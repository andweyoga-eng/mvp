import { ExternalLink, FileText, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HEALTH_MEDIA_TYPE_LABELS,
  healthMediaPreviewUrl,
  type HealthMediaLink,
  type HealthMediaType,
} from "@shared/health-media-links";

const TYPE_ICONS: Record<HealthMediaType, typeof FileText> = {
  document: FileText,
  video: Video,
  audio: Mic,
};

export interface AdminHealthMaterialsPanelProps {
  userName: string;
  healthText: string | null;
  mediaLinks: HealthMediaLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MediaPreviewCard({ link }: { link: HealthMediaLink }) {
  const Icon = TYPE_ICONS[link.type];
  const previewUrl = healthMediaPreviewUrl(link.url);
  const isEmbeddable = Boolean(previewUrl);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[#3d1b80]" aria-hidden />
          <span className="truncate text-sm font-semibold text-gray-900">
            {link.label ?? HEALTH_MEDIA_TYPE_LABELS[link.type]}
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="h-7 shrink-0 text-xs">
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            Open in Google
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>

      {isEmbeddable ? (
        <iframe
          title={`${HEALTH_MEDIA_TYPE_LABELS[link.type]} preview`}
          src={previewUrl!}
          className="h-64 w-full border-0 bg-gray-100"
          sandbox="allow-scripts allow-same-origin allow-popups"
          loading="lazy"
        />
      ) : (
        <div className="px-4 py-6 text-sm text-gray-500">
          Preview unavailable for this link. Use &ldquo;Open in Google&rdquo; — the member may need to set sharing to
          &ldquo;Anyone with the link can view.&rdquo;
        </div>
      )}
    </div>
  );
}

export function AdminHealthMaterialsPanel({
  userName,
  healthText,
  mediaLinks,
  open,
  onOpenChange,
}: AdminHealthMaterialsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Health note — {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Health note</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">
              {healthText?.trim() ? healthText : "No health note on file."}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">
              Supporting materials {mediaLinks.length > 0 ? `(${mediaLinks.length})` : ""}
            </p>
            {mediaLinks.length === 0 ? (
              <p className="text-sm text-gray-500">No Google Drive links shared.</p>
            ) : (
              mediaLinks.map((link) => <MediaPreviewCard key={link.id} link={link} />)
            )}
          </div>

          <p className="text-xs text-gray-500">
            Read-only view. Files stay in the member&apos;s Google Drive — nothing is stored on our servers.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
