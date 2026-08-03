import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { User, Gavel, Cake, HeartPulse, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyConsentStatus,
  requestAccountErasure,
  submitAuthenticatedConsent,
  withdrawHealthDataConsent,
  type ConsentStatusResponse,
} from "@/lib/consent-api";
import { useAuth } from "@/lib/auth";
import {
  CONSENT_COPY,
  PRIVACY_UI_COPY,
  type ConsentLanguage,
  type ConsentType,
} from "@shared/consent";
import { LEGAL_CONFIG } from "@shared/legal-config";
import { detectConsentLanguage } from "@/lib/consent-language";
import { OnboardingConsentPanel, type ConsentPanelStep } from "@/components/onboarding-consent-modal";

const CATEGORY_ICONS: Record<ConsentType, typeof User> = {
  profile_booking: User,
  terms: Gavel,
  age_declaration: Cake,
  health_data: HeartPulse,
  whatsapp_contact: MessageCircle,
  cancellation_refund: Gavel,
};

/** DPDP account privacy UI — excludes checkout Cancellation Policy clickwrap. */
const PRIVACY_SECTION_TYPES: ConsentType[] = [
  "profile_booking",
  "terms",
  "age_declaration",
  "health_data",
  "whatsapp_contact",
];

function StatusBadge({
  status,
  labels,
}: {
  status: "active" | "withdrawn" | "not_given";
  labels: (typeof PRIVACY_UI_COPY)[ConsentLanguage]["status"];
}) {
  const styles = {
    active: "bg-emerald-100 text-emerald-800",
    withdrawn: "bg-primary/10 text-primary/70",
    not_given: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[status])}>
      {labels[status]}
    </span>
  );
}

export type PrivacyConsentSectionProps = {
  hideTitle?: boolean;
  onHealthWithdrawn?: () => void;
  /** When true, show the DPDPA onboarding form instead of read-only status. */
  onboardingActive?: boolean;
  profileDateOfBirth?: string;
  needsHealthConsent?: boolean;
  healthConsentChecked?: boolean;
  onHealthConsentCheckedChange?: (checked: boolean) => void;
  marketingOptIn?: boolean;
  onMarketingOptInChange?: (checked: boolean) => void;
  onOnboardingComplete?: () => void | Promise<void>;
};

export function PrivacyConsentSection({
  hideTitle = false,
  onHealthWithdrawn,
  onboardingActive = false,
  profileDateOfBirth = "",
  needsHealthConsent = false,
  healthConsentChecked = false,
  onHealthConsentCheckedChange,
  marketingOptIn = false,
  onMarketingOptInChange,
  onOnboardingComplete,
}: PrivacyConsentSectionProps = {}) {
  const { toast } = useToast();
  const { logout, refreshUser } = useAuth();
  const [lang, setLang] = useState<ConsentLanguage>(detectConsentLanguage);
  const ui = PRIVACY_UI_COPY[lang];
  const consentCopy = CONSENT_COPY[lang];
  const [data, setData] = useState<ConsentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawingHealth, setWithdrawingHealth] = useState(false);
  const [erasureOpen, setErasureOpen] = useState(false);
  const [erasureConfirm, setErasureConfirm] = useState("");
  const [erasureAck, setErasureAck] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [erasureDone, setErasureDone] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [consentStep, setConsentStep] = useState<ConsentPanelStep>("consent");

  const reload = () => {
    setLoading(true);
    fetchMyConsentStatus()
      .then(setData)
      .catch(() => toast({ title: ui.loadError, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const requirement = data?.requirement;
  const showOnboardingForm = onboardingActive && Boolean(requirement?.requiresConsent);
  const healthCategory = data?.categories.find((c) => c.consentType === "health_data");
  const healthActive = healthCategory?.status === "active";

  const handleWithdrawHealth = async () => {
    setWithdrawingHealth(true);
    try {
      await withdrawHealthDataConsent();
      toast({ title: ui.healthWithdrawn });
      onHealthWithdrawn?.();
      reload();
    } catch {
      toast({ title: ui.healthWithdrawFailed, variant: "destructive" });
    } finally {
      setWithdrawingHealth(false);
    }
  };

  const handleErasure = async () => {
    setErasing(true);
    try {
      const result = await requestAccountErasure();
      setScheduledAt(result.scheduledErasureAt);
      setErasureDone(true);
      await logout();
    } catch {
      toast({ title: ui.erasureFailed, variant: "destructive" });
    } finally {
      setErasing(false);
    }
  };

  const handleOnboardingConsent = async (payload: {
    dateOfBirth?: string;
    consentProfile?: boolean;
    consentTerms?: boolean;
    consentAge?: boolean;
  }) => {
    if (needsHealthConsent && !healthConsentChecked) {
      return {
        ok: false,
        message: "Please accept health data processing before continuing.",
      };
    }
    const policyVersion = data?.consentVersion ?? LEGAL_CONFIG.documentVersion;
    const result = await submitAuthenticatedConsent({
      ...payload,
      consentVersion: policyVersion,
    });
    if (!result.ok) {
      return result;
    }
    await refreshUser();
    const nextStatus = await fetchMyConsentStatus();
    setData(nextStatus);
    if (nextStatus.requirement?.requiresConsent) {
      toast({
        title: "Consent could not be completed",
        description: "Please try again.",
        variant: "destructive",
      });
      return { ok: false };
    }
    await onOnboardingComplete?.();
    return { ok: true };
  };

  if (erasureDone) {
    return (
      <div className="rounded-2xl border border-dz-glass-border bg-white/60 p-8 text-center">
        <h3 className="font-display text-xl font-bold text-primary">{ui.erasureDoneTitle}</h3>
        <p className="mt-2 text-sm text-dz-muted">
          {ui.erasureDoneBody}
          {scheduledAt ? ` (${new Date(scheduledAt).toLocaleDateString()})` : ""}. {ui.erasureDoneEmail}
        </p>
        <Button className="mt-6" onClick={() => (window.location.href = "/")}>
          {ui.returnHome}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="privacy-consent-section">
      {hideTitle ? null : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-primary">{ui.sectionTitle}</h2>
            <p className="text-sm font-medium text-foreground/75">{ui.sectionSubtitle}</p>
          </div>
          <div className="flex rounded-lg border border-dz-glass-border bg-white/80 p-0.5 text-xs font-semibold">
            {(["en", "kn"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  lang === code ? "bg-primary text-white" : "text-dz-muted",
                )}
              >
                {code === "en" ? "EN" : "ಕನ್ನಡ"}
              </button>
            ))}
          </div>
        </div>
      )}

      {hideTitle ? (
        <div className="flex justify-end">
          <div className="flex rounded-lg border border-dz-glass-border bg-white/80 p-0.5 text-xs font-semibold">
            {(["en", "kn"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  lang === code ? "bg-primary text-white" : "text-dz-muted",
                )}
              >
                {code === "en" ? "EN" : "ಕನ್ನಡ"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : showOnboardingForm && requirement ? (
        <div className="space-y-5 rounded-2xl border border-primary/15 bg-primary/[0.02] p-4 sm:p-5">
          <OnboardingConsentPanel
            embedded
            hideLanguageToggle
            language={lang}
            onLanguageChange={setLang}
            step={consentStep}
            onStepChange={setConsentStep}
            onBack={() => setConsentStep("consent")}
            onCancel={() => undefined}
            onConsentComplete={handleOnboardingConsent}
            mode={requirement.flow === "reconsent" ? "reconsent" : "first_time"}
            requiredTypes={requirement.requiredTypes}
            requireDateOfBirth={requirement.requireDateOfBirth && !profileDateOfBirth}
            prefilledDateOfBirth={profileDateOfBirth}
            beforeSubmit={
              <>
                {needsHealthConsent ? (
                  <ConsentCheckbox
                    checked={healthConsentChecked}
                    onChange={(checked) => onHealthConsentCheckedChange?.(checked)}
                    testId="health-consent-checkbox"
                    variant="secondary"
                    className="rounded-xl border-2 border-dz-secondary/50 bg-dz-secondary/10 p-4"
                    label={
                      <span className="flex items-start gap-2 text-sm font-medium leading-relaxed">
                        <span className="mt-0.5 shrink-0" aria-hidden>
                          💚
                        </span>
                        <span>
                          {consentCopy.healthConsent} Uploaded files are stored securely; Google links
                          are opened read-only and we never copy file contents from Drive.
                        </span>
                      </span>
                    }
                  />
                ) : null}

                <div className="rounded-xl border border-dz-glass-border bg-white/60 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Optional
                  </p>
                  <ConsentCheckbox
                    checked={marketingOptIn}
                    onChange={(checked) => onMarketingOptInChange?.(checked)}
                    testId="marketing-consent-checkbox"
                    label={consentCopy.marketingConsent}
                  />
                </div>
              </>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {(data?.categories ?? [])
            .filter((row) => PRIVACY_SECTION_TYPES.includes(row.consentType))
            .map((row) => {
            const Icon = CATEGORY_ICONS[row.consentType];
            return (
              <li
                key={row.consentType}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dz-glass-border bg-white/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-medium">{ui.categories[row.consentType]}</p>
                    {row.lastUpdated ? (
                      <p className="text-xs text-dz-muted">
                        {row.status === "active" ? ui.givenOn : ui.updatedOn}{" "}
                        {new Date(row.lastUpdated).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <StatusBadge status={row.status} labels={ui.status} />
              </li>
            );
          })}
        </ul>
      )}

      {!showOnboardingForm ? (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/privacy" target="_blank">
              {ui.privacyLink}
            </Link>
          </Button>
        </div>
      ) : null}

      {!showOnboardingForm ? (
        <>
          <div className="rounded-xl border-2 border-dz-secondary/40 bg-dz-secondary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{consentCopy.healthBannerTitle}</p>
                <p className="text-xs text-dz-muted">{consentCopy.healthBannerBody}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!healthActive || withdrawingHealth}
                onClick={handleWithdrawHealth}
                data-testid="withdraw-health-consent"
              >
                {withdrawingHealth ? consentCopy.withdrawingHealth : consentCopy.withdrawHealthConsent}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
            <p className="font-medium text-destructive">{ui.erasureSectionTitle}</p>
            <p className="mt-1 text-sm text-dz-muted">{ui.erasureSectionBody}</p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => setErasureOpen(true)}
              data-testid="open-erasure-dialog"
            >
              {ui.erasureButton}
            </Button>
          </div>
        </>
      ) : null}

      <Dialog open={erasureOpen} onOpenChange={setErasureOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{ui.erasureDialogTitle}</DialogTitle>
            <DialogDescription>{ui.erasureDialogBody}</DialogDescription>
          </DialogHeader>
          <Input
            value={erasureConfirm}
            onChange={(e) => setErasureConfirm(e.target.value.toUpperCase())}
            placeholder={ui.erasurePlaceholder}
            data-testid="erasure-confirm-input"
          />
          <ConsentCheckbox
            checked={erasureAck}
            onChange={setErasureAck}
            testId="erasure-ack-checkbox"
            variant="destructive"
            className="border-0 bg-transparent p-0"
            label={ui.erasureAck}
          />
          <Button
            variant="destructive"
            disabled={erasureConfirm !== "ERASE" || !erasureAck || erasing}
            onClick={handleErasure}
            data-testid="confirm-erasure"
          >
            {erasing ? ui.erasureProcessing : ui.erasureConfirm}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
