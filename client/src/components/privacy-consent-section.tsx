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
import { detectConsentLanguage } from "@/lib/consent-language";

const CATEGORY_ICONS: Record<ConsentType, typeof User> = {
  profile_booking: User,
  terms: Gavel,
  age_declaration: Cake,
  health_data: HeartPulse,
  whatsapp_contact: MessageCircle,
};

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

export function PrivacyConsentSection({ onHealthWithdrawn }: { onHealthWithdrawn?: () => void } = {}) {
  const { toast } = useToast();
  const { logout } = useAuth();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">{ui.sectionTitle}</h2>
          <p className="text-sm text-dz-muted">{ui.sectionSubtitle}</p>
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

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <ul className="space-y-3">
          {(data?.categories ?? []).map((row) => {
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

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/privacy" target="_blank">
            {ui.privacyLink}
          </Link>
        </Button>
      </div>

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
