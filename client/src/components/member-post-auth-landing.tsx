import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { applyPostLoginLandingIfNeeded } from "@/lib/member-landing";

/** After login, send members with upcoming sessions to My Sessions; otherwise to schedule. */
export function MemberPostAuthLanding() {
  const { user, isLoading } = useAuth();
  const [pathname, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading || !user) return;
    void applyPostLoginLandingIfNeeded(pathname, setLocation, user);
  }, [user, isLoading, pathname, setLocation]);

  return null;
}
