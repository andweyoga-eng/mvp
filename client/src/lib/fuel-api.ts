import { getAuthHeaders } from "@/lib/auth";
import type { FuelEstimateReviewState } from "@shared/fuel";

export type FuelDailyContent = {
  recipe: {
    title: string;
    teaser: string;
    ingredients: string;
    method: string;
    imageUrl: string | null;
    approxKcal: number | null;
  } | null;
  practiceAlong: {
    provider: string;
    title: string;
    embedUrl: string;
  } | null;
};

type FuelDashboardBase = FuelDailyContent & {
  estimationAvailable: boolean;
  today: string;
};

export type FuelDashboardResponse =
  | ({
      gate: "health_consent_required";
      healthConsented: false;
      configured: false;
    } & FuelDashboardBase)
  | ({
      gate: "not_configured";
      healthConsented: true;
      configured: false;
      message: string;
    } & FuelDashboardBase)
  | ({
      gate: "ok";
      healthConsented: true;
      configured: true;
      target: number;
      deficit: number;
      mealPlan: Array<{ index: number; label: string; startTime: string; endTime: string }>;
      dayTotal: number;
      caloriesLeftLabel: string;
      verdictReady: boolean;
      status: "on_track" | "over" | "under" | "pending";
      statusDelta: string | null;
      weekBars: Array<{
        date: string;
        total: number;
        status: "on_track" | "over" | "under" | "pending";
        delta: number | null;
      }>;
      meals: FuelMealRow[];
      pepPhrases: Array<{ pre: string; accent: string; post: string }>;
    } & FuelDashboardBase);

export type FuelMealRow = {
  id: string;
  loggedDate: string;
  loggedAt: string;
  name: string;
  calories: number;
  targetAtLogCal: number;
  mealSlotIndex: number | null;
  clientLocalTime: string | null;
};

export type FuelStatementResponse = {
  today: string;
  target: number;
  deficit: number;
  mealsLoggedThisWeek: number;
  avgDailyDelta: number | null;
  rows: Array<
    FuelMealRow & {
      dayTotal: number;
      dayStatus: "on_track" | "over" | "under" | "pending";
      dayDelta: string | null;
    }
  >;
};

export type FuelEstimateResponse = {
  name: string;
  calories: number;
  confidence: number;
  items?: string[];
  model?: string;
  latency_ms?: number;
  reviewState: FuelEstimateReviewState;
  advisory: true;
};

export type FuelEstimateErrorBody = {
  error: "disabled" | "unreadable" | "quota" | "provider_down" | "schema" | "no_food";
  message: string;
  retry_after?: number;
};

export class FuelEstimateRequestError extends Error {
  readonly status: number;
  readonly body: FuelEstimateErrorBody;

  constructor(status: number, body: FuelEstimateErrorBody) {
    super(body.message || "Photo estimate failed");
    this.name = "FuelEstimateRequestError";
    this.status = status;
    this.body = body;
  }
}

export function clientLocalDateTime(now = new Date()) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    clientLocalDate: `${get("year")}-${get("month")}-${get("day")}`,
    clientLocalTime: `${hour}:${get("minute")}`,
    clientTimeZone: tz,
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (data as { message?: string }).message === "string"
        ? (data as { message: string }).message
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function fetchFuelDashboard(): Promise<FuelDashboardResponse> {
  const { clientLocalDate, clientTimeZone } = clientLocalDateTime();
  const qs = new URLSearchParams({ localDate: clientLocalDate, tz: clientTimeZone });
  const res = await fetch(`/api/fuel/dashboard?${qs}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return parseJson(res);
}

export async function fetchFuelStatement(): Promise<FuelStatementResponse> {
  const { clientLocalDate, clientTimeZone } = clientLocalDateTime();
  const qs = new URLSearchParams({ localDate: clientLocalDate, tz: clientTimeZone });
  const res = await fetch(`/api/fuel/statement?${qs}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return parseJson(res);
}

export async function logFuelMeal(input: {
  name: string;
  calories: number;
  mealSlotIndex?: number | null;
}): Promise<FuelMealRow> {
  const local = clientLocalDateTime();
  const res = await fetch("/api/fuel/meals", {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, ...local }),
  });
  return parseJson(res);
}

export async function deleteFuelMeal(id: string): Promise<void> {
  const res = await fetch(`/api/fuel/meals/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  await parseJson(res);
}

export async function estimateFuelMeal(
  file: File,
  opts?: { slotIndex?: number | null },
): Promise<FuelEstimateResponse> {
  const form = new FormData();
  form.append("photo", file);
  if (opts?.slotIndex != null) {
    form.append("slot_index", String(opts.slotIndex));
  }
  form.append("client_ts", new Date().toISOString());

  const res = await fetch("/api/fuel/estimate", {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FuelEstimateRequestError(res.status, {
      error: (data as FuelEstimateErrorBody).error ?? "provider_down",
      message:
        typeof (data as { message?: string }).message === "string"
          ? (data as { message: string }).message
          : "Photo estimate failed",
      retry_after: (data as FuelEstimateErrorBody).retry_after,
    });
  }
  return data as FuelEstimateResponse;
}
