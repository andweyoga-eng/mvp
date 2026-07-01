import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Baby, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { DateOfBirthField } from "@/components/date-of-birth-field";
import {
  REQUIRED_ACCOUNT_CONSENTS,
  type ConsentType,
  CONSENT_COPY,
  type ConsentLanguage,
  isValidDateOfBirth,
  isAdult,
} from "@shared/consent";
import { LEGAL_CONFIG } from "@shared/legal-config";
import { detectConsentLanguage } from "@/lib/consent-language";

export type ConsentPanelStep = "consent" | "minor";
export type ConsentSubmitPayload = {
  dateOfBirth?: string;
  consentProfile?: boolean;
  consentTerms?: boolean;
  consentAge?: boolean;
};

interface OnboardingConsentPanelProps {
  step: ConsentPanelStep;
  onStepChange: (step: ConsentPanelStep) => void;
  onBack: () => void;
  onCancel: () => void;
  onConsentComplete: (payload: ConsentSubmitPayload) => Promise<{ ok: boolean; code?: string }>;
  mode?: "first_time" | "reconsent";
  requiredTypes?: ConsentType[];
  requireDateOfBirth?: boolean;
  initialLanguage?: ConsentLanguage;
}

export function OnboardingConsentPanel({
  step,
  onStepChange,
  onBack,
  onCancel,
  onConsentComplete,
  mode = "first_time",
  requiredTypes = [...REQUIRED_ACCOUNT_CONSENTS],
  requireDateOfBirth = true,
  initialLanguage = detectConsentLanguage(),
}: OnboardingConsentPanelProps) {
  const [lang, setLang] = useState<ConsentLanguage>(initialLanguage);
  const copy = CONSENT_COPY[lang];
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [cbProfile, setCbProfile] = useState(false);
  const [cbTerms, setCbTerms] = useState(false);
  const [cbAge, setCbAge] = useState(false);
  const [dobError, setDobError] = useState("");
  const [loading, setLoading] = useState(false);

  const requireProfile = requiredTypes.includes("profile_booking");
  const requireTerms = requiredTypes.includes("terms");
  const requireAge = requiredTypes.includes("age_declaration");
  const title = mode === "reconsent" ? copy.reconsentTitle : copy.modalTitle;
  const subtitle = mode === "reconsent" ? copy.reconsentSubtitle : copy.modalSubtitle;
  const canSubmit =
    (!requireProfile || cbProfile) &&
    (!requireTerms || cbTerms) &&
    (!requireAge || cbAge) &&
    (!requireDateOfBirth || dateOfBirth.length > 0) &&
    !loading;

  const handleAgree = async () => {
    if (!canSubmit) return;
    if (!isValidDateOfBirth(dateOfBirth)) {
      setDobError(copy.invalidDob);
      return;
    }
    if (!isAdult(dateOfBirth)) {
      onStepChange("minor");
      return;
    }
    setLoading(true);
    try {
      const result = await onConsentComplete({
        dateOfBirth: requireDateOfBirth ? dateOfBirth : undefined,
        consentProfile: requireProfile ? true : undefined,
        consentTerms: requireTerms ? true : undefined,
        consentAge: requireAge ? true : undefined,
      });
      if (!result.ok && result.code === "underage") {
        onStepChange("minor");
        return;
      }
    } catch {
      setDobError(copy.genericError);
    } finally {
      setLoading(false);
    }
  };

  if (step === "minor") {
    return (
      <div className="space-y-5 pt-2 text-center" data-testid="minor-detected-panel">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-dz-secondary/15">
          <Baby className="h-7 w-7 text-dz-secondary" aria-hidden />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-primary">{copy.minorTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-dz-muted">{copy.minorBody}</p>
          <p className="mt-3 text-sm text-dz-muted">
            {copy.minorContactPrefix}{" "}
            <a
              href={`mailto:${LEGAL_CONFIG.grievanceOfficer.email}`}
              className="font-medium text-primary underline"
            >
              {LEGAL_CONFIG.grievanceOfficer.email}
            </a>
          </p>
        </div>
        <Button
          type="button"
          className="h-12 w-full rounded-xl"
          onClick={() => {
            onCancel();
            window.location.href = "/";
          }}
          data-testid="minor-return-home"
        >
          {copy.returnHome}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1" data-testid="onboarding-consent-panel">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-dz-muted hover:text-primary"
          data-testid="consent-back-button"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </button>
        <div className="flex rounded-lg border border-dz-glass-border bg-white/80 p-0.5 text-xs font-semibold">
          {(["en", "kn"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn(
                "rounded-md px-2.5 py-1 uppercase",
                lang === code ? "bg-primary text-white" : "text-dz-muted",
              )}
            >
              {code === "en" ? "EN" : "ಕನ್ನಡ"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-xl font-bold text-primary">{title}</h3>
        <p className="mt-1 text-sm text-dz-muted">{subtitle}</p>
      </div>

      {requireDateOfBirth ? (
        <DateOfBirthField
          id="consent-dob"
          label={copy.dobLabel}
          value={dateOfBirth}
          onChange={(iso) => {
            setDateOfBirth(iso);
            setDobError("");
          }}
          error={dobError}
          testIdPrefix="consent-dob"
        />
      ) : null}

      {requireProfile ? (
        <ConsentCheckbox
          checked={cbProfile}
          onChange={setCbProfile}
          testId="consent-cb-profile"
          label={copy.cb1Profile}
        />
      ) : null}
      {requireTerms ? (
        <ConsentCheckbox
          checked={cbTerms}
          onChange={setCbTerms}
          testId="consent-cb-terms"
          label={
            <>
              {copy.cb2TermsPrefix}{" "}
              <Link href="/terms" target="_blank" className="text-primary underline">
                {copy.cb2TermsLink}
              </Link>{" "}
              {copy.cb2And}{" "}
              <Link href="/privacy" target="_blank" className="text-primary underline">
                {copy.cb2PrivacyLink}
              </Link>
              .
            </>
          }
        />
      ) : null}
      {requireAge ? (
        <ConsentCheckbox
          checked={cbAge}
          onChange={setCbAge}
          testId="consent-cb-age"
          label={copy.cb3Age}
        />
      ) : null}

      <p className="rounded-xl border border-dz-glass-border bg-white/60 px-3 py-2.5 text-xs leading-relaxed text-dz-muted">
        {copy.trustSignal}
      </p>

      <Button
        type="button"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        onClick={handleAgree}
        className={cn(
          "h-12 w-full rounded-xl font-bold",
          !canSubmit && "cursor-not-allowed opacity-60",
        )}
        data-testid="consent-agree-button"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === "reconsent" ? (
          copy.agreeUpdates
        ) : (
          copy.agreeContinue
        )}
      </Button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm text-dz-muted underline"
      >
        {copy.cancel}
      </button>
    </div>
  );
}
