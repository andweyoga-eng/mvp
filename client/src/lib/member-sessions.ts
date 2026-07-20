import { format } from "date-fns";
import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import {
  isWithinJoinPromptWindow,
  JOIN_PROMPT_BEFORE_MS,
} from "@shared/session-meet-access";

export type MeetJoinState = "hidden" | "disabled" | "active";

export interface MemberSession {
  id: string;
  bookingId: string;
  classId: string;
  anchorClassId?: string | null;
  className: string;
  instructorName: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  isLive?: boolean;
  cancellationReason?: string | null;
  paymentStatus: string;
  verificationStatus: string | null;
  googleMeetLink: string | null;
  meetJoinState?: MeetJoinState;
  sessionDurationMinutes?: number;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  bookedAt: string;
  isFlexi?: boolean;
  flexiBookingId?: string | null;
}

type MemberSessionApiRow = {
  id: string;
  bookingId: string;
  classId: string;
  anchorClassId?: string | null;
  className: string;
  instructorName: string;
  sessionDate: string;
  status: MemberSession["status"];
  isLive?: boolean;
  cancellationReason?: string | null;
  paymentStatus: string;
  verificationStatus?: string | null;
  googleMeetLink: string | null;
  meetJoinState?: MeetJoinState;
  sessionDurationMinutes?: number;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  bookedAt: string;
  isFlexi?: boolean;
  flexiBookingId?: string | null;
};

export function mapMemberSessions(rows: MemberSessionApiRow[]): MemberSession[] {
  return rows.map((r) => {
    const d = new Date(r.sessionDate);
    return {
      id: r.id,
      bookingId: r.bookingId,
      classId: r.classId,
      anchorClassId: r.anchorClassId ?? null,
      className: r.className,
      instructorName: r.instructorName,
      date: r.sessionDate,
      time: format(d, "HH:mm"),
      status: r.status,
      isLive: r.isLive,
      cancellationReason: r.cancellationReason ?? null,
      paymentStatus: r.paymentStatus,
      verificationStatus: r.verificationStatus ?? null,
      googleMeetLink: r.googleMeetLink,
      meetJoinState: r.meetJoinState,
      sessionDurationMinutes: r.sessionDurationMinutes ?? 60,
      receiptUrl: r.receiptUrl,
      invoiceUrl: r.invoiceUrl,
      bookedAt: r.bookedAt,
      isFlexi: !!r.isFlexi,
      flexiBookingId: r.flexiBookingId ?? null,
    };
  });
}

export function memberSessionsQueryKey(userId: string) {
  return ["/api/sessions/my", userId] as const;
}

export async function fetchMemberSessions(): Promise<MemberSession[]> {
  const res = await fetch("/api/sessions/my", {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const rows = await readResponseJson<MemberSessionApiRow[]>(res);
  if (!res.ok) throw new Error("Failed to load sessions");
  return mapMemberSessions(rows);
}

/** Snapshot key for detecting payment verification transitions. */
export function memberSessionPaymentKey(session: Pick<
  MemberSession,
  "paymentStatus" | "verificationStatus"
>): string {
  if (session.paymentStatus === "paid" || session.paymentStatus === "waived") return "paid";
  if (session.verificationStatus === "pending") return "pending-verify";
  if (session.paymentStatus === "pending") return "pending";
  return session.paymentStatus;
}

export function sessionAwaitingPaymentUpdate(sessions: MemberSession[]): boolean {
  return sessions.some(
    (s) =>
      s.status === "upcoming" &&
      (s.paymentStatus === "pending" || s.verificationStatus === "pending"),
  );
}

/** Sessions that just moved from awaiting payment to paid (for celebration popup). */
export function sessionWithinJoinPromptWindow(
  session: Pick<MemberSession, "date" | "sessionDurationMinutes">,
  now: Date = new Date(),
): boolean {
  return isWithinJoinPromptWindow({
    sessionStart: new Date(session.date),
    sessionDurationMinutes: session.sessionDurationMinutes ?? 60,
    now,
  });
}

/** Poll more often when a session is approaching the 30-minute join window. */
export function sessionApproachingJoinPrompt(sessions: MemberSession[], now: Date = new Date()): boolean {
  return sessions.some((s) => {
    if (s.status !== "upcoming" || s.paymentStatus !== "paid") return false;
    const startMs = new Date(s.date).getTime();
    const minsUntil = (startMs - now.getTime()) / 60_000;
    const duration = s.sessionDurationMinutes ?? 60;
    return minsUntil <= JOIN_PROMPT_BEFORE_MS / 60_000 + 5 && minsUntil > -duration;
  });
}

export function findUpcomingMemberSessionForClass(
  sessions: MemberSession[],
  classId: string,
): MemberSession | undefined {
  return sessions.find(
    (s) =>
      (s.classId === classId || s.anchorClassId === classId) &&
      s.status === "upcoming" &&
      (s.paymentStatus === "paid" || s.paymentStatus === "waived"),
  );
}

export function findUpcomingPendingSessionForClass(
  sessions: MemberSession[],
  classId: string,
): MemberSession | undefined {
  return sessions.find(
    (s) => s.classId === classId && s.status === "upcoming" && s.paymentStatus === "pending",
  );
}

export function sessionsNewlyPaymentVerified(
  sessions: MemberSession[],
  previousKeys: Map<string, string>,
): MemberSession[] {
  const out: MemberSession[] = [];
  for (const s of sessions) {
    const key = memberSessionPaymentKey(s);
    const prev = previousKeys.get(s.bookingId);
    if (s.status !== "upcoming" || s.paymentStatus !== "paid") continue;
    const wasAwaiting = prev === "pending" || prev === "pending-verify";
    if (wasAwaiting && key === "paid") out.push(s);
  }
  return out;
}
