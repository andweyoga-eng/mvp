import { getAuthHeaders } from "@/lib/auth";
import type {
  FuelCaptureMethod,
  FuelEstimateReviewState,
  FuelMacros,
} from "@shared/fuel";

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
  mealGroupId: string | null;
  mealTitle: string | null;
  weightG: number | null;
  captureMethod: string | null;
  confidence: number | null;
  macros: FuelMacros | null;
  eatenLocalTime: string | null;
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
  macros?: FuelMacros | null;
  model?: string;
  latency_ms?: number;
  reviewState: FuelEstimateReviewState;
  advisory: true;
  fromWeight?: boolean;
};

export type FuelEstimateErrorBody = {
  error:
    | "disabled"
    | "unreadable"
    | "quota"
    | "provider_down"
    | "schema"
    | "no_food"
    | "screen_food"
    | "model_unavailable";
  message: string;
  retry_after?: number;
};

export class FuelEstimateRequestError extends Error {
  readonly status: number;
  readonly body: FuelEstimateErrorBody;

  constructor(status: number, body: FuelEstimateErrorBody) {
    super(body.message || "Estimate failed");
    this.name = "FuelEstimateRequestError";
    this.status = status;
    this.body = body;
  }
}

function localParts(): { localDate: string; localTime: string; tz: string } {
  const now = new Date();
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
    localDate: `${get("year")}-${get("month")}-${get("day")}`,
    localTime: `${hour}:${get("minute")}`,
    tz,
  };
}

export async function fetchFuelDashboard(): Promise<FuelDashboardResponse> {
  const { localDate, tz } = localParts();
  const qs = new URLSearchParams({ localDate, tz });
  const res = await fetch(`/api/fuel/dashboard?${qs}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to load");
  return res.json();
}

export async function fetchFuelStatement(): Promise<FuelStatementResponse> {
  const { localDate, tz } = localParts();
  const qs = new URLSearchParams({ localDate, tz });
  const res = await fetch(`/api/fuel/statement?${qs}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to load statement");
  return res.json();
}

export async function logFuelMeal(input: {
  name: string;
  calories: number;
  mealSlotIndex?: number | null;
}): Promise<FuelMealRow> {
  const { localDate, localTime, tz } = localParts();
  const res = await fetch("/api/fuel/meals", {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      calories: input.calories,
      mealSlotIndex: input.mealSlotIndex,
      clientLocalDate: localDate,
      clientLocalTime: localTime,
      clientTimeZone: tz,
    }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to log meal");
  return res.json();
}

export async function logFuelMealBatch(input: {
  mealGroupId: string;
  mealTitle: string;
  mealSlotIndex: number | null;
  items: Array<{
    name: string;
    calories: number;
    weightG?: number | null;
    captureMethod: FuelCaptureMethod;
    confidence?: number | null;
    macros?: FuelMacros | null;
    eatenLocalTime?: string | null;
  }>;
}): Promise<{ mealGroupId: string; mealTitle: string; items: FuelMealRow[]; totalCalories: number }> {
  const { localDate, localTime, tz } = localParts();
  const res = await fetch("/api/fuel/meals/batch", {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      clientLocalDate: localDate,
      clientLocalTime: localTime,
      clientTimeZone: tz,
    }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to log meal");
  return res.json();
}

export async function appendFuelMealItem(
  groupId: string,
  input: {
    name: string;
    calories: number;
    weightG?: number | null;
    captureMethod: FuelCaptureMethod;
    confidence?: number | null;
    macros?: FuelMacros | null;
    eatenLocalTime?: string | null;
  },
): Promise<FuelMealRow> {
  const { localDate, localTime, tz } = localParts();
  const res = await fetch(`/api/fuel/meals/group/${encodeURIComponent(groupId)}/items`, {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      clientLocalDate: localDate,
      clientLocalTime: localTime,
      clientTimeZone: tz,
    }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to add item");
  return res.json();
}

export async function fetchFuelMealNameSuggestions(
  q: string,
): Promise<Array<{ name: string; source: "personal" | "catalog" }>> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/fuel/meal-name-suggestions?q=${encodeURIComponent(q.trim())}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    suggestions?: Array<string | { name: string; source?: string }>;
  };
  return (data.suggestions ?? []).map((s) => {
    if (typeof s === "string") return { name: s, source: "personal" as const };
    return {
      name: s.name,
      source: s.source === "catalog" ? ("catalog" as const) : ("personal" as const),
    };
  });
}

export async function deleteFuelMeal(id: string): Promise<void> {
  const res = await fetch(`/api/fuel/meals/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to delete");
}

export async function deleteFuelMealGroup(groupId: string): Promise<void> {
  const res = await fetch(`/api/fuel/meals/group/${encodeURIComponent(groupId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to delete meal");
}

export async function estimateFuelMeal(
  file: File,
  opts?: { signal?: AbortSignal },
): Promise<FuelEstimateResponse> {
  const form = new FormData();
  form.append("photo", file);
  const res = await fetch("/api/fuel/estimate", {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: form,
    signal: opts?.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FuelEstimateRequestError(res.status, {
      error: (data as FuelEstimateErrorBody).error ?? "provider_down",
      message: (data as FuelEstimateErrorBody).message || "Estimate failed",
      retry_after: (data as FuelEstimateErrorBody).retry_after,
    });
  }
  return data as FuelEstimateResponse;
}

export async function estimateFuelMealFromWeight(
  input: { name: string; weightGrams: number },
  opts?: { signal?: AbortSignal },
): Promise<FuelEstimateResponse> {
  const res = await fetch("/api/fuel/estimate", {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      weightGrams: input.weightGrams,
    }),
    signal: opts?.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FuelEstimateRequestError(res.status, {
      error: (data as FuelEstimateErrorBody).error ?? "provider_down",
      message: (data as FuelEstimateErrorBody).message || "Estimate failed",
      retry_after: (data as FuelEstimateErrorBody).retry_after,
    });
  }
  return data as FuelEstimateResponse;
}

/** Group meal rows for Today / Statement (legacy rows without group id = solo group). */
export function groupFuelMeals<T extends FuelMealRow>(meals: T[]): Array<{
  groupKey: string;
  mealGroupId: string | null;
  title: string;
  loggedDate: string;
  mealSlotIndex: number | null;
  totalCalories: number;
  items: T[];
}> {
  const map = new Map<string, T[]>();
  for (const m of meals) {
    const key = m.mealGroupId || m.id;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return [...map.entries()].map(([groupKey, items]) => {
    const first = items[0];
    const title =
      first.mealTitle?.trim() ||
      (items.length > 1 ? first.name : first.name);
    return {
      groupKey,
      mealGroupId: first.mealGroupId,
      title,
      loggedDate: first.loggedDate,
      mealSlotIndex: first.mealSlotIndex,
      totalCalories: items.reduce((s, i) => s + i.calories, 0),
      items,
    };
  });
}
