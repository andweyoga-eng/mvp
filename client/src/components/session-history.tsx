import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  User,
  CalendarDays,
  MapPin,
  X,
  RefreshCw,
  Star,
  Video,
  Download,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  fetchMemberSessions,
  memberSessionsQueryKey,
  sessionAwaitingPaymentUpdate,
  type MemberSession,
} from "@/lib/member-sessions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMeetJoinMessage } from "@shared/session-meet-access";
import {
  canRetrySessionPayment,
  defaultPaymentRetryDeps,
  retrySessionPayment,
} from "@/lib/session-payment-retry";
import {
  SessionShareMenu,
  buildBookedSessionSharePayloadForUi,
} from "@/components/session-share-menu";

type SessionData = MemberSession & {
  canCancel?: boolean;
  canRebook?: boolean;
  canReview?: boolean;
};

function withSessionActions(sessions: MemberSession[]): SessionData[] {
  return sessions.map((r) => ({
    ...r,
    canCancel: r.status === "upcoming" && !r.isLive && r.paymentStatus === "paid",
    canRebook: r.status === "cancelled",
    canReview: r.status === "completed",
  }));
}

function formatSessionTime(dateIso: string): string {
  return format(new Date(dateIso), "h:mm a");
}

function sessionLocation(session: SessionData): string {
  return session.googleMeetLink ? "Online" : "Studio";
}

interface SessionHistoryProps {
  userId: string;
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

  const upcomingSessions = sessions.filter((s) => s.status === "upcoming");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const cancelledSessions = sessions.filter((s) => s.status === "cancelled");

  const tabBtn = (tab: string, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={cn(
        "flex-1 rounded-[10px] px-2 py-2 text-[13px] font-semibold transition-colors",
        activeTab === tab
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-primary",
      )}
      data-testid={`${tab}-sessions-tab`}
    >
      {label} {count}
    </button>
  );

  const handleCancelSession = async (sessionId: string) => {
    try {
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

  const statusBadge = (session: SessionData) => {
    const label =
      session.isLive && session.status === "upcoming"
        ? "Live"
        : session.status.charAt(0).toUpperCase() + session.status.slice(1);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          session.status === "upcoming" && "bg-primary/10 text-primary",
          session.status === "completed" && "bg-emerald-100 text-emerald-800",
          session.status === "cancelled" && "bg-red-100 text-red-700",
        )}
        data-testid={`session-status-${session.id}`}
      >
        {session.status === "upcoming" && !session.isLive ? (
          <CalendarDays className="h-3 w-3" />
        ) : null}
        {label}
      </span>
    );
  };

  const renderSessionCard = (session: SessionData) => {
    const duration = session.sessionDurationMinutes ?? 60;
    const start = new Date(session.date);

    return (
      <article
        key={session.id}
        className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
        data-testid={`session-card-${session.id}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            className="font-display text-base font-semibold text-foreground"
            data-testid={`session-title-${session.id}`}
          >
            {session.className}
          </h3>
          {statusBadge(session)}
        </div>

        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0 text-primary/70" />
          <span>{session.instructorName}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
            {format(start, "MMM d, yyyy")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0 text-primary/70" />
            {formatSessionTime(session.date)} · {duration} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            {sessionLocation(session)}
          </span>
        </div>

        {session.status === "cancelled" && session.cancellationReason ? (
          <p className="mt-3 rounded-lg border border-red-100 bg-red-50 p-2 text-sm text-red-700">
            <span className="font-semibold">Cancellation reason: </span>
            {session.cancellationReason}
          </p>
        ) : null}

        {(session.paymentStatus === "pending" ||
          session.verificationStatus === "pending" ||
          session.paymentStatus === "paid") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {session.paymentStatus === "pending" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                Payment pending
              </span>
            )}
            {session.verificationStatus === "pending" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                Awaiting verification
              </span>
            )}
            {session.paymentStatus === "paid" &&
              session.googleMeetLink &&
              session.meetJoinState !== "hidden" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {session.meetJoinState === "active" ? (
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <a href={session.googleMeetLink} target="_blank" rel="noopener noreferrer">
                          <Video className="mr-1 h-3 w-3" />
                          Join session
                        </a>
                      </Button>
                    ) : (
                      <span tabIndex={0} className="inline-flex">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 cursor-not-allowed text-xs opacity-50"
                          disabled
                        >
                          <Video className="mr-1 h-3 w-3" />
                          Join session
                        </Button>
                      </span>
                    )}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-center">
                    {getMeetJoinMessage({
                      sessionStart: start,
                      sessionDurationMinutes: duration,
                      isPaid:
                        session.paymentStatus === "paid" || session.paymentStatus === "waived",
                      hasMeetLink: !!session.googleMeetLink,
                    })}
                  </TooltipContent>
                </Tooltip>
              )}
            {session.invoiceUrl && (
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <a href={session.invoiceUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-1 h-3 w-3" />
                  Invoice
                </a>
              </Button>
            )}
            {session.receiptUrl && (
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <a href={session.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Receipt
                </a>
              </Button>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {session.status === "upcoming" && session.canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelSession(session.id)}
              className="border-red-200 text-red-600 hover:bg-red-50"
              data-testid={`cancel-session-${session.id}`}
            >
              <X className="mr-1 h-4 w-4" />
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
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry payment
            </Button>
          )}

          {session.status === "upcoming" &&
            (session.paymentStatus === "paid" || session.paymentStatus === "waived") && (
              <SessionShareMenu
                payload={buildBookedSessionSharePayloadForUi({
                  className: session.className,
                  instructorName: session.instructorName,
                  date: session.date,
                  classId: session.classId,
                })}
                className="border-primary/20 text-primary hover:bg-primary/5"
              />
            )}

          {session.status === "cancelled" && session.canRebook && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRebookSession(session.id)}
              className="border-primary/20 text-primary hover:bg-primary/5"
              data-testid={`rebook-session-${session.id}`}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Rebook
            </Button>
          )}

          {session.status === "completed" && session.canReview && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              data-testid={`review-session-${session.id}`}
            >
              <Star className="mr-1 h-4 w-4" />
              Review
            </Button>
          )}
        </div>
      </article>
    );
  };

  const emptyState = (tab: string) => {
    const copy =
      tab === "upcoming"
        ? {
            title: "No upcoming sessions",
            body: "Book your next yoga session to get started!",
          }
        : tab === "completed"
          ? {
              title: "No completed sessions yet",
              body: "Your completed sessions will appear here after you attend them.",
            }
          : {
              title: "No cancelled sessions",
              body: "Great! You haven't cancelled any sessions.",
            };
    return (
      <div className="py-10 text-center text-muted-foreground">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-primary/30" />
        <p className="font-medium text-foreground">{copy.title}</p>
        <p className="mt-1 text-sm">{copy.body}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const lists: Record<string, SessionData[]> = {
    upcoming: upcomingSessions,
    completed: completedSessions,
    cancelled: cancelledSessions,
  };

  return (
    <div className="space-y-4" data-testid="session-history">
      <div className="flex gap-1.5 rounded-[14px] bg-muted p-1.5">
        {tabBtn("upcoming", "Upcoming", upcomingSessions.length)}
        {tabBtn("completed", "Completed", completedSessions.length)}
        {tabBtn("cancelled", "Cancelled", cancelledSessions.length)}
      </div>

      <div className="space-y-3" data-testid={`${activeTab}-sessions-content`}>
        {lists[activeTab]?.length ? lists[activeTab].map(renderSessionCard) : emptyState(activeTab)}
      </div>
    </div>
  );
}
