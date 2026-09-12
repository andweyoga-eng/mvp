import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndQuit: () => void | Promise<void>;
  onQuitAnyway: () => void | Promise<void>;
  saving?: boolean;
};

/** Quit onboarding: Save contact fields then sign out, or quit without saving. */
export function QuitSetupDialog({
  open,
  onOpenChange,
  onSaveAndQuit,
  onQuitAnyway,
  saving,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quit setup?</AlertDialogTitle>
          <AlertDialogDescription>
            Save the contact details you have entered, or leave without saving. Either way you will
            be signed out and returned to the home page. You can finish setup anytime after signing
            back in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            disabled={saving}
            onClick={(e) => {
              e.preventDefault();
              void onSaveAndQuit();
            }}
            data-testid="quit-setup-save"
          >
            {saving ? "Saving…" : "Save and Quit setup"}
          </AlertDialogAction>
          <AlertDialogCancel
            disabled={saving}
            onClick={(e) => {
              e.preventDefault();
              void onQuitAnyway();
            }}
            data-testid="quit-setup-anyway"
          >
            Quit anyway
          </AlertDialogCancel>
          <AlertDialogCancel disabled={saving} data-testid="quit-setup-cancel">
            Keep setting up
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
