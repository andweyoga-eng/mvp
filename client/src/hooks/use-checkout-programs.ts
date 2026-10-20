import { useEffect, useMemo, useState } from "react";
import type { PublicCheckoutProgram } from "@shared/checkout-program";
import { sessionFrequencyToProgramKind } from "@shared/checkout-program";

export type { PublicCheckoutProgram };

export function useCheckoutPrograms(params: {
  classTypeId?: string | null;
  sessionFrequency?: string | null;
  enabled?: boolean;
}) {
  const kind = sessionFrequencyToProgramKind(params.sessionFrequency ?? null);
  const enabled = params.enabled !== false && !!params.classTypeId && !!kind;
  const [programs, setPrograms] = useState<PublicCheckoutProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string>("");

  useEffect(() => {
    if (!enabled || !params.classTypeId || !kind) {
      setPrograms([]);
      setProgramId("");
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      classTypeId: params.classTypeId,
      kind,
    });
    fetch(`/api/programs/active?${qs}`, { credentials: "include" })
      .then(async (res) => {
        const body = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(
            (body as { message?: string }).message || "Failed to load programs",
          );
        }
        return body as PublicCheckoutProgram[];
      })
      .then((rows) => {
        if (cancelled) return;
        setPrograms(rows);
        setProgramId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows.length === 1 ? rows[0]!.id : "";
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPrograms([]);
        setProgramId("");
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, params.classTypeId, kind]);

  const selected = useMemo(
    () => programs.find((p) => p.id === programId) ?? null,
    [programs, programId],
  );

  return {
    kind,
    programs,
    programId,
    setProgramId,
    selected,
    loading,
    error,
    ready: !loading && !!programId && programs.length > 0,
    needsChoice: !loading && programs.length > 1 && !programId,
    empty: !loading && programs.length === 0,
  };
}
