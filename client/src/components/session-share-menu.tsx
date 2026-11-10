import { Share2, MessageCircle, Mail, Smartphone, Copy, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  buildBookedSessionSharePayload,
  buildClassTypeSharePayload,
} from "@shared/session-share";
import {
  copyShareText,
  getShareBaseUrl,
  openEmailShare,
  openSmsShare,
  openWhatsAppShare,
  shareSessionPayload,
  type SessionSharePayload,
} from "@/lib/session-share";

interface SessionShareMenuProps {
  payload: SessionSharePayload;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default" | "secondary";
  className?: string;
  label?: string;
}

export function SessionShareMenu({
  payload,
  size = "sm",
  variant = "outline",
  className,
  label = "Share",
}: SessionShareMenuProps) {
  const { toast } = useToast();

  const handleNativeShare = async () => {
    const shared = await shareSessionPayload(payload);
    if (!shared) return;
    toast({ title: "Shared", description: "Thanks for spreading the word!" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          className={className}
          data-testid="session-share-trigger"
        >
          <Share2 className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
          <DropdownMenuItem onClick={() => void handleNativeShare()}>
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Share…
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => openWhatsAppShare(payload)}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSmsShare(payload)}>
          <Smartphone className="h-4 w-4 mr-2" />
          SMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEmailShare(payload)}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void copyShareText(payload, toast)}>
          <Copy className="h-4 w-4 mr-2" />
          Copy message
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildClassTypeSharePayloadForUi(
  classType: { id: string; name: string; price: string | number },
): SessionSharePayload {
  return buildClassTypeSharePayload(classType, classType.id, getShareBaseUrl());
}

export function buildBookedSessionSharePayloadForUi(session: {
  className: string;
  instructorName: string;
  date: string;
  classId: string;
}): SessionSharePayload {
  return buildBookedSessionSharePayload(session, getShareBaseUrl());
}
