import {
  getSessionEndTime,
  resolveSessionDurationMinutes,
} from "@shared/session-window";

export type MemberSessionDisplayStatus = "upcoming" | "completed" | "cancelled";

export function classifyMemberSessionStatus(params: {
  mappingStatus: string;
  classCancelledAt: Date | string | null | undefined;
  sessionStart: Date | string;
  durationMinutes: number | null | undefined;
  now?: Date;
}): { status: MemberSessionDisplayStatus; isLive: boolean } {
  const now = params.now ?? new Date();
  if (params.mappingStatus === "cancelled" || params.classCancelledAt) {
    return { status: "cancelled", isLive: false };
  }

  const duration = resolveSessionDurationMinutes(params.durationMinutes);
  const startMs = new Date(params.sessionStart).getTime();
  const endMs = getSessionEndTime(params.sessionStart, duration).getTime();
  const nowMs = now.getTime();

  if (endMs <= nowMs) {
    return { status: "completed", isLive: false };
  }
  if (startMs <= nowMs) {
    return { status: "upcoming", isLive: true };
  }
  if (params.mappingStatus === "completed") {
    return { status: "upcoming", isLive: false };
  }
  return { status: "upcoming", isLive: false };
}
