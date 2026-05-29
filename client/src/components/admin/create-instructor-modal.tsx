import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Upload,
  QrCode,
  CheckCircle2,
  Circle,
  Mail,
  Phone,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  adminHeaders,
  parseAdminApiError,
  validateInstructorForm,
} from "@/lib/admin-api";
import { FieldError, FormErrorSummary } from "@/components/admin/field-error";
import {
  INSTRUCTOR_LICENSE_STATUSES,
  getInstructorStatusLabel,
  type InstructorOperationalStatus,
} from "@shared/instructor-compliance";
import type { Instructor } from "@shared/schema";

function compressImageForUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1024;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      while (dataUrl.length > 900_000 && quality > 0.45) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

const INITIAL_FORM = {
  name: "",
  bio: "",
  imageUrl: "",
  specialties: "",
  email: "",
  phone: "",
  onboardingQrImageUrl: "",
  ycbRegistrationNumber: "",
  ycbLicenseStatus: "pending",
  ycbAdminComment: "",
  yogaAllianceRegistrationNumber: "",
  yogaAllianceLicenseStatus: "pending",
  yogaAllianceAdminComment: "",
};

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-gray-400 shrink-0" />
      )}
      <span className={done ? "text-gray-800" : "text-gray-500"}>{label}</span>
    </div>
  );
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "pending") return "secondary";
  return "destructive";
}

function instructorToForm(ins: Instructor): typeof INITIAL_FORM {
  return {
    name: ins.name,
    bio: ins.bio ?? "",
    imageUrl: ins.imageUrl ?? "",
    specialties: ins.specialties?.join(", ") ?? "",
    email: ins.email ?? "",
    phone: ins.phone ?? "",
    onboardingQrImageUrl: ins.onboardingQrImageUrl ?? "",
    ycbRegistrationNumber: ins.ycbRegistrationNumber ?? "",
    ycbLicenseStatus: ins.ycbLicenseStatus ?? "pending",
    ycbAdminComment: ins.ycbAdminComment ?? "",
    yogaAllianceRegistrationNumber: ins.yogaAllianceRegistrationNumber ?? "",
    yogaAllianceLicenseStatus: ins.yogaAllianceLicenseStatus ?? "pending",
    yogaAllianceAdminComment: ins.yogaAllianceAdminComment ?? "",
  };
}

function InstructorProfileForm({
  form,
  setForm,
  errors,
  setErrors,
  fileRef,
  onQrFile,
}: {
  form: typeof INITIAL_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fileRef: React.RefObject<HTMLInputElement>;
  onQrFile: (file: File | undefined) => void;
}) {
  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#3d1b80]">Profile</h3>
        <div>
          <Label>Full name <span className="text-red-500">*</span></Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={errors.name ? "border-red-500" : ""}
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={2}
          />
        </div>
        <div>
          <Label>Photo URL</Label>
          <Input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://..."
          />
          <FieldError message={errors.imageUrl} />
        </div>
        <div>
          <Label>Specialties (comma-separated)</Label>
          <Input
            value={form.specialties}
            onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))}
          />
        </div>
      </section>

      <section className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold text-[#3d1b80] flex items-center gap-2">
          <QrCode className="w-4 h-4" /> Contact & onboarding QR
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={errors.email ? "border-red-500" : ""}
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <Label>Phone <span className="text-red-500">*</span></Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={errors.phone ? "border-red-500" : ""}
            />
            <FieldError message={errors.phone} />
          </div>
        </div>
        <div>
          <Label>QR image <span className="text-red-500">*</span></Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onQrFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2 mt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Upload QR
            </Button>
            {form.onboardingQrImageUrl && (
              <img
                src={form.onboardingQrImageUrl}
                alt="Onboarding QR preview"
                className="h-16 w-16 object-contain border rounded"
              />
            )}
          </div>
          <FieldError message={errors.onboardingQrImageUrl} />
        </div>
      </section>

      <section className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold text-[#3d1b80] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Licences & certifications
        </h3>
        <div className="space-y-3 rounded-lg border p-3 bg-gray-50/80">
          <Label>YCB registration number <span className="text-red-500">*</span></Label>
          <Input
            value={form.ycbRegistrationNumber}
            onChange={(e) => setForm((f) => ({ ...f, ycbRegistrationNumber: e.target.value }))}
          />
          <FieldError message={errors.ycbRegistrationNumber} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Validity status</Label>
              <Select
                value={form.ycbLicenseStatus}
                onValueChange={(v) => setForm((f) => ({ ...f, ycbLicenseStatus: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTRUCTOR_LICENSE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Admin comment</Label>
              <Textarea
                value={form.ycbAdminComment}
                onChange={(e) => setForm((f) => ({ ...f, ycbAdminComment: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border p-3 bg-gray-50/80">
          <Label>Yoga Alliance registration number <span className="text-red-500">*</span></Label>
          <Input
            value={form.yogaAllianceRegistrationNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, yogaAllianceRegistrationNumber: e.target.value }))
            }
          />
          <FieldError message={errors.yogaAllianceRegistrationNumber} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Validity status</Label>
              <Select
                value={form.yogaAllianceLicenseStatus}
                onValueChange={(v) => setForm((f) => ({ ...f, yogaAllianceLicenseStatus: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTRUCTOR_LICENSE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Admin comment</Label>
              <Textarea
                value={form.yogaAllianceAdminComment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, yogaAllianceAdminComment: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function EditInstructorModal({
  instructor,
  onUpdated,
}: {
  instructor: Instructor;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => instructorToForm(instructor));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateInstructorForm>["data"]) => {
      const res = await fetch(`/api/admin/instructors/${instructor.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json() as Promise<Instructor>;
    },
    onSuccess: (updated: Instructor) => {
      toast({
        title: "Instructor updated",
        description:
          updated.status === "active"
            ? "Status is now Active — ready for session scheduling."
            : getInstructorStatusLabel(updated.status) +
              (updated.statusNotes ? `: ${updated.statusNotes}` : ""),
      });
      setOpen(false);
      onUpdated();
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Could not update instructor", description: e.message, variant: "destructive" });
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setForm(instructorToForm(instructor));
      setErrors({});
    }
  }

  async function onQrFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await compressImageForUpload(file);
      setForm((f) => ({ ...f, onboardingQrImageUrl: dataUrl }));
    } catch (err) {
      toast({
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Try a smaller image",
        variant: "destructive",
      });
    }
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const v = validateInstructorForm(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    updateMutation.mutate(v.data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-2">
          <Pencil className="w-4 h-4 mr-2" /> Edit details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit instructor — {instructor.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitForm} className="space-y-6">
          <FormErrorSummary errors={errors} />
          <InstructorProfileForm
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
            fileRef={fileRef}
            onQrFile={onQrFile}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-[#3d1b80] hover:bg-[#2d1260] text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateInstructorModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [created, setCreated] = useState<Instructor | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateInstructorForm>["data"]) => {
      const res = await fetch("/api/instructors", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json() as Promise<Instructor>;
    },
    onSuccess: (instructor) => {
      setCreated(instructor);
      setStep("verify");
      toast({
        title: "Instructor profile created",
        description: "Complete email and phone verification to activate.",
      });
      onCreated();
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Could not create instructor", description: e.message, variant: "destructive" });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/instructors/${id}/send-email-otp`, {
        method: "POST",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification email sent", description: "Check the instructor inbox for the 6-digit code." });
    },
    onError: (e: Error) => {
      toast({ title: "Could not send code", description: e.message, variant: "destructive" });
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async ({ id, otpCode }: { id: string; otpCode: string }) => {
      const res = await fetch(`/api/admin/instructors/${id}/verify-email-otp`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ otp: otpCode }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json() as Promise<Instructor>;
    },
    onSuccess: (instructor) => {
      setCreated(instructor);
      toast({
        title: "Email verified",
        description:
          instructor.status === "active"
            ? "Instructor is now active and available for sessions."
            : instructor.statusNotes ?? undefined,
      });
    },
    onError: (e: Error) => {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    },
  });

  const verifyPhoneManualMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/instructors/${id}/verify-phone/manual`, {
        method: "POST",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json() as Promise<Instructor>;
    },
    onSuccess: (instructor) => {
      setCreated(instructor);
      toast({
        title: "Phone marked verified",
        description:
          instructor.status === "active"
            ? "Instructor is now active and available for sessions."
            : instructor.statusNotes ?? "Replace with SMS gateway verification when integrated.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Could not verify phone", description: e.message, variant: "destructive" });
    },
  });

  function resetModal() {
    setStep("form");
    setCreated(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setOtp("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetModal();
  }

  async function onQrFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await compressImageForUpload(file);
      setForm((f) => ({ ...f, onboardingQrImageUrl: dataUrl }));
      setErrors((e) => {
        const { onboardingQrImageUrl: _, ...rest } = e;
        return rest;
      });
    } catch (err) {
      toast({
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Try a smaller image",
        variant: "destructive",
      });
    }
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const v = validateInstructorForm(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    createMutation.mutate(v.data);
  }

  const instructor = created;
  const checklist = instructor
    ? {
        qr: !!instructor.onboardingQrImageUrl,
        email: instructor.emailVerified,
        phone: instructor.phoneVerified,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
          <Plus className="w-4 h-4 mr-2" /> Onboard Instructor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Instructor onboarding" : "Verification checklist"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={submitForm} className="space-y-6">
            <FormErrorSummary errors={errors} />
            <p className="text-xs text-gray-500">
              One-off onboarding QR is separate from per-session payment QR in New Session.
            </p>
            <InstructorProfileForm
              form={form}
              setForm={setForm}
              errors={errors}
              setErrors={setErrors}
              fileRef={fileRef}
              onQrFile={onQrFile}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#3d1b80] hover:bg-[#2d1260] text-white"
              >
                {createMutation.isPending ? "Saving..." : "Create & verify"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          instructor && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{instructor.name}</p>
                  <p className="text-sm text-gray-500">{instructor.email}</p>
                </div>
                <Badge variant={statusBadgeVariant(instructor.status)}>
                  {getInstructorStatusLabel(instructor.status)}
                </Badge>
              </div>

              <div className="rounded-lg border p-4 space-y-2 bg-[#faf8ff]">
                <p className="text-sm font-medium text-[#3d1b80]">Onboarding checklist</p>
                {checklist && (
                  <>
                    <ChecklistItem done={checklist.qr} label="Onboarding QR uploaded" />
                    <ChecklistItem done={checklist.email} label="Email verified (OTP)" />
                    <ChecklistItem done={checklist.phone} label="Phone verified" />
                  </>
                )}
              </div>

              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4 text-[#3d1b80]" /> Email verification
                </div>
                {!instructor.emailVerified ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sendOtpMutation.isPending}
                      onClick={() => sendOtpMutation.mutate(instructor.id)}
                    >
                      Send OTP to {instructor.email}
                    </Button>
                    <div className="flex gap-2">
                      <Input
                        placeholder="6-digit code"
                        value={otp}
                        maxLength={6}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      />
                      <Button
                        type="button"
                        className="bg-[#3d1b80] text-white shrink-0"
                        disabled={verifyEmailMutation.isPending || otp.length !== 6}
                        onClick={() =>
                          verifyEmailMutation.mutate({ id: instructor.id, otpCode: otp })
                        }
                      >
                        Verify
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-green-700">Email verified</p>
                )}
              </div>

              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="w-4 h-4 text-[#3d1b80]" /> Phone verification
                </div>
                {!instructor.phoneVerified ? (
                  <>
                    <Button type="button" variant="outline" size="sm" disabled title="SMS gateway coming soon">
                      Verify phone (SMS) — coming soon
                    </Button>
                    <p className="text-xs text-gray-500">
                      Placeholder until SMS gateway is integrated. Use manual verify for UAT.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={verifyPhoneManualMutation.isPending}
                      onClick={() => verifyPhoneManualMutation.mutate(instructor.id)}
                    >
                      Mark phone verified (manual)
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-green-700">Phone verified</p>
                )}
              </div>

              {instructor.status === "active" && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-900 text-sm">
                    Instructor is active and can be assigned to sessions.
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InstructorStatusActions({
  instructor,
  onUpdated,
}: {
  instructor: Instructor;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (status: InstructorOperationalStatus) => {
      const res = await fetch(`/api/admin/instructors/${instructor.id}/status`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status, statusNotes: null }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Instructor status updated" });
      onUpdated();
    },
    onError: (e: Error) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  if (instructor.status === "suspended" || instructor.status === "blacklisted") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate("active")}
      >
        Re-activate instructor
      </Button>
    );
  }

  if (instructor.status === "active") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("suspended")}
        >
          Suspend
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("blacklisted")}
        >
          Blacklist
        </Button>
      </div>
    );
  }

  return null;
}
