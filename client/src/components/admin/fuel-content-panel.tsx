import { useEffect, useState } from "react";
import { Apple, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";

function todayIso() {
  // Member-local calendar date (not UTC), so admin "today" matches the Fuel dashboard.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function AdminFuelContentPanel() {
  const { toast } = useToast();
  const [forDate, setForDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [method, setMethod] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [approxKcal, setApproxKcal] = useState("");

  const [provider, setProvider] = useState<"youtube" | "instagram">("youtube");
  const [embedId, setEmbedId] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");

  const [estimationStatus, setEstimationStatus] = useState<{
    estimationEnabled: boolean;
    geminiKeyPresent: boolean;
    active: boolean;
    model: string;
    statusLabel: string;
  } | null>(null);

  const loadEstimationStatus = async () => {
    try {
      const res = await fetch("/api/admin/fuel/estimation-status", {
        credentials: "include",
        headers: adminHeaders(),
      });
      if (!res.ok) return;
      setEstimationStatus(await res.json());
    } catch {
      /* non-blocking */
    }
  };

  const load = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fuel/content?forDate=${encodeURIComponent(date)}`, {
        headers: adminHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setTitle(data.recipe?.title ?? "");
      setTeaser(data.recipe?.teaser ?? "");
      setIngredients(data.recipe?.ingredients ?? "");
      setMethod(data.recipe?.method ?? "");
      setImageUrl(data.recipe?.imageUrl ?? "");
      setApproxKcal(data.recipe?.approxKcal != null ? String(data.recipe.approxKcal) : "");
      setProvider(data.media?.provider === "instagram" ? "instagram" : "youtube");
      setEmbedId(data.media?.embedId ?? "");
      setMediaTitle(data.media?.title ?? "");
    } catch (err) {
      toast({
        title: "Could not load WeDiet content",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(forDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forDate]);

  useEffect(() => {
    void loadEstimationStatus();
  }, []);

  const saveRecipe = async () => {
    setSaving(true);
    try {
      const trimmedUrl = imageUrl.trim();
      const res = await fetch("/api/admin/fuel/recipe", {
        method: "PUT",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          forDate,
          title: title.trim(),
          teaser: teaser.trim(),
          ingredients: ingredients.trim(),
          method: method.trim(),
          imageUrl: trimmedUrl || null,
          approxKcal: approxKcal.trim() === "" ? null : approxKcal.trim(),
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message || "Save failed");
      }
      await res.json();
      toast({ title: "Recipe saved" });
    } catch (err) {
      toast({
        title: "Recipe save failed",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fuel/media", {
        method: "PUT",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          forDate,
          provider,
          embedId: embedId.trim(),
          title: mediaTitle.trim() || "Practice along",
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message || "Save failed");
      }
      const data = await res.json();
      setEmbedId(data.embedId ?? embedId.trim());
      toast({ title: "Practice video saved" });
    } catch (err) {
      toast({
        title: "Media save failed",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Apple className="h-5 w-5" />
          WeDiet content
        </CardTitle>
        <CardDescription>
          Curate the recipe of the day and practice-along embed (provider + id only; no raw member URLs).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {estimationStatus && (
          <div
            className={`rounded-lg border p-4 ${
              estimationStatus.active
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-muted bg-muted/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <Camera className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Photo calorie estimation</p>
                <p className="text-muted-foreground">{estimationStatus.statusLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Flag: {estimationStatus.estimationEnabled ? "on" : "off"} · API key:{" "}
                  {estimationStatus.geminiKeyPresent ? "present" : "missing"} · Model:{" "}
                  {estimationStatus.model}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="max-w-xs">
          <Label>For date</Label>
          <Input type="date" value={forDate} onChange={(e) => setForDate(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold">Recipe of the day</h3>
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Teaser</Label>
                  <Input value={teaser} onChange={(e) => setTeaser(e.target.value)} />
                </div>
                <div>
                  <Label>Ingredients</Label>
                  <Textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
                </div>
                <div>
                  <Label>Method</Label>
                  <Textarea value={method} onChange={(e) => setMethod(e.target.value)} />
                </div>
                <div>
                  <Label>Image URL (paste)</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://…"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. Must be a full http(s) link (e.g. https://…). Leave blank if none.
                  </p>
                </div>
                <div>
                  <Label>Approx kcal</Label>
                  <Input type="number" value={approxKcal} onChange={(e) => setApproxKcal(e.target.value)} />
                </div>
                <Button disabled={saving} onClick={() => void saveRecipe()}>
                  Save recipe
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Practice along</h3>
                <div>
                  <Label>Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(v) => setProvider(v as "youtube" | "instagram")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Video URL or embed id</Label>
                  <Input
                    value={embedId}
                    onChange={(e) => setEmbedId(e.target.value)}
                    placeholder={
                      provider === "youtube"
                        ? "https://youtube.com/shorts/… or video id"
                        : "https://instagram.com/reel/… or id"
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Full YouTube/Instagram links are fine. We store only the id.
                  </p>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} />
                </div>
                <Button disabled={saving} onClick={() => void saveMedia()}>
                  Save video
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
