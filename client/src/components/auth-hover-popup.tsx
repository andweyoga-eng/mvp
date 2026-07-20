import { useState, cloneElement, isValidElement, type ReactElement, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformConfig } from "@/hooks/use-platform-config";

interface AuthChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueAsGuest?: () => void;
}

export function AuthChoiceDialog({
  open,
  onOpenChange,
  onContinueAsGuest,
}: AuthChoiceDialogProps) {
  const { guestCheckoutEnabled } = usePlatformConfig();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const resetAndClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    try {
      if (keepSignedIn) {
        localStorage.setItem("awy_keep_signed_in", "1");
      } else {
        localStorage.removeItem("awy_keep_signed_in");
      }
    } catch {
      /* ignore */
    }
    window.location.href = `/api/auth/google?keep=${keepSignedIn ? "1" : "0"}`;
  };

  const handleContinueAsGuest = () => {
    resetAndClose(false);
    onContinueAsGuest?.();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent
        className="max-w-md rounded-3xl border-dz-glass-border bg-dz-surface p-8"
        data-testid="booking-auth-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold text-primary">
            Book a{" "}
            <span className="font-accent italic font-normal text-dz-secondary">session</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-dz-muted">
            {guestCheckoutEnabled
              ? "Sign in with Google or continue as a guest for trial and drop-in sessions."
              : "Sign in with Google to book your session."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border-dz-glass-border bg-white font-semibold text-foreground hover:bg-white/90"
            data-testid="google-signin-popup-button"
          >
            <span
              className="inline-flex h-5 w-5 rounded-full"
              style={{
                background:
                  "conic-gradient(from -45deg,#ea4335 0 25%,#fbbc05 0 50%,#34a853 0 75%,#4285f4 0)",
              }}
              aria-hidden
            />
            <span className="truncate">Continue with Google</span>
          </Button>

          <label className="flex cursor-pointer select-none items-center justify-center gap-2.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={keepSignedIn}
              onClick={() => setKeepSignedIn((v) => !v)}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                keepSignedIn
                  ? "border-primary bg-primary text-white"
                  : "border-dz-glass-border bg-white",
              )}
              data-testid="keep-signed-in-checkbox"
            >
              {keepSignedIn ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
            <span
              className="text-sm font-medium text-dz-muted"
              onClick={() => setKeepSignedIn((v) => !v)}
            >
              Keep me signed in
            </span>
          </label>

          {guestCheckoutEnabled ? (
            <Button
              type="button"
              onClick={handleContinueAsGuest}
              className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-dz-primary hover:bg-primary/90"
              data-testid="guest-popup-button"
            >
              Continue as Guest
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AuthHoverPopupProps {
  children: ReactElement;
  onContinueAsGuest?: () => void;
}

export function AuthHoverPopup({ children, onContinueAsGuest }: AuthHoverPopupProps) {
  const [open, setOpen] = useState(false);

  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
        onClick: (e: MouseEvent) => {
          (children.props as { onClick?: (e: MouseEvent) => void }).onClick?.(e);
          setOpen(true);
        },
      })
    : children;

  return (
    <>
      {child}
      <AuthChoiceDialog
        open={open}
        onOpenChange={setOpen}
        onContinueAsGuest={onContinueAsGuest}
      />
    </>
  );
}

export { AuthChoiceDialog as BookingAuthDialog };
