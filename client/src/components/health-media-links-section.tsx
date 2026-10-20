import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Link2,
  Lock,
  Mic,
  Video,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HEALTH_MEDIA_LINK_HELP,
  HEALTH_MEDIA_TYPE_LABELS,
  HEALTH_MEDIA_TYPES,
  type HealthMediaLink,
  type HealthMediaType,
  validateHealthMediaUrl,
  healthMediaLinksToDraft,
  draftToHealthMediaLinks,
} from "@shared/health-media-links";

const TYPE_ICONS: Record<HealthMediaType, typeof FileText> = {
  document: FileText,
  video: Video,
  audio: Mic,
};

const TYPE_PLACEHOLDERS: Record<HealthMediaType, string> = {
  document: "https://docs.google.com/document/d/… or Drive PDF link",
  video: "https://drive.google.com/file/d/…/view",
  audio: "https://drive.google.com/file/d/…/view",
};

export interface HealthMediaLinksEditorProps {
  value: HealthMediaLink[];
  onChange: (links: HealthMediaLink[]) => void;
  disabled?: boolean;
}

export function HealthMediaLinksEditor({
  value,
  onChange,
  disabled = false,
}: HealthMediaLinksEditorProps) {
  const [draft, setDraft] = useState(() => healthMediaLinksToDraft(value));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<HealthMediaType, string>>>({});
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setDraft(healthMediaLinksToDraft(value));
    setFieldErrors({});
  }, [value]);

  function syncDraft(nextDraft: Record<HealthMediaType, string>) {
    setDraft(nextDraft);
    const links = draftToHealthMediaLinks(nextDraft);
    onChange(links);
  }

  function handleFieldChange(type: HealthMediaType, raw: string) {
    const next = { ...draft, [type]: raw };
    setDraft(next);

    if (!raw.trim()) {
      setFieldErrors((prev) => ({ ...prev, [type]: undefined }));
      syncDraft(next);
      return;
    }

    const result = validateHealthMediaUrl(raw, type);
    if (!result.valid) {
      setFieldErrors((prev) => ({ ...prev, [type]: result.message }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, [type]: undefined }));
    syncDraft(next);
  }

  function clearField(type: HealthMediaType) {
    const next = { ...draft, [type]: "" };
    setDraft(next);
    setFieldErrors((prev) => ({ ...prev, [type]: undefined }));
    syncDraft(next);
  }

  const hasAnyLink = HEALTH_MEDIA_TYPES.some((t) => draft[t].trim().length > 0);
  const hasValidLink = draftToHealthMediaLinks(draft).length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] to-emerald-50/40 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            Share supporting materials <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {HEALTH_MEDIA_LINK_HELP.headline}
        </p>
        <p className="text-xs text-muted-foreground">{HEALTH_MEDIA_LINK_HELP.body}</p>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-primary/10 bg-white/80 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-white"
        onClick={() => setShowGuide((open) => !open)}
        data-testid="health-media-guide-toggle"
      >
        <span>How to share from Google Drive</span>
        {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showGuide ? (
        <ol className="list-decimal space-y-2 rounded-xl border border-primary/10 bg-white/90 px-4 py-3 pl-8 text-sm text-muted-foreground">
          {HEALTH_MEDIA_LINK_HELP.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}

      <div className="space-y-3">
        {HEALTH_MEDIA_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          const raw = draft[type];
          const error = fieldErrors[type];
          const isValid = raw.trim() && !error;

          return (
            <div key={type} className="space-y-1.5">
              <Label htmlFor={`health-media-${type}`} className="flex items-center gap-2 text-xs font-semibold">
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                {HEALTH_MEDIA_TYPE_LABELS[type]} link
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`health-media-${type}`}
                  type="url"
                  inputMode="url"
                  placeholder={TYPE_PLACEHOLDERS[type]}
                  value={raw}
                  disabled={disabled}
                  onChange={(e) => handleFieldChange(type, e.target.value)}
                  className={cn(
                    "text-sm",
                    error ? "border-destructive" : isValid ? "border-emerald-400" : "",
                  )}
                  data-testid={`health-media-link-${type}`}
                />
                {raw.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={disabled}
                    onClick={() => clearField(type)}
                    aria-label={`Clear ${HEALTH_MEDIA_TYPE_LABELS[type]} link`}
                  >
                    ×
                  </Button>
                ) : null}
              </div>
              {error ? (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              ) : isValid ? (
                <p className="flex items-center gap-1 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Link looks good
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        <span>{HEALTH_MEDIA_LINK_HELP.trust}</span>
        {hasAnyLink && !hasValidLink ? (
          <span className="text-amber-700">Fix invalid links before saving.</span>
        ) : null}
      </div>
    </div>
  );
}

export function HealthMediaLinksSummary({ links }: { links: HealthMediaLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = TYPE_ICONS[link.type];
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
            {link.label ?? HEALTH_MEDIA_TYPE_LABELS[link.type]}
            <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}
