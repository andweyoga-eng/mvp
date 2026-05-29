import { Sparkles, Video, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { PaymentVerifiedCelebration } from "@/components/payment-verified-provider";

export function PaymentVerifiedCelebrationDialog({
  open,
  celebration,
  onJoinNow,
  onJoinLater,
  onOpenChange,
}: {
  open: boolean;
  celebration: PaymentVerifiedCelebration;
  onJoinNow: () => void;
  onJoinLater: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const hasMeetLink = !!celebration.googleMeetLink;
  const sessionWhen = new Date(celebration.sessionDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-orange-50">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3d1b80] to-[#bb5309] shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl text-[#3d1b80]">Class is starting soon</DialogTitle>
          <DialogDescription className="text-base text-purple-900/90 leading-relaxed">
            <span className="font-semibold">{celebration.className}</span> kicks off in about 30
            minutes. Roll out your mat — ready when you are.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-purple-100 bg-white/80 p-3 text-sm text-purple-800 space-y-1">
          <p className="font-medium">{celebration.className}</p>
          <p className="text-purple-600">With {celebration.instructorName}</p>
          <p className="flex items-center gap-2 text-purple-700">
            <Clock className="h-4 w-4 shrink-0" />
            {format(sessionWhen, "EEE, MMM d")} ·{" "}
            {format(sessionWhen, "h:mm a")}
          </p>
        </div>

        {!hasMeetLink ? (
          <p className="text-xs text-center text-muted-foreground px-2">
            Your Meet link will appear here once the session is ready — check My Sessions too.
          </p>
        ) : null}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="w-full bg-gradient-to-r from-[#3d1b80] to-[#5c2da3] hover:opacity-95 text-white font-bold"
            disabled={!hasMeetLink}
            title={hasMeetLink ? "Open Google Meet in a new tab" : "Meet link not available yet"}
            onClick={onJoinNow}
          >
            <Video className="h-4 w-4 mr-2" />
            Hop on Meet
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-purple-200 text-purple-800 hover:bg-purple-50 font-semibold"
            onClick={onJoinLater}
          >
            I&apos;ll join later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
