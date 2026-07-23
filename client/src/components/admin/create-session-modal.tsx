import { useRef, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MAX_WEEKLY_OCCURRENCES, WEEKDAY_LABELS } from "@shared/session-schedule";
import { FLEXI_BOOKING_ENABLED, flexiTooltipCopy } from "@shared/flexi-mode";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError, validateSessionForm } from "@/lib/admin-api";
import { clampIndianPhoneDigits } from "@/lib/admin-phone-input";
import { FieldError, FormErrorSummary } from "@/components/admin/field-error";
import { SessionDateTimePicker } from "@/components/admin/session-datetime-picker";
import { formatIstDatetimeLocal } from "@shared/ist-datetime";
import type { PaymentQrCode } from "@/components/admin/payment-qr-codes-panel";

export interface SessionFormClassType {
  id: string;
  name: string;
  price: string;
  duration: number;
}

export interface SessionFormInstructor {
  id: string;
  name: string;
  /** When true, shown in the list but cannot be selected (onboarding / suspension). */
  disabled?: boolean;
}

const SESSION_FREQUENCY_LABELS: Record<string, string> = {
  recurring: "Recurring",
  drop_in: "Drop in",
  trial: "Trial session",
};

const DELIVERY_MODE_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  hybrid: "Hybrid",
};

const SESSION_TYPE_OPTIONS: Array<{
  value: "recurring" | "drop_in" | "trial";
  label: string;
  description: string;
}> = [
  {
    value: "recurring",
    label: "Repeat",
    description: "Regular batch sessions",
  },
  {
    value: "drop_in",
    label: "Drop in",
    description: "Flexible one-off or spread sessions",
  },
  {
    value: "trial",
    label: "Trial session",
    description: "Intro sessions for new yogis",
  },
];

const MEET_LINK_PREFIX = "https://";

const INITIAL_FORM = {
  classTypeId: "",
  instructorId: "",
  date: "",
  maxCapacity: "20",
  googleMeetLink: MEET_LINK_PREFIX,
  deliveryMode: "online" as "online" | "offline" | "hybrid",
  sessionFrequency: "recurring" as "recurring" | "drop_in" | "trial",
  venueAddress: "",
  venueMapLink: "",
  venueContactPhone: "",
  paymentMethod: "razorpay_link" as "razorpay_link" | "razorpay_gateway" | "qr",
  razorpayLink: "",
  paymentQrCodeId: "",
  qrContactPhone: "",
  qrContactEmail: "",
  publishMode: "now" as "now" | "later",
  publishAt: "",
  recurrenceKind: "once" as "once" | "weekly",
  occurrenceCount: "4",
  recurrenceWeekdays: [] as number[],
  flexiEnabled: false,
  flexiSelectionCount: "1",
};

const MAX_QR_LOCAL_PHONE_DIGITS = 10;

function meetLinkRequiredForDeliveryMode(mode: "online" | "offline" | "hybrid"): boolean {
  return mode === "online" || mode === "hybrid";
}

function countLocalPhoneDigits(phone: string): number {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > MAX_QR_LOCAL_PHONE_DIGITS) {
    digits = digits.slice(2);
  }
  return digits.length;
}

function applyQrContactSelection(qr: PaymentQrCode): {
  fields: Partial<typeof INITIAL_FORM>;
  notice: string | null;
} {
  const localDigits = countLocalPhoneDigits(qr.contactPhone ?? "");
  if (localDigits > MAX_QR_LOCAL_PHONE_DIGITS) {
    return {
      fields: {
        paymentQrCodeId: qr.id,
        qrContactPhone: "",
        qrContactEmail: "",
      },
      notice: `“${qr.name}” has a phone number with more than ${MAX_QR_LOCAL_PHONE_DIGITS} digits. Update the contact phone under QR Codes → Create, then select this QR again.`,
    };
  }
  return {
    fields: {
      paymentQrCodeId: qr.id,
      qrContactPhone: qr.contactPhone ?? "",
      qrContactEmail: qr.contactEmail ?? "",
    },
    notice: null,
  };
}

export interface AdminClassSessionForEdit {
  id: string;
  classTypeId: string;
  instructorId: string;
  date: string;
  maxCapacity: number;
  googleMeetLink?: string | null;
  deliveryMode?: string | null;
  sessionFrequency?: string | null;
  venueAddress?: string | null;
  venueMapLink?: string | null;
  venueContactPhone?: string | null;
  paymentMethod?: string | null;
  razorpayLink?: string | null;
  paymentQrCodeId?: string | null;
  qrContactPhone?: string | null;
  qrContactEmail?: string | null;
  status?: string;
  publishedAt?: string | null;
  recurrenceKind?: string | null;
  recurrenceWeekdays?: number[];
  occurrenceCount?: string;
  seriesId?: string | null;
  seriesWeekCount?: number | null;
  flexiEnabled?: boolean | null;
  flexiSelectionCount?: number | null;
}

function toDatetimeLocalValue(iso: string): string {
  return formatIstDatetimeLocal(iso);
}

function meetLinkForForm(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v || MEET_LINK_PREFIX;
}

function meetLinkForSubmit(value: string): string {
  const v = value.trim();
  if (!v || v === MEET_LINK_PREFIX) return "";
  return v;
}

function sessionToForm(sess: AdminClassSessionForEdit): typeof INITIAL_FORM {
  const publishedAt = sess.publishedAt ? new Date(sess.publishedAt) : null;
  const publishLater =
    publishedAt && publishedAt.getTime() > Date.now() + 60_000 && sess.status === "scheduled";
  return {
    classTypeId: sess.classTypeId,
    instructorId: sess.instructorId,
    date: toDatetimeLocalValue(sess.date),
    maxCapacity: String(sess.maxCapacity),
    googleMeetLink: meetLinkForForm(sess.googleMeetLink),
    deliveryMode: (sess.deliveryMode as "online" | "offline" | "hybrid") ?? "online",
    sessionFrequency:
      (sess.sessionFrequency as "recurring" | "drop_in" | "trial") ?? "recurring",
    venueAddress: sess.venueAddress ?? "",
    venueMapLink: sess.venueMapLink ?? "",
    venueContactPhone: clampIndianPhoneDigits(sess.venueContactPhone ?? ""),
    paymentMethod: (sess.paymentMethod ?? "razorpay_link") as typeof INITIAL_FORM.paymentMethod,
    razorpayLink: sess.razorpayLink ?? "",
    paymentQrCodeId: sess.paymentQrCodeId ?? "",
    qrContactPhone: clampIndianPhoneDigits(sess.qrContactPhone ?? ""),
    qrContactEmail: sess.qrContactEmail ?? "",
    publishMode: publishLater ? "later" : "now",
    publishAt: publishLater && sess.publishedAt ? toDatetimeLocalValue(sess.publishedAt) : "",
    recurrenceKind:
      sess.recurrenceKind === "weekly" ? ("weekly" as const) : ("once" as const),
    occurrenceCount:
      sess.seriesWeekCount != null
        ? String(sess.seriesWeekCount)
        : (sess.occurrenceCount ?? "4"),
    recurrenceWeekdays: sess.recurrenceWeekdays ?? [],
    flexiEnabled: !!sess.flexiEnabled,
    flexiSelectionCount: String(
      sess.flexiSelectionCount ?? sess.recurrenceWeekdays?.length ?? 1,
    ),
  };
}

export function CreateSessionModal({
  classTypes,
  instructors,
  paymentQrCodes,
  onCreated,
  open: controlledOpen,
  onOpenChange,
  sessionToEdit = null,
  showTrigger = true,
  adminDefaultPhone = "",
}: {
  classTypes: SessionFormClassType[];
  instructors: SessionFormInstructor[];
  paymentQrCodes: PaymentQrCode[];
  onCreated?: (result?: { sessions?: Array<{ date: string | Date }> }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sessionToEdit?: AdminClassSessionForEdit | null;
  showTrigger?: boolean;
  adminDefaultPhone?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!sessionToEdit;
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [qrContactNotice, setQrContactNotice] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && sessionToEdit) {
      setForm(sessionToForm(sessionToEdit));
      setErrors({});
    } else if (open && !sessionToEdit) {
      setForm({ ...INITIAL_FORM, venueContactPhone: clampIndianPhoneDigits(adminDefaultPhone) });
      setErrors({});
      setQrContactNotice(null);
    }
  }, [open, sessionToEdit, adminDefaultPhone]);

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateSessionForm>["data"]) => {
      const body = {
        ...payload,
        date: payload!.date.toISOString(),
        publishedAt: payload!.publishedAt?.toISOString() ?? null,
        recurrenceKind: payload!.recurrenceKind,
        occurrenceCount: payload!.occurrenceCount,
        recurrenceWeekdays: payload!.recurrenceWeekdays,
        flexiEnabled: payload!.flexiEnabled,
        flexiSelectionCount: payload!.flexiSelectionCount,
      };
      const url = isEdit ? `/api/admin/classes/${sessionToEdit!.id}` : "/api/classes";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: (data: { sessions?: unknown[]; message?: string }) => {
      const count = data?.sessions?.length;
      toast({
        title: isEdit ? "Session updated" : "Session scheduled",
        description: isEdit
          ? "Changes saved."
          : count && count > 1
            ? `${count} sessions scheduled in this series.`
            : "Session has been created.",
      });
      setForm(INITIAL_FORM);
      setErrors({});
      setQrContactNotice(null);
      setOpen(false);
      onCreated?.(data as { sessions?: Array<{ date: string | Date }> });
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({
        title: isEdit ? "Could not update session" : "Could not create session",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  function formForValidation(overrides?: Partial<typeof form>) {
    const f = { ...form, ...overrides };
    return {
      ...f,
      googleMeetLink: meetLinkForSubmit(f.googleMeetLink),
      venueContactPhone: clampIndianPhoneDigits(f.venueContactPhone),
      qrContactPhone: clampIndianPhoneDigits(f.qrContactPhone),
    };
  }

  function runValidation(overrides?: Partial<typeof form>) {
    const v = validateSessionForm(formForValidation(overrides));
    if (!v.ok) {
      setErrors(v.errors);
      return null;
    }
    setErrors({});
    return v.data;
  }

  function submitSessionForm() {
    const v = validateSessionForm(formForValidation());
    if (!v.ok) {
      setErrors(v.errors);
      const n = Object.keys(v.errors).length;
      toast({
        title: "Check required fields",
        description: `Fix ${n} field${n === 1 ? "" : "s"} highlighted below.`,
        variant: "destructive",
      });
      requestAnimationFrame(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return;
    }
    setErrors({});
    mutation.mutate(v.data);
  }

  function clearFieldError(field: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const noClassTypes = classTypes.length === 0;
  const noInstructors = instructors.length === 0;
  const eligibleInstructors = instructors.filter((i) => !i.disabled);
  const noEligibleInstructors = instructors.length > 0 && eligibleInstructors.length === 0;
  const selectedClassType = classTypes.find((ct) => ct.id === form.classTypeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && !controlledOpen && (
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="w-full bg-[#bb5309] hover:bg-[#9a4508] text-white sm:w-auto"
            data-testid="create-session-open-button"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Session
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 flex flex-col max-h-[min(90vh,680px)] overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-2 shrink-0 border-b">
          <DialogTitle>{isEdit ? "Edit Session" : "Schedule a Session"}</DialogTitle>
          <DialogDescription className="text-left">
            {isEdit
              ? "Update this session. Date/time cannot change if members have already booked."
              : "Like a calendar event: one-time or weekly series. Manual entry today. Google Calendar sync later."}
          </DialogDescription>
        </DialogHeader>

        {(noClassTypes || noInstructors || noEligibleInstructors) ? (
          <div className="px-6 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {noClassTypes && "Create at least one Session Type first (Sessions → Session Type). "}
                {noInstructors && "Create at least one Instructor first (Instructors tab). "}
                {noEligibleInstructors &&
                  "Instructors exist but none are session-eligible yet. Complete onboarding verification or re-activate suspended instructors."}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitSessionForm();
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div ref={errorSummaryRef}>
                <FormErrorSummary errors={errors} />
              </div>

              {/* Row 1: catalog */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Session Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    modal={false}
                    value={form.classTypeId || undefined}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, classTypeId: v }));
                      clearFieldError("classTypeId");
                    }}
                  >
                    <SelectTrigger className={errors.classTypeId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select session type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classTypes.map((ct) => (
                        <SelectItem key={ct.id} value={ct.id}>
                          {ct.name} · Rs.{ct.price} / {ct.duration}min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.classTypeId} />
                </div>
                <div>
                  <Label>
                    Instructor <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    modal={false}
                    value={form.instructorId || undefined}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, instructorId: v }));
                      clearFieldError("instructorId");
                    }}
                  >
                    <SelectTrigger className={errors.instructorId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select instructor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map((ins) => (
                        <SelectItem
                          key={ins.id}
                          value={ins.id}
                          disabled={ins.disabled}
                        >
                          {ins.name}
                          {ins.disabled ? " (not eligible)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.instructorId} />
                </div>
                <div>
                  <Label>Session duration</Label>
                  <Input
                    value={selectedClassType?.duration ? String(selectedClassType.duration) : ""}
                    readOnly
                    placeholder="Duration in minutes"
                  />
                </div>
              </div>

              {isEdit && form.recurrenceKind === "weekly" && (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <Label className="text-sm font-semibold">Recurrence (series)</Label>
                  <p className="text-xs text-muted-foreground">
                    This session is part of a weekly series. Recurrence cannot be changed here;
                    edit individual session details below.
                  </p>
                  <div>
                    <Label className="mb-2 block text-sm">Repeat on</Label>
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAY_LABELS.map((label, day) => (
                        <label
                          key={day}
                          className="flex items-center gap-2 text-sm opacity-90"
                        >
                          <Checkbox checked={form.recurrenceWeekdays.includes(day)} disabled />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Series length: <span className="font-medium">{form.occurrenceCount}</span>{" "}
                    week(s)
                  </p>
                  {FLEXI_BOOKING_ENABLED ? (
                    <p className="text-sm text-muted-foreground">
                      Flexi Mode:{" "}
                      <span className="font-medium">
                        {form.flexiEnabled
                          ? `On · exactly ${form.flexiSelectionCount} weekly selection(s)`
                          : "Off"}
                      </span>
                    </p>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
                <div>
                  <Label>
                    Session type <span className="text-red-500">*</span>
                  </Label>
                  {isEdit ? (
                    <>
                      <Input
                        readOnly
                        value={
                          SESSION_FREQUENCY_LABELS[form.sessionFrequency] ??
                          form.sessionFrequency
                        }
                        className="bg-muted/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Session type is fixed after creation to protect bookings and guest checkout
                        rules.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {SESSION_TYPE_OPTIONS.map((option) => {
                        const checked = form.sessionFrequency === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                              checked
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(on) => {
                                if (!on) return;
                                setForm((f) => ({
                                  ...f,
                                  sessionFrequency: option.value,
                                }));
                              }}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <Label>
                    Session mode <span className="text-red-500">*</span>
                  </Label>
                  {isEdit ? (
                    <>
                      <Input
                        readOnly
                        value={
                          DELIVERY_MODE_LABELS[form.deliveryMode] ?? form.deliveryMode
                        }
                        className="bg-muted/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Delivery mode cannot be changed here after the session is created.
                      </p>
                    </>
                  ) : (
                    <Select
                      modal={false}
                      value={form.deliveryMode}
                      onValueChange={(v) => {
                        const nextMode = v as "online" | "offline" | "hybrid";
                        setForm((f) => ({
                          ...f,
                          deliveryMode: nextMode,
                        }));
                        clearFieldError("googleMeetLink");
                        clearFieldError("venueAddress");
                        clearFieldError("venueMapLink");
                        clearFieldError("venueContactPhone");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {!isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
                  <div className="sm:col-span-2">
                    <label className="flex items-start gap-3 rounded-md border p-3 bg-background">
                      <Checkbox
                        checked={form.recurrenceKind === "weekly"}
                        onCheckedChange={(on) => {
                          setForm((f) => ({
                            ...f,
                            recurrenceKind: on ? "weekly" : "once",
                            occurrenceCount: on ? (parseInt(f.occurrenceCount, 10) >= 2 ? f.occurrenceCount : "4") : "1",
                            recurrenceWeekdays: on ? f.recurrenceWeekdays : [],
                            flexiEnabled: on ? f.flexiEnabled : false,
                            flexiSelectionCount: on ? f.flexiSelectionCount : "1",
                          }));
                          clearFieldError("occurrenceCount");
                          clearFieldError("recurrenceWeekdays");
                          clearFieldError("flexiSelectionCount");
                        }}
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Repeat on multiple days/weeks</p>
                        <p className="text-xs text-muted-foreground">
                          Enable to spread this {SESSION_FREQUENCY_LABELS[form.sessionFrequency]?.toLowerCase() ?? "session"} across upcoming weeks.
                        </p>
                      </div>
                    </label>
                  </div>

                  {form.recurrenceKind === "weekly" && (
                    <>
                      <div>
                        <Label className="mb-2 block">
                          Repeat on <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex flex-wrap gap-3">
                          {WEEKDAY_LABELS.map((label, day) => {
                            const checked = form.recurrenceWeekdays.includes(day);
                            return (
                              <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(on) => {
                                    setForm((f) => {
                                      const set = new Set(f.recurrenceWeekdays);
                                      if (on) set.add(day);
                                      else set.delete(day);
                                      return {
                                        ...f,
                                        recurrenceWeekdays: [...set].sort((a, b) => a - b),
                                      };
                                    });
                                    clearFieldError("recurrenceWeekdays");
                                  }}
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                        <FieldError message={errors.recurrenceWeekdays} />
                      </div>
                      <div>
                        <Label>
                          For (weeks) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min={2}
                          max={MAX_WEEKLY_OCCURRENCES}
                          value={form.occurrenceCount}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, occurrenceCount: e.target.value }));
                            clearFieldError("occurrenceCount");
                          }}
                          className={errors.occurrenceCount ? "border-red-500" : ""}
                        />
                        <FieldError message={errors.occurrenceCount} />
                      </div>
                      {FLEXI_BOOKING_ENABLED ? (
                        <>
                          <div className="sm:col-span-2">
                            <label className="flex items-start gap-3 rounded-md border p-3 bg-background">
                              <Checkbox
                                checked={form.flexiEnabled}
                                onCheckedChange={(on) => {
                                  setForm((f) => ({
                                    ...f,
                                    flexiEnabled: !!on,
                                    flexiSelectionCount: String(
                                      Math.max(
                                        1,
                                        parseInt(f.flexiSelectionCount, 10) ||
                                          f.recurrenceWeekdays.length ||
                                          1,
                                      ),
                                    ),
                                  }));
                                  clearFieldError("flexiSelectionCount");
                                }}
                              />
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Flexi Mode</p>
                                <p className="text-xs text-muted-foreground">{flexiTooltipCopy()}</p>
                              </div>
                            </label>
                          </div>
                          {form.flexiEnabled ? (
                            <div>
                              <Label>
                                Exact weekly selections <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={7}
                                value={form.flexiSelectionCount}
                                onChange={(e) => {
                                  setForm((f) => ({ ...f, flexiSelectionCount: e.target.value }));
                                  clearFieldError("flexiSelectionCount");
                                }}
                                className={errors.flexiSelectionCount ? "border-red-500" : ""}
                              />
                              <FieldError message={errors.flexiSelectionCount} />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Registered members must choose exactly this many weekday/time slots when
                                they start Flexi checkout from this schedule.
                              </p>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              {/* Row 2: schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    {form.recurrenceKind === "weekly" && !isEdit
                      ? "First session: date & time (IST)"
                      : "Date & time (IST)"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <SessionDateTimePicker
                    id="session-date"
                    value={form.date}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, date: v }));
                      clearFieldError("date");
                    }}
                    onBlur={(date) => runValidation({ date })}
                    error={errors.date}
                  />
                </div>
                <div>
                  <Label>
                    Max Capacity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={form.maxCapacity}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, maxCapacity: e.target.value }));
                      clearFieldError("maxCapacity");
                    }}
                    onBlur={() => runValidation()}
                    className={errors.maxCapacity ? "border-red-500" : ""}
                  />
                  <FieldError message={errors.maxCapacity} />
                </div>
              </div>

              {/* Row 3: meet */}
              <div>
                <Label>
                  Google Meet Link
                  {meetLinkRequiredForDeliveryMode(form.deliveryMode) && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <Input
                  value={form.googleMeetLink}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next =
                      raw.length < MEET_LINK_PREFIX.length && MEET_LINK_PREFIX.startsWith(raw)
                        ? MEET_LINK_PREFIX
                        : raw.startsWith("http") || raw.startsWith(MEET_LINK_PREFIX)
                          ? raw
                          : `${MEET_LINK_PREFIX}${raw.replace(/^\/+/, "")}`;
                    setForm((f) => ({ ...f, googleMeetLink: next }));
                    clearFieldError("googleMeetLink");
                  }}
                  onBlur={() => runValidation()}
                  placeholder="meet.google.com/..."
                  disabled={form.deliveryMode === "offline"}
                  className={errors.googleMeetLink ? "border-red-500" : ""}
                />
                <FieldError message={errors.googleMeetLink} />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.deliveryMode === "offline"
                    ? "Offline sessions do not require a Meet link."
                    : "Sent to members after payment. Not shown on the public site."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <Label>
                    Studio/Gym address
                    {(form.deliveryMode === "offline" || form.deliveryMode === "hybrid") && (
                      <span className="text-red-500"> *</span>
                    )}
                  </Label>
                  <Input
                    value={form.venueAddress}
                    disabled={form.deliveryMode === "online"}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, venueAddress: e.target.value }));
                      clearFieldError("venueAddress");
                    }}
                    onBlur={(e) => runValidation({ venueAddress: e.target.value })}
                    placeholder="Studio address"
                    className={errors.venueAddress ? "border-red-500" : ""}
                  />
                  <FieldError message={errors.venueAddress} />
                </div>
                <div>
                  <Label>
                    Map link
                    {(form.deliveryMode === "offline" || form.deliveryMode === "hybrid") && (
                      <span className="text-red-500"> *</span>
                    )}
                  </Label>
                  <Input
                    value={form.venueMapLink}
                    disabled={form.deliveryMode === "online"}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, venueMapLink: e.target.value }));
                      clearFieldError("venueMapLink");
                    }}
                    onBlur={(e) => runValidation({ venueMapLink: e.target.value })}
                    placeholder="https://maps..."
                    className={errors.venueMapLink ? "border-red-500" : ""}
                  />
                  <FieldError message={errors.venueMapLink} />
                </div>
                <div>
                  <Label>
                    Venue contact number
                    {(form.deliveryMode === "offline" || form.deliveryMode === "hybrid") && (
                      <span className="text-red-500"> *</span>
                    )}
                  </Label>
                  <Input
                    value={form.venueContactPhone}
                    disabled={form.deliveryMode === "online"}
                    onChange={(e) => {
                      const venueContactPhone = clampIndianPhoneDigits(e.target.value);
                      setForm((f) => ({ ...f, venueContactPhone }));
                      clearFieldError("venueContactPhone");
                    }}
                    onBlur={(e) =>
                      runValidation({
                        venueContactPhone: clampIndianPhoneDigits(e.target.value),
                      })
                    }
                    placeholder="10-digit number"
                    maxLength={10}
                    inputMode="numeric"
                    className={errors.venueContactPhone ? "border-red-500" : ""}
                  />
                  <FieldError message={errors.venueContactPhone} />
                </div>
              </div>

              {/* Payment — horizontal */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <Label className="text-sm font-semibold">
                  Payment <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={form.paymentMethod}
                  onValueChange={(v) => {
                    setForm((f) => ({
                      ...f,
                      paymentMethod: v as "razorpay_link" | "razorpay_gateway" | "qr",
                    }));
                    clearFieldError("paymentMethod");
                  }}
                  className="flex flex-col sm:flex-row sm:flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="razorpay_link" id="pay-rzp-link" />
                    <Label htmlFor="pay-rzp-link" className="font-normal cursor-pointer">
                      Payment Link
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="razorpay_gateway" id="pay-rzp-gw" />
                    <Label htmlFor="pay-rzp-gw" className="font-normal cursor-pointer">
                      Razorpay gateway (checkout)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="qr" id="pay-qr" />
                    <Label htmlFor="pay-qr" className="font-normal cursor-pointer">
                      QR code (manual verification)
                    </Label>
                  </div>
                </RadioGroup>

                {form.paymentMethod === "razorpay_link" ? (
                  <div className="max-w-xl">
                    <Label>
                      Payment link URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.razorpayLink}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, razorpayLink: e.target.value }));
                        clearFieldError("razorpayLink");
                      }}
                      onBlur={() => runValidation()}
                      placeholder="https://rzp.io/..."
                      className={errors.razorpayLink ? "border-red-500" : ""}
                    />
                    <FieldError message={errors.razorpayLink} />
                  </div>
                ) : null}

                {form.paymentMethod === "qr" ? (
                  <div className="space-y-4">
                    {qrContactNotice ? (
                      <Alert className="border-amber-300 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-700" />
                        <AlertDescription className="text-amber-900 text-sm">
                          {qrContactNotice}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>
                        QR code <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        modal={false}
                        value={form.paymentQrCodeId || undefined}
                        onValueChange={(v) => {
                          const qr = paymentQrCodes.find((q) => q.id === v);
                          if (qr) {
                            const { fields, notice } = applyQrContactSelection(qr);
                            setForm((f) => ({ ...f, ...fields }));
                            setQrContactNotice(notice);
                          } else {
                            setForm((f) => ({ ...f, paymentQrCodeId: v }));
                            setQrContactNotice(null);
                          }
                          clearFieldError("paymentQrCodeId");
                          clearFieldError("qrContactPhone");
                          clearFieldError("qrContactEmail");
                        }}
                      >
                        <SelectTrigger className={errors.paymentQrCodeId ? "border-red-500" : ""}>
                          <SelectValue
                            placeholder={
                              paymentQrCodes.length ? "Select QR..." : "Upload QR codes first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentQrCodes.map((qr) => (
                            <SelectItem key={qr.id} value={qr.id}>
                              {qr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.paymentQrCodeId} />
                    </div>
                    <div>
                      <Label>
                        Contact phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={form.qrContactPhone}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            qrContactPhone: clampIndianPhoneDigits(e.target.value),
                          }));
                          clearFieldError("qrContactPhone");
                        }}
                        onBlur={() => runValidation()}
                        placeholder="10-digit number"
                        maxLength={10}
                        inputMode="numeric"
                        className={errors.qrContactPhone ? "border-red-500" : ""}
                      />
                      <FieldError message={errors.qrContactPhone} />
                    </div>
                    <div>
                      <Label>
                        Contact email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={form.qrContactEmail}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, qrContactEmail: e.target.value }));
                          clearFieldError("qrContactEmail");
                        }}
                        onBlur={() => runValidation()}
                        placeholder="payments@andweyoga.com"
                        className={errors.qrContactEmail ? "border-red-500" : ""}
                      />
                      <FieldError message={errors.qrContactEmail} />
                    </div>
                    </div>
                  </div>
                ) : null}

                {form.paymentMethod === "razorpay_gateway" ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground max-w-xl">
                      Members pay via Razorpay Checkout when API keys are configured. Transaction
                      details appear in Payment History.
                    </p>
                    <div
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border border-dashed bg-muted/40 p-4 opacity-60 pointer-events-none"
                      aria-disabled
                    >
                      <p className="sm:col-span-3 text-xs text-muted-foreground">
                        QR code, contact phone, and email are not used for checkout.
                      </p>
                      <div>
                        <Label className="text-muted-foreground">QR code</Label>
                        <Select disabled>
                          <SelectTrigger className="bg-muted">
                            <SelectValue placeholder="Not required" />
                          </SelectTrigger>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact phone</Label>
                        <Input disabled placeholder="Not required" className="bg-muted" />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact email</Label>
                        <Input disabled placeholder="Not required" className="bg-muted" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Publication — horizontal */}
              <div className="rounded-lg border bg-muted/20 p-4">
                <Label className="text-sm font-semibold block mb-3">Publication</Label>
                <div className="flex flex-wrap items-end gap-6">
                  <RadioGroup
                    value={form.publishMode}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, publishMode: v as "now" | "later" }));
                      clearFieldError("publishAt");
                    }}
                    className="flex flex-wrap gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="now" id="pub-now" />
                      <Label htmlFor="pub-now" className="font-normal cursor-pointer">
                        Publish now
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="later" id="pub-later" />
                      <Label htmlFor="pub-later" className="font-normal cursor-pointer">
                        Publish later
                      </Label>
                    </div>
                  </RadioGroup>
                  {form.publishMode === "later" && (
                    <div className="flex-1 min-w-[200px] max-w-xs">
                      <Label className="text-xs">
                        Go live at (IST) <span className="text-red-500">*</span>
                      </Label>
                      <SessionDateTimePicker
                        id="session-publish-at"
                        value={form.publishAt}
                        onChange={(v) => {
                          setForm((f) => ({ ...f, publishAt: v }));
                          clearFieldError("publishAt");
                        }}
                        onBlur={(publishAt) => runValidation({ publishAt })}
                        error={errors.publishAt}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-background shrink-0 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-[#bb5309] hover:bg-[#9a4508] text-white"
              >
                {mutation.isPending
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save changes"
                    : "Schedule Session"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
