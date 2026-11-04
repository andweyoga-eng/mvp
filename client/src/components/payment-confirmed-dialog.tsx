import { CheckCircle2, Clock, Headphones, LayoutDashboard, LogOut, UserCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MeetLinkJoinControl } from "@/components/meet-link-join-control";
import { CUSTOMER_SUPPORT } from "@shared/support";
import { cn } from "@/lib/utils";

export type PaymentConfirmedDetails = {
  bookingId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
  googleMeetLink?: string | null;
  sessionDurationMinutes?: number;
};

export type FlexiSummaryItem = {
  weekdayLabel: string;
  timeLabel: string;
};

export function PaymentConfirmedContent({
  details,
  onViewSessions,
  onGoToDashboard,
  onGoToMyAccount,
  onLogout,
  variant = "default",
  flexiSummary,
}: {
  details: PaymentConfirmedDetails;
  onViewSessions: () => void;
  onGoToDashboard: () => void;
  onGoToMyAccount: () => void;
  onLogout: () => void;
  variant?: "default" | "compact";
  flexiSummary?: FlexiSummaryItem[];
}) {
  const sessionWhen = new Date(details.sessionDate);
  const durationMinutes = details.sessionDurationMinutes ?? 60;
  const isCompact = variant === "compact";
  const hasFlexi = !!flexiSummary?.length;

  return (
    <div className={cn(isCompact ? "space-y-2.5" : "space-y-3")}>
      <div className={cn("text-center", isCompact ? "space-y-1" : "space-y-1.5")}>
        <div
          className={cn(
            "mx-auto flex items-center justify-center rounded-full bg-green-600 shadow-md",
            isCompact ? "h-9 w-9" : "h-10 w-10",
          )}
        >
          <CheckCircle2 className={cn("text-white", isCompact ? "h-5 w-5" : "h-5 w-5")} />
        </div>
        <p className={cn("font-semibold text-green-900", isCompact ? "text-base" : "text-lg")}>
          Payment confirmed
        </p>
        <p
          className={cn(
            "text-green-900/90",
            isCompact ? "text-xs leading-snug" : "text-sm leading-relaxed",
          )}
        >
          {hasFlexi
            ? "Your Flexi package is locked in. We'll remind you to join about 30 minutes before class."
            : isCompact
              ? "Your session is locked in. Join link opens 30 minutes before class."
              : (
                <>
                  Your payment for <span className="font-semibold">{details.className}</span> is
                  verified. Your session is locked in. We&apos;ll nudge you to join about 30 minutes
                  before class.
                </>
              )}
        </p>
      </div>

      <div
        className={cn(
          "rounded-lg border border-green-100 bg-white/80 text-green-900",
          isCompact ? "space-y-2 p-2.5 text-xs" : "space-y-2.5 p-3 text-sm",
        )}
      >
        <div className="space-y-0.5">
          <p className={cn("font-medium", isCompact && "text-sm")}>{details.className}</p>
          <p className="text-green-700">With {details.instructorName}</p>
          {hasFlexi ? (
            <p className="text-green-800">
              {flexiSummary.map((item) => `${item.weekdayLabel} · ${item.timeLabel}`).join(" · ")}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-green-800">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {format(sessionWhen, "EEE, MMM d")} · {format(sessionWhen, "h:mm a")}
            </p>
          )}
        </div>
        <MeetLinkJoinControl
          googleMeetLink={details.googleMeetLink ?? null}
          sessionStart={sessionWhen}
          sessionDurationMinutes={durationMinutes}
          isPaid
          className={cn(
            "w-full border-green-200 text-green-900 hover:bg-green-50",
            isCompact && "h-8 text-xs",
          )}
        />
      </div>

      {!isCompact ? (
        <div className="rounded-lg border border-primary/10 bg-white/80 p-2.5 text-xs space-y-1.5">
          <div className="flex items-start gap-2">
            <Headphones className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Need help?</p>
              <p className="text-muted-foreground">
                <a
                  className="text-primary underline underline-offset-2"
                  href={CUSTOMER_SUPPORT.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
                {" · "}
                <a
                  className="text-primary underline underline-offset-2"
                  href={`mailto:${CUSTOMER_SUPPORT.email}`}
                >
                  {CUSTOMER_SUPPORT.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
        <Button
          type="button"
          size={isCompact ? "sm" : "default"}
          className="w-full bg-primary hover:bg-primary/90 !text-white font-bold"
          onClick={onViewSessions}
        >
          View My Sessions
        </Button>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            size={isCompact ? "sm" : "default"}
            variant="outline"
            className="border-green-200 text-green-900 hover:bg-green-50 font-semibold"
            onClick={onGoToDashboard}
          >
            <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
            Dashboard
          </Button>
          <Button
            type="button"
            size={isCompact ? "sm" : "default"}
            variant="outline"
            className="border-green-200 text-green-900 hover:bg-green-50 font-semibold"
            onClick={onGoToMyAccount}
          >
            <UserCircle2 className="mr-1.5 h-3.5 w-3.5" />
            My Account
          </Button>
        </div>
        <Button
          type="button"
          size={isCompact ? "sm" : "default"}
          variant="ghost"
          className="w-full text-muted-foreground font-medium"
          onClick={onLogout}
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Log Out
        </Button>
      </div>

      {isCompact ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Need help?{" "}
          <a
            className="text-primary underline underline-offset-2"
            href={CUSTOMER_SUPPORT.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp us
          </a>
        </p>
      ) : null}
    </div>
  );
}

export function PaymentConfirmedDialog({
  open,
  details,
  onViewSessions,
  onGoToDashboard,
  onGoToMyAccount,
  onLogout,
  onOpenChange,
  flexiSummary,
}: {
  open: boolean;
  details: PaymentConfirmedDetails;
  onViewSessions: () => void;
  onGoToDashboard: () => void;
  onGoToMyAccount: () => void;
  onLogout: () => void;
  onOpenChange: (open: boolean) => void;
  flexiSummary?: FlexiSummaryItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-green-200 bg-gradient-to-br from-green-50 via-white to-purple-50 p-4 sm:p-5">
        <DialogHeader className="text-center sm:text-center space-y-2 sr-only">
          <DialogTitle>Payment confirmed</DialogTitle>
          <DialogDescription>Your payment has been verified.</DialogDescription>
        </DialogHeader>
        <PaymentConfirmedContent
          details={details}
          onViewSessions={onViewSessions}
          onGoToDashboard={onGoToDashboard}
          onGoToMyAccount={onGoToMyAccount}
          onLogout={onLogout}
          flexiSummary={flexiSummary}
        />
      </DialogContent>
    </Dialog>
  );
}
