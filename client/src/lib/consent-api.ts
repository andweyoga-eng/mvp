import { getAuthHeaders } from "@/lib/auth";
import type { ConsentCategoryStatus, ConsentRequirement } from "@shared/consent";

export type ConsentStatusResponse = {
  categories: ConsentCategoryStatus[];
  consentVersion: string;
  hasDateOfBirth: boolean;
  requirement: ConsentRequirement;
  pendingErasure: { id: string; scheduledErasureAt: string } | null;
};

export async function submitOnboardingConsent(body: {
  dateOfBirth: string;
  consentProfile: true;
  consentTerms: true;
  consentAge: true;
  consentVersion?: string;
}): Promise<{ ok: boolean; code?: string }> {
  const res = await fetch("/api/auth/onboarding-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, code: data.code ?? "underage" };
  }
  if (!res.ok) throw new Error("Failed to submit consent");
  return { ok: true };
}

export async function submitAuthenticatedConsent(body: {
  dateOfBirth?: string;
  consentProfile?: boolean;
  consentTerms?: boolean;
  consentAge?: boolean;
  consentVersion?: string;
}): Promise<{ ok: boolean; code?: string; message?: string }> {
  const res = await fetch("/api/users/me/consent/complete", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, code: data.code ?? "underage" };
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      message: typeof data.message === "string" ? data.message : "Failed to submit consent",
    };
  }
  return { ok: true };
}

export async function fetchMyConsentStatus(): Promise<ConsentStatusResponse> {
  const res = await fetch("/api/users/me/consent", {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load consent status");
  return res.json();
}

export async function withdrawHealthDataConsent(): Promise<void> {
  const res = await fetch("/api/users/me/consent/health-data/withdraw", {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to withdraw health consent");
}

export async function requestAccountErasure(): Promise<{
  scheduledErasureAt: string;
}> {
  const res = await fetch("/api/users/me/erase", {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "ERASE", acknowledged: true }),
  });
  if (!res.ok) throw new Error("Failed to request erasure");
  return res.json();
}

export async function fetchLegalConfig() {
  const res = await fetch("/api/legal/config");
  if (!res.ok) throw new Error("Failed to load legal config");
  return res.json();
}
