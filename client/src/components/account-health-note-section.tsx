import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HeartPulse,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadHealthDocumentFile } from "@/lib/health-document-upload";
import { cn } from "@/lib/utils";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { CONSENT_COPY, type ConsentLanguage } from "@shared/consent";
import {
  HEALTH_DOCUMENT_MAX_BYTES,
  HEALTH_DOCUMENT_TOO_LARGE_MESSAGE,
  HEALTH_NO_CONCERNS_TEXT,
  isAllowedHealthDisclosureFile,
  isHealthDisclosureComplete,
  MAX_HEALTH_CONCERNS_CHARS,
  type HealthHistoryEntry,
} from "@shared/health-disclosure";

type HealthTab = "current" | "history";

function docLabel(url: string): string {
  const segment = url.split("/").pop() ?? url;
  return decodeURIComponent(segment);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface AccountHealthNoteSectionProps {
  currentText: string;
  documentUrls: string[];
  lastModified: string | null;
  history: HealthHistoryEntry[];
  healthConsentGiven: boolean;
  healthConsentChecked: boolean;
  onHealthConsentCheckedChange: (checked: boolean) => void;
  consentLang: ConsentLanguage;
  onConsentLangChange: (lang: ConsentLanguage) => void;
  onSave: (payload: { text: string; documentUrls: string[] }) => Promise<void>;
  isLoading: boolean;
  /** When true and no note on file, show the edit form with Save note (not Edit). */
  startInEditMode?: boolean;
}

export function AccountHealthNoteSection({
  currentText,
  documentUrls,
  lastModified,
  history,
  healthConsentGiven,
  healthConsentChecked,
  onHealthConsentCheckedChange,
  consentLang,
  onConsentLangChange,
  onSave,
  isLoading,
  startInEditMode = false,
}: AccountHealthNoteSectionProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<HealthTab>("current");
  const [isEditing, setIsEditing] = useState(() => startInEditMode && !isHealthDisclosureComplete(currentText));
  const [draftText, setDraftText] = useState("");
  const [draftDocs, setDraftDocs] = useState<string[]>([]);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachedSize, setAttachedSize] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consentCopy = CONSENT_COPY[consentLang];

  const hasCurrentNote = isHealthDisclosureComplete(currentText);
  const showConsentPrompt = isEditing && !healthConsentGiven;

  useEffect(() => {
    if (startInEditMode && !hasCurrentNote) {
      setIsEditing(true);
      setTab("current");
    }
  }, [startInEditMode, hasCurrentNote]);
  const saveDisabled =
    isLoading ||
    isUploading ||
    !isHealthDisclosureComplete(draftText) ||
    (showConsentPrompt && !healthConsentChecked);

  useEffect(() => {
    if (!isEditing) return;
    setDraftText(currentText);
    setDraftDocs(documentUrls);
    setAttachedName(documentUrls[0] ? docLabel(documentUrls[0]) : null);
    setAttachedSize(null);
    setFileTooLarge(false);
  }, [isEditing, currentText, documentUrls]);

  const subTabBtn = (active: boolean) =>
    cn(
      "flex-1 rounded-[10px] px-2 py-2 text-[13px] font-semibold transition-colors",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
    );

  const startEdit = () => {
    setTab("current");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftText(currentText);
    setDraftDocs(documentUrls);
    setFileTooLarge(false);
  };

  const handleSave = async () => {
    if (!isHealthDisclosureComplete(draftText)) {
      toast({
        title: "Health note required",
        description: 'Add your note or tap "No current concerns".',
        variant: "destructive",
      });
      return;
    }
    await onSave({ text: draftText.trim(), documentUrls: draftDocs });
    setIsEditing(false);
  };

  const handleFilePick = async (file: File) => {
    if (!isAllowedHealthDisclosureFile(file)) {
      toast({
        title: "Unsupported file",
        description: "Only PDF or image files are supported.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > HEALTH_DOCUMENT_MAX_BYTES) {
      setFileTooLarge(true);
      return;
    }
    setFileTooLarge(false);
    setIsUploading(true);
    try {
      const result = await uploadHealthDocumentFile(file);
      if (!result.ok) {
        if (result.tooLarge) {
          setFileTooLarge(true);
          return;
        }
        toast({ title: "Upload failed", description: result.message, variant: "destructive" });
        return;
      }
      setDraftDocs([result.objectPath]);
      setAttachedName(file.name);
      setAttachedSize(file.size);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4" data-testid="account-health-note">
      <div className="flex gap-1.5 rounded-[14px] bg-muted p-1.5">
        <button
          type="button"
          className={subTabBtn(tab === "current")}
          onClick={() => setTab("current")}
          data-testid="health-tab-current"
        >
          Current note
        </button>
        <button
          type="button"
          className={subTabBtn(tab === "history")}
          onClick={() => setTab("history")}
          data-testid="health-tab-history"
        >
          History {history.length > 0 ? history.length : ""}
        </button>
      </div>

      {tab === "history" ? (
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous notes yet.</p>
          ) : (
            history.map((entry, i) => (
              <div
                key={`${entry.savedAt}-${i}`}
                className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(entry.savedAt).toLocaleDateString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{entry.text}</p>
                {entry.documentUrls.length > 0 ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    {docLabel(entry.documentUrls[0])}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : isEditing ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Editing saves the current note to History and starts a new one.
          </p>

          {showConsentPrompt ? (
            <div className="space-y-2">
              <div className="flex justify-end">
                <div className="flex rounded-lg border border-dz-glass-border bg-white/80 p-0.5 text-xs font-semibold">
                  {(["en", "kn"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onConsentLangChange(code)}
                      className={cn(
                        "rounded-md px-2.5 py-1",
                        consentLang === code ? "bg-primary text-white" : "text-dz-muted",
                      )}
                    >
                      {code === "en" ? "EN" : "ಕನ್ನಡ"}
                    </button>
                  ))}
                </div>
              </div>
              <ConsentCheckbox
                checked={healthConsentChecked}
                onChange={onHealthConsentCheckedChange}
                testId="health-consent-checkbox"
                variant="secondary"
                className="rounded-xl border-2 border-dz-secondary/50 bg-dz-secondary/10 p-4"
                label={
                  <span className="flex items-start gap-2">
                    <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-dz-secondary" aria-hidden />
                    {consentCopy.healthConsent}
                  </span>
                }
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="health-note-draft" className="text-xs font-semibold text-muted-foreground">
              Your health note
            </Label>
            <Textarea
              id="health-note-draft"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              maxLength={MAX_HEALTH_CONCERNS_CHARS}
              className="min-h-[120px]"
              data-testid="health-update-text"
            />
            <p className="text-xs text-muted-foreground">
              {draftText.trim().length}/{MAX_HEALTH_CONCERNS_CHARS} characters
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraftText(HEALTH_NO_CONCERNS_TEXT);
              setDraftDocs([]);
              setAttachedName(null);
            }}
            className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            data-testid="health-no-concerns"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            No current concerns
          </Button>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              Supporting document (optional, max 1 MB)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFilePick(file);
              }}
            />
            {draftDocs.length > 0 && attachedName ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-muted/50 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">{attachedName}</span>
                {attachedSize != null ? (
                  <span className="text-xs text-muted-foreground">{formatFileSize(attachedSize)}</span>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove document"
                  onClick={() => {
                    setDraftDocs([]);
                    setAttachedName(null);
                    setAttachedSize(null);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                data-testid="health-concerns-choose-file"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading…" : "Upload document"}
              </Button>
            )}
            {fileTooLarge ? (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {HEALTH_DOCUMENT_TOO_LARGE_MESSAGE}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveDisabled}
              className="flex-1 rounded-full py-6 font-bold"
              data-testid="save-health-update"
            >
              {isLoading ? "Saving…" : "Save note"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelEdit}
              disabled={isLoading || isUploading}
              className="flex-1 rounded-full py-6 font-bold"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hasCurrentNote ? (
            <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4">
              {lastModified ? (
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(lastModified).toLocaleDateString()} at{" "}
                  {new Date(lastModified).toLocaleTimeString()}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{currentText}</p>
              {documentUrls.length > 0 ? (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  {docLabel(documentUrls[0])}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No health note on file yet. Add one so we can keep your practice safe.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={startEdit}
            className="rounded-full"
            data-testid="health-edit-note"
          >
            <Pencil className="mr-2 h-4 w-4" />
            {hasCurrentNote ? "Edit note" : "Add health note"}
          </Button>
        </div>
      )}
    </div>
  );
}
