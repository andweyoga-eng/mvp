import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, QrCode, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import { adminPaymentQrCodeSchema } from "@shared/admin-validation";
import { countryCodeOptions } from "@/lib/mobile-validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PaymentQrCode {
  id: string;
  name: string;
  imageUrl: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
}

function getCountryPhoneLimits(countryCode: string): { minLength: number; maxLength: number } {
  const country = countryCodeOptions.find((c) => c.value === countryCode);
  return {
    minLength: country?.minLength ?? 10,
    maxLength: country?.maxLength ?? 10,
  };
}

function clampLocalPhoneDigits(digits: string, countryCode: string): string {
  const { maxLength } = getCountryPhoneLimits(countryCode);
  return digits.replace(/\D/g, "").slice(0, maxLength);
}

function buildFullContactPhone(localDigits: string, countryCode: string): string {
  const local = localDigits.replace(/\D/g, "");
  return `${countryCode}${local}`;
}

/** Admin QR contact: length by country + shared server schema (no member spam heuristics). */
function validateQrContactFields(phone: string, email: string, _countryCode: string) {
  const local = phone.replace(/\D/g, "").slice(0, 10);

  let phoneErr: string | undefined;
  if (!local) {
    phoneErr = "Contact phone is required";
  } else if (local.length !== 10) {
    phoneErr = "Enter a 10-digit phone number";
  }

  const parsed = adminPaymentQrCodeSchema.safeParse({
    name: "x",
    imageUrl: "data:image/png;base64,iVBORw0KGgo=",
    contactPhone: local,
    contactEmail: email.trim(),
  });

  if (!phoneErr && !parsed.success) {
    phoneErr = parsed.error.errors.find((e) => e.path[0] === "contactPhone")?.message;
  }

  const emailErr = !parsed.success
    ? parsed.error.errors.find((e) => e.path[0] === "contactEmail")?.message
    : undefined;

  return { phoneErr, emailErr, ok: !phoneErr && !emailErr };
}

/** Resize and compress so base64 JSON stays under the server body limit. */
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

      const encode = (quality: number) => canvas.toDataURL("image/jpeg", quality);
      let quality = 0.85;
      let dataUrl = encode(quality);
      // Keep payload small enough for express.json (base64 expands ~33%)
      while (dataUrl.length > 900_000 && quality > 0.45) {
        quality -= 0.1;
        dataUrl = encode(quality);
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

function QrCodeForm({
  name,
  imageUrl,
  contactPhone,
  contactEmail,
  phoneCountryCode,
  phoneError,
  emailError,
  onNameChange,
  onImageChange,
  onContactPhoneChange,
  onContactEmailChange,
  onPhoneCountryCodeChange,
}: {
  name: string;
  imageUrl: string;
  contactPhone: string;
  contactEmail: string;
  phoneCountryCode: string;
  phoneError?: string;
  emailError?: string;
  onNameChange: (v: string) => void;
  onImageChange: (v: string) => void;
  onContactPhoneChange: (v: string) => void;
  onContactEmailChange: (v: string) => void;
  onPhoneCountryCodeChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div>
        <Label>
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. UPI, Primary account"
        />
      </div>
      <div>
        <Label>
          QR image <span className="text-red-500">*</span>
        </Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              toast({
                title: "Invalid file",
                description: "Please choose an image file (PNG, JPG, etc.).",
                variant: "destructive",
              });
              return;
            }
            if (file.size > 5_000_000) {
              toast({
                title: "File too large",
                description: "Please use an image under 5MB.",
                variant: "destructive",
              });
              return;
            }
            try {
              const dataUrl = await compressImageForUpload(file);
              onImageChange(dataUrl);
            } catch {
              toast({
                title: "Could not process image",
                description: "Try a different QR image file.",
                variant: "destructive",
              });
            } finally {
              e.target.value = "";
            }
          }}
        />
        <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          {imageUrl ? "Replace QR image" : "Upload QR image"}
        </Button>
        {imageUrl && (
          <img src={imageUrl} alt="QR preview" className="mt-3 max-h-48 mx-auto border rounded-lg" />
        )}
      </div>
      <div>
        <Label>
          Contact phone <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2 mt-1">
          <Select
            modal={false}
            value={phoneCountryCode}
            onValueChange={(v) => {
              onPhoneCountryCodeChange(v);
              onContactPhoneChange(clampLocalPhoneDigits(contactPhone, v));
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {countryCodeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.flag} {o.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="tel"
            inputMode="numeric"
            value={contactPhone}
            onChange={(e) =>
              onContactPhoneChange(clampLocalPhoneDigits(e.target.value, phoneCountryCode))
            }
            maxLength={10}
            className={phoneError ? "border-red-500" : ""}
          />
        </div>
        {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
      </div>
      <div>
        <Label>
          Contact email <span className="text-red-500">*</span>
        </Label>
        <Input
          type="email"
          value={contactEmail}
          onChange={(e) => onContactEmailChange(e.target.value)}
          placeholder="payments@example.com"
          className={emailError ? "border-red-500 mt-1" : "mt-1"}
        />
        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
      </div>
    </div>
  );
}

export function CreateQrButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const digits = contactPhone.replace(/\D/g, "").slice(0, 10);
      const res = await fetch("/api/admin/payment-qr-codes", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          name,
          imageUrl,
          contactPhone: digits,
          contactEmail,
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "QR code saved" });
      setName("");
      setImageUrl("");
      setContactPhone("");
      setContactEmail("");
      setFieldErrors({});
      setOpen(false);
      onCreated();
    },
    onError: (e: Error) => {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const { phoneErr, emailErr, ok } = validateQrContactFields(
      contactPhone,
      contactEmail,
      phoneCountryCode,
    );
    setFieldErrors({ phone: phoneErr, email: emailErr });
    if (!name.trim() || !imageUrl) {
      toast({ title: "Missing fields", description: "Name and QR image are required.", variant: "destructive" });
      return;
    }
    if (!ok) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="w-full bg-[#3d1b80] text-white sm:w-auto"
          data-testid="add-qr-code-button"
        >
          <Plus className="w-4 h-4 mr-2" /> Add QR Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Payment QR Code</DialogTitle>
        </DialogHeader>
        <QrCodeForm
          name={name}
          imageUrl={imageUrl}
          contactPhone={contactPhone}
          contactEmail={contactEmail}
          phoneCountryCode={phoneCountryCode}
          phoneError={fieldErrors.phone}
          emailError={fieldErrors.email}
          onNameChange={setName}
          onImageChange={setImageUrl}
          onContactPhoneChange={setContactPhone}
          onContactEmailChange={setContactEmail}
          onPhoneCountryCodeChange={setPhoneCountryCode}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#3d1b80] text-white"
            disabled={!name.trim() || !imageUrl || mutation.isPending}
            onClick={handleSave}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function splitStoredPhone(stored: string): { countryCode: string; local: string } {
  const match = countryCodeOptions
    .map((o) => o.value)
    .sort((a, b) => b.length - a.length)
    .find((cc) => stored.startsWith(cc));
  if (match) {
    return { countryCode: match, local: stored.slice(match.length).replace(/\D/g, "") };
  }
  return { countryCode: "+91", local: stored.replace(/\D/g, "") };
}

function EditQrDialog({ qr, onUpdated }: { qr: PaymentQrCode; onUpdated: () => void }) {
  const initialPhone = splitStoredPhone(qr.contactPhone ?? "");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(qr.name);
  const [imageUrl, setImageUrl] = useState(qr.imageUrl);
  const [contactPhone, setContactPhone] = useState(initialPhone.local);
  const [contactEmail, setContactEmail] = useState(qr.contactEmail ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialPhone.countryCode);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const digits = contactPhone.replace(/\D/g, "").slice(0, 10);
      const res = await fetch(`/api/admin/payment-qr-codes/${qr.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({
          name,
          imageUrl,
          contactPhone: digits,
          contactEmail,
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "QR code updated" });
      setOpen(false);
      onUpdated();
    },
    onError: (e: Error) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          const p = splitStoredPhone(qr.contactPhone ?? "");
          setName(qr.name);
          setImageUrl(qr.imageUrl);
          setContactPhone(p.local);
          setPhoneCountryCode(p.countryCode);
          setContactEmail(qr.contactEmail ?? "");
          setFieldErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="w-4 h-4 mr-1" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit QR Code</DialogTitle>
        </DialogHeader>
        <QrCodeForm
          name={name}
          imageUrl={imageUrl}
          contactPhone={contactPhone}
          contactEmail={contactEmail}
          phoneCountryCode={phoneCountryCode}
          phoneError={fieldErrors.phone}
          emailError={fieldErrors.email}
          onNameChange={setName}
          onImageChange={setImageUrl}
          onContactPhoneChange={setContactPhone}
          onContactEmailChange={setContactEmail}
          onPhoneCountryCodeChange={setPhoneCountryCode}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#3d1b80] text-white"
            disabled={!name.trim() || !imageUrl || mutation.isPending}
            onClick={() => {
              const { phoneErr, emailErr, ok } = validateQrContactFields(
                contactPhone,
                contactEmail,
                phoneCountryCode,
              );
              setFieldErrors({ phone: phoneErr, email: emailErr });
              if (!ok) return;
              mutation.mutate();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Left-aligned actions below the QR Codes → Create sub-tab. */
export function QrCodesCreateToolbar({ onCreated }: { onCreated: () => void }) {
  return (
    <div
      className="mb-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-start"
      data-testid="qr-codes-create-toolbar"
    >
      <CreateQrButton onCreated={onCreated} />
    </div>
  );
}

export function PaymentQrCodesPanel({
  qrCodes,
  isLoading,
  onDataChange,
}: {
  qrCodes: PaymentQrCode[];
  isLoading: boolean;
  onDataChange?: () => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payment-qr-codes/${id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
    },
    onSuccess: () => {
      toast({ title: "QR code removed" });
      onDataChange?.();
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        One-time QR uploads. Reuse by name when scheduling sessions ({qrCodes.length} saved)
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d1b80]" />
        </div>
      ) : qrCodes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payment QR codes yet</p>
          <p className="text-sm mt-1">Upload QR codes once, then select them when creating sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="border rounded-lg p-4 bg-white">
              <img src={qr.imageUrl} alt={qr.name} className="w-full max-h-40 object-contain mb-3" />
              <p className="font-semibold text-gray-900">{qr.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{qr.contactEmail}</p>
              <p className="text-xs text-muted-foreground">{qr.contactPhone}</p>
              <div className="flex gap-2 mt-3">
                <EditQrDialog qr={qr} onUpdated={() => onDataChange?.()} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {qr.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sessions already using this QR will keep their link until edited.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600"
                        onClick={() => deleteMutation.mutate(qr.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
