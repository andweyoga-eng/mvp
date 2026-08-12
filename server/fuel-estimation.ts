/**
 * Swappable calorie estimation provider (SPEC-FUEL-01 §4.3).
 * Photos transit only — never persisted by callers.
 *
 * Dev: Gemini free tier when GEMINI_API_KEY is set and FUEL_ESTIMATION_ENABLED=true.
 * Otherwise (and for real members until no-train/DPA): manual-entry fallback.
 */

export type FuelEstimateResult = {
  name: string;
  calories: number;
  confidence?: number;
  provider: string;
  advisory: true;
};

export type EstimationProvider = {
  id: string;
  estimate(input: {
    imageBase64: string;
    mimeType?: string;
  }): Promise<FuelEstimateResult>;
};

function stripDataUrl(imageBase64: string): { mime: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(imageBase64);
  if (match) return { mime: match[1], data: match[2] };
  return { mime: "image/jpeg", data: imageBase64 };
}

/** Always-available fallback: no model call. */
export const manualEstimationProvider: EstimationProvider = {
  id: "manual",
  async estimate() {
    return {
      name: "",
      calories: 0,
      provider: "manual",
      advisory: true,
    };
  },
};

export const geminiEstimationProvider: EstimationProvider = {
  id: "gemini",
  async estimate({ imageBase64, mimeType }) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const { mime, data } = stripDataUrl(imageBase64);
    const model = process.env.GEMINI_FUEL_MODEL?.trim() || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const prompt =
      'Estimate the meal in this photo. Reply with ONLY compact JSON: {"name":"short meal name","calories":number}. Calories are a rough estimate for an adult portion. No markdown.';

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || mime, data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 128 },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini estimate failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { name?: unknown; calories?: unknown };
    const name = typeof parsed.name === "string" ? parsed.name.trim().slice(0, 200) : "Meal";
    const calories = Math.max(
      0,
      Math.min(20000, Math.round(Number(parsed.calories) || 0)),
    );
    return { name: name || "Meal", calories, provider: "gemini", advisory: true };
  },
};

export function resolveEstimationProvider(): EstimationProvider {
  const enabled = process.env.FUEL_ESTIMATION_ENABLED === "true";
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  if (enabled && hasKey) return geminiEstimationProvider;
  return manualEstimationProvider;
}

export async function estimateMealCalories(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<FuelEstimateResult & { fallback?: boolean; error?: string }> {
  const provider = resolveEstimationProvider();
  if (provider.id === "manual") {
    return { ...await provider.estimate(input), fallback: true };
  }
  try {
    return await provider.estimate(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Estimation failed";
    console.warn("[fuel] estimation fallback to manual:", message);
    return {
      name: "",
      calories: 0,
      provider: "manual",
      advisory: true,
      fallback: true,
      error: message,
    };
  }
}
