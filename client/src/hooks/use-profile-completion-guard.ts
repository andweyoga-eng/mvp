import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getFirstIncompleteAccountAnchor } from "@shared/profileCompleteness";
import { myAccountHref } from "@/lib/account-routes";

const GUARDED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/emojou",
  "/workshops",
  "/trips",
  "/explore",
  "/fuel",
  "/reserve",
];

/** Redirect incomplete profiles back to the missing section when leaving My Account. */
export function useProfileCompletionGuard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.profileCompletionStatus === "complete") return;
    if (location.startsWith("/my-account")) return;
    if (!GUARDED_PREFIXES.some((p) => location === p || location.startsWith(`${p}?`))) return;

    const anchor = getFirstIncompleteAccountAnchor({
      emailVerified: user.emailVerified,
      name: user.name,
      primaryMobile: user.primaryMobile,
      primaryMobileCountryCode: user.primaryMobileCountryCode,
      emergencyMobile: user.emergencyMobile,
      emergencyMobileCountryCode: user.emergencyMobileCountryCode,
      healthUpdateText: user.healthUpdateText,
    });
    if (!anchor) return;

      toast({
          title: "Complete your profile",
          description:
            "Add your mobile number and contact details so we can reach you.",
        });
    setLocation(myAccountHref(anchor));
  }, [user, location, setLocation, toast]);
}
