import { useEffect } from "react";
import { useLocation } from "wouter";
import { mapLegacyMyAccountUrl } from "@/lib/account-routes";

/** Redirect legacy `/my-account` URLs to `/account/…` routes. */
export default function MyAccountRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const target = mapLegacyMyAccountUrl(window.location.pathname, window.location.search);
    setLocation(target);
  }, [setLocation]);

  return null;
}
