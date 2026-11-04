import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import {
  FlexiSelectionBuilder,
  type FlexiOption,
  type FlexiSelection,
} from "@/components/flexi-selection-builder";
import { RefreshCw } from "lucide-react";

export interface FlexiAdminSummary {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  classTypeId: string;
  classTypeName: string;
  instructorId: string;
  instructorName: string;
  anchorClassId: string;
  selectionCount: number;
  editCount: number;
  status: string;
  paymentStatus: string;
  horizonStartAt: string;
  horizonEndAt: string;
  canRematch: boolean;
  selections: FlexiSelection[];
}

interface FlexiRematchOptionsResponse {
  flexiBookingId: string;
  editCount: number;
  selectionCount: number;
  tooltip?: string;
  options: FlexiOption[];
}

function formatHorizon(startAt: string, endAt: string) {
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  return `${fmt(startAt)} - ${fmt(endAt)}`;
}

export function FlexiRematchPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftSelections, setDraftSelections] = useState<FlexiSelection[]>([]);

  const { data: rows = [], isLoading } = useQuery<FlexiAdminSummary[]>({
    queryKey: ["/api/admin/flexi-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flexi-bookings", { headers: adminHeaders() });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const {
    data: rematchOptions,
    isFetching: optionsLoading,
  } = useQuery<FlexiRematchOptionsResponse>({
    queryKey: ["/api/admin/flexi-bookings", activeId, "options"],
    enabled: !!activeId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/flexi-bookings/${activeId}/options`, {
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const rematchMutation = useMutation({
    mutationFn: async ({
      flexiBookingId,
      selections,
    }: {
      flexiBookingId: string;
      selections: FlexiSelection[];
    }) => {
      const res = await fetch(`/api/admin/flexi-bookings/${flexiBookingId}/rematch`, {
        method: "PATCH",
        headers: {
          ...adminHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selections: selections.map((selection) => ({
            weekday: selection.weekday,
            sourceSeriesId: selection.sourceSeriesId,
            sourceClassId: selection.sourceClassId,
            timeLabel: selection.timeLabel,
          })),
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Flexi rematched",
        description: "Calendar, Meet access, and capacity were recomputed for future occurrences.",
      });
      setActiveId(null);
      setDraftSelections([]);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/flexi-bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Rematch failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activeRow = useMemo(
    () => rows.find((row) => row.id === activeId) ?? null,
    [rows, activeId],
  );

  function beginRematch(row: FlexiAdminSummary) {
    setActiveId(row.id);
    setDraftSelections(row.selections);
  }

  function cancelRematch() {
    setActiveId(null);
    setDraftSelections([]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#3d1b80]" /> Flexi Rematch
        </CardTitle>
        <CardDescription>
          Super admins may rematch a Flexi package once before it ends. Exact day-count stays
          unchanged; capacity, calendar, and Meet access are recomputed for future occurrences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bb5309]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No Flexi bookings yet.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const isEditing = activeId === row.id;
              return (
                <div key={row.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{row.classTypeName}</h3>
                        <Badge variant="outline" className="capitalize">
                          {row.paymentStatus}
                        </Badge>
                        <Badge
                          className={
                            row.canRematch
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {row.editCount >= 1
                            ? "Rematch used"
                            : row.canRematch
                              ? "Rematch available"
                              : "Not rematchable"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {row.userName} · {row.userEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {row.instructorName} · N={row.selectionCount} ·{" "}
                        {formatHorizon(row.horizonStartAt, row.horizonEndAt)}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {row.selections.map((selection) => (
                          <li key={`${selection.weekday}-${selection.sourceClassId}`}>
                            {selection.weekdayLabel} · {selection.timeLabel || "Time n/a"}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {row.canRematch ? (
                      <Button
                        size="sm"
                        variant={isEditing ? "outline" : "default"}
                        className={
                          isEditing
                            ? undefined
                            : "bg-[#3d1b80] hover:bg-[#2f1463] text-white shrink-0"
                        }
                        onClick={() => (isEditing ? cancelRematch() : beginRematch(row))}
                      >
                        {isEditing ? "Cancel" : "Rematch once"}
                      </Button>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {optionsLoading || !rematchOptions ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#bb5309]" />
                        </div>
                      ) : (
                        <>
                          <FlexiSelectionBuilder
                            selectionCount={rematchOptions.selectionCount || row.selectionCount}
                            tooltip="Choose a new weekday and time mix from the same Flexi pool. This rematch can only be done once."
                            options={rematchOptions.options}
                            selections={draftSelections}
                            onChange={setDraftSelections}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={
                                rematchMutation.isPending ||
                                draftSelections.length !==
                                  (rematchOptions.selectionCount || row.selectionCount)
                              }
                              onClick={() =>
                                rematchMutation.mutate({
                                  flexiBookingId: row.id,
                                  selections: draftSelections,
                                })
                              }
                            >
                              {rematchMutation.isPending ? "Saving..." : "Confirm rematch"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelRematch}>
                              Cancel
                            </Button>
                          </div>
                          {activeRow && draftSelections.length !== activeRow.selectionCount ? (
                            <p className="text-xs text-muted-foreground">
                              Select exactly {activeRow.selectionCount} weekly slot
                              {activeRow.selectionCount === 1 ? "" : "s"} before confirming.
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
