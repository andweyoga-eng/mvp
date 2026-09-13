import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone } from "lucide-react";
import { ACCOUNT_DEACTIVATED_MESSAGE, CUSTOMER_SUPPORT } from "@shared/support";

interface DeactivatedAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeactivatedAccountDialog({
  open,
  onOpenChange,
}: DeactivatedAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account deactivated</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left text-sm text-muted-foreground">
              <p>{ACCOUNT_DEACTIVATED_MESSAGE}</p>
              <div className="rounded-md border bg-muted/50 p-4 space-y-2">
                <p className="font-medium text-foreground">Customer care</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`mailto:${CUSTOMER_SUPPORT.email}`}
                    className="text-primary hover:underline"
                  >
                    {CUSTOMER_SUPPORT.email}
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${CUSTOMER_SUPPORT.phone.replace(/\s/g, "")}`}
                    className="text-primary hover:underline"
                  >
                    {CUSTOMER_SUPPORT.phoneDisplay}
                  </a>
                </p>
                <p className="text-xs">Hours: {CUSTOMER_SUPPORT.hours}</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
