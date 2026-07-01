import { useEffect, useState, type ReactNode } from "react";
import { detectConsentLanguage } from "@/lib/consent-language";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchMyConsentStatus,
  submitAuthenticatedConsent,
  type ConsentStatusResponse,
} from "@/lib/consent-api";
import { OnboardingConsentPanel } from "@/components/onboarding-consent-modal";
import { LEGAL_CONFIG } from "@shared/legal-config";
import { MY_ACCOUNT_PROFILE_URL } from "@/lib/member-landing";
import { useToast } from "@/hooks/use-toast";

const DEFER_LOGIN_TOAST_KEY = "awy_defer_login_toast";
const OAUTH_NEW_USER_KEY = "awy_oauth_new_user";

function clearDeferredLoginToast(): void {
  sessionStorage.removeItem(DEFER_LOGIN_TOAST_KEY);
  sessionStorage.removeItem(OAUTH_NEW_USER_KEY);
}

function showDeferredLoginToastIfNeeded(toast: ReturnType<typeof useToast>["toast"]): void {
  if (!sessionStorage.getItem(DEFER_LOGIN_TOAST_KEY)) return;
  sessionStorage.removeItem(DEFER_LOGIN_TOAST_KEY);
  sessionStorage.removeItem(OAUTH_NEW_USER_KEY);
  toast({
    title: "Login successful!",
    description: "Welcome to andWeYoga!",
  });
}

const PUBLIC_PATHS = new Set(["/", "/privacy", "/terms", "/grievance", "/reset-password"]);

function memberPathRequiresConsent(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return !path.startsWith("/admin") && !PUBLIC_PATHS.has(path);
}

function ConsentBlockingScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white overflow-y-auto">
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}

export function PostAuthConsentGate({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [consentStatus, setConsentStatus] = useState<ConsentStatusResponse | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [step, setStep] = useState<"consent" | "minor">("consent");

  const isMemberProtectedRoute = memberPathRequiresConsent(location);

  const shouldFetchConsent =
    !!user && !authLoading && isMemberProtectedRoute;

  useEffect(() => {
    if (!shouldFetchConsent) {
      setConsentStatus(null);
      return;
    }
    setConsentLoading(true);
    fetchMyConsentStatus()
      .then((data) => setConsentStatus(data))
      .finally(() => setConsentLoading(false));
  }, [shouldFetchConsent, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("newUser") === "true") {
      sessionStorage.setItem(OAUTH_NEW_USER_KEY, "1");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const requirement = consentStatus?.requirement;
  const needsConsent = Boolean(shouldFetchConsent && requirement?.requiresConsent);

  const awaitingAuthOnProtectedRoute = isMemberProtectedRoute && authLoading;
  const awaitingConsentStatus =
    shouldFetchConsent && (consentLoading || !consentStatus);

  const blockRouteTree =
    awaitingAuthOnProtectedRoute || awaitingConsentStatus || needsConsent;

  if (!blockRouteTree) {
    return <>{children}</>;
  }

  if (awaitingAuthOnProtectedRoute || awaitingConsentStatus) {
    return (
      <ConsentBlockingScreen>
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </ConsentBlockingScreen>
    );
  }

  if (!requirement) {
    return (
      <ConsentBlockingScreen>
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </ConsentBlockingScreen>
    );
  }

  const initialLanguage = detectConsentLanguage();

  return (
    <ConsentBlockingScreen>
      <div className="w-full rounded-3xl border border-dz-glass-border bg-dz-surface p-8 shadow-2xl">
        <OnboardingConsentPanel
          step={step}
          onStepChange={setStep}
          onBack={() => {
            if (requirement.flow === "first_time") return;
            setStep("consent");
          }}
          onCancel={async () => {
            clearDeferredLoginToast();
            await logout();
            setLocation("/");
          }}
          onConsentComplete={async (payload) => {
            const result = await submitAuthenticatedConsent({
              ...payload,
              consentVersion: LEGAL_CONFIG.documentVersion,
            });
            if (result.ok) {
              await refreshUser();
              const nextStatus = await fetchMyConsentStatus();
              setConsentStatus(nextStatus);
              const isNewUser =
                sessionStorage.getItem(OAUTH_NEW_USER_KEY) === "1" ||
                requirement.flow === "first_time";
              if (isNewUser) {
                sessionStorage.removeItem(OAUTH_NEW_USER_KEY);
                setLocation(MY_ACCOUNT_PROFILE_URL);
              }
              showDeferredLoginToastIfNeeded(toast);
            }
            return result;
          }}
          mode={requirement.flow === "reconsent" ? "reconsent" : "first_time"}
          requiredTypes={requirement.requiredTypes}
          requireDateOfBirth={requirement.requireDateOfBirth}
          initialLanguage={initialLanguage}
        />
      </div>
    </ConsentBlockingScreen>
  );
}
