/**
 * Swappable calorie estimation provider (SPEC-FUEL / SPEC-WEDIET-TRACK-DIET-V2).
 * Photos transit only — never persisted by callers.
 * Supports photo → name+kcal+macros and weight-only name+weightGrams → kcal+macros.
 */

import {
  clampFuelMealName,
  FUEL_ESTIMATE_SCREEN_FOOD_COPY,
  FUEL_ESTIMATE_TIMEOUT_MS,
  fuelEstimateReviewState,
  roundFuelCalories,
  type FuelEstimateReviewState,
  type FuelMacros,
} from "@shared/fuel";

export type FuelEstimateResult = {
  name: string;
  calories: number;
  confidence: number;
  items: string[];
  macros: FuelMacros | null;
  provider: string;
  model: string;
  latencyMs: number;
  reviewState: FuelEstimateReviewState;
  advisory: true;
  fromWeight?: boolean;
};

export type EstimationProvider = {
  id: string;
  estimate(input: { imageBase64: string; mimeType: string }): Promise<FuelEstimateResult>;
  estimateFromWeight(input: { name: string; weightGrams: number }): Promise<FuelEstimateResult>;
};

export class FuelEstimationError extends Error {
  readonly code:
    | "disabled"
    | "unreadable"
    | "quota"
    | "provider_down"
    | "schema"
    | "no_food"
    | "screen_food"
    | "model_unavailable";
  readonly status: 501 | 422 | 429 | 503;
  readonly retryAfter?: number;

  constructor(
    message: string,
    code: FuelEstimationError["code"],
    status: FuelEstimationError["status"],
    retryAfter?: number,
  ) {
    super(message);
    this.name = "FuelEstimationError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const GEMINI_PROMPT = `Look at this photo carefully.

Step 1: screen or secondary photo check:
If the image shows food or a drink displayed on a phone, tablet, laptop, TV, monitor, or other screen (device bezel, status bar, UI chrome, glare, moiré, pixel grid, someone holding a phone toward the camera, a photo of a photo, etc.), set is_screen_or_secondary_photo to true, is_food_detected to false, dish_name to "", total_calories_kcal to 0, confidence to 0, items to [], and macros protein/carbs/fat/fiber all to 0. Do not estimate calories for screen or secondary photos.

Step 2: real food check:
Otherwise set is_screen_or_secondary_photo to false. If the photo does not clearly show real food or a drink meant to be eaten or drunk right now (empty plate, packaging only, people, scenery, blur with no dish, etc.), set is_food_detected to false, dish_name to "", total_calories_kcal to 0, confidence to 0, items to [], and macros all to 0.

Step 3: estimate:
If it clearly shows real food or drink in front of the camera (not on a screen), set is_food_detected to true and estimate total calories for the portion shown plus approximate macros in grams (protein, carbs, fat, fiber). Assume Indian home-cooked portions unless the dish is clearly otherwise. Name the dish the way a person would say it, in under six words. Return confidence between 0 and 1: use below 0.6 when the portion size, oil content, or the dish itself is genuinely unclear. Do not refuse, and do not return a range; return one integer for calories when food is present.`;

const GEMINI_WEIGHT_PROMPT = `You are estimating nutrition for a named food by weight only (no photo). Given the food name and weight in grams, estimate total calories (kcal) for that portion and macros in grams (protein, carbs, fat, fiber). Assume typical Indian home-cooked density unless the name clearly indicates otherwise. Return confidence between 0 and 1. Do not refuse; return one integer for calories.`;

const MACROS_SCHEMA = {
  type: "object",
  required: ["protein", "carbs", "fat", "fiber"],
  properties: {
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
    fiber: { type: "number" },
  },
};

const RESPONSE_SCHEMA = {
  type: "object",
  required: [
    "is_screen_or_secondary_photo",
    "is_food_detected",
    "dish_name",
    "total_calories_kcal",
    "confidence",
    "macros",
  ],
  properties: {
    is_screen_or_secondary_photo: { type: "boolean" },
    is_food_detected: { type: "boolean" },
    dish_name: { type: "string" },
    items: { type: "array", items: { type: "string" } },
    total_calories_kcal: { type: "integer" },
    confidence: { type: "number" },
    macros: MACROS_SCHEMA,
  },
};

const WEIGHT_RESPONSE_SCHEMA = {
  type: "object",
  required: ["total_calories_kcal", "confidence", "macros"],
  properties: {
    total_calories_kcal: { type: "integer" },
    confidence: { type: "number" },
    macros: MACROS_SCHEMA,
  },
};

export function isFuelEstimationEnabled(): boolean {
  return (
    process.env.FUEL_ESTIMATION_ENABLED === "true" &&
    Boolean(process.env.GEMINI_API_KEY?.trim())
  );
}

export function isFuelEstimationFlagOn(): boolean {
  return process.env.FUEL_ESTIMATION_ENABLED === "true";
}

export function getFuelEstimationModel(): string {
  return process.env.GEMINI_FUEL_MODEL?.trim() || "gemini-3.1-flash-lite";
}

/** Optional secondary model. Empty = no automatic fallback (avoids dead hardcoded models). */
export function getFuelEstimationFallbackModel(): string | null {
  const v = process.env.GEMINI_FUEL_FALLBACK_MODEL?.trim();
  return v || null;
}

function isModelUnavailableResponse(status: number, body: string): boolean {
  if (status === 404) return true;
  return /no longer available|not found|is not supported|UNKNOWN_MODEL|model .* unavailable/i.test(
    body,
  );
}

const MODEL_UNAVAILABLE_LOG = "Estimate model unavailable. Check GEMINI_FUEL_MODEL / fallback.";
const MODEL_UNAVAILABLE_MEMBER =
  "Estimate isn’t available right now. No stress. Enter name and weight. If this keeps happening, ask your studio to check estimate setup.";

export function getGeminiHost(): string {
  return process.env.GEMINI_HOST?.trim() || "https://generativelanguage.googleapis.com";
}

function stripDataUrl(imageBase64: string): { mime: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(imageBase64);
  if (match) return { mime: match[1], data: match[2] };
  return { mime: "image/jpeg", data: imageBase64 };
}

function parseProviderJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function parseMacros(raw: unknown): FuelMacros | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const protein = Number(m.protein);
  const carbs = Number(m.carbs);
  const fat = Number(m.fat);
  const fiber = Number(m.fiber);
  if (![protein, carbs, fat, fiber].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return {
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
  };
}

function normalizePhotoPayload(raw: Record<string, unknown>): {
  name: string;
  calories: number;
  confidence: number;
  items: string[];
  macros: FuelMacros | null;
} {
  if (raw.is_screen_or_secondary_photo === true) {
    throw new FuelEstimationError(FUEL_ESTIMATE_SCREEN_FOOD_COPY, "screen_food", 422);
  }

  if (raw.is_food_detected === false) {
    throw new FuelEstimationError(
      "No food detected in this photo. Retake a clearer shot of your meal.",
      "no_food",
      422,
    );
  }

  const rawKcal = Number(raw.total_calories_kcal);
  if (!Number.isFinite(rawKcal) || rawKcal < 1 || rawKcal > 8000) {
    throw new FuelEstimationError(
      "Could not read calories from this photo.",
      "schema",
      422,
    );
  }
  const confidence = Number(raw.confidence);
  const name =
    typeof raw.dish_name === "string" ? clampFuelMealName(raw.dish_name) : "";
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  return {
    name: name || "Meal",
    calories: roundFuelCalories(rawKcal),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    items,
    macros: parseMacros(raw.macros),
  };
}

function normalizeWeightPayload(
  raw: Record<string, unknown>,
  fallbackName: string,
): {
  name: string;
  calories: number;
  confidence: number;
  macros: FuelMacros | null;
} {
  const rawKcal = Number(raw.total_calories_kcal);
  if (!Number.isFinite(rawKcal) || rawKcal < 1 || rawKcal > 8000) {
    throw new FuelEstimationError(
      "Couldn't estimate from weight. Enter calories by hand.",
      "schema",
      422,
    );
  }
  const confidence = Number(raw.confidence);
  return {
    name: clampFuelMealName(fallbackName) || "Meal",
    calories: roundFuelCalories(rawKcal),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    macros: parseMacros(raw.macros),
  };
}

async function callGeminiGenerate(opts: {
  model: string;
  parts: Array<Record<string, unknown>>;
  responseSchema: Record<string, unknown>;
}): Promise<{ text: string; latencyMs: number; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }

  const host = getGeminiHost().replace(/\/$/, "");
  const url = `${host}/v1beta/models/${opts.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const started = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FUEL_ESTIMATE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: opts.parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
          responseSchema: opts.responseSchema,
        },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FuelEstimationError(
        "Photo estimation timed out. Try again or enter manually.",
        "provider_down",
        503,
      );
    }
    throw new FuelEstimationError(
      "Photo estimation is temporarily unavailable.",
      "provider_down",
      503,
    );
  } finally {
    clearTimeout(timer);
  }

  const latencyMs = Date.now() - started;

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || 12;
    throw new FuelEstimationError(
      "Photo estimation is busy. Try again shortly.",
      "quota",
      429,
      retryAfter,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isModelUnavailableResponse(res.status, body)) {
      console.warn(`[fuel-estimate] model unavailable: ${opts.model} (HTTP ${res.status})`);
      throw new FuelEstimationError(MODEL_UNAVAILABLE_MEMBER, "model_unavailable", 503);
    }
    const err = new FuelEstimationError(
      res.status >= 500
        ? "Photo estimation is temporarily unavailable."
        : "Could not read this photo.",
      res.status >= 500 ? "provider_down" : "unreadable",
      res.status >= 500 ? 503 : 422,
    );
    (err as FuelEstimationError & { httpStatus?: number }).httpStatus = res.status;
    throw err;
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new FuelEstimationError("Could not read this photo.", "unreadable", 422);
  }
  return { text, latencyMs, model: opts.model };
}

async function callGeminiWithFallback(opts: {
  parts: Array<Record<string, unknown>>;
  responseSchema: Record<string, unknown>;
}): Promise<{ text: string; latencyMs: number; model: string }> {
  const primary = getFuelEstimationModel();
  const fallback = getFuelEstimationFallbackModel();
  try {
    return await callGeminiGenerate({ ...opts, model: primary });
  } catch (err) {
    if (!(err instanceof FuelEstimationError)) throw err;
    if (err.code === "disabled" || err.code === "quota" || err.code === "no_food" || err.code === "screen_food")
      throw err;
    if (!fallback || fallback === primary) {
      if (err.code === "model_unavailable") {
        console.error(`[fuel-estimate] ${MODEL_UNAVAILABLE_LOG} primary=${primary}`);
      }
      throw err;
    }
    try {
      return await callGeminiGenerate({ ...opts, model: fallback });
    } catch (err2) {
      if (err2 instanceof FuelEstimationError && err2.code === "model_unavailable") {
        console.error(
          `[fuel-estimate] ${MODEL_UNAVAILABLE_LOG} primary=${primary} fallback=${fallback}`,
        );
        throw new FuelEstimationError(MODEL_UNAVAILABLE_MEMBER, "model_unavailable", 503);
      }
      throw err2;
    }
  }
}

export const geminiEstimationProvider: EstimationProvider = {
  id: "gemini",
  async estimate({ imageBase64, mimeType }) {
    const { mime, data } = stripDataUrl(imageBase64);
    const { text, latencyMs, model } = await callGeminiWithFallback({
      parts: [
        { inline_data: { mime_type: mimeType || mime, data } },
        { text: GEMINI_PROMPT },
      ],
      responseSchema: RESPONSE_SCHEMA,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = parseProviderJson(text);
    } catch {
      throw new FuelEstimationError("Could not read this photo.", "unreadable", 422);
    }

    const normalized = normalizePhotoPayload(parsed);
    const reviewState = fuelEstimateReviewState(normalized.confidence);

    return {
      name: reviewState === "failure" ? "" : normalized.name,
      calories: reviewState === "failure" ? 0 : normalized.calories,
      confidence: normalized.confidence,
      items: normalized.items,
      macros: reviewState === "failure" ? null : normalized.macros,
      provider: "gemini",
      model,
      latencyMs,
      reviewState,
      advisory: true,
    };
  },

  async estimateFromWeight({ name, weightGrams }) {
    const foodName = clampFuelMealName(name);
    const { text, latencyMs, model } = await callGeminiWithFallback({
      parts: [
        {
          text: `${GEMINI_WEIGHT_PROMPT}\n\nFood name: ${foodName}\nWeight: ${weightGrams} g`,
        },
      ],
      responseSchema: WEIGHT_RESPONSE_SCHEMA,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = parseProviderJson(text);
    } catch {
      throw new FuelEstimationError(
        "Couldn't estimate from weight. Enter calories by hand.",
        "unreadable",
        422,
      );
    }

    const normalized = normalizeWeightPayload(parsed, foodName);
    const reviewState = fuelEstimateReviewState(normalized.confidence);

    return {
      name: foodName,
      calories: reviewState === "failure" ? 0 : normalized.calories,
      confidence: normalized.confidence,
      items: [],
      macros: reviewState === "failure" ? null : normalized.macros,
      provider: "gemini",
      model,
      latencyMs,
      reviewState,
      advisory: true,
      fromWeight: true,
    };
  },
};

export function resolveEstimationProvider(): EstimationProvider | null {
  if (!isFuelEstimationEnabled()) return null;
  return geminiEstimationProvider;
}

export async function estimateMealCalories(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<FuelEstimateResult> {
  if (!isFuelEstimationFlagOn()) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }

  const provider = resolveEstimationProvider();
  if (!provider) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }

  const imageBase64 = input.buffer.toString("base64");
  return provider.estimate({ imageBase64, mimeType: input.mimeType });
}

export async function estimateMealFromWeight(input: {
  name: string;
  weightGrams: number;
}): Promise<FuelEstimateResult> {
  if (!isFuelEstimationFlagOn()) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }
  const provider = resolveEstimationProvider();
  if (!provider) {
    throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
  }
  return provider.estimateFromWeight(input);
}

/** Magic-byte sniff for allowed image types. */
export function sniffImageMime(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
