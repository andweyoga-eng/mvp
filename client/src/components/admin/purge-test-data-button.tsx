import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";

type PurgeSummary = {
  message?: string;
  sessionTypes: number;
  instructors: number;
  sessions: number;
  users: number;
  paymentQrs: number;
};

export function PurgeTestDataButton({ onPurged }: { onPurged?: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/purge-qa-fixtures", {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return (await res.json()) as PurgeSummary;
    },
    onSuccess: (summary) => {
      setOpen(false);
      toast({
        title: "Test data removed",
        description: `${summary.instructors} instructors, ${summary.sessions} sessions, ${summary.sessionTypes} session types, ${summary.users} members, ${summary.paymentQrs} QR codes.`,
      });
      void qc.invalidateQueries({ queryKey: ["/api/admin/instructors"] });
      void qc.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      void qc.invalidateQueries({ queryKey: ["/api/admin/class-types"] });
      onPurged?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not purge test data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="purge-test-data-button"
        title="Remove integration-test instructors, sessions, members, and QR codes"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Purge test data
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge test data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes integration-test instructors, their sessions, test session types, test
              member accounts, and test QR codes. Instructors and sessions you created by hand stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="purge-test-data-confirm"
            >
              {mutation.isPending ? "Removing..." : "Remove test data"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
