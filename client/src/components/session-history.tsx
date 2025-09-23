import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  CalendarDays,
  Star,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionData {
  id: string;
  className: string;
  instructorName: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  bookedAt: string;
  attendedAt?: string;
  cancelledAt?: string;
  canCancel?: boolean;
  canRebook?: boolean;
  canReview?: boolean;
}

interface SessionHistoryProps {
  userId: string;
}

export function SessionHistory({ userId }: SessionHistoryProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Mock data for demonstration - will be replaced with actual API calls
  useEffect(() => {
    const mockSessions: SessionData[] = [
      {
        id: '1',
        className: 'Hatha Yoga - Beginner',
        instructorName: 'Sarah Johnson',
        date: '2025-09-25',
        time: '09:00',
        duration: 60,
        location: 'Studio A',
        status: 'upcoming',
        bookedAt: '2025-09-20T10:00:00Z',
        canCancel: true
      },
      {
        id: '2',
        className: 'Vinyasa Flow - Intermediate',
        instructorName: 'Michael Chen',
        date: '2025-09-27',
        time: '18:30',
        duration: 75,
        location: 'Studio B',
        status: 'upcoming',
        bookedAt: '2025-09-21T15:30:00Z',
        canCancel: true
      },
      {
        id: '3',
        className: 'Restorative Yoga',
        instructorName: 'Emma Williams',
        date: '2025-09-15',
        time: '19:00',
        duration: 90,
        location: 'Studio A',
        status: 'completed',
        bookedAt: '2025-09-10T12:00:00Z',
        attendedAt: '2025-09-15T19:00:00Z',
        canReview: true
      },
      {
        id: '4',
        className: 'Power Yoga',
        instructorName: 'David Kumar',
        date: '2025-09-12',
        time: '07:00',
        duration: 60,
        location: 'Studio B',
        status: 'cancelled',
        bookedAt: '2025-09-08T09:00:00Z',
        cancelledAt: '2025-09-11T14:00:00Z',
        canRebook: true
      }
    ];
    
    setSessions(mockSessions);
    setIsLoading(false);
  }, [userId]);

  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const cancelledSessions = sessions.filter(s => s.status === 'cancelled');

  const handleCancelSession = async (sessionId: string) => {
    try {
      // TODO: Implement actual API call
      console.log(`Cancelling session ${sessionId}`);
      
      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { 
                ...session, 
                status: 'cancelled' as const, 
                cancelledAt: new Date().toISOString(),
                canCancel: false 
              }
            : session
        )
      );
      
      toast({
        title: "Session Cancelled",
        description: "Your yoga session has been successfully cancelled.",
      });
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel your session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRebookSession = async (sessionId: string) => {
    try {
      // TODO: Implement actual API call to open booking modal
      console.log(`Rebooking session ${sessionId}`);
      
      toast({
        title: "Rebooking Session",
        description: "Opening booking calendar to schedule a new session.",
      });
    } catch (error) {
      toast({
        title: "Rebooking Failed",
        description: "Unable to rebook your session. Please try again.",
        variant: "destructive",
      });
    }
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
            {session.status === 'upcoming' && <CalendarDays className="h-3 w-3 mr-1" />}
            {session.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {session.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-purple-600">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(session.date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-purple-600">
            <Clock className="h-4 w-4" />
            <span>{session.time} ({session.duration} min)</span>
          </div>
          {session.location && (
            <div className="flex items-center gap-2 text-purple-600">
              <MapPin className="h-4 w-4" />
              <span>{session.location}</span>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
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
        
        {/* Timestamps */}
        <div className="text-xs text-gray-500 mt-3 space-y-1">
          <div>Booked: {format(new Date(session.bookedAt), 'MMM dd, yyyy HH:mm')}</div>
          {session.attendedAt && (
            <div>Attended: {format(new Date(session.attendedAt), 'MMM dd, yyyy HH:mm')}</div>
          )}
          {session.cancelledAt && (
            <div>Cancelled: {format(new Date(session.cancelledAt), 'MMM dd, yyyy HH:mm')}</div>
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
                <p className="text-sm">Great! You haven't cancelled any sessions.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}