import { useEffect, useMemo, useState } from "react";

function formatHoldTime(secondsLeft: number): string {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return [mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Client countdown synced to server-held `heldUntil` (A-01). */
export function usePaymentHoldCountdown(heldUntil: string | null | undefined) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!heldUntil) {
      setSecondsLeft(0);
      setExpired(false);
      return;
    }

    const tick = () => {
      const secs = Math.max(
        0,
        Math.floor((new Date(heldUntil).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(secs);
      setExpired(secs === 0);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [heldUntil]);

  const isActive = Boolean(heldUntil && secondsLeft > 0 && !expired);
  const isWarning = isActive && secondsLeft <= 120;

  const timeDisplay = useMemo(() => formatHoldTime(secondsLeft), [secondsLeft]);

  return { secondsLeft, expired, isActive, isWarning, timeDisplay };
}
