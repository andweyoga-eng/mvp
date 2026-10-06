import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MOOD_OPTIONS,
  POST_SESSION_MOOD_PROMPT,
  PRE_SESSION_MOOD_PROMPT,
  POST_SESSION_SKIP_NOTE,
} from "@shared/mood";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type MoodPhase = "pre" | "post";

interface MoodCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  phase: MoodPhase;
  /** Called after save or skip so parent can clear URL params */
  onComplete?: () => void;
}

export function MoodCaptureDialog({
  open,
  onOpenChange,
  classId,
  phase,
  onComplete,
}: MoodCaptureDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);

  const prompt = phase === "post" ? POST_SESSION_MOOD_PROMPT : PRE_SESSION_MOOD_PROMPT;
  const title =
    phase === "post" ? "How do you feel after practice?" : "How are you arriving today?";

  async function pickMood(moodId: string) {
    if (!user) {
      toast({
        title: "Sign in to continue",
        description: "Please log in so we can save your check-in.",
        variant: "destructive",
      });
      return;
    }
    if (!classId) return;

    setSavingId(moodId);
    try {
      const res = await apiRequest(
        "POST",
        `/api/sessions/${classId}/mood`,
        { phase, moodId },
        getAuthHeaders(),
      );
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      toast({
        title: phase === "post" ? "Thank you" : "Checked in",
        description: "Your reflection was saved.",
      });
      onOpenChange(false);
      onComplete?.();
    } catch (e: unknown) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  }

  function handleSkip() {
    onOpenChange(false);
    onComplete?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[#3d1b80]">{title}</DialogTitle>
          <DialogDescription className="text-center">{prompt}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap justify-center gap-3 py-2">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={!!savingId}
              onClick={() => pickMood(m.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 p-3 min-w-[4.5rem] transition-all",
                "hover:border-[#3d1b80] hover:bg-[#f5f0ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d1b80]",
                savingId === m.id && "border-[#3d1b80] bg-[#f5f0ff] scale-105",
                savingId && savingId !== m.id && "opacity-40",
              )}
              title={m.label}
              aria-label={m.label}
            >
              <span className="text-3xl leading-none" role="img" aria-hidden>
                {m.emoji}
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[4.5rem]">
                {m.label}
              </span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground text-sm"
          disabled={!!savingId}
          onClick={handleSkip}
        >
          Skip for now
        </Button>
        {phase === "post" && (
          <p className="text-xs text-muted-foreground text-center leading-relaxed px-1">
            {POST_SESSION_SKIP_NOTE}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Build URL for post-session redirect: schedule + mood popup */
export function buildPostMoodScheduleUrl(classId: string, origin = ""): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?mood=post&classId=${encodeURIComponent(classId)}#schedule`;
}
