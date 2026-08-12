import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MousePointerClick, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AccountFoldSection } from "@/components/account-fold-section";
import { cn } from "@/lib/utils";
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

type HealthTab = "latest" | "recent";

export interface AccountHealthNoteSectionProps {
  currentText: string;
  documentUrls: string[];
  mediaLinks: HealthMediaLink[];
  lastModified: string | null;
  history: HealthHistoryEntry[];
  onSave: (payload: { text: string; documentUrls: string[]; mediaLinks: HealthMediaLink[] }) => Promise<void>;
  isLoading: boolean;
  startInEditMode?: boolean;
  continueLabel?: string;
}

function HealthHistoryList({ history }: { history: HealthHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm font-medium text-foreground/70">No previous updates yet.</p>;
  }

  return (
    <div className="space-y-3">
      {history.map((entry, i) => {
        const entryLinks = resolveHealthMediaLinks(entry.mediaLinks, entry.documentUrls);
        const entryUploads = filterHealthObjectDocumentUrls(entry.documentUrls);
        return (
          <div
            key={`${entry.savedAt}-${i}`}
            className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4"
          >
            <p className="text-xs font-semibold text-foreground/70">
              {new Date(entry.savedAt).toLocaleDateString()} at{" "}
              {new Date(entry.savedAt).toLocaleTimeString()}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-foreground">{entry.text}</p>
            <div className="mt-2 space-y-2">
              <HealthDocumentUploadSummary documentUrls={entryUploads} />
              <HealthMediaLinksSummary links={entryLinks} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AccountHealthNoteSection({
  currentText,
  documentUrls,
  mediaLinks,
  lastModified,
  history,
  onSave,
  isLoading,
  startInEditMode = false,
  continueLabel = "Save update",
}: AccountHealthNoteSectionProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<HealthTab>("latest");
  const [isEditing, setIsEditing] = useState(() => startInEditMode && !isHealthDisclosureComplete(currentText));
  const [draftText, setDraftText] = useState("");
  const [draftMediaLinks, setDraftMediaLinks] = useState<HealthMediaLink[]>([]);
  const [draftDocumentUrls, setDraftDocumentUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const resolvedCurrentLinks = resolveHealthMediaLinks(mediaLinks, documentUrls);
  const currentUploads = filterHealthObjectDocumentUrls(documentUrls);
  const hasCurrentNote = isHealthDisclosureComplete(currentText);

  useEffect(() => {
    if (startInEditMode && !hasCurrentNote) {
      setIsEditing(true);
      setTab("latest");
    }
  }, [startInEditMode, hasCurrentNote]);

  const saveDisabled = isLoading || isUploading || !isHealthDisclosureComplete(draftText);

  useEffect(() => {
    if (!isEditing) return;
    setDraftText(currentText);
    setDraftMediaLinks(resolveHealthMediaLinks(mediaLinks, documentUrls));
    setDraftDocumentUrls(filterHealthObjectDocumentUrls(documentUrls));
  }, [isEditing, currentText, mediaLinks, documentUrls]);

  const applyNoConcerns = () => {
    setDraftText(HEALTH_NO_CONCERNS_TEXT);
    setDraftMediaLinks([]);
    setDraftDocumentUrls([]);
  };

  const startEdit = () => {
    setTab("latest");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (!hasCurrentNote) return;
    setIsEditing(false);
    setDraftText(currentText);
    setDraftMediaLinks(resolveHealthMediaLinks(mediaLinks, documentUrls));
    setDraftDocumentUrls(filterHealthObjectDocumentUrls(documentUrls));
  };

  const handleSave = async () => {
    if (!isHealthDisclosureComplete(draftText)) {
      toast({
        title: "Health History required",
        description: `Add your latest update or tap "${HEALTH_NO_CONCERNS_TEXT}".`,
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
    setTab("latest");
  };

  const subTabBtn = (active: boolean) =>
    cn(
      "flex-1 rounded-[10px] px-2 py-2 text-[13px] font-semibold transition-colors",
      active ? "bg-primary text-primary-foreground" : "font-semibold text-foreground/75 hover:text-primary",
    );

  const editForm = (
    <div className="space-y-4">
      {hasCurrentNote ? (
        <p className="text-sm font-medium text-foreground/75">
          Editing saves the current update to Recent History and starts a new one.
        </p>
      ) : null}

      <div
        className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5"
        data-testid="health-no-concerns-hint"
      >
        <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
        <p className="text-sm font-medium text-foreground">
          <button
            type="button"
            onClick={applyNoConcerns}
            className="font-semibold text-emerald-700 underline decoration-2 underline-offset-2 hover:text-emerald-800"
          >
            Click here
          </button>{" "}
          if you have no issues now. Otherwise mention any concerns in the box below.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="health-note-draft" className="text-sm font-medium text-foreground">
          Your latest update
        </Label>
        <Textarea
          id="health-note-draft"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          maxLength={MAX_HEALTH_CONCERNS_CHARS}
          className="min-h-[120px] font-medium"
          data-testid="health-update-text"
        />
        <p className="text-xs font-medium text-foreground/65">
          {draftText.trim().length}/{MAX_HEALTH_CONCERNS_CHARS} characters
        </p>
      </div>

      <AccountFoldSection
        nested
        title="Share video, audio & documents"
        subtitle="Optional Google Drive links or file uploads"
        defaultOpen={false}
      >
        <div className="space-y-4">
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
        </div>
      </AccountFoldSection>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveDisabled}
          className="flex-1 rounded-full py-6 font-bold"
          data-testid="save-health-update"
        >
          {isLoading ? "Saving…" : continueLabel}
        </Button>
        {hasCurrentNote ? (
          <Button
            type="button"
            variant="outline"
            onClick={cancelEdit}
            disabled={isLoading || isUploading}
            className="flex-1 rounded-full py-6 font-bold"
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );

  const latestContent =
    isEditing || !hasCurrentNote ? (
      editForm
    ) : (
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4">
          {lastModified ? (
            <p className="text-xs font-semibold text-foreground/70">
              Last updated {new Date(lastModified).toLocaleDateString()} at{" "}
              {new Date(lastModified).toLocaleTimeString()}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-foreground">{currentText}</p>
          <div className="mt-3 space-y-2">
            <HealthDocumentUploadSummary documentUrls={currentUploads} />
            <HealthMediaLinksSummary links={resolvedCurrentLinks} />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={startEdit}
          className="rounded-full font-semibold"
          data-testid="health-edit-note"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit update
        </Button>
      </div>
    );

  return (
    <div className="space-y-4" data-testid="account-health-note">
      <div className="flex gap-1.5 rounded-[14px] bg-muted p-1.5">
        <button
          type="button"
          onClick={() => setTab("latest")}
          className={subTabBtn(tab === "latest")}
          data-testid="health-tab-current"
        >
          Latest update
        </button>
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={subTabBtn(tab === "recent")}
          data-testid="health-tab-history"
        >
          Recent History
        </button>
      </div>

      {tab === "latest" ? (
        latestContent
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground/70">
            {history.length === 0
              ? "Previous updates appear here after you save a new one."
              : `${history.length} previous ${history.length === 1 ? "entry" : "entries"}`}
          </p>
          {/* Cap is ≤5 server-side; one-fold scroll is enough for speed. */}
          <div className="max-h-[min(50vh,24rem)] overflow-y-auto overscroll-contain pr-1">
            <HealthHistoryList history={history} />
          </div>
        </div>
      )}
    </div>
  );
}
