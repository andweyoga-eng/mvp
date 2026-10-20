import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, Lock, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadHealthDocumentFile } from "@/lib/health-document-upload";
import { isAllowedHealthDocument } from "@/lib/health-document-helpers";
import {
  HEALTH_DOCUMENT_MAX_BYTES,
  HEALTH_DOCUMENT_MAX_MB,
  HEALTH_DOCUMENT_TOO_LARGE_MESSAGE,
} from "@shared/health-disclosure";
import { filterHealthObjectDocumentUrls } from "@shared/health-media-links";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface HealthDocumentUploadFieldProps {
  documentUrls: string[];
  onChange: (documentUrls: string[]) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export function HealthDocumentUploadField({
  documentUrls,
  onChange,
  disabled = false,
  onUploadingChange,
}: HealthDocumentUploadFieldProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachedSize, setAttachedSize] = useState<number | null>(null);

  const objectPaths = filterHealthObjectDocumentUrls(documentUrls);
  const hasAttachment = objectPaths.length > 0;

  useEffect(() => {
    if (objectPaths.length === 0) {
      setAttachedName(null);
      setAttachedSize(null);
      return;
    }
    setAttachedName((prev) => prev ?? "Uploaded document");
  }, [documentUrls, objectPaths.length]);

  async function handleFilePick(file: File) {
    if (!isAllowedHealthDocument(file)) {
      toast({
        title: "Unsupported file",
        description: "Please upload a PDF, JPG, or PNG file.",
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
    onUploadingChange?.(true);
    try {
      const result = await uploadHealthDocumentFile(file);
      if (!result.ok) {
        if (result.tooLarge) {
          setFileTooLarge(true);
          return;
        }
        toast({
          title: result.status === 404 ? "Upload unavailable" : "Upload failed",
          description:
            result.status === 404
              ? "Direct upload isn't available right now. Try a Google Drive link below instead."
              : result.message,
          variant: "destructive",
        });
        return;
      }
      onChange([result.objectPath]);
      setAttachedName(file.name);
      setAttachedSize(file.size);
      toast({
        title: "Document uploaded",
        description: "Save your note to keep this file attached.",
      });
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearAttachment() {
    onChange([]);
    setAttachedName(null);
    setAttachedSize(null);
    setFileTooLarge(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/15 bg-white/70 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" aria-hidden />
          <Label className="text-sm font-semibold text-foreground">
            Upload a document directly <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          PDF or image, up to {HEALTH_DOCUMENT_MAX_MB} MB. Prefer Google Drive links below for large videos. We store
          uploads securely and only your care team can view them.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        disabled={disabled || isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFilePick(file);
        }}
        data-testid="health-document-file-input"
      />

      {hasAttachment ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-muted/50 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{attachedName ?? "Uploaded document"}</span>
          {attachedSize != null ? (
            <span className="text-xs text-muted-foreground">{formatFileSize(attachedSize)}</span>
          ) : null}
          <button
            type="button"
            aria-label="Remove uploaded document"
            disabled={disabled || isUploading}
            onClick={clearAttachment}
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
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full"
          data-testid="health-concerns-choose-file"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Uploading…" : "Choose file"}
        </Button>
      )}

      {fileTooLarge ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          {HEALTH_DOCUMENT_TOO_LARGE_MESSAGE}
        </p>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        Encrypted storage · view-only for your care team
      </p>
    </div>
  );
}

export function HealthDocumentUploadSummary({
  documentUrls,
  label = "Uploaded document",
}: {
  documentUrls: string[];
  label?: string;
}) {
  const objectPaths = filterHealthObjectDocumentUrls(documentUrls);
  if (objectPaths.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {objectPaths.map((objectPath) => (
        <a
          key={objectPath}
          href={objectPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
          {label}
        </a>
      ))}
    </div>
  );
}
