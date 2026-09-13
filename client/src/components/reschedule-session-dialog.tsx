import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export type RescheduleTarget = {
  classId: string;
  classTypeName: string;
  instructorName: string;
  date: string;
  seatsRemaining: number;
  isOwnInstructor: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  sourceBookingId?: string | null;
  classTypeName: string;
  onCompleted: () => void;
};

function formatTarget(dateIso: string): string {
  return new Date(dateIso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function RescheduleSessionDialog({
  open,
  onOpenChange,
  subscriptionId,
  sourceBookingId,
  classTypeName,
  onCompleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [targets, setTargets] = useState<RescheduleTarget[]>([]);
  const [windowEnd, setWindowEnd] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !subscriptionId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelectedClassId(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/subscriptions/${subscriptionId}/reschedule-targets`,
          { credentials: "include", headers: getAuthHeaders() },
        );
        const body = await readResponseJson<{
          targets?: RescheduleTarget[];
          windowEnd?: string;
          message?: string;
        }>(res);
        if (cancelled) return;
        if (!res.ok) {
          setTargets([]);
          setError(body.message || "Could not load reschedule options.");
          return;
        }
        setTargets(body.targets ?? []);
        setWindowEnd(body.windowEnd ?? null);
      } catch {
        if (!cancelled) setError("Could not load reschedule options.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, subscriptionId]);

  const handleConfirm = async () => {
    if (!selectedClassId) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/reschedule`, {
        method: "POST",
        credentials: "include",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          targetClassId: selectedClassId,
          sourceBookingId: sourceBookingId || undefined,
        }),
      });
      const body = await readResponseJson<{ message?: string }>(res);
      if (!res.ok) {
        setError(body.message || "Reschedule failed.");
        return;
      }
      onOpenChange(false);
      onCompleted();
    } catch {
      setError("Reschedule failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule {classTypeName}</DialogTitle>
          <DialogDescription>
            Pick another session of the same type. Your cancelled session stays on your history.
            {windowEnd
              ? ` Window ends ${new Date(windowEnd).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`
              : null}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading options…
          </div>
        ) : error && !targets.length ? (
          <p className="text-sm text-destructive py-4">{error}</p>
        ) : !targets.length ? (
          <p className="text-sm text-muted-foreground py-4">
            No open seats in your reschedule window right now. Check again later, or wait for the
            deadline refund.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {targets.map((t) => (
              <li key={t.classId}>
                <button
                  type="button"
                  onClick={() => setSelectedClassId(t.classId)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedClassId === t.classId
                      ? "border-primary bg-primary/5"
                      : "border-primary/10 hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium">{formatTarget(t.date)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.instructorName}
                    {t.isOwnInstructor ? " · your instructor" : ""} · {t.seatsRemaining} seat
                    {t.seatsRemaining === 1 ? "" : "s"} left
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && targets.length ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!selectedClassId || submitting || loading}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "Reserving…" : "Confirm reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
