import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { adminHeaders } from "@/lib/admin-api";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type AdminFuelStatement = {
  userId: string;
  name: string;
  email: string;
  weekStart: string;
  weekEnd: string;
  prevWeekStart: string;
  nextWeekStart: string;
  today: string;
  target: number;
  deficit: number;
  mealsLoggedThisWeek: number;
  avgDailyDelta: number | null;
  rows: Array<{
    id: string;
    loggedDate: string;
    name: string;
    calories: number;
    dayTotal: number;
    dayStatus: string;
    dayDelta: string | null;
    clientLocalTime: string | null;
  }>;
};

/**
 * Weekly calorie statement (same API as andWeProgress Calorie section).
 */
export function AdminCalorieStatementView({
  userId,
  footer,
}: {
  userId: string;
  /** Optional footer (e.g. andWeProgress section comments). */
  footer?: ReactNode;
}) {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "progress", "fuel", userId, weekStart],
    queryFn: async () => {
      const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
      const res = await fetch(
        `/api/admin/progress/users/${userId}/fuel/statement${qs}`,
        { credentials: "include", headers: adminHeaders() },
      );
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Diet is not configured for this member yet.");
      }
      if (!res.ok) throw new Error("Failed to load calorie statement");
      return res.json() as Promise<AdminFuelStatement>;
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground py-2">Loading calorie statement…</p>;
  }
  if (query.error || !query.data) {
    return (
      <div className="space-y-3 pt-1">
        <p className="text-sm text-muted-foreground">
          {(query.error as Error)?.message || "Could not load calorie statement."}
        </p>
        {footer}
      </div>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-3 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium">
            Week {data.weekStart} → {data.weekEnd}
          </span>
          <span className="text-muted-foreground text-xs ml-2">
            target {data.target} · deficit {data.deficit} · {data.mealsLoggedThisWeek} meals
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekStart(data.prevWeekStart)}
          >
            <ChevronLeft className="h-4 w-4" /> Prev week
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekStart(data.nextWeekStart)}
          >
            Next week <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meals logged this week.</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Meal</th>
                <th className="px-3 py-2">kcal</th>
                <th className="px-3 py-2">Day total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.loggedDate}
                    {r.clientLocalTime ? (
                      <span className="text-xs text-muted-foreground ml-1">
                        {r.clientLocalTime}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.calories}</td>
                  <td className="px-3 py-2">{r.dayTotal}</td>
                  <td className="px-3 py-2">
                    {r.dayStatus}
                    {r.dayDelta ? (
                      <span className="text-xs text-muted-foreground ml-1">{r.dayDelta}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </div>
  );
}
