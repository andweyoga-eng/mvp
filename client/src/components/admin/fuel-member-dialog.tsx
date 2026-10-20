import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Apple, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_FUEL_MEAL_PLAN, FUEL_SAFETY_FLOOR_CAL, type FuelMealPlan } from "@shared/fuel";
import { adminHeaders } from "@/lib/admin-api";
import { AdminCalorieStatementView } from "@/components/admin/calorie-statement-view";

type FuelConfigResponse = {
  dailyCalorieTargetCal: number | null;
  dailyDeficitCal: number | null;
  fuelMealPlan: FuelMealPlan;
  calorieTargetSetBy: string | null;
  calorieTargetSetAt: string | null;
  fuelFloorOverrideReason: string | null;
  defaultMealPlan: FuelMealPlan;
};

export function AdminFuelMemberDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState("1500");
  const [deficit, setDeficit] = useState("300");
  const [overrideReason, setOverrideReason] = useState("");
  const [planJson, setPlanJson] = useState(JSON.stringify(DEFAULT_FUEL_MEAL_PLAN, null, 2));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}/fuel`, {
          headers: adminHeaders(),
          credentials: "include",
        });
        const data = (await res.json()) as FuelConfigResponse & { message?: string };
        if (!res.ok) throw new Error(data.message || "Failed to load");
        if (cancelled) return;
        setTarget(data.dailyCalorieTargetCal != null ? String(data.dailyCalorieTargetCal) : "1500");
        setDeficit(data.dailyDeficitCal != null ? String(data.dailyDeficitCal) : "300");
        setOverrideReason(data.fuelFloorOverrideReason ?? "");
        setPlanJson(JSON.stringify(data.fuelMealPlan ?? data.defaultMealPlan, null, 2));
      } catch (err) {
        toast({
          title: "Could not load Diet config",
          description: err instanceof Error ? err.message : "Error",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, toast]);

  const save = async (clear = false) => {
    setSaving(true);
    try {
      let fuelMealPlan = DEFAULT_FUEL_MEAL_PLAN;
      if (!clear) {
        fuelMealPlan = JSON.parse(planJson) as FuelMealPlan;
      }
      const body = clear
        ? { clearConfig: true }
        : {
            dailyCalorieTargetCal: Number(target),
            dailyDeficitCal: Number(deficit),
            fuelMealPlan,
            overrideReason: overrideReason.trim() || undefined,
          };
      const res = await fetch(`/api/admin/users/${userId}/fuel`, {
        method: "PUT",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");
      toast({ title: clear ? "Diet config cleared" : "Diet config saved" });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "progress", "fuel", userId],
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const floor = Number(target) - Number(deficit);
  const needsOverride = Number.isFinite(floor) && floor < FUEL_SAFETY_FLOOR_CAL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            WeDiet: {userName}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="statement" className="w-full">
          <TabsList className="mb-3 grid w-full grid-cols-2">
            <TabsTrigger value="statement">Weekly statement</TabsTrigger>
            <TabsTrigger value="configure">Configure targets</TabsTrigger>
          </TabsList>
          <TabsContent value="statement" className="mt-0">
            {open ? <AdminCalorieStatementView userId={userId} /> : null}
          </TabsContent>
          <TabsContent value="configure" className="mt-0">
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  On-track band is [target − deficit, target]. Effective floor below{" "}
                  {FUEL_SAFETY_FLOOR_CAL} needs an override reason.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Daily target (cal)</Label>
                    <Input
                      type="number"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Deficit band (cal)</Label>
                    <Input
                      type="number"
                      value={deficit}
                      onChange={(e) => setDeficit(e.target.value)}
                    />
                  </div>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Effective floor: {Number.isFinite(floor) ? floor : "-"}
                </p>
                {needsOverride && (
                  <div>
                    <Label>Override reason (required)</Label>
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Why this floor is appropriate for this member"
                    />
                  </div>
                )}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>Meal plan (JSON)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() =>
                        setPlanJson(JSON.stringify(DEFAULT_FUEL_MEAL_PLAN, null, 2))
                      }
                    >
                      Reset default
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[180px] font-mono text-xs"
                    value={planJson}
                    onChange={(e) => setPlanJson(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" disabled={saving} onClick={() => void save(true)}>
                    Clear config
                  </Button>
                  <Button disabled={saving} onClick={() => void save(false)}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
