import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  fetchMemberSessions,
  memberSessionPaymentKey,
  memberSessionsQueryKey,
  sessionApproachingJoinPrompt,
  sessionAwaitingPaymentUpdate,
  sessionsNewlyPaymentVerified,
  sessionWithinJoinPromptWindow,
  type MemberSession,
} from "@/lib/member-sessions";
import { useToast } from "@/hooks/use-toast";
import {
  acknowledgeJoinPrompt,
  acknowledgePaymentConfirmed,
  isJoinPromptAcknowledged,
  isPaymentConfirmedAcknowledged,
} from "@/lib/payment-verified-celebration";
import { MY_SESSIONS_UPCOMING_URL } from "@/lib/member-landing";
import { PaymentConfirmedDialog } from "@/components/payment-confirmed-dialog";
import { PaymentVerifiedCelebrationDialog } from "@/components/payment-verified-celebration-dialog";

export type JoinPromptCelebration = {
  bookingId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
  googleMeetLink: string | null;
  meetJoinState: MemberSession["meetJoinState"];
  popupDismissed: boolean;
};

type PaymentVerifiedContextValue = {
  celebrationCount: number;
  openCelebrationFromMenu: () => void;
};

const PaymentVerifiedContext = createContext<PaymentVerifiedContextValue | null>(null);

function toJoinPrompt(session: MemberSession, popupDismissed: boolean): JoinPromptCelebration {
  return {
    bookingId: session.bookingId,
    className: session.className,
    instructorName: session.instructorName,
    sessionDate: session.date,
    googleMeetLink: session.googleMeetLink,
    meetJoinState: session.meetJoinState,
    popupDismissed,
  };
}

export function PaymentVerifiedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pathname, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdminPath = pathname.startsWith("/admin");
  const [paymentConfirmed, setPaymentConfirmed] = useState<MemberSession | null>(null);
  const [joinPrompts, setJoinPrompts] = useState<JoinPromptCelebration[]>([]);
  const [forceShowJoinBookingId, setForceShowJoinBookingId] = useState<string | null>(null);
  const paymentSnapshotRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);
  const paymentToastShownRef = useRef<Set<string>>(new Set());

  const { data: sessions = [] } = useQuery({
    queryKey: memberSessionsQueryKey(user?.id ?? ""),
    enabled: !!user?.id && !isAdminPath,
    queryFn: fetchMemberSessions,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      if (sessionAwaitingPaymentUpdate(rows)) return 4000;
      if (sessionApproachingJoinPrompt(rows)) return 4000;
      return 12000;
    },
  });

  useEffect(() => {
    if (!user?.id || isAdminPath) {
      setPaymentConfirmed(null);
      setJoinPrompts([]);
      paymentSnapshotRef.current = new Map();
      seededRef.current = false;
      return;
    }

    if (!sessions.length && !seededRef.current) return;

    const snapshot = paymentSnapshotRef.current;
    const now = new Date();

    if (!seededRef.current) {
      for (const s of sessions) {
        snapshot.set(s.bookingId, memberSessionPaymentKey(s));
      }
      const initialJoinPrompts = sessions
        .filter(
          (s) =>
            s.status === "upcoming" &&
            s.paymentStatus === "paid" &&
            sessionWithinJoinPromptWindow(s, now) &&
            !isJoinPromptAcknowledged(s.bookingId),
        )
        .map((s) => toJoinPrompt(s, false));
      if (initialJoinPrompts.length > 0) setJoinPrompts(initialJoinPrompts);
      seededRef.current = true;
      return;
    }

    const newlyVerified = sessionsNewlyPaymentVerified(sessions, snapshot).filter(
      (s) => !isPaymentConfirmedAcknowledged(s.bookingId),
    );
    for (const s of sessions) {
      snapshot.set(s.bookingId, memberSessionPaymentKey(s));
    }

    if (newlyVerified.length > 0) {
      const next = newlyVerified[0];
      setPaymentConfirmed(next);
      for (const s of newlyVerified) {
        if (!paymentToastShownRef.current.has(s.bookingId)) {
          paymentToastShownRef.current.add(s.bookingId);
          toast({
            title: "Payment confirmed",
            description: `${s.className} is locked in. View details in My Sessions.`,
          });
        }
      }
    }

    setJoinPrompts((current) => {
      const dismissed = new Map(current.map((c) => [c.bookingId, c.popupDismissed]));
      const eligible = sessions.filter(
        (s) =>
          s.status === "upcoming" &&
          s.paymentStatus === "paid" &&
          sessionWithinJoinPromptWindow(s, now) &&
          !isJoinPromptAcknowledged(s.bookingId),
      );
      return eligible.map((s) =>
        toJoinPrompt(s, dismissed.get(s.bookingId) ?? false),
      );
    });
  }, [sessions, user?.id, isAdminPath, toast]);

  const joinPromptCount = joinPrompts.length;

  const joinDialogCelebration = useMemo(() => {
    if (!joinPrompts.length) return null;
    if (forceShowJoinBookingId) {
      return joinPrompts.find((c) => c.bookingId === forceShowJoinBookingId) ?? joinPrompts[0];
    }
    return joinPrompts.find((c) => !c.popupDismissed) ?? null;
  }, [joinPrompts, forceShowJoinBookingId]);

  const joinDialogOpen =
    !!joinDialogCelebration &&
    (!joinDialogCelebration.popupDismissed || !!forceShowJoinBookingId);

  const dismissJoinPopup = useCallback((bookingId: string) => {
    setForceShowJoinBookingId(null);
    setJoinPrompts((current) =>
      current.map((c) => (c.bookingId === bookingId ? { ...c, popupDismissed: true } : c)),
    );
  }, []);

  const joinNow = useCallback(
    (bookingId: string) => {
      const item = joinPrompts.find((c) => c.bookingId === bookingId);
      if (item?.googleMeetLink) {
        window.open(item.googleMeetLink, "_blank", "noopener,noreferrer");
      }
      acknowledgeJoinPrompt(bookingId);
      setForceShowJoinBookingId(null);
      setJoinPrompts((current) => current.filter((c) => c.bookingId !== bookingId));
      void queryClient.invalidateQueries({ queryKey: memberSessionsQueryKey(user?.id ?? "") });
    },
    [joinPrompts, queryClient, user?.id],
  );

  const closePaymentConfirmed = useCallback((bookingId: string) => {
    acknowledgePaymentConfirmed(bookingId);
    setPaymentConfirmed(null);
  }, []);

  const viewMySessions = useCallback(() => {
    if (paymentConfirmed) {
      closePaymentConfirmed(paymentConfirmed.bookingId);
    }
    setLocation(MY_SESSIONS_UPCOMING_URL);
  }, [paymentConfirmed, closePaymentConfirmed, setLocation]);

  const openCelebrationFromMenu = useCallback(() => {
    if (!joinPrompts.length) return;
    setForceShowJoinBookingId(joinPrompts[0].bookingId);
  }, [joinPrompts]);

  const value = useMemo(
    () => ({
      celebrationCount: isAdminPath ? 0 : joinPromptCount,
      openCelebrationFromMenu: isAdminPath ? () => {} : openCelebrationFromMenu,
    }),
    [joinPromptCount, isAdminPath, openCelebrationFromMenu],
  );

  return (
    <PaymentVerifiedContext.Provider value={value}>
      {children}
      {!isAdminPath && paymentConfirmed ? (
        <PaymentConfirmedDialog
          open
          details={{
            bookingId: paymentConfirmed.bookingId,
            className: paymentConfirmed.className,
            instructorName: paymentConfirmed.instructorName,
            sessionDate: paymentConfirmed.date,
            googleMeetLink: paymentConfirmed.googleMeetLink,
            sessionDurationMinutes: paymentConfirmed.sessionDurationMinutes ?? 60,
          }}
          onViewSessions={viewMySessions}
          onCancel={() => closePaymentConfirmed(paymentConfirmed.bookingId)}
          onOpenChange={(open) => {
            if (!open) closePaymentConfirmed(paymentConfirmed.bookingId);
          }}
        />
      ) : null}
      {!isAdminPath && !paymentConfirmed && joinDialogCelebration ? (
        <PaymentVerifiedCelebrationDialog
          open={joinDialogOpen}
          celebration={joinDialogCelebration}
          onJoinNow={() => joinNow(joinDialogCelebration.bookingId)}
          onJoinLater={() => dismissJoinPopup(joinDialogCelebration.bookingId)}
          onOpenChange={(open) => {
            if (!open) dismissJoinPopup(joinDialogCelebration.bookingId);
          }}
        />
      ) : null}
    </PaymentVerifiedContext.Provider>
  );
}

export function usePaymentVerifiedCelebrations(): PaymentVerifiedContextValue {
  const ctx = useContext(PaymentVerifiedContext);
  if (!ctx) {
    return { celebrationCount: 0, openCelebrationFromMenu: () => {} };
  }
  return ctx;
}
