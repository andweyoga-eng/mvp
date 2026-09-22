import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Apple,
  Camera,
  ChevronDown,
  ChevronRight,
  Heart,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  Utensils,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FeatureInteractionFreeze } from "@/components/feature-interaction-freeze";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { TrackDietModal } from "@/components/fuel/track-diet-modal";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { setAccountReturnIntent } from "@/lib/account-return-intent";
import { cn } from "@/lib/utils";
import {
  deleteFuelMeal,
  deleteFuelMealGroup,
  fetchFuelDashboard,
  fetchFuelStatement,
  groupFuelMeals,
  type FuelDashboardResponse,
  type FuelMealRow,
  type FuelStatementResponse,
} from "@/lib/fuel-api";
import {
  dayStatus,
  formatSignedDelta,
  FUEL_MEDICAL_DISCLAIMER,
  FUEL_OUTSIDE_SLOTS_TITLE,
  FUEL_SUPPORT_COPY,
  FUEL_SUPPORT_HREF,
  isLocalTimeInSlot,
  midpointHhmm,
  signedDelta,
  type DayVerdictStatus,
} from "@shared/fuel";

type FuelView = "fuel" | "statement";

type StatementDayVerdict = DayVerdictStatus;

function statusPillClass(status: string) {
  if (status === "on_track") return "bg-[#cfe9d1] text-[#354c3a]";
  if (status === "pending") return "border border-black bg-white text-primary";
  return "bg-red-100 text-[#ba1a1a]";
}

function statementDayTrayClass(status: StatementDayVerdict) {
  if (status === "over" || status === "under") {
    return "bg-red-50 border-red-100";
  }
  if (status === "on_track") {
    return "bg-[#f3faf4] border-emerald-100/80";
  }
  if (status === "pending") {
    return "border-black bg-white";
  }
  return "";
}

function statementDayHeaderTextClass(status: StatementDayVerdict) {
  if (status === "over" || status === "under") return "text-[#9f1239]";
  if (status === "on_track") return "text-[#354c3a]";
  return "text-primary";
}

function statementDayVerdictLabel(status: StatementDayVerdict): string {
  if (status === "on_track") return "Target Hit";
  if (status === "over") return "Target missed. Over eating";
  if (status === "under") return "Target missed. Under eating";
  return "In progress";
}

function weekDateKeys(anchorDate: string): string[] {
  const [y, m, d] = anchorDate.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const dow = anchor.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() + mondayOffset);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

function formatStatementDate(date: string): { ddmm: string; weekday: string } {
  const [, m, d] = date.split("-");
  const weekday = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  return { ddmm: `${d}/${m}`, weekday };
}

type StatementDayTray = {
  date: string;
  meals: FuelStatementResponse["rows"];
  dayTotal: number;
  target: number;
  status: StatementDayVerdict;
  delta: number | null;
};

function buildStatementDayTrays(data: FuelStatementResponse): StatementDayTray[] {
  const byDate = new Map<string, FuelStatementResponse["rows"]>();
  for (const row of data.rows) {
    const list = byDate.get(row.loggedDate) ?? [];
    list.push(row);
    byDate.set(row.loggedDate, list);
  }

  return weekDateKeys(data.today)
    .filter((date) => date <= data.today)
    .map((date) => {
      const meals = (byDate.get(date) ?? []).slice().sort((a, b) => {
        const ta = a.clientLocalTime || "";
        const tb = b.clientLocalTime || "";
        return ta.localeCompare(tb);
      });
      const dayTotal = meals.reduce((s, m) => s + m.calories, 0);
      const targetFromMeal = meals.find((m) => m.targetAtLogCal > 0)?.targetAtLogCal;
      const target = targetFromMeal || data.target;

      let status: StatementDayVerdict;
      if (date === data.today && meals.length === 0) {
        status = "pending";
      } else if (date === data.today && meals.some((m) => m.dayStatus === "pending")) {
        status = "pending";
      } else if (meals.length === 0) {
        status = "under";
      } else {
        status = dayStatus(dayTotal, target, data.deficit);
      }

      const delta = status === "pending" ? null : signedDelta(dayTotal, target);
      return { date, meals, dayTotal, target, status, delta };
    })
    .reverse();
}

function mealGroupLabel(group: {
  title: string;
  items: FuelMealRow[];
  totalCalories: number;
}): string {
  const n = group.items.length;
  return `${group.title} · ${n} item${n === 1 ? "" : "s"} · ${group.totalCalories} cal`;
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today&apos;s recipe</p>
          <p className="mt-1 font-display text-lg font-bold text-primary">
            {recipe?.title || "Recipe coming soon"}
          </p>
          {recipe?.teaser ? <p className="mt-2 text-sm text-muted-foreground">{recipe.teaser}</p> : null}
          {recipe && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              onClick={() => setRecipeOpen((o) => !o)}
            >
              {recipeOpen ? "Hide details" : "View details"}
              {recipeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {recipeOpen && recipe && (
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-primary">Ingredients</p>
                <p className="whitespace-pre-wrap">{recipe.ingredients}</p>
              </div>
              <div>
                <p className="font-semibold text-primary">Method</p>
                <p className="whitespace-pre-wrap">{recipe.method}</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practice along</p>
        {practiceAlong?.embedUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl bg-black/5">
            <iframe
              title={practiceAlong.title || "Practice"}
              src={practiceAlong.embedUrl}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-3 flex h-[180px] flex-col items-center justify-center gap-2 rounded-xl bg-primary/5 text-muted-foreground">
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
  onAppendToGroup,
}: {
  data: Extract<FuelDashboardResponse, { gate: "ok" }>;
  onOpenLog: () => void;
  onAppendToGroup: (group: {
    mealGroupId: string;
    mealTitle: string;
    mealSlotIndex: number | null;
  }) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const deleteItemMutation = useMutation({
    mutationFn: deleteFuelMeal,
    onSuccess: async () => {
      setConfirmKey(null);
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteFuelMealGroup,
    onSuccess: async () => {
      setConfirmKey(null);
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const todayMeals = data.meals.filter((m) => m.loggedDate === data.today);
  const todayGroups = useMemo(() => groupFuelMeals(todayMeals), [todayMeals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(28px,4vw,42px)] font-bold tracking-tight text-primary">
            Your daily <span className="font-accent italic font-normal text-dz-secondary">diet</span>
          </h1>
          <p className="mt-2 inline-flex rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Target: {data.target} cal/day · band −{data.deficit}
          </p>
        </div>
        <Button
          className="h-9 shrink-0 px-3.5 text-sm sm:h-10 sm:px-4"
          onClick={onOpenLog}
          data-testid="fuel-log-meal"
        >
          <Camera className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          Track your Diet
        </Button>
      </div>

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

      <div>
        <h3 className="font-display text-[19px] font-bold text-primary">Today&apos;s meals</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Entries for today against your target band (−{data.deficit} cal).
        </p>
        <div className="mt-4 space-y-2">
          {todayGroups.length === 0 && (
            <GlassCard className="p-5 text-sm text-muted-foreground">No meals logged today yet.</GlassCard>
          )}
          {todayGroups.map((group) => {
            const expanded = expandedGroups[group.groupKey] ?? false;
            const confirmGroup = confirmKey === `g:${group.groupKey}`;
            return (
              <GlassCard key={group.groupKey} className="overflow-hidden p-0">
                {confirmGroup ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 px-4 py-3 text-sm text-[#ba1a1a]">
                    <span>Delete entire meal “{group.title}”?</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setConfirmKey(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteGroupMutation.isPending || deleteItemMutation.isPending}
                        onClick={() => {
                          if (group.mealGroupId) deleteGroupMutation.mutate(group.mealGroupId);
                          else if (group.items[0]) deleteItemMutation.mutate(group.items[0].id);
                        }}
                      >
                        Delete meal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 px-2 py-2">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left"
                        onClick={() =>
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [group.groupKey]: !expanded,
                          }))
                        }
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {expanded ? (
                            <ChevronDown className="h-5 w-5 stroke-[2.5]" />
                          ) : (
                            <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                          )}
                        </span>
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Utensils className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-primary">{mealGroupLabel(group)}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {group.items[0]?.clientLocalTime || "-"}
                          </p>
                        </div>
                      </button>
                      {group.mealGroupId && (
                        <button
                          type="button"
                          className="rounded-lg p-2 text-primary hover:bg-primary/10"
                          onClick={() =>
                            onAppendToGroup({
                              mealGroupId: group.mealGroupId!,
                              mealTitle: group.title,
                              mealSlotIndex: group.mealSlotIndex,
                            })
                          }
                          aria-label="Add item to meal"
                        >
                          <Plus className="h-5 w-5 stroke-[2.5]" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-[#ba1a1a]"
                        onClick={() => setConfirmKey(`g:${group.groupKey}`)}
                        aria-label="Delete meal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {expanded && (
                      <ul className="space-y-1 border-t border-black/5 px-3 py-2">
                        {group.items.map((row, idx) =>
                          confirmKey === `i:${row.id}` ? (
                            <li
                              key={row.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-[#ba1a1a]"
                            >
                              <span>Delete “{row.name}”?</span>
                              <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => setConfirmKey(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deleteItemMutation.isPending}
                                  onClick={() => deleteItemMutation.mutate(row.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </li>
                          ) : (
                            <li key={row.id} className="flex items-center gap-2 rounded-lg px-2 py-2">
                              <span className="w-6 shrink-0 font-mono text-xs font-bold text-primary">
                                {idx + 1})
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-primary">{row.name}</p>
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  {row.weightG != null ? `${row.weightG}g · ` : ""}
                                  {row.eatenLocalTime
                                    ? `Eaten ${row.eatenLocalTime} · logged ${row.clientLocalTime || "-"}`
                                    : row.clientLocalTime || "-"}
                                </p>
                              </div>
                              <p className="font-mono text-sm font-semibold text-primary">{row.calories}</p>
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-[#ba1a1a]"
                                onClick={() => setConfirmKey(`i:${row.id}`)}
                                aria-label="Delete item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />
    </div>
  );
}

function StatementView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fuel-statement"],
    queryFn: fetchFuelStatement,
  });
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const dayTrays = useMemo(() => (data ? buildStatementDayTrays(data) : []), [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading statement…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load statement"}
      </p>
    );
  }

  const floor = Math.max(0, data.target - data.deficit);

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs text-muted-foreground">My Account &gt; Calorie Bank &amp; Statement</p>
      <h1 className="font-display text-[clamp(28px,4vw,42px)] font-bold tracking-tight text-primary">
        Your calorie <span className="font-accent italic font-normal text-dz-secondary">statement</span>
      </h1>
      <p className="inline-flex flex-wrap rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
        Target set: {data.target} cal/day · maintain {floor}-{data.target} (band −{data.deficit})
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Target Hit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Target missed. Over / under eating
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-black bg-white" /> In progress
        </span>
        <span className="rounded-lg bg-[#f4f1f8] px-2.5 py-1 font-semibold text-primary">This week</span>
      </div>

      <div className="space-y-3">
        {dayTrays.map((day) => {
          const { ddmm, weekday } = formatStatementDate(day.date);
          const expanded = openDays[day.date] ?? day.date === data.today;
          const headerTone = statementDayHeaderTextClass(day.status);
          const groups = groupFuelMeals(day.meals);
          return (
            <GlassCard
              key={day.date}
              className={cn("overflow-hidden p-0", statementDayTrayClass(day.status))}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                onClick={() =>
                  setOpenDays((prev) => ({
                    ...prev,
                    [day.date]: !expanded,
                  }))
                }
                aria-expanded={expanded}
              >
                <span className="mt-0.5 text-muted-foreground">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={cn("font-mono text-sm font-semibold", headerTone)}>
                      {ddmm} <span className="font-sans font-medium">{weekday}</span>
                    </p>
                    <span className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", statusPillClass(day.status))}>
                      {statementDayVerdictLabel(day.status)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "font-mono text-xs",
                      day.status === "over" || day.status === "under"
                        ? "text-[#9f1239]/80"
                        : "text-muted-foreground",
                    )}
                  >
                    Target set {day.target}
                    {" · "}
                    Consumed {day.dayTotal}
                    {day.delta != null ? ` · vs target ${formatSignedDelta(day.delta)}` : ""}
                  </p>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-black/5 px-4 py-3">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {day.status === "pending" ? "No meals logged yet today." : "No meals logged this day."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {groups.map((group) => {
                        const gKey = `${day.date}:${group.groupKey}`;
                        const gOpen = openGroups[gKey] ?? false;
                        return (
                          <li key={gKey} className="rounded-xl bg-white/60">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                              onClick={() =>
                                setOpenGroups((prev) => ({ ...prev, [gKey]: !gOpen }))
                              }
                            >
                              {gOpen ? (
                                <ChevronDown className="h-4 w-4 stroke-[2.5] text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4 stroke-[2.5] text-primary" />
                              )}
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                                {mealGroupLabel(group)}
                              </span>
                            </button>
                            {gOpen && (
                              <ul className="space-y-1 border-t border-black/5 px-3 py-2">
                                {group.items.map((meal, idx) => (
                                  <li
                                    key={meal.id}
                                    className="flex items-center justify-between gap-2 py-1 text-sm"
                                  >
                                    <span className="truncate text-primary">
                                      <span className="mr-1.5 font-mono text-xs font-bold">{idx + 1})</span>
                                      {meal.name}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {meal.weightG != null ? `${meal.weightG}g · ` : ""}
                                      {meal.calories}
                                      {meal.eatenLocalTime
                                        ? ` · eaten ${meal.eatenLocalTime} · logged ${meal.clientLocalTime || "-"}`
                                        : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </GlassCard>
          );
        })}
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
  const [pepIndex, setPepIndex] = useState(0);
  const [appendTarget, setAppendTarget] = useState<{
    mealGroupId: string;
    mealTitle: string;
    mealSlotIndex: number | null;
    eatenLocalTime?: string | null;
  } | null>(null);
  const [slotPrompt, setSlotPrompt] = useState<{
    mealGroupId: string;
    mealTitle: string;
    mealSlotIndex: number;
    startTime: string;
    endTime: string;
  } | null>(null);

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

  const pep =
    data?.gate === "ok"
      ? data.pepPhrases[pepIndex % data.pepPhrases.length]
      : null;

  const nowLocalTime = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return `${get("hour")}:${get("minute")}`;
  };

  const openAppend = (group: {
    mealGroupId: string;
    mealTitle: string;
    mealSlotIndex: number | null;
  }) => {
    if (group.mealSlotIndex == null || data?.gate !== "ok") {
      setAppendTarget({ ...group, eatenLocalTime: null });
      setLogOpen(true);
      return;
    }
    const slot = data.mealPlan.find((s) => s.index === group.mealSlotIndex);
    if (!slot) {
      setAppendTarget({ ...group, eatenLocalTime: null });
      setLogOpen(true);
      return;
    }
    const now = nowLocalTime();
    if (isLocalTimeInSlot(now, slot.startTime, slot.endTime)) {
      setAppendTarget({ ...group, eatenLocalTime: null });
      setLogOpen(true);
      return;
    }
    setSlotPrompt({
      mealGroupId: group.mealGroupId,
      mealTitle: group.mealTitle,
      mealSlotIndex: group.mealSlotIndex,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  return (
    <DashboardShell active="fuel">
      <FeatureInteractionFreeze feature="wediet">
      <PageContainer className="relative py-[clamp(24px,4vw,40px)] pb-24">
        {data?.gate === "ok" && pep && (
          <div className="relative mb-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#4b3282] to-dz-secondary px-7 py-6 text-white">
            <Heart className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 rotate-12 text-white/10" />
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Vibe check</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <p className="max-w-3xl font-display text-[clamp(18px,2.2vw,24px)] font-semibold leading-snug">
                {pep.pre}
                <span className="font-accent italic font-normal">{pep.accent}</span>
                {pep.post}
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
        )}

        <div className="mb-6 inline-flex rounded-full bg-primary/5 p-1">
          {(
            [
              ["fuel", "Diet Control"],
              ["statement", "Calorie Statement"],
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

        {isLoading && <p className="text-sm text-muted-foreground">Loading andWeDiet…</p>}
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
              <h2 className="font-display text-2xl font-bold text-primary">A quick health check-in</h2>
              <p className="text-sm text-muted-foreground">
                andWeDiet uses your health-data consent to store meal names and calorie values. Photos are
                never kept. Only the confirmed name and calories. Share a short Health History and tick
                consent to continue.
              </p>
              <p className="text-xs text-muted-foreground">{FUEL_MEDICAL_DISCLAIMER}</p>
              <Button
                onClick={() => {
                  setAccountReturnIntent("/fuel");
                  setLocation("/my-account#health");
                }}
              >
                Share Health History
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
          <FuelDashboardView
            data={data}
            onOpenLog={() => {
              setAppendTarget(null);
              setLogOpen(true);
            }}
            onAppendToGroup={openAppend}
          />
        )}
        {data?.gate === "ok" && view === "statement" && <StatementView />}

        {data?.gate === "ok" && (
          <TrackDietModal
            open={logOpen}
            onClose={() => {
              setLogOpen(false);
              setAppendTarget(null);
            }}
            mealPlan={data.mealPlan}
            dayTotal={data.dayTotal}
            target={data.target}
            estimationAvailable={data.estimationAvailable}
            appendTarget={appendTarget}
          />
        )}

        {slotPrompt && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-[22px] bg-dz-surface p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-primary">Outside this meal window</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {slotPrompt.mealTitle} is set for {slotPrompt.startTime}-{slotPrompt.endTime} (your local
                time). Add this item to that meal anyway, or log it under {FUEL_OUTSIDE_SLOTS_TITLE}?
              </p>
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setAppendTarget({
                      mealGroupId: slotPrompt.mealGroupId,
                      mealTitle: slotPrompt.mealTitle,
                      mealSlotIndex: slotPrompt.mealSlotIndex,
                      eatenLocalTime: midpointHhmm(slotPrompt.startTime, slotPrompt.endTime),
                    });
                    setSlotPrompt(null);
                    setLogOpen(true);
                  }}
                >
                  Add to {slotPrompt.mealTitle}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSlotPrompt(null);
                    setAppendTarget(null);
                    setLogOpen(true);
                  }}
                >
                  Track a new meal instead
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setSlotPrompt(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
      </FeatureInteractionFreeze>
    </DashboardShell>
  );
}
