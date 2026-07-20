import { useEffect } from "react";
import { useLocation } from "wouter";

/** Legacy /calendar URLs now land on the unified Sessions tab. */
export default function CalendarRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/dashboard", { replace: true });
  }, [setLocation]);

  return null;
}
