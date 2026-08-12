import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Apple,
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronRight,
  Heart,
  PlayCircle,
  RefreshCw,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  deleteFuelMeal,
  estimateFuelMeal,
  fetchFuelDashboard,
  fetchFuelStatement,
  logFuelMeal,
  type FuelDashboardResponse,
  type FuelMealRow,
} from "@/lib/fuel-api";
import {
  FUEL_MEDICAL_DISCLAIMER,
  FUEL_SUPPORT_COPY,
  FUEL_SUPPORT_HREF,
} from "@shared/fuel";

type FuelView = "fuel" | "statement";

function statusPillClass(status: string) {
  if (status === "on_track") return "bg-[#cfe9d1] text-[#354c3a]";
  if (status === "pending") return "bg-muted text-muted-foreground";
  return "bg-red-100 text-[#ba1a1a]";
}

function dateDividerLabel(date: string, today: string) {
  if (date === today) return "Today";
  const y = new Date(`${today}T12:00:00`);
  y.setDate(y.getDate() - 1);
  const ymd = y.toISOString().slice(0, 10);
  if (date === ymd) return "Yesterday";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function groupMeals(meals: FuelMealRow[], today: string) {
  const map = new Map<string, FuelMealRow[]>();
  for (const m of meals) {
    const list = map.get(m.loggedDate) ?? [];
    list.push(m);
    map.set(m.loggedDate, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function LogMealModal({
  open,
  onClose,
  mealPlan,
  dayTotal,
  target,
}: {
  open: boolean;
  onClose: () => void;
  mealPlan: Array<{ index: number; label: string }>;
  dayTotal: number;
  target: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "scanning" | "result">("upload");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [slotIndex, setSlotIndex] = useState<number | "">("");
  const [advisory, setAdvisory] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setName("");
      setCalories("");
      setSlotIndex("");
      setAdvisory(false);
    }
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: () =>
      logFuelMeal({
        name: name.trim(),
        calories: Number(calories),
        mealSlotIndex: slotIndex === "" ? undefined : Number(slotIndex),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
      toast({ title: "Added to Calorie Bank" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    setStep("scanning");
    try {
      const est = await estimateFuelMeal(file);
      setName(est.name || "");
      setCalories(est.calories ? String(est.calories) : "");
      setAdvisory(true);
      setStep("result");
      if (est.fallback) {
        toast({
          title: "Enter calories manually",
          description: "Photo estimate unavailable right now.",
        });
      }
    } catch (err) {
      setStep("result");
      setAdvisory(true);
      toast({
        title: "Enter calories manually",
        description: err instanceof Error ? err.message : "Estimation failed",
      });
    }
  };

  if (!open) return null;

  const calNum = Number(calories);
  const previewTotal = dayTotal + (Number.isFinite(calNum) ? calNum : 0);
  const canSave = name.trim().length > 0 && Number.isFinite(calNum) && calNum >= 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="fuel-log-modal"
    >
      <div
        className="relative w-full max-w-[400px] rounded-[22px] bg-dz-surface p-6 shadow-[0_24px_60px_rgba(27,28,27,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-primary/5"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {step === "upload" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Log a meal</h3>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 flex h-[150px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] text-sm text-muted-foreground"
            >
              <Camera className="h-8 w-8 text-primary/70" />
              Drag a photo or tap to snap your meal
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
            />
            <Button className="mt-4 w-full" onClick={() => fileRef.current?.click()}>
              Upload photo
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                setAdvisory(false);
                setStep("result");
              }}
            >
              Enter manually
            </Button>
          </>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <h3 className="font-display text-xl font-bold text-primary">Scanning your plate</h3>
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-dashed border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Detecting food & estimating calories…</p>
          </div>
        )}

        {step === "result" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Confirm your meal</h3>
            <div className="mt-4 flex h-[90px] items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Utensils className="h-8 w-8" />
            </div>
            {advisory && (
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                Rough estimate. Edit before saving
              </p>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Meal
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Calories
                </label>
                <Input
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                />
              </div>
              {mealPlan.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Meal slot (optional)
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={slotIndex}
                    onChange={(e) =>
                      setSlotIndex(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="">Auto / none</option>
                    {mealPlan.map((s) => (
                      <option key={s.index} value={s.index}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Target {target} · today so far {previewTotal} cal
            </p>
            <Button
              className="mt-4 w-full"
              disabled={!canSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Add to Calorie Bank
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                setStep("upload");
                setName("");
                setCalories("");
                setAdvisory(false);
              }}
            >
              Retake
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function DailyInspirationCards({
  recipe,
  practiceAlong,
}: {
  recipe: FuelDashboardResponse["recipe"];
  practiceAlong: FuelDashboardResponse["practiceAlong"];
}) {
  const [recipeOpen, setRecipeOpen] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <GlassCard className="overflow-hidden p-0">
        {recipe?.imageUrl ? (
          <img src={recipe.imageUrl} alt="" className="h-[190px] w-full object-cover" />
        ) : (
          <div className="flex h-[190px] items-center justify-center bg-primary/5 text-primary/40">
            <Apple className="h-10 w-10" />
          </div>
        )}
        <div className="p-5">
          <span className="inline-flex rounded-lg bg-[#cfe9d1] px-2.5 py-1 text-xs font-semibold text-[#354c3a]">
            Recipe of the day
          </span>
          {recipe ? (
            <>
              <h3 className="mt-3 font-display text-xl font-bold text-primary">{recipe.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{recipe.teaser}</p>
              {recipeOpen && (
                <div className="mt-3 space-y-2 border-t border-dashed border-primary/15 pt-3 text-sm">
                  <p className="whitespace-pre-wrap">{recipe.ingredients}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{recipe.method}</p>
                </div>
              )}
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                onClick={() => setRecipeOpen((v) => !v)}
              >
                {recipeOpen ? "Show less" : "Read more"}
                {recipeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No recipe set for today yet.</p>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-primary">Practice along</h3>
          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            YouTube / Instagram
          </span>
        </div>
        {practiceAlong ? (
          <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black/5">
            <iframe
              title={practiceAlong.title}
              src={practiceAlong.embedUrl}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-4 flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-primary/[0.04] text-muted-foreground">
            <PlayCircle className="h-12 w-12 text-primary/35" />
            <p className="text-sm">No practice video set for today.</p>
          </div>
        )}
        {practiceAlong?.title ? (
          <p className="mt-3 text-sm font-medium text-primary">{practiceAlong.title}</p>
        ) : null}
      </GlassCard>
    </div>
  );
}

function FuelDashboardView({
  data,
  onOpenLog,
}: {
  data: Extract<FuelDashboardResponse, { gate: "ok" }>;
  onOpenLog: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pepIndex, setPepIndex] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const pep = data.pepPhrases[pepIndex % data.pepPhrases.length];

  const deleteMutation = useMutation({
    mutationFn: deleteFuelMeal,
    onSuccess: async () => {
      setConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const grouped = useMemo(() => groupMeals(data.meals, data.today), [data.meals, data.today]);
  const maxBar = Math.max(1, ...data.weekBars.map((b) => Math.abs(b.delta ?? b.total)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(28px,4vw,42px)] font-bold tracking-tight text-primary">
            Your daily <span className="font-accent italic font-normal text-dz-secondary">fuel</span>
          </h1>
          <p className="mt-2 inline-flex rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Target: {data.target} cal/day · band −{data.deficit}
          </p>
        </div>
        <Button className="h-12 min-w-[200px]" onClick={onOpenLog} data-testid="fuel-log-meal">
          <Camera className="mr-2 h-4 w-4" />
          Log a meal
        </Button>
      </div>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-2 font-mono text-[26px] font-semibold text-primary">
            {data.dayTotal} / {data.target} cal
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{data.caloriesLeftLabel}</p>
          {data.verdictReady && data.status !== "pending" && (
            <span className={cn("mt-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold", statusPillClass(data.status))}>
              {data.statusDelta} · {data.status.replace("_", " ")}
            </span>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
          <div className="mt-4 flex h-28 items-end gap-2">
            {data.weekBars.map((bar) => {
              const h = Math.max(8, Math.round((Math.abs(bar.delta ?? bar.total) / maxBar) * 100));
              const color =
                bar.status === "on_track"
                  ? "bg-emerald-600/70"
                  : bar.status === "pending"
                    ? "bg-primary/20"
                    : "bg-red-500/70";
              return (
                <div key={bar.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className={cn("w-4 rounded-t", color)} style={{ height: `${h}%` }} title={`${bar.date}: ${bar.total}`} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {bar.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />

      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#4b3282] to-dz-secondary px-7 py-7 text-white">
        <Heart className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 rotate-12 text-white/10" />
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Vibe check</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <p className="max-w-3xl font-display text-[clamp(18px,2.2vw,24px)] font-semibold leading-snug">
            {pep?.pre}
            <span className="font-accent italic font-normal">{pep?.accent}</span>
            {pep?.post}
          </p>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            onClick={() => setPepIndex((i) => i + 1)}
            aria-label="Shuffle vibe"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="border-t border-dashed border-primary/20 pt-5 font-display text-[19px] font-bold text-primary">
          Calorie Bank: ledger
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Day colour appears after your last meal slot (or at day close). Individual meals stay neutral.
        </p>

        <div className="mt-4 space-y-4">
          {grouped.length === 0 && (
            <GlassCard className="p-5 text-sm text-muted-foreground">No meals logged yet.</GlassCard>
          )}
          {grouped.map(([date, rows]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {dateDividerLabel(date, data.today)}
              </p>
              <div className="space-y-2">
                {rows.map((row) =>
                  confirmId === row.id ? (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-[#ba1a1a]"
                    >
                      <span>Delete “{row.name}” from the ledger?</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(row.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <GlassCard key={row.id} className="flex items-center gap-3 px-3 py-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Utensils className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-primary">{row.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.clientLocalTime || "-"}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold text-primary">{row.calories}</p>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-[#ba1a1a]"
                        onClick={() => setConfirmId(row.id)}
                        aria-label="Delete meal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </GlassCard>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatementView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fuel-statement"],
    queryFn: fetchFuelStatement,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading statement…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load statement"}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs text-muted-foreground">My Account &gt; Calorie Bank &amp; Statement</p>
      <h1 className="font-display text-[clamp(28px,4vw,42px)] font-bold tracking-tight text-primary">
        Your calorie <span className="font-accent italic font-normal text-dz-secondary">statement</span>
      </h1>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> within band
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> over / under-fuelled
        </span>
        <span className="rounded-lg bg-[#f4f1f8] px-2.5 py-1 font-semibold text-primary">This week</span>
      </div>

      <div className="space-y-2">
        {data.rows.map((row) => (
          <GlassCard key={row.id} className="grid grid-cols-[72px_1fr_72px_72px_90px] items-center gap-2 px-4 py-3 text-sm">
            <span className="font-mono text-xs text-muted-foreground">
              {row.loggedDate.slice(5).replace("-", "/")}
            </span>
            <span className="truncate font-medium text-primary">{row.name}</span>
            <span className="text-right font-mono">{row.calories}</span>
            <span className="text-right font-mono text-muted-foreground">{row.targetAtLogCal}</span>
            <span className={cn("justify-self-end rounded-lg px-2 py-1 text-xs font-semibold", statusPillClass(row.dayStatus))}>
              {row.dayDelta ?? "-"}
            </span>
          </GlassCard>
        ))}
        {!data.rows.length && (
          <GlassCard className="p-5 text-sm text-muted-foreground">No meals this week yet.</GlassCard>
        )}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        {data.mealsLoggedThisWeek} meals logged this week
        {data.avgDailyDelta != null
          ? ` · avg daily vs target ${data.avgDailyDelta > 0 ? "+" : ""}${data.avgDailyDelta} cal`
          : ""}
      </p>

      <p className="text-xs text-muted-foreground">{FUEL_MEDICAL_DISCLAIMER}</p>
      <a href={FUEL_SUPPORT_HREF} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
        {FUEL_SUPPORT_COPY}
      </a>
    </div>
  );
}

export default function FuelPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<FuelView>("fuel");
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["fuel-dashboard"],
    queryFn: fetchFuelDashboard,
    enabled: Boolean(user),
    refetchOnMount: "always",
    staleTime: 0,
  });

  return (
    <DashboardShell active="fuel">
      <PageContainer className="relative py-[clamp(24px,4vw,40px)] pb-24">
        <div className="mb-6 inline-flex rounded-full bg-primary/5 p-1">
          {(
            [
              ["fuel", "Fuel"],
              ["statement", "Statement"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                view === id ? "bg-primary text-white" : "text-muted-foreground hover:text-primary",
              )}
              data-testid={`fuel-view-${id}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading andWeFuel…</p>}
        {error && (
          <GlassCard className="p-5 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
            <Button className="mt-3" variant="secondary" onClick={() => void refetch()}>
              Retry
            </Button>
          </GlassCard>
        )}

        {data?.gate === "health_consent_required" && (
          <div className="space-y-6">
            <GlassCard className="space-y-3 p-6">
              <h2 className="font-display text-2xl font-bold text-primary">Health data consent needed</h2>
              <p className="text-sm text-muted-foreground">
                andWeFuel uses your health-data consent to store meal names and calorie values. Photos are
                never kept. Only the confirmed name and calories.
              </p>
              <p className="text-xs text-muted-foreground">{FUEL_MEDICAL_DISCLAIMER}</p>
              <Button onClick={() => setLocation("/my-account#privacy")}>
                Review privacy & consent
              </Button>
            </GlassCard>
            <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />
          </div>
        )}

        {data?.gate === "not_configured" && (
          <div className="space-y-6">
            <GlassCard className="space-y-3 p-6">
              <h2 className="font-display text-2xl font-bold text-primary">Almost ready</h2>
              <p className="text-sm text-muted-foreground">{data.message}</p>
              <p className="text-sm text-muted-foreground">
                Your coach will set a daily target, deficit band, and meal schedule before logging opens.
              </p>
            </GlassCard>
            <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />
          </div>
        )}

        {data?.gate === "ok" && view === "fuel" && (
          <FuelDashboardView data={data} onOpenLog={() => setLogOpen(true)} />
        )}
        {data?.gate === "ok" && view === "statement" && (
          <>
            <Button variant="secondary" className="mb-4" onClick={() => setView("fuel")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
            <StatementView />
          </>
        )}

        {data?.gate === "ok" && (
          <LogMealModal
            open={logOpen}
            onClose={() => setLogOpen(false)}
            mealPlan={data.mealPlan}
            dayTotal={data.dayTotal}
            target={data.target}
          />
        )}
      </PageContainer>
    </DashboardShell>
  );
}
