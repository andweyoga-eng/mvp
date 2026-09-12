/**
 * Swappable calorie estimation provider (SPEC-FUEL v3 / Gemini handoff).
 * Photos transit only — never persisted by callers.
 */

import {
  clampFuelMealName,
  FUEL_ESTIMATE_TIMEOUT_MS,
  fuelEstimateReviewState,
  roundFuelCalories,
  type FuelEstimateReviewState,
} from "@shared/fuel";

export type FuelEstimateResult = {
  name: string;
  calories: number;
  confidence: number;
  items: string[];
  provider: string;
  model: string;
  latencyMs: number;
  reviewState: FuelEstimateReviewState;
  advisory: true;
};

export type EstimationProvider = {
  id: string;
  estimate(input: { imageBase64: string; mimeType: string }): Promise<FuelEstimateResult>;
};

export class FuelEstimationError extends Error {
  readonly code: "disabled" | "unreadable" | "quota" | "provider_down" | "schema" | "no_food";
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

const GEMINI_PROMPT = `Look at this photo. First decide whether it clearly shows food or a drink meant to be eaten or drunk. If it does not (empty plate, packaging only, people, scenery, blur with no dish, etc.), set is_food_detected to false, dish_name to "", total_calories_kcal to 0, confidence to 0, and items to []. If it does show food, set is_food_detected to true and estimate total calories for the portion shown. Assume Indian home-cooked portions unless the dish is clearly otherwise. Name the dish the way a person would say it, in under six words. Return confidence between 0 and 1: use below 0.6 when the portion size, oil content, or the dish itself is genuinely unclear. Do not refuse, and do not return a range; return one integer for calories when food is present.`;

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["is_food_detected", "dish_name", "total_calories_kcal", "confidence"],
  properties: {
    is_food_detected: { type: "boolean" },
    dish_name: { type: "string" },
    items: { type: "array", items: { type: "string" } },
    total_calories_kcal: { type: "integer" },
    confidence: { type: "number" },
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
  return process.env.GEMINI_FUEL_MODEL?.trim() || "gemini-2.0-flash";
}

export function getGeminiHost(): string {
  return process.env.GEMINI_HOST?.trim() || "https://generativelanguage.googleapis.com";
}

function stripDataUrl(imageBase64: string): { mime: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(imageBase64);
  if (match) return { mime: match[1], data: match[2] };
  return { mime: "image/jpeg", data: imageBase64 };
}

function parseProviderJson(text: string): {
  is_food_detected?: unknown;
  dish_name?: unknown;
  total_calories_kcal?: unknown;
  confidence?: unknown;
  items?: unknown;
} {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as ReturnType<typeof parseProviderJson>;
}

function normalizeProviderPayload(raw: ReturnType<typeof parseProviderJson>): {
  name: string;
  calories: number;
  confidence: number;
  items: string[];
} {
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
  };
}

export const geminiEstimationProvider: EstimationProvider = {
  id: "gemini",
  async estimate({ imageBase64, mimeType }) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new FuelEstimationError("Photo estimation is disabled.", "disabled", 501);
    }

    const model = getFuelEstimationModel();
    const host = getGeminiHost().replace(/\/$/, "");
    const url = `${host}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const { mime, data } = stripDataUrl(imageBase64);
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
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType || mime, data } },
                { text: GEMINI_PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
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
      if (res.status >= 500) {
        throw new FuelEstimationError(
          "Photo estimation is temporarily unavailable.",
          "provider_down",
          503,
        );
      }
      throw new FuelEstimationError(
        body.slice(0, 120) || "Could not read this photo.",
        "unreadable",
        422,
      );
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      throw new FuelEstimationError("Could not read this photo.", "unreadable", 422);
    }

    let parsed: ReturnType<typeof parseProviderJson>;
    try {
      parsed = parseProviderJson(text);
    } catch {
      throw new FuelEstimationError("Could not read this photo.", "unreadable", 422);
    }

    const normalized = normalizeProviderPayload(parsed);
    const reviewState = fuelEstimateReviewState(normalized.confidence);

    return {
      name: reviewState === "failure" ? "" : normalized.name,
      calories: reviewState === "failure" ? 0 : normalized.calories,
      confidence: normalized.confidence,
      items: normalized.items,
      provider: "gemini",
      model,
      latencyMs,
      reviewState,
      advisory: true,
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
