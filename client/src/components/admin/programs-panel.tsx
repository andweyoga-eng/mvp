import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Archive, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import { formatClassTypeOptionLabel } from "@shared/class-type-name";
import {
  PROGRAM_KINDS,
  computeProgramTotalSessions,
  formatProgramPaiseAsRupees,
  programPerSessionDivisibility,
  programRupeesToPaise,
  type ProgramKind,
} from "@shared/programs";

export interface ClassTypeOption {
  id: string;
  name: string;
  duration: number;
  price: string;
}

type ProgramRow = {
  id: string;
  classTypeId: string;
  classTypeName: string | null;
  version: number;
  kind: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  totalSessions: number;
  pricePaise: number;
  flexiAllowed: boolean;
  status: string;
  subscriptionCount: number;
};

type ProgramForm = {
  classTypeId: string;
  kind: ProgramKind;
  sessionsPerWeek: string;
  durationWeeks: string;
  priceRupees: string;
  flexiAllowed: boolean;
  status: "draft" | "active" | "archived";
};

const EMPTY_FORM: ProgramForm = {
  classTypeId: "",
  kind: "recurring",
  sessionsPerWeek: "3",
  durationWeeks: "12",
  priceRupees: "",
  flexiAllowed: false,
  status: "active",
};

function programToForm(p: ProgramRow): ProgramForm {
  return {
    classTypeId: p.classTypeId,
    kind: (PROGRAM_KINDS.includes(p.kind as ProgramKind) ? p.kind : "recurring") as ProgramKind,
    sessionsPerWeek: String(p.sessionsPerWeek),
    durationWeeks: String(p.durationWeeks),
    priceRupees: String(p.pricePaise / 100),
    flexiAllowed: p.flexiAllowed,
    status: (p.status as ProgramForm["status"]) || "active",
  };
}

function ProgramFormFields({
  form,
  setForm,
  classTypes,
  lockClassType,
}: {
  form: ProgramForm;
  setForm: React.Dispatch<React.SetStateAction<ProgramForm>>;
  classTypes: ClassTypeOption[];
  lockClassType?: boolean;
}) {
  const isSingleSession = form.kind === "trial" || form.kind === "drop_in";
  const sessionsPerWeek = isSingleSession ? 1 : Math.max(1, Number(form.sessionsPerWeek) || 1);
  const durationWeeks = isSingleSession ? 1 : Math.max(1, Number(form.durationWeeks) || 1);
  const totalSessions = computeProgramTotalSessions(sessionsPerWeek, durationWeeks);
  let pricePaise = 0;
  try {
    pricePaise = form.priceRupees.trim() === "" ? 0 : programRupeesToPaise(form.priceRupees);
  } catch {
    pricePaise = 0;
  }
  const divisibility = programPerSessionDivisibility(pricePaise, totalSessions);

  return (
    <div className="space-y-3">
      <div>
        <Label>
          Class type <span className="text-red-500">*</span>
        </Label>
        <select
          className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
          value={form.classTypeId}
          disabled={lockClassType}
          onChange={(e) => setForm((f) => ({ ...f, classTypeId: e.target.value }))}
        >
          <option value="">Select class type…</option>
          {classTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {formatClassTypeOptionLabel(ct)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>
          Kind <span className="text-red-500">*</span>
        </Label>
        <select
          className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
          value={form.kind}
          onChange={(e) => {
            const kind = e.target.value as ProgramKind;
            setForm((f) => ({
              ...f,
              kind,
              ...(kind === "trial" || kind === "drop_in"
                ? { sessionsPerWeek: "1", durationWeeks: "1" }
                : {}),
            }));
          }}
        >
          {PROGRAM_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Sessions / week</Label>
          <Input
            type="number"
            min={1}
            max={14}
            disabled={isSingleSession}
            value={isSingleSession ? "1" : form.sessionsPerWeek}
            onChange={(e) => setForm((f) => ({ ...f, sessionsPerWeek: e.target.value }))}
          />
        </div>
        <div>
          <Label>Duration (weeks)</Label>
          <Input
            type="number"
            min={1}
            max={52}
            disabled={isSingleSession}
            value={isSingleSession ? "1" : form.durationWeeks}
            onChange={(e) => setForm((f) => ({ ...f, durationWeeks: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <Label>
          Whole-program price (INR) <span className="text-red-500">*</span>
        </Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.priceRupees}
          onChange={(e) => setForm((f) => ({ ...f, priceRupees: e.target.value }))}
          placeholder="e.g. 14400"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {totalSessions} session{totalSessions === 1 ? "" : "s"} → about ₹
          {divisibility.perSessionRupeesLabel} per session
        </p>
        {divisibility.warning && (
          <Alert className="mt-2 border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-950 text-xs">
              {divisibility.warning}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          id="program-flexi"
          type="checkbox"
          checked={form.flexiAllowed}
          onChange={(e) => setForm((f) => ({ ...f, flexiAllowed: e.target.checked }))}
        />
        <Label htmlFor="program-flexi" className="font-normal">
          Flexi composition allowed (keep off until Flexi relaunch)
        </Label>
      </div>
      <div>
        <Label>Status</Label>
        <select
          className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
          value={form.status}
          onChange={(e) =>
            setForm((f) => ({ ...f, status: e.target.value as ProgramForm["status"] }))
          }
        >
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="archived">archived</option>
        </select>
      </div>
    </div>
  );
}

function CreateProgramButton({
  classTypes,
  onCreated,
}: {
  classTypes: ClassTypeOption[];
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classTypeId: form.classTypeId,
          kind: form.kind,
          sessionsPerWeek: Number(form.sessionsPerWeek),
          durationWeeks: Number(form.durationWeeks),
          priceRupees: Number(form.priceRupees),
          flexiAllowed: form.flexiAllowed,
          status: form.status === "archived" ? "active" : form.status,
        }),
      });
      if (!res.ok) throw new Error((await parseAdminApiError(res)).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Program created" });
      setOpen(false);
      setForm(EMPTY_FORM);
      onCreated();
    },
    onError: (err: Error) => {
      toast({ title: "Could not create program", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#bb5309] hover:bg-[#9a4508] text-white">
          <Plus className="w-4 h-4 mr-2" /> New program
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create program</DialogTitle>
          <DialogDescription>
            Programs are the sellable SKU. Price is for the whole program, not per session.
          </DialogDescription>
        </DialogHeader>
        <ProgramFormFields form={form} setForm={setForm} classTypes={classTypes} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending || !form.classTypeId || form.priceRupees === ""}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProgramButton({
  program,
  classTypes,
  onUpdated,
}: {
  program: ProgramRow;
  classTypes: ClassTypeOption[];
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProgramForm>(() => programToForm(program));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/programs/${program.id}`, {
        method: "PATCH",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classTypeId: form.classTypeId,
          kind: form.kind,
          sessionsPerWeek: Number(form.sessionsPerWeek),
          durationWeeks: Number(form.durationWeeks),
          priceRupees: Number(form.priceRupees),
          flexiAllowed: form.flexiAllowed,
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error((await parseAdminApiError(res)).message);
      return res.json() as Promise<{ versioned?: boolean; message?: string }>;
    },
    onSuccess: (body) => {
      toast({
        title: body.versioned ? "New program version created" : "Program updated",
        description: body.message,
      });
      setOpen(false);
      onUpdated();
    },
    onError: (err: Error) => {
      toast({ title: "Could not update program", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setForm(programToForm(program));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit program</DialogTitle>
          <DialogDescription>
            {program.subscriptionCount > 0
              ? `This program has ${program.subscriptionCount} subscription(s). Saving creates version ${program.version + 1} and archives v${program.version}.`
              : "No subscriptions yet. Edits apply in place."}
          </DialogDescription>
        </DialogHeader>
        <ProgramFormFields form={form} setForm={setForm} classTypes={classTypes} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProgramsPanel({ classTypes }: { classTypes: ClassTypeOption[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: programs = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/programs", statusFilter],
    queryFn: async () => {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`/api/admin/programs${qs}`, {
        headers: adminHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await parseAdminApiError(res)).message);
      return (await res.json()) as ProgramRow[];
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/programs/${id}/archive`, {
        method: "POST",
        headers: adminHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await parseAdminApiError(res)).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Program archived" });
      void refetch();
      qc.invalidateQueries({ queryKey: ["/api/admin/programs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Archive failed", description: err.message, variant: "destructive" });
    },
  });

  const sorted = useMemo(
    () =>
      [...programs].sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;
        return (a.classTypeName ?? "").localeCompare(b.classTypeName ?? "");
      }),
    [programs],
  );

  const refresh = () => {
    void refetch();
    qc.invalidateQueries({ queryKey: ["/api/admin/programs"] });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Filter</Label>
          <select
            className="rounded-md border bg-white px-3 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <CreateProgramButton classTypes={classTypes} onCreated={refresh} />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Programs are the sellable SKU. Set whole-program prices here. Session types no longer carry a
        price.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bb5309]" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No programs yet</p>
          <p className="text-sm mt-1">Create trial, drop-in, and recurring SKUs per class type.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const div = programPerSessionDivisibility(p.pricePaise, p.totalSessions);
            return (
              <div
                key={p.id}
                className="border rounded-lg p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {p.classTypeName ?? "Unknown type"} · {p.kind}
                    </h3>
                    <Badge variant="outline">v{p.version}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "active"
                          ? "border-emerald-600 text-emerald-700"
                          : p.status === "archived"
                            ? "border-gray-400 text-gray-600"
                            : ""
                      }
                    >
                      {p.status}
                    </Badge>
                    {p.flexiAllowed ? <Badge variant="outline">flexi</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {p.sessionsPerWeek}/week × {p.durationWeeks} weeks = {p.totalSessions} sessions · ₹
                    {formatProgramPaiseAsRupees(p.pricePaise)} whole
                    {" · "}~₹{div.perSessionRupeesLabel}/session
                    {p.subscriptionCount > 0
                      ? ` · ${p.subscriptionCount} subscription(s)`
                      : " · no subscriptions"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">#{p.id.slice(0, 8)}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {p.status !== "archived" ? (
                    <>
                      <EditProgramButton
                        program={p}
                        classTypes={classTypes}
                        onUpdated={refresh}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={archiveMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Archive this program? Existing subscriptions keep running; it leaves checkout.",
                            )
                          ) {
                            archiveMutation.mutate(p.id);
                          }
                        }}
                      >
                        <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
