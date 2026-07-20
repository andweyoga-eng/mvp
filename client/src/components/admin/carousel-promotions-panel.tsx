import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, GalleryHorizontalEnd } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";

export interface PromotableSession {
  id: string;
  date: string;
  classType?: { name?: string } | null;
  instructor?: { name?: string } | null;
}

interface CarouselPromotion {
  id: string;
  classId: string;
  position: number;
  startAt: string;
  endAt: string;
  enabled: boolean;
  session: {
    id: string;
    date: string;
    className: string;
    instructorName: string;
  } | null;
}

const PROMOTIONS_KEY = "/api/admin/carousel-promotions";

type PromotionForm = {
  classId: string;
  position: string;
  startAt: string;
  endAt: string;
  enabled: boolean;
};

/** Convert an ISO string to the value expected by <input type="datetime-local"> (local time). */
function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function defaultForm(): PromotionForm {
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    classId: "",
    position: "0",
    startAt: toLocalInputValue(now.toISOString()),
    endAt: toLocalInputValue(inAWeek.toISOString()),
    enabled: true,
  };
}

function sessionLabel(s: PromotableSession): string {
  const name = s.classType?.name ?? "Session";
  const instructor = s.instructor?.name ? ` · ${s.instructor.name}` : "";
  const when = new Date(s.date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${name}${instructor}, ${when}`;
}

function formatWindow(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function promotionStatus(p: CarouselPromotion): { label: string; className: string } {
  const now = Date.now();
  const start = new Date(p.startAt).getTime();
  const end = new Date(p.endAt).getTime();
  if (!p.enabled) return { label: "Paused", className: "bg-gray-200 text-gray-700" };
  if (now < start) return { label: "Scheduled", className: "bg-amber-100 text-amber-700" };
  if (now > end) return { label: "Expired", className: "bg-gray-200 text-gray-500" };
  return { label: "Live", className: "bg-green-100 text-green-700" };
}

function PromotionFormFields({
  form,
  setForm,
  sessions,
  errors,
}: {
  form: PromotionForm;
  setForm: React.Dispatch<React.SetStateAction<PromotionForm>>;
  sessions: PromotableSession[];
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>
          Session to promote <span className="text-red-500">*</span>
        </Label>
        <select
          value={form.classId}
          onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${
            errors.classId ? "border-red-500" : "border-input"
          }`}
        >
          <option value="">Select a session…</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {sessionLabel(s)}
            </option>
          ))}
        </select>
        {errors.classId && <p className="mt-1 text-xs text-red-500">{errors.classId}</p>}
        {sessions.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            No upcoming sessions available. Create a session first.
          </p>
        )}
      </div>

      <div>
        <Label>Placement in rotation</Label>
        <Input
          type="number"
          min="0"
          max="99"
          value={form.position}
          onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
          className={errors.position ? "border-red-500" : ""}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Lower numbers appear first (0 = front of the carousel).
        </p>
        {errors.position && <p className="mt-1 text-xs text-red-500">{errors.position}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>
            Go live at <span className="text-red-500">*</span>
          </Label>
          <Input
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
            className={errors.startAt ? "border-red-500" : ""}
          />
          {errors.startAt && <p className="mt-1 text-xs text-red-500">{errors.startAt}</p>}
        </div>
        <div>
          <Label>
            Ends at <span className="text-red-500">*</span>
          </Label>
          <Input
            type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
            className={errors.endAt ? "border-red-500" : ""}
          />
          {errors.endAt && <p className="mt-1 text-xs text-red-500">{errors.endAt}</p>}
        </div>
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Enabled (uncheck to pause without deleting)</span>
      </label>
    </div>
  );
}

function validate(form: PromotionForm): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!form.classId) errors.classId = "Select a session to promote";
  if (!form.startAt) errors.startAt = "Start time is required";
  if (!form.endAt) errors.endAt = "End time is required";
  if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
    errors.endAt = "End time must be after the start time";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function toPayload(form: PromotionForm) {
  return {
    classId: form.classId,
    position: Number(form.position) || 0,
    startAt: form.startAt,
    endAt: form.endAt,
    enabled: form.enabled,
  };
}

function CreatePromotionButton({ sessions }: { sessions: PromotableSession[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PromotionForm>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(PROMOTIONS_KEY, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(toPayload(form)),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Promotion added", description: "The session will appear in the carousel." });
      setForm(defaultForm());
      setErrors({});
      setOpen(false);
      qc.invalidateQueries({ queryKey: [PROMOTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["/api/carousel/promotions"] });
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Could not add promotion", description: e.message, variant: "destructive" });
    },
  });

  function submit() {
    const v = validate(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(defaultForm());
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3d1b80] text-white hover:bg-[#2d1260]">
          <Plus className="mr-2 h-4 w-4" /> Promote a session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Promote to Available Today carousel</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-2"
        >
          <PromotionFormFields form={form} setForm={setForm} sessions={sessions} errors={errors} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] text-white">
              {mutation.isPending ? "Saving…" : "Add promotion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPromotionDialog({
  promotion,
  sessions,
}: {
  promotion: CarouselPromotion;
  sessions: PromotableSession[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PromotionForm>(() => ({
    classId: promotion.classId,
    position: String(promotion.position),
    startAt: toLocalInputValue(promotion.startAt),
    endAt: toLocalInputValue(promotion.endAt),
    enabled: promotion.enabled,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${PROMOTIONS_KEY}/${promotion.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(toPayload(form)),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Promotion updated" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: [PROMOTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["/api/carousel/promotions"] });
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  function submit() {
    const v = validate(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setForm({
            classId: promotion.classId,
            position: String(promotion.position),
            startAt: toLocalInputValue(promotion.startAt),
            endAt: toLocalInputValue(promotion.endAt),
            enabled: promotion.enabled,
          });
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit promotion</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-2"
        >
          <PromotionFormFields form={form} setForm={setForm} sessions={sessions} errors={errors} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] text-white">
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePromotionButton({ promotion }: { promotion: CarouselPromotion }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${PROMOTIONS_KEY}/${promotion.id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Promotion deleted" });
      qc.invalidateQueries({ queryKey: [PROMOTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["/api/carousel/promotions"] });
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this promotion?</AlertDialogTitle>
          <AlertDialogDescription>
            The session will no longer be force-shown in the Available Today carousel. The session
            itself is not deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CarouselPromotionsPanel({ sessions }: { sessions: PromotableSession[] }) {
  const { data, isLoading } = useQuery<CarouselPromotion[]>({
    queryKey: [PROMOTIONS_KEY],
    queryFn: async () => {
      const res = await fetch(PROMOTIONS_KEY, { headers: adminHeaders() });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const promotions = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.position - b.position),
    [data],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-muted-foreground">
          Hand-pick sessions to feature in the home "Available Today" carousel and set their live
          window. When no promotion is live, the carousel falls back to the regular today's
          sessions.
        </p>
        <CreatePromotionButton sessions={sessions} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#3d1b80]" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <GalleryHorizontalEnd className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">No promotions configured</p>
          <p className="mt-1 text-sm">
            The carousel is using the automatic today's-sessions rotation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => {
            const status = promotionStatus(p);
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3d1b80]/10 text-xs font-bold text-[#3d1b80]">
                      {p.position}
                    </span>
                    <h4 className="font-semibold text-gray-900">
                      {p.session?.className ?? "Unknown session"}
                    </h4>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {p.session?.instructorName ?? "Unknown instructor"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Live {formatWindow(p.startAt)} → {formatWindow(p.endAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditPromotionDialog promotion={p} sessions={sessions} />
                  <DeletePromotionButton promotion={p} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
