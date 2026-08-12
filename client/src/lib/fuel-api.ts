import { getAuthHeaders } from "@/lib/auth";

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

export type FuelDashboardResponse =
  | ({
      gate: "health_consent_required";
      healthConsented: false;
      configured: false;
      today: string;
    } & FuelDailyContent)
  | ({
      gate: "not_configured";
      healthConsented: true;
      configured: false;
      today: string;
      message: string;
    } & FuelDailyContent)
  | ({
      gate: "ok";
      healthConsented: true;
      configured: true;
      today: string;
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
    } & FuelDailyContent);

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

export async function estimateFuelMeal(file: File): Promise<{
  name: string;
  calories: number;
  advisory: true;
  label: string;
  fallback?: boolean;
}> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const imageBase64 = `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
  const res = await fetch("/api/fuel/estimate", {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType: file.type || "image/jpeg" }),
  });
  return parseJson(res);
}
