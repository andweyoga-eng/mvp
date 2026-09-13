import type { ConsentLanguage } from "@shared/consent";

export function detectConsentLanguage(): ConsentLanguage {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("kn")) {
    return "kn";
  }
  return "en";
}
