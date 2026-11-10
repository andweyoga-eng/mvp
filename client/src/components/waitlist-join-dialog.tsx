import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { setPendingWaitlist } from "@/lib/pending-waitlist";
import { clearPendingBooking } from "@/lib/pending-booking";
import { sanitizeGuestPhoneInput, validateRequiredGuestPhone } from "@shared/guest-phone";
import { formatProfileWhatsapp } from "@shared/waitlist";

interface WaitlistJoinDialogProps {
  open: boolean;
  classType: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

export function WaitlistJoinDialog({ open, classType, onOpenChange }: WaitlistJoinDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const profileWhatsapp = user ? formatProfileWhatsapp(user) : null;
  const phone = validateRequiredGuestPhone(whatsapp);
  const whatsappReady = Boolean(profileWhatsapp) || phone.ok;

  function close() {
    setWhatsapp("");
    onOpenChange(false);
  }

  function signInWithGmail() {
    if (!classType || !phone.ok) return;
    setPendingWaitlist({
      classTypeId: classType.id,
      className: classType.name,
      whatsapp: phone.normalized,
    });
    clearPendingBooking();
    window.location.href = "/api/auth/google?keep=1";
  }

  async function submit(payload: { email?: string; name?: string; whatsapp?: string }) {
    if (!classType) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/class-types/${classType.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        toast({
          title: "Could not join waitlist",
          description: data?.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "You're on the waitlist",
        description: "We'll reach out by email and WhatsApp when sessions open.",
      });
      close();
    } finally {
      setSubmitting(false);
    }
  }

  const title = classType?.name ? `Join the waitlist for ${classType.name}` : "Join the waitlist";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This class is not open for booking yet. We will use the name and email on your account
              and let you know by email and WhatsApp when sessions open.
            </p>
            <div className="space-y-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{user.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
              {profileWhatsapp ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp</p>
                  <p className="font-medium text-foreground">{profileWhatsapp}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="waitlist-member-whatsapp">WhatsApp number</Label>
                  <Input
                    id="waitlist-member-whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(sanitizeGuestPhoneInput(e.target.value))}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                className="w-full"
                disabled={submitting || !whatsappReady}
                onClick={() =>
                  void submit(profileWhatsapp ? {} : { whatsapp })
                }
              >
                Join Waitlist
              </Button>
              <Button variant="outline" className="w-full" onClick={close}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This class is not open for booking yet. Add your WhatsApp number, then sign in with
              Gmail so we can add you to the waitlist.
            </p>
            <div className="space-y-2">
              <Label htmlFor="waitlist-choice-whatsapp">WhatsApp number</Label>
              <Input
                id="waitlist-choice-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(sanitizeGuestPhoneInput(e.target.value))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
              />
            </div>
            <Button className="w-full" disabled={!phone.ok} onClick={signInWithGmail}>
              Sign in with Gmail
            </Button>
            <Button variant="ghost" className="w-full" onClick={close}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
