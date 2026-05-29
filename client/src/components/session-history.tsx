import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  CalendarDays,
  Star,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  fetchMemberSessions,
  memberSessionsQueryKey,
  sessionAwaitingPaymentUpdate,
  type MemberSession,
} from '@/lib/member-sessions';
import { Download, Video, ExternalLink } from 'lucide-react';
import {
  canRetrySessionPayment,
  defaultPaymentRetryDeps,
  retrySessionPayment,
} from '@/lib/session-payment-retry';

type SessionData = MemberSession & {
  canCancel?: boolean;
  canRebook?: boolean;
  canReview?: boolean;
  isLive?: boolean;
  cancellationReason?: string | null;
};

function withSessionActions(sessions: MemberSession[]): SessionData[] {
  return sessions.map((r) => ({
    ...r,
    canCancel: r.status === "upcoming" && !r.isLive && r.paymentStatus === "paid",
    canRebook: r.status === "cancelled",
    canReview: r.status === "completed",
  }));
}

interface SessionHistoryProps {
  userId: string;
  /** Initial sub-tab: upcoming | completed | cancelled */
  initialSubTab?: string;
}

export function SessionHistory({ userId, initialSubTab }: SessionHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(
    initialSubTab === "completed" || initialSubTab === "cancelled"
      ? initialSubTab
      : "upcoming",
  );

  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: memberSessionsQueryKey(userId),
    queryFn: fetchMemberSessions,
    select: (rows) => withSessionActions(rows),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      return sessionAwaitingPaymentUpdate(rows) ? 4000 : false;
    },
    retry: 1,
  });

  useEffect(() => {
    if (
      initialSubTab === "upcoming" ||
      initialSubTab === "completed" ||
      initialSubTab === "cancelled"
    ) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const cancelledSessions = sessions.filter(s => s.status === 'cancelled');

  const handleCancelSession = async (sessionId: string) => {
    try {
      // TODO: Implement actual API call
      console.log(`Cancelling session ${sessionId}`);
      
      void refetch();
      
      toast({
        title: "Session cancelled",
        description: "Your session has been cancelled successfully.",
      });
    } catch {
      toast({
        title: "Cancellation failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleRebookSession = (sessionId: string) => {
    console.log(`Rebooking session ${sessionId}`);
    toast({
      title: "Rebooking",
      description: "Redirecting to booking page...",
    });
  };

  const handleRetryPayment = async (session: SessionData) => {
    await retrySessionPayment(
      session,
      defaultPaymentRetryDeps({
        onPaid: async () => {
          toast({
            title: "Payment completed",
            description: "Your booking is now confirmed.",
          });
          void refetch();
          queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
        },
        onDismiss: () => {
          toast({
            title: "Payment not completed",
            description: "You can retry payment anytime from Upcoming sessions.",
            variant: "destructive",
          });
        },
        onError: (message) => {
          toast({
            title: "Retry payment failed",
            description: message,
            variant: "destructive",
          });
        },
      }),
    );
  };

  const renderSessionCard = (session: SessionData) => (
    <Card key={session.id} className="border-purple-100 hover:border-purple-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-purple-800 mb-1" data-testid={`session-title-${session.id}`}>
              {session.className}
            </h3>
            <div className="flex items-center gap-2 text-sm text-purple-600 mb-2">
              <User className="h-4 w-4" />
              <span>{session.instructorName}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {session.isLive && session.status === "upcoming" && (
              <Badge className="bg-emerald-600 text-white animate-pulse" data-testid={`session-live-${session.id}`}>
                Session is Live
              </Badge>
            )}
            <Badge 
              variant={
                session.status === 'upcoming' ? 'default' :
                session.status === 'completed' ? 'secondary' : 
                'destructive'
              }
              className={
                session.status === 'upcoming' ? 'bg-purple-100 text-purple-800' :
                session.status === 'completed' ? 'bg-green-100 text-green-800' : 
                'bg-red-100 text-red-800'
              }
              data-testid={`session-status-${session.id}`}
            >
              {session.status === 'upcoming' && !session.isLive && <CalendarDays className="h-3 w-3 mr-1" />}
              {session.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {session.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-purple-600">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(session.date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-purple-600">
            <Clock className="h-4 w-4" />
            <span>{session.time}</span>
          </div>
        </div>

        {session.status === "cancelled" && session.cancellationReason && (
          <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2">
            <span className="font-semibold">Cancellation reason: </span>
            {session.cancellationReason}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant="outline"
            className={
              session.paymentStatus === "paid"
                ? "capitalize border-green-300 text-green-800"
                : "capitalize"
            }
          >
            Payment: {session.paymentStatus}
          </Badge>
          {session.paymentStatus === "pending" && session.verificationStatus === "pending" && (
            <Badge className="bg-amber-100 text-amber-800">Awaiting verification</Badge>
          )}
          {session.paymentStatus === "paid" && session.verificationStatus === "confirmed" && (
            <Badge className="bg-green-100 text-green-800">Payment confirmed</Badge>
          )}
          {session.paymentStatus === "paid" &&
            session.googleMeetLink &&
            session.meetJoinState !== "hidden" && (
              session.meetJoinState === "active" ? (
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <a href={session.googleMeetLink} target="_blank" rel="noopener noreferrer">
                    <Video className="h-3 w-3 mr-1" />
                    Join session
                  </a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs opacity-50 cursor-not-allowed"
                  disabled
                  title="Join opens 1 hour before the session and closes when the session ends"
                >
                  <Video className="h-3 w-3 mr-1" />
                  Join session
                </Button>
              )
            )}
          {session.invoiceUrl && (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <a href={session.invoiceUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-3 w-3 mr-1" />
                Invoice
              </a>
            </Button>
          )}
          {session.receiptUrl && (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <a href={session.receiptUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Receipt
              </a>
            </Button>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          {session.status === 'upcoming' && session.canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelSession(session.id)}
              className="border-red-200 text-red-600 hover:bg-red-50"
              data-testid={`cancel-session-${session.id}`}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}

          {canRetrySessionPayment(session) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRetryPayment(session)}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              data-testid={`retry-payment-${session.id}`}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry payment
            </Button>
          )}
          
          {session.status === 'cancelled' && session.canRebook && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRebookSession(session.id)}
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
              data-testid={`rebook-session-${session.id}`}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Rebook
            </Button>
          )}
          
          {session.status === 'completed' && session.canReview && (
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-200 text-yellow-600 hover:bg-yellow-50"
              data-testid={`review-session-${session.id}`}
            >
              <Star className="h-4 w-4 mr-1" />
              Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-purple-600">Loading your session history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-orange-50">
        <CardTitle className="flex items-center gap-3 text-purple-800">
          <CalendarDays className="h-6 w-6 text-purple-600" />
          Session History
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
              data-testid="upcoming-sessions-tab"
            >
              Upcoming ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800"
              data-testid="completed-sessions-tab"
            >
              Completed ({completedSessions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled"
              className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800"
              data-testid="cancelled-sessions-tab"
            >
              Cancelled ({cancelledSessions.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4" data-testid="upcoming-sessions-content">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map(renderSessionCard)
            ) : (
              <div className="text-center py-8 text-purple-600">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-purple-300" />
                <p className="text-lg font-medium">No upcoming sessions</p>
                <p className="text-sm">Book your next yoga session to get started!</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4" data-testid="completed-sessions-content">
            {completedSessions.length > 0 ? (
              completedSessions.map(renderSessionCard)
            ) : (
              <div className="text-center py-8 text-green-600">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-300" />
                <p className="text-lg font-medium">No completed sessions yet</p>
                <p className="text-sm">Your completed sessions will appear here after you attend them.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="cancelled" className="space-y-4" data-testid="cancelled-sessions-content">
            {cancelledSessions.length > 0 ? (
              cancelledSessions.map(renderSessionCard)
            ) : (
              <div className="text-center py-8 text-red-600">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-300" />
                <p className="text-lg font-medium">No cancelled sessions</p>
                <p className="text-sm">Great! You haven&apos;t cancelled any sessions.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
