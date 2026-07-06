import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { CONSENT_COPY, type ConsentLanguage } from "@shared/consent";
import {
  HEALTH_NO_CONCERNS_TEXT,
  isHealthDisclosureComplete,
  MAX_HEALTH_CONCERNS_CHARS,
  type HealthHistoryEntry,
} from "@shared/health-disclosure";
import {
  type HealthMediaLink,
  filterHealthObjectDocumentUrls,
  resolveHealthMediaLinks,
} from "@shared/health-media-links";
import {
  HealthMediaLinksEditor,
  HealthMediaLinksSummary,
} from "@/components/health-media-links-section";
import {
  HealthDocumentUploadField,
  HealthDocumentUploadSummary,
} from "@/components/health-document-upload-field";

type HealthTab = "current" | "history";

export interface AccountHealthNoteSectionProps {
  currentText: string;
  documentUrls: string[];
  mediaLinks: HealthMediaLink[];
  lastModified: string | null;
  history: HealthHistoryEntry[];
  healthConsentGiven: boolean;
  healthConsentChecked: boolean;
  onHealthConsentCheckedChange: (checked: boolean) => void;
  consentLang: ConsentLanguage;
  onConsentLangChange: (lang: ConsentLanguage) => void;
  onSave: (payload: { text: string; documentUrls: string[]; mediaLinks: HealthMediaLink[] }) => Promise<void>;
  isLoading: boolean;
  startInEditMode?: boolean;
}

export function AccountHealthNoteSection({
  currentText,
  documentUrls,
  mediaLinks,
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
  const [draftMediaLinks, setDraftMediaLinks] = useState<HealthMediaLink[]>([]);
  const [draftDocumentUrls, setDraftDocumentUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const consentCopy = CONSENT_COPY[consentLang];

  const resolvedCurrentLinks = resolveHealthMediaLinks(mediaLinks, documentUrls);
  const currentUploads = filterHealthObjectDocumentUrls(documentUrls);
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
    setDraftMediaLinks(resolveHealthMediaLinks(mediaLinks, documentUrls));
    setDraftDocumentUrls(filterHealthObjectDocumentUrls(documentUrls));
  }, [isEditing, currentText, mediaLinks, documentUrls]);

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
    setDraftMediaLinks(resolveHealthMediaLinks(mediaLinks, documentUrls));
    setDraftDocumentUrls(filterHealthObjectDocumentUrls(documentUrls));
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
    await onSave({
      text: draftText.trim(),
      documentUrls: draftDocumentUrls,
      mediaLinks: draftMediaLinks,
    });
    setIsEditing(false);
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
            history.map((entry, i) => {
              const entryLinks = resolveHealthMediaLinks(entry.mediaLinks, entry.documentUrls);
              const entryUploads = filterHealthObjectDocumentUrls(entry.documentUrls);
              return (
                <div
                  key={`${entry.savedAt}-${i}`}
                  className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {new Date(entry.savedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{entry.text}</p>
                  <div className="mt-2 space-y-2">
                    <HealthDocumentUploadSummary documentUrls={entryUploads} />
                    <HealthMediaLinksSummary links={entryLinks} />
                  </div>
                </div>
              );
            })
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
                  <span className="flex items-start gap-2 text-sm leading-relaxed">
                    <span className="mt-0.5 shrink-0" aria-hidden>💚</span>
                    <span>
                      {consentCopy.healthConsent} Uploaded files are stored securely; Google links are opened
                      read-only and we never copy file contents from Drive.
                    </span>
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
              setDraftMediaLinks([]);
              setDraftDocumentUrls([]);
            }}
            className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            data-testid="health-no-concerns"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            No current concerns
          </Button>

          <HealthDocumentUploadField
            documentUrls={draftDocumentUrls}
            onChange={setDraftDocumentUrls}
            disabled={isLoading || isUploading}
            onUploadingChange={setIsUploading}
          />

          <HealthMediaLinksEditor
            value={draftMediaLinks}
            onChange={setDraftMediaLinks}
            disabled={isLoading || isUploading}
          />

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
              <div className="mt-3 space-y-2">
                <HealthDocumentUploadSummary documentUrls={currentUploads} />
                <HealthMediaLinksSummary links={resolvedCurrentLinks} />
              </div>
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
