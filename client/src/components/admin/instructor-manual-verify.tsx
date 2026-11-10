import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import type { Instructor } from "@shared/schema";

export type ManualVerifyResponse = Instructor & {
  otpEmailSent?: boolean;
  otpWarning?: string | null;
};

export function formatManualVerifyError(message: string, status?: number): string {
  const lower = message.toLowerCase();
  if (status === 403 || lower.includes("super admin")) {
    return "Only a super admin can manually verify instructor email. Sign in with a super admin account and try again.";
  }
  if (status === 404 || lower.includes("not found")) {
    return "This instructor record could not be found. Refresh the page and try again.";
  }
  if (lower.includes("gmail") || lower.includes("not configured")) {
    return "Email was verified in the system, but the OTP notification email could not be sent because Gmail is not configured on the server. Ask your developer to set GMAIL_USER and GMAIL_APP_PASSWORD, then resend OTP from the instructor card.";
  }
  if (lower.includes("no email")) {
    return "This instructor has no email address on file. Add an email in Edit details, save, then try manual verification again.";
  }
  if (lower.includes("failed to verify email manually")) {
    return "The server could not save the manual verification. Please try again. If this keeps happening, check the server logs.";
  }
  return message || "Manual verification failed for an unknown reason. Please try again.";
}

export function useInstructorManualEmailVerify(options?: {
  onSuccess?: (instructor: ManualVerifyResponse) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async (instructorId: string) => {
      const res = await fetch(`/api/admin/instructors/${instructorId}/verify-email/manual`, {
        method: "POST",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { status: res.status });
      }
      return res.json() as Promise<ManualVerifyResponse>;
    },
    onSuccess: (instructor) => {
      setConfirmOpen(false);
      options?.onSuccess?.(instructor);
      if (instructor.otpWarning) {
        setWarningMessage(
          `Email verification was saved as a manual override, but the OTP email could not be delivered: ${instructor.otpWarning}`,
        );
        setWarningOpen(true);
      }
    },
    onError: (e: Error & { status?: number }) => {
      setConfirmOpen(false);
      setErrorMessage(formatManualVerifyError(e.message, e.status));
      setErrorOpen(true);
    },
  });

  function openConfirm() {
    setErrorMessage("");
    setConfirmOpen(true);
  }

  function confirm(instructorId: string) {
    if (!instructorId || mutation.isPending) return;
    mutation.mutate(instructorId);
  }

  function dismissError() {
    setErrorOpen(false);
    setErrorMessage("");
  }

  function dismissWarning() {
    setWarningOpen(false);
    setWarningMessage("");
  }

  return {
    confirmOpen,
    setConfirmOpen,
    errorOpen,
    warningOpen,
    errorMessage,
    warningMessage,
    mutation,
    openConfirm,
    confirm,
    dismissError,
    dismissWarning,
  };
}

export function InstructorManualVerifyDialogs({
  confirmOpen,
  onConfirmOpenChange,
  errorOpen,
  errorMessage,
  warningOpen,
  warningMessage,
  isPending,
  instructorName,
  onConfirm,
  onDismissError,
  onDismissWarning,
}: {
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  errorOpen: boolean;
  errorMessage: string;
  warningOpen: boolean;
  warningMessage: string;
  isPending: boolean;
  instructorName?: string;
  onConfirm: () => void;
  onDismissError: () => void;
  onDismissWarning: () => void;
}) {
  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {instructorName
                ? `Manually verify ${instructorName}?`
                : "Manually verify instructor email?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are manually verifying this email. The OTP email will still be sent to the
              instructor for their own records. This action will be logged against your admin
              account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="bg-[#3d1b80] hover:bg-[#2d1260] text-white"
              disabled={isPending}
              onClick={onConfirm}
            >
              {isPending ? "Verifying..." : "Confirm manual verification"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={errorOpen}
        onOpenChange={(open) => {
          if (!open) onDismissError();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual verification failed</AlertDialogTitle>
            <AlertDialogDescription className="text-left whitespace-pre-wrap">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" onClick={onDismissError}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={warningOpen}
        onOpenChange={(open) => {
          if (!open) onDismissWarning();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verified, but OTP email not sent</AlertDialogTitle>
            <AlertDialogDescription className="text-left whitespace-pre-wrap">
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" onClick={onDismissWarning}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
