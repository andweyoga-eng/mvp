import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMeetJoinMessage, getMeetJoinState } from "@shared/session-meet-access";

export function MeetLinkJoinControl({
  googleMeetLink,
  sessionStart,
  sessionDurationMinutes,
  isPaid = true,
  size = "default",
  className,
  /** When true, show schedule hint under the button instead of a hover tooltip. */
  showInlineHint = true,
}: {
  googleMeetLink: string | null;
  sessionStart: Date;
  sessionDurationMinutes: number;
  isPaid?: boolean;
  size?: "sm" | "default";
  className?: string;
  showInlineHint?: boolean;
}) {
  const hasMeetLink = !!googleMeetLink?.trim();
  const meetJoinState = getMeetJoinState({
    sessionStart,
    sessionDurationMinutes,
    isPaid,
    hasMeetLink,
  });

  if (!isPaid) return null;

  const hint = getMeetJoinMessage({
    sessionStart,
    sessionDurationMinutes,
    isPaid,
    hasMeetLink,
  });

  const isActive = meetJoinState === "active" && hasMeetLink;
  const buttonClass = size === "sm" ? "h-7 text-xs" : "h-9 text-sm";
  const showHint = showInlineHint && !isActive && hasMeetLink;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className?.includes("w-full") && "w-full")}>
      {isActive ? (
        <Button
          asChild
          size={size === "sm" ? "sm" : "default"}
          variant="outline"
          className={cn(buttonClass, className)}
        >
          <a href={googleMeetLink!} target="_blank" rel="noopener noreferrer">
            <Video className={cn("mr-1.5", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
            Join session
          </a>
        </Button>
      ) : (
        <Button
          size={size === "sm" ? "sm" : "default"}
          variant="outline"
          className={cn(buttonClass, "cursor-not-allowed opacity-50", className)}
          disabled
        >
          <Video className={cn("mr-1.5", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
          Join session
        </Button>
      )}
      {showHint ? (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
