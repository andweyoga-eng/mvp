import {
  buildEmailShareUrl,
  buildSmsShareUrl,
  buildWhatsAppShareUrl,
  buildClassTypeSharePayload,
} from "@shared/session-share";
import { useToast } from "@/hooks/use-toast";

export type SessionSharePayload = ReturnType<typeof buildClassTypeSharePayload>;

export function getShareBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return "";
}

export async function shareSessionPayload(payload: SessionSharePayload): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }
    }
  }
  return false;
}

export function openWhatsAppShare(payload: SessionSharePayload): void {
  window.open(buildWhatsAppShareUrl(`${payload.text}`), "_blank", "noopener,noreferrer");
}

export function openSmsShare(payload: SessionSharePayload): void {
  window.location.href = buildSmsShareUrl(payload.text);
}

export function openEmailShare(payload: SessionSharePayload): void {
  window.location.href = buildEmailShareUrl(payload.title, payload.text);
}

export async function copyShareText(
  payload: SessionSharePayload,
  toast: ReturnType<typeof useToast>["toast"],
): Promise<void> {
  try {
    await navigator.clipboard.writeText(payload.text);
    toast({ title: "Copied", description: "Share message copied to clipboard." });
  } catch {
    toast({
      title: "Copy failed",
      description: "Could not copy to clipboard.",
      variant: "destructive",
    });
  }
}
