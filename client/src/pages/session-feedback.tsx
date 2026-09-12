import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

/**
 * Legacy route: redirects to home schedule with mood popup query params.
 * Use `/?mood=post&classId=<id>#schedule` in Meet / Razorpay configs instead.
 */
export default function SessionFeedbackRedirect() {
  const search = useSearch();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const classId = params.get("classId") || "";
    const mood = params.get("mood") || "post";
    const q = new URLSearchParams({ mood, ...(classId ? { classId } : {}) });
    setLocation(`/?${q.toString()}#schedule`);
  }, [search, setLocation]);

  return null;
}
