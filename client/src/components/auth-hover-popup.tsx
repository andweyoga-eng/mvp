import { useState, cloneElement, isValidElement, type ReactElement, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleContinueAsGuest = () => {
    onOpenChange(false);
    onContinueAsGuest?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="booking-auth-dialog">
        <DialogHeader>
          <DialogTitle className="text-primary font-bold">Book a session</DialogTitle>
          <DialogDescription>
            Sign in with Google or continue as a guest for trial and drop-in sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold flex items-center justify-center gap-3 py-4 px-5 h-12"
            data-testid="google-signin-popup-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="truncate">
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </span>
          </Button>

          <Button
            type="button"
            onClick={handleContinueAsGuest}
            className="w-full bg-primary hover:bg-primary/90 !text-white font-bold py-3 px-5 h-11"
            data-testid="guest-popup-button"
          >
            Continue as Guest
          </Button>

          <p className="text-center text-[10px] text-muted-foreground leading-tight px-2">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AuthHoverPopupProps {
  children: React.ReactNode;
  onContinueAsGuest?: () => void;
}

export function AuthHoverPopup({ children, onContinueAsGuest }: AuthHoverPopupProps) {
  const [open, setOpen] = useState(false);

  const openDialog = (e: MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
        onClick: (e: MouseEvent) => {
          (children as ReactElement<{ onClick?: (e: MouseEvent) => void }>).props.onClick?.(e);
          openDialog(e);
        },
      })
    : (
      <button type="button" className="inline-flex" onClick={openDialog}>
        {children}
      </button>
    );

  return (
    <>
      {trigger}
      <AuthChoiceDialog
        open={open}
        onOpenChange={setOpen}
        onContinueAsGuest={onContinueAsGuest}
      />
    </>
  );
}
