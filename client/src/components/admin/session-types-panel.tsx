import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, BookOpen, Upload, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError, validateClassTypeForm } from "@/lib/admin-api";
import { MAX_TEXT_LENGTH, limitTextInput, PLACEHOLDER_OWNER_CANCEL_OTP, normalizeOwnerCancelOtpInput, isOwnerCancelFormSubmittable, ownerCancelFormBlocker } from "@shared/input-limits";
import { FormErrorSummary } from "@/components/admin/field-error";
import { CLASS_INTENSITIES, DEFAULT_CLASS_INTENSITY, STRICT_NO_TO_MAX_LENGTH } from "@shared/schema";
import { parseStrictNoToTags, strictNoToCounterState } from "@/lib/strict-no-to";
import { compressImageForUpload, validateAdminImageFile, ADMIN_IMAGE_MAX_FILE_BYTES } from "@/lib/image-upload";

export interface ClassType {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: number;
  imageUrl: string | null;
  intensity: string;
  strictNoTo?: string | null;
}

type ClassTypeForm = {
  name: string;
  description: string;
  price: string;
  duration: string;
  imageUrl: string;
  intensity: string;
  strictNoTo: string;
};

const EMPTY_CLASS_TYPE_FORM: ClassTypeForm = {
  name: "",
  description: "",
  price: "",
  duration: "60",
  imageUrl: "",
  intensity: DEFAULT_CLASS_INTENSITY,
  strictNoTo: "",
};

function classTypeToForm(ct: ClassType): ClassTypeForm {
  return {
    name: ct.name,
    description: ct.description,
    price: String(ct.price),
    duration: String(ct.duration),
    imageUrl: ct.imageUrl ?? "",
    intensity: ct.intensity ?? DEFAULT_CLASS_INTENSITY,
    strictNoTo: ct.strictNoTo ?? "",
  };
}

function ClassTypeFormFields({
  form,
  setForm,
  errors,
}: {
  form: ClassTypeForm;
  setForm: React.Dispatch<React.SetStateAction<ClassTypeForm>>;
  errors: Record<string, string>;
}) {
  return (
    <>
      <FormErrorSummary errors={errors} />
      <div>
        <Label>
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Hatha Yoga"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label>
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Brief description..."
          rows={3}
          className={errors.description ? "border-red-500" : ""}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>
            Price (INR) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={errors.price ? "border-red-500" : ""}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>
        <div>
          <Label>
            Duration (minutes) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            className={errors.duration ? "border-red-500" : ""}
          />
          {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
        </div>
      </div>
      <StrictNoToAdminField
        value={form.strictNoTo}
        onChange={(strictNoTo) => setForm((f) => ({ ...f, strictNoTo }))}
        error={errors.strictNoTo}
      />
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label>
            Intensity <span className="text-red-500">*</span>
          </Label>
          <select
            value={form.intensity}
            onChange={(e) => setForm((f) => ({ ...f, intensity: e.target.value }))}
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${
              errors.intensity ? "border-red-500" : "border-input"
            }`}
          >
            {CLASS_INTENSITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {errors.intensity && <p className="text-xs text-red-500 mt-1">{errors.intensity}</p>}
        </div>
        <div>
          <Label>
            Session image <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Required. JPEG, PNG, or WebP up to 2 MB, or paste an https:// image URL.
          </p>
          <ClassTypeImageField
            imageUrl={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            error={errors.imageUrl}
          />
        </div>
      </div>
    </>
  );
}

function StrictNoToAdminField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const tags = parseStrictNoToTags(value);
  const { isOverLimit, isNearLimit, counterColor } = strictNoToCounterState(value.length);

  return (
    <div className="rounded-2xl border border-primary/12 bg-white/65 p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <Label className="text-xs font-extrabold uppercase tracking-wide text-primary">
          Not Suitable
        </Label>
        <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] text-red-900">
          New field
        </Badge>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Enter conditions separated by commas — e.g. <em>Pregnant women, Asthmatic, Low BP</em>. For
        edge cases not covered here, the contact-team link on the booking page handles the rest.
      </p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, STRICT_NO_TO_MAX_LENGTH + 10))}
        rows={2}
        placeholder="Pregnant women, Asthmatic, Low BP…"
        className={error || isOverLimit ? "border-red-500" : ""}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="text-xs">
          {isOverLimit ? (
            <span className="font-semibold text-red-700">Exceeds limit — trim to save</span>
          ) : isNearLimit ? (
            <span className="font-medium text-amber-700">Approaching limit</span>
          ) : (
            <span className="text-muted-foreground">
              Tip: use the contact-team link for anything longer
            </span>
          )}
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: counterColor }}>
          {value.length} / {STRICT_NO_TO_MAX_LENGTH}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {tags.length > 0 && (
        <div className="mt-3 border-t border-primary/10 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Preview — member view
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                style={{
                  background: "rgba(186,26,26,0.07)",
                  borderColor: "rgba(186,26,26,0.16)",
                  color: "#93000a",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassTypeImageField({
  imageUrl,
  onChange,
  error,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [filePickError, setFilePickError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) setAttachedFileName(null);
  }, [imageUrl]);

  const handleImageChange = (url: string) => {
    if (!url) setAttachedFileName(null);
    onChange(url);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={isUploading}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fileErr = validateAdminImageFile(file);
          if (fileErr) {
            setFilePickError(fileErr);
            toast({
              title: file.size > ADMIN_IMAGE_MAX_FILE_BYTES ? "Image too large" : "Invalid image",
              description: fileErr,
              variant: "destructive",
            });
            return;
          }
          setFilePickError(null);
          setAttachedFileName(file.name);
          setIsUploading(true);
          try {
            const dataUrl = await compressImageForUpload(file);
            handleImageChange(dataUrl);
            const sizeKb = Math.round(file.size / 1024);
            toast({
              title: "Image attached",
              description: `${file.name} (${sizeKb} KB) ready to save.`,
            });
          } catch (err) {
            setAttachedFileName(null);
            toast({
              title: "Could not process image",
              description: err instanceof Error ? err.message : "Try a different file.",
              variant: "destructive",
            });
          } finally {
            setIsUploading(false);
            e.target.value = "";
          }
        }}
      />
      {isUploading && (
        <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>
            Processing{attachedFileName ? ` ${attachedFileName}` : " image"}…
          </span>
        </div>
      )}
      {imageUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={imageUrl}
            alt="Session type preview"
            className="h-20 w-28 rounded-lg object-cover border"
          />
          <div className="flex flex-col gap-2 min-w-0">
            {attachedFileName && (
              <p className="text-xs text-muted-foreground truncate" title={attachedFileName}>
                {attachedFileName}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1" /> Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => handleImageChange("")}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isUploading}
          onClick={() => fileRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" /> Upload image
            </>
          )}
        </Button>
      )}
      <Input
        value={imageUrl.startsWith("data:") ? "" : imageUrl}
        onChange={(e) => {
          setAttachedFileName(null);
          onChange(e.target.value);
        }}
        placeholder="Or paste https:// image URL"
        className={error ? "border-red-500" : ""}
        disabled={isUploading}
      />
      {filePickError && (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {filePickError}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CreateClassTypeButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClassTypeForm>(EMPTY_CLASS_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateClassTypeForm>["data"]) => {
      const res = await fetch("/api/class-types", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session type created", description: `${form.name} added.` });
      setForm(EMPTY_CLASS_TYPE_FORM);
      setErrors({});
      setOpen(false);
      onCreated();
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Could not create", description: e.message, variant: "destructive" });
    },
  });

  function submit() {
    const v = validateClassTypeForm(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Session Type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Session Type</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4 mt-2"
        >
          <ClassTypeFormFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] text-white">
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditClassTypeDialog({
  classType,
  onUpdated,
}: {
  classType: ClassType;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClassTypeForm>(() => classTypeToForm(classType));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateClassTypeForm>["data"]) => {
      const res = await fetch(`/api/class-types/${classType.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session type updated" });
      setOpen(false);
      onUpdated();
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  function submit() {
    const v = validateClassTypeForm(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(classTypeToForm(classType));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="w-4 h-4 mr-1" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Session Type</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4 mt-2"
        >
          <ClassTypeFormFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] text-white">
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RetireClassTypeButton({
  classType,
  onRetired,
}: {
  classType: ClassType;
  onRetired: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [ownerOtp, setOwnerOtp] = useState("");

  const reset = () => {
    setReason("");
    setOwnerOtp("");
  };

  const canSubmit = isOwnerCancelFormSubmittable(reason, ownerOtp);
  const submitBlocker = ownerCancelFormBlocker(reason, ownerOtp);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/class-types/${classType.id}/retire`, {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: reason.trim(),
          ownerOtp: normalizeOwnerCancelOtpInput(ownerOtp) || ownerOtp.trim(),
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: { message?: string }) => {
      toast({ title: "Session type removed", description: data.message });
      reset();
      setOpen(false);
      onRetired();
    },
    onError: (e: Error) => {
      toast({ title: "Could not remove session type", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-1" /> Remove
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {classType.name}?</DialogTitle>
          <DialogDescription>
            All upcoming sessions for this type will be cancelled. Members with bookings will be
            notified by email, SMS, and WhatsApp (SMS/WhatsApp are placeholders until those channels
            go live).
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-800" />
          <AlertDescription className="text-amber-950 text-sm">
            <strong>Owner OTP (placeholder):</strong> use <strong>000000</strong> after confirming
            with the studio owner. Live SMS OTP will replace this later.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`retire-reason-${classType.id}`}>Reason for removal</Label>
            <Textarea
              id={`retire-reason-${classType.id}`}
              value={reason}
              maxLength={MAX_TEXT_LENGTH.cancelReason}
              onChange={(e) => setReason(limitTextInput(e.target.value, MAX_TEXT_LENGTH.cancelReason))}
              placeholder="e.g. This discipline is no longer offered at the studio"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`retire-otp-${classType.id}`}>Owner OTP</Label>
            <div className="flex gap-2">
              <Input
                id={`retire-otp-${classType.id}`}
                value={ownerOtp}
                maxLength={MAX_TEXT_LENGTH.ownerOtp}
                onChange={(e) =>
                  setOwnerOtp(
                    limitTextInput(normalizeOwnerCancelOtpInput(e.target.value), MAX_TEXT_LENGTH.ownerOtp),
                  )
                }
                placeholder={PLACEHOLDER_OWNER_CANCEL_OTP}
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
                className="font-mono tracking-widest"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setOwnerOtp(PLACEHOLDER_OWNER_CANCEL_OTP)}
              >
                Use {PLACEHOLDER_OWNER_CANCEL_OTP}
              </Button>
            </div>
          </div>
        </div>

        {submitBlocker && !mutation.isPending ? (
          <p className="text-xs text-amber-800">{submitBlocker}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Keep type
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending || !canSubmit}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Removing…" : "Remove session type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SessionTypesPanel({
  classTypes,
  totalCount,
  isLoading,
  isSuperAdmin,
  onDataChange,
}: {
  classTypes: ClassType[];
  /** Full count across all pages (when paginated). */
  totalCount?: number;
  isLoading: boolean;
  isSuperAdmin?: boolean;
  onDataChange: () => void;
}) {
  const displayTotal = totalCount ?? classTypes.length;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-sm text-muted-foreground">
          Yoga disciplines shown on the public site ({displayTotal} total)
        </p>
        <CreateClassTypeButton onCreated={onDataChange} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d1b80]" />
        </div>
      ) : classTypes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No session types yet</p>
          <p className="text-sm mt-1">Create types before scheduling sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classTypes.map((ct) => (
            <div key={ct.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                {ct.imageUrl && (
                  <img
                    src={ct.imageUrl}
                    alt={ct.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{ct.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ct.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[#3d1b80] border-[#3d1b80]">
                      Rs.{ct.price}
                    </Badge>
                    <Badge variant="outline" className="text-gray-600">
                      {ct.duration} min
                    </Badge>
                    {ct.intensity && (
                      <Badge variant="outline" className="text-[#9a4612] border-[#9a4612]">
                        {ct.intensity}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <EditClassTypeDialog classType={ct} onUpdated={onDataChange} />
                    {isSuperAdmin ? (
                      <RetireClassTypeButton classType={ct} onRetired={onDataChange} />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
