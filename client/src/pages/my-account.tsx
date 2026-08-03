import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Smartphone,
  Siren,
  Phone,
  AlertTriangle,
  Heart,
  CalendarClock,
  CreditCard,
  SlidersHorizontal,
  ShieldCheck,
  BadgeCheck,
  LogOut,
  Lightbulb,
  ArrowUp,
  Shield,
  Coins,
} from "lucide-react";
import Navigation from "@/components/navigation";
import { SessionHistory } from "@/components/session-history";
import { PaymentHistory } from "@/components/payment-history";
import { PrivacyConsentSection } from "@/components/privacy-consent-section";
import { AccountHealthNoteSection } from "@/components/account-health-note-section";
import { AccountComingSoonBadge, AccountFoldSection } from "@/components/account-fold-section";
import { DateOfBirthField } from "@/components/date-of-birth-field";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import {
  ADDRESS_COUNTRY_OPTIONS,
  DEFAULT_ADDRESS_COUNTRY,
  getAddressStatesForCountry,
  hasPredefinedAddressStates,
} from "@shared/address-regions";
import { type ConsentLanguage, type ConsentRequirement, isAdult, isValidDateOfBirth, CONSENT_COPY } from "@shared/consent";
import { detectConsentLanguage } from "@/lib/consent-language";
import { fetchMyConsentStatus } from "@/lib/consent-api";
import { LEGAL_CONFIG } from "@shared/legal-config";
import { useAuth, getAuthHeaders, type User as AuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  countryCodeOptions,
  validateMobileNumber,
  formatMobileNumber,
} from "@shared/mobile-validation";
import {
  isHealthDisclosureComplete,
  isAccountProfileComplete,
  isProfileFieldsSectionComplete,
  getFirstIncompleteAccountAnchor,
  type AccountProfileCheckInput,
} from "@shared/profileCompleteness";
import { anchorFromLegacyTab, type AccountAnchor } from "@/lib/account-routes";
import { getPendingBooking } from "@/lib/pending-booking";
import { redirectAfterProfileComplete } from "@/lib/member-landing";
import { parseHealthHistory, HEALTH_NO_CONCERNS_TEXT } from "@shared/health-disclosure";
import { resolveHealthMediaLinks, type HealthMediaLink } from "@shared/health-media-links";

/**
 * MY ACCOUNT — the single source of truth for the member account experience.
 * One vertical-scroll page (no page-level tabs, no drawer here) with an in-page
 * section rail (desktop) and chip nav (mobile). Every other page's account
 * drawer deep-links into these section anchors.
 *
 * Anchor ids are a contract — keep `#profile #health #sessions #payments
 * #preferences #security` stable (heading reads "Contact Info" but id is
 * `profile` so existing links keep working).
 */

type PhoneField = "primaryMobile" | "secondaryMobile" | "emergencyMobile";

function validateRequiredMobile(
  field: PhoneField,
  digits: string,
  countryCode: string,
): { isValid: boolean; error: string } {
  if (field === "secondaryMobile" && !digits.trim()) return { isValid: true, error: "" };
  if (field !== "secondaryMobile" && !digits.trim()) {
    return {
      isValid: false,
      error: field === "primaryMobile" ? "Mobile is required" : "Emergency contact is required",
    };
  }
  const v = validateMobileNumber(digits, countryCode);
  return { isValid: v.isValid, error: v.error ?? "" };
}

const scrollToSchedule = () => {
  window.location.href = "/?openBooking=true";
};

const NAV: { id: AccountAnchor; label: string; icon: typeof User; soon?: boolean }[] = [
  { id: "profile", label: "Contact Info", icon: User },
  { id: "health", label: "Health History", icon: Heart },
  { id: "sessions", label: "Sessions", icon: CalendarClock },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "credits", label: "Credits", icon: Coins, soon: true },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal, soon: true },
  { id: "security", label: "Account & security", icon: ShieldCheck },
  { id: "privacy", label: "Privacy & consent", icon: Shield },
];

/** Desktop breakpoint (handoff: 900px). Below this the page scrolls; at/above it the
 * content panel scrolls internally while the left rail stays static. */
const DESKTOP_MQ = "(min-width: 900px)";
/** Id of the internally-scrolling content panel (desktop/tablet). */
const SCROLL_PANEL_ID = "account-scroll";

function scrollToAccountSection(id: AccountAnchor) {
  window.location.hash = id;
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function healthSectionSummary(text: string, lastModified: string | null | undefined): string {
  if (!isHealthDisclosureComplete(text)) {
    return "Add your Health History to book sessions";
  }
  const preview = text.length > 72 ? `${text.slice(0, 72)}…` : text;
  if (lastModified) {
    return `Updated ${new Date(lastModified).toLocaleDateString()} · ${preview}`;
  }
  return preview;
}

export default function MyAccount() {
  const { user, updateProfile, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [payTab, setPayTab] = useState<"history" | "methods">("history");
  const [activeSection, setActiveSection] = useState<AccountAnchor>("profile");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openSections, setOpenSections] = useState<Partial<Record<AccountAnchor, boolean>>>({});

  const [profileData, setProfileData] = useState({
    name: "",
    dateOfBirth: "",
    primaryMobile: "",
    primaryMobileCountryCode: "+91",
    secondaryMobile: "",
    secondaryMobileCountryCode: "+91",
    emergencyMobile: "",
    emergencyMobileCountryCode: "+91",
    healthUpdateText: "",
    healthDocumentUrls: [] as string[],
    healthMediaLinks: [] as HealthMediaLink[],
    whatsappConsent: false,
    addressStreet: "",
    addressLine2: "",
    addressCity: "",
    addressCountry: DEFAULT_ADDRESS_COUNTRY,
    addressState: "",
    addressPincode: "",
  });
  const [mobileValidation, setMobileValidation] = useState({
    primaryMobile: { isValid: true, error: "" },
    secondaryMobile: { isValid: true, error: "" },
    emergencyMobile: { isValid: true, error: "" },
  });
  // Preferences are UI-only placeholders until the notifications backend ships.
  const [prefs, setPrefs] = useState({ reminders: true, updates: true, promos: false });
  // Fail-closed default: never assume health-data consent is already given until
  // the server confirms it. Assuming `true` here let onboarding skip recording it.
  const [healthConsentGiven, setHealthConsentGiven] = useState(false);
  const [healthConsentChecked, setHealthConsentChecked] = useState(false);
  const [consentRequirement, setConsentRequirement] = useState<ConsentRequirement | null>(null);
  const [pendingHealthSave, setPendingHealthSave] = useState<{
    text: string;
    documentUrls: string[];
    mediaLinks: HealthMediaLink[];
  } | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [consentLang, setConsentLang] = useState<ConsentLanguage>(detectConsentLanguage);
  const [dobError, setDobError] = useState("");
  const dobLocked = Boolean(user?.dateOfBirth);

  useEffect(() => {
    if (!user?.id) return;
    fetchMyConsentStatus()
      .then((data) => {
        const health = data.categories.find((c) => c.consentType === "health_data");
        setHealthConsentGiven(health?.status === "active");
        setConsentRequirement(data.requirement);
      })
      .catch(() => {
        setHealthConsentGiven(false);
        setConsentRequirement(null);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user) setLocation("/");
  }, [user, setLocation]);

  // Hydrate the form ONCE per signed-in user. Re-running on every `user` change
  // would clobber locally-typed-but-unsaved fields (e.g. emergency contact, DOB)
  // whenever a background silent save (primary mobile) mutates `user`.
  const hydratedUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      hydratedUserId.current = null;
      return;
    }
    if (hydratedUserId.current === user.id) return;
    hydratedUserId.current = user.id;
    const next = {
      name: user.name || "",
      dateOfBirth: user.dateOfBirth || "",
      primaryMobile: user.primaryMobile || "",
      primaryMobileCountryCode: user.primaryMobileCountryCode || "+91",
      secondaryMobile: user.secondaryMobile || "",
      secondaryMobileCountryCode: user.secondaryMobileCountryCode || "+91",
      emergencyMobile: user.emergencyMobile || "",
      emergencyMobileCountryCode: user.emergencyMobileCountryCode || "+91",
      healthUpdateText: user.healthUpdateText || "",
      healthDocumentUrls: user.healthDocumentUrls || [],
      healthMediaLinks: resolveHealthMediaLinks(user.healthMediaLinks, user.healthDocumentUrls),
      whatsappConsent: Boolean(user.whatsappConsent),
      addressStreet: user.addressStreet || "",
      addressLine2: user.addressLine2 || "",
      addressCity: user.addressCity || "",
      addressCountry: user.addressCountry || DEFAULT_ADDRESS_COUNTRY,
      addressState: user.addressState || "",
      addressPincode: user.addressPincode || "",
    };
    setProfileData(next);
    setDobError("");
    setMobileValidation({
      primaryMobile: validateRequiredMobile(
        "primaryMobile",
        formatMobileNumber(next.primaryMobile),
        next.primaryMobileCountryCode,
      ),
      secondaryMobile: validateRequiredMobile(
        "secondaryMobile",
        formatMobileNumber(next.secondaryMobile),
        next.secondaryMobileCountryCode,
      ),
      emergencyMobile: validateRequiredMobile(
        "emergencyMobile",
        formatMobileNumber(next.emergencyMobile),
        next.emergencyMobileCountryCode,
      ),
    });
  }, [user]);

  // Save primary mobile as soon as it is valid so the team can contact the member.
  useEffect(() => {
    if (!user?.id) return;
    const digits = formatMobileNumber(profileData.primaryMobile);
    const valid = validateMobileNumber(digits, profileData.primaryMobileCountryCode).isValid;
    if (!valid || !digits.trim()) return;
    const saved = formatMobileNumber(user.primaryMobile || "");
    if (digits === saved) return;

    const timer = window.setTimeout(() => {
      void updateProfile(
        {
          primaryMobile: digits,
          primaryMobileCountryCode: profileData.primaryMobileCountryCode,
        },
        { silent: true },
      ).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    profileData.primaryMobile,
    profileData.primaryMobileCountryCode,
    user?.id,
    user?.primaryMobile,
    updateProfile,
  ]);

  // Deep-link scrolling: the page renders via JS, so a cross-page hash can land
  // before sections mount. Resolve on mount AND on hashchange. Also honour the
  // legacy `?tab=` query so old links keep working.
  useEffect(() => {
    const scrollToAnchor = () => {
      const hash = window.location.hash.replace("#", "");
      const tabAnchor = anchorFromLegacyTab(
        new URLSearchParams(window.location.search).get("tab"),
      );
      const id = hash || tabAnchor || "";
      if (id && NAV.some((n) => n.id === id)) {
        setActiveSection(id as AccountAnchor);
        setOpenSections((current) => ({ ...current, [id]: true }));
      }
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      // scrollIntoView scrolls the nearest scrollable ancestor — the window on
      // mobile, the content panel on desktop — and honours each section's
      // scroll-margin-top, so the heading lands clear of the sticky chrome.
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Defer the first attempt so the sections are mounted.
    const t = window.setTimeout(scrollToAnchor, 60);
    window.addEventListener("hashchange", scrollToAnchor);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", scrollToAnchor);
    };
  }, [user]);

  // Scrollspy (highlight the current section in the rail/chips) + reveal the
  // mobile "Back to top" button once the user has scrolled past the header.
  // The observer root differs by breakpoint: the window on mobile (full-page
  // scroll) vs. the content panel on desktop (internal scroll), so we rebuild
  // it whenever the breakpoint flips.
  useEffect(() => {
    if (!user) return;

    const mq = window.matchMedia(DESKTOP_MQ);
    let observer: IntersectionObserver | null = null;

    const build = () => {
      observer?.disconnect();
      const isDesktop = mq.matches;
      const panel = document.getElementById(SCROLL_PANEL_ID);
      const root = isDesktop ? panel : null;
      const topInset = isDesktop ? 8 : 140;
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]?.target.id) {
            setActiveSection(visible[0].target.id as AccountAnchor);
          }
        },
        { root, rootMargin: `-${topInset}px 0px -55% 0px`, threshold: 0 },
      );
      NAV.map((n) => document.getElementById(n.id))
        .filter((el): el is HTMLElement => !!el)
        .forEach((el) => observer!.observe(el));
    };

    build();

    // "Back to top" is mobile-only and mobile scrolls the window.
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", build);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", build);
    };
  }, [user]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleInputChange = (field: string, value: string) => {
    let nextValue = value;
    if (field.includes("Mobile") && !field.endsWith("CountryCode")) {
      nextValue = formatMobileNumber(value);
    }
    if (field === "dateOfBirth") {
      setDobError("");
      if (value && !isValidDateOfBirth(value)) {
        setDobError("Please enter a valid date of birth.");
      } else if (value && !isAdult(value)) {
        setDobError("You must be 18 or older to use andWeYoga.");
      }
    }
    setProfileData((prev) => {
      const next = { ...prev, [field]: nextValue };
      if (
        field === "primaryMobile" ||
        field === "secondaryMobile" ||
        field === "emergencyMobile"
      ) {
        const ccKey = `${field}CountryCode` as keyof typeof next;
        setMobileValidation((mv) => ({
          ...mv,
          [field]: validateRequiredMobile(field as PhoneField, nextValue, next[ccKey] as string),
        }));
      }
      return next;
    });
  };

  const handleCountryCodeChange = (field: string, value: string) => {
    setProfileData((prev) => {
      const next = { ...prev, [field]: value };
      const mobileField = field.replace("CountryCode", "") as PhoneField;
      const digits = formatMobileNumber((next[mobileField] as string) || "");
      setMobileValidation((mv) => ({
        ...mv,
        [mobileField]: validateRequiredMobile(mobileField, digits, value),
      }));
      return next;
    });
  };

  // Single source of truth for the Contact Info PUT payload so the standalone
  // "Save changes" submit and the onboarding finish step persist identical data.
  // DOB is only sent when unlocked AND present, so we never clobber a DOB the
  // member supplied via the consent panel instead of the contact form.
  const buildContactPayload = () => ({
    name: profileData.name,
    primaryMobile: profileData.primaryMobile,
    primaryMobileCountryCode: profileData.primaryMobileCountryCode,
    secondaryMobile: profileData.secondaryMobile,
    secondaryMobileCountryCode: profileData.secondaryMobileCountryCode,
    emergencyMobile: profileData.emergencyMobile,
    emergencyMobileCountryCode: profileData.emergencyMobileCountryCode,
    whatsappConsent: profileData.whatsappConsent,
    whatsappConsentSource: profileData.whatsappConsent ? "profile_primary_mobile" : undefined,
    addressStreet: profileData.addressStreet.trim() || undefined,
    addressLine2: profileData.addressLine2.trim() || undefined,
    addressCity: profileData.addressCity.trim() || undefined,
    addressCountry: profileData.addressCountry || DEFAULT_ADDRESS_COUNTRY,
    addressState: profileData.addressState.trim() || undefined,
    addressPincode: profileData.addressPincode.trim() || undefined,
    ...(!dobLocked && profileData.dateOfBirth.trim()
      ? { dateOfBirth: profileData.dateOfBirth }
      : {}),
  });

  const buildCheckFromUser = (u: AuthUser): AccountProfileCheckInput => ({
    emailVerified: Boolean(u.emailVerified),
    name: u.name,
    primaryMobile: u.primaryMobile,
    primaryMobileCountryCode: u.primaryMobileCountryCode,
    secondaryMobile: u.secondaryMobile,
    secondaryMobileCountryCode: u.secondaryMobileCountryCode,
    emergencyMobile: u.emergencyMobile,
    emergencyMobileCountryCode: u.emergencyMobileCountryCode,
    healthUpdateText: u.healthUpdateText,
  });

  const routeToAnchor = (anchor: AccountAnchor) => {
    setActiveSection(anchor);
    setOpenSections((current) => ({ ...current, [anchor]: true }));
    scrollToAccountSection(anchor);
  };

  /**
   * The single, fail-closed exit gate for onboarding. Re-fetches the member AND
   * their consent requirement FRESH from the server, then either routes to the
   * first still-incomplete My Account step (profile → health → privacy) or, only
   * when profile + health + mandatory consent are ALL confirmed complete,
   * redirects the member onward. Any failure keeps them in My Account.
   * Returns true only when it redirected away.
   */
  const resolveNextStepAndRoute = async (): Promise<boolean> => {
    // Fail-closed: assume consent is still required until the server proves it isn't.
    let requiresConsent = true;
    let serverUser: AuthUser | null = null;
    try {
      const [status, refreshed] = await Promise.all([
        fetchMyConsentStatus(),
        refreshUser(),
      ]);
      requiresConsent = Boolean(status.requirement?.requiresConsent);
      setConsentRequirement(status.requirement);
      const health = status.categories.find((c) => c.consentType === "health_data");
      setHealthConsentGiven(health?.status === "active");
      serverUser = refreshed;
    } catch {
      serverUser = null;
    }

    if (!serverUser) {
      toast({
        title: "Couldn't confirm your setup",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return false;
    }

    const anchor = getFirstIncompleteAccountAnchor(buildCheckFromUser(serverUser), {
      requiresConsent,
    });
    if (anchor) {
      routeToAnchor(anchor);
      return false;
    }

    toast({
      title: "You're all set",
      description: getPendingBooking()
        ? "Your profile is complete. Taking you to checkout."
        : "Your profile is complete. Welcome to your dashboard.",
    });
    redirectAfterProfileComplete();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim())
      return toast({ title: "Name is required", variant: "destructive" });
    if (!dobLocked) {
      if (!profileData.dateOfBirth.trim()) {
        setDobError("Date of birth is required.");
        return toast({ title: "Date of birth is required", variant: "destructive" });
      }
      if (!isValidDateOfBirth(profileData.dateOfBirth)) {
        setDobError("Please enter a valid date of birth.");
        return toast({ title: "Invalid date of birth", variant: "destructive" });
      }
      if (!isAdult(profileData.dateOfBirth)) {
        setDobError("You must be 18 or older to use andWeYoga.");
        return toast({
          title: "Age requirement",
          description: "You must be 18 or older to use andWeYoga.",
          variant: "destructive",
        });
      }
    }
    if (!profileData.primaryMobile.trim())
      return toast({ title: "Mobile number is required", variant: "destructive" });
    if (!profileData.emergencyMobile.trim())
      return toast({ title: "Emergency contact is required", variant: "destructive" });
    if (!mobileValidation.primaryMobile.isValid)
      return toast({
        title: `Mobile: ${mobileValidation.primaryMobile.error}`,
        variant: "destructive",
      });
    if (!mobileValidation.emergencyMobile.isValid)
      return toast({
        title: `Emergency: ${mobileValidation.emergencyMobile.error}`,
        variant: "destructive",
      });
    if (profileData.secondaryMobile && !mobileValidation.secondaryMobile.isValid)
      return toast({
        title: `Alternate: ${mobileValidation.secondaryMobile.error}`,
        variant: "destructive",
      });
    setIsLoading(true);
    const wasIncomplete = user?.profileCompletionStatus !== "complete";
    try {
      const contactPayload = buildContactPayload();
      const checkAfterSave: AccountProfileCheckInput = {
        emailVerified: Boolean(user?.emailVerified),
        name: contactPayload.name,
        primaryMobile: contactPayload.primaryMobile,
        primaryMobileCountryCode: contactPayload.primaryMobileCountryCode,
        secondaryMobile: contactPayload.secondaryMobile,
        secondaryMobileCountryCode: contactPayload.secondaryMobileCountryCode,
        emergencyMobile: contactPayload.emergencyMobile,
        emergencyMobileCountryCode: contactPayload.emergencyMobileCountryCode,
        healthUpdateText: profileData.healthUpdateText,
      };
      const completesProfile =
        wasIncomplete && isAccountProfileComplete(checkAfterSave);
      await updateProfile(contactPayload, {
        successTitle: completesProfile ? undefined : "Contact info saved",
        silent: completesProfile,
      });
      if (wasIncomplete) {
        // Onboarding: let the fail-closed gate decide the next step (health →
        // privacy) or redirect — it verifies consent fresh from the server, so a
        // completed profile can never skip mandatory consent.
        await resolveNextStepAndRoute();
        return;
      }
      // A returning member simply edited their contact details — stay in place.
    } catch {
      // updateProfile already shows error toast
    } finally {
      setIsLoading(false);
    }
  };

  const persistHealthUpdate = async (payload: {
    text: string;
    documentUrls: string[];
    mediaLinks: HealthMediaLink[];
  }) => {
    if (!user?.id) return null;
    const body: Record<string, unknown> = {
      healthUpdateText: payload.text,
      healthDocumentUrls: payload.documentUrls,
      healthMediaLinks: payload.mediaLinks,
    };
    if (!healthConsentGiven) {
      body.healthDataConsent = true;
      body.consentVersion = LEGAL_CONFIG.documentVersion;
    }
    const res = await fetch(`/api/users/${user.id}/health-update`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      profileCompletionStatus?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to save");
    }
    return data;
  };

  const advanceToPrivacyStep = () => {
    setActiveSection("privacy");
    setOpenSections((current) => ({ ...current, privacy: true }));
    scrollToAccountSection("privacy");
  };

  const handleHealthSave = async (payload: {
    text: string;
    documentUrls: string[];
    mediaLinks: HealthMediaLink[];
  }) => {
    if (!user?.id) return;
    if (!isHealthDisclosureComplete(payload.text)) {
      toast({
        title: "Health History required",
        description: `Add your latest update or tap "${HEALTH_NO_CONCERNS_TEXT}".`,
        variant: "destructive",
      });
      return;
    }

    setProfileData((prev) => ({
      ...prev,
      healthUpdateText: payload.text,
      healthDocumentUrls: payload.documentUrls,
      healthMediaLinks: payload.mediaLinks,
    }));

    if (!healthConsentGiven && consentRequirement?.requiresConsent) {
      setPendingHealthSave(payload);
      toast({
        title: "Almost there",
        description: "Review privacy & consent to save your Health History and finish setup.",
      });
      advanceToPrivacyStep();
      return;
    }

    setIsLoading(true);
    try {
      await persistHealthUpdate(payload);
      setPendingHealthSave(null);
      setHealthConsentGiven(true);
      const wasIncomplete = user?.profileCompletionStatus !== "complete";
      if (wasIncomplete) {
        // Fail-closed gate: routes to privacy when consent is still required and
        // only redirects once profile + health + consent are all confirmed done.
        await resolveNextStepAndRoute();
        return;
      }
      await refreshUser();
      toast({ title: "Health History saved" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacyOnboardingComplete = async () => {
    setIsLoading(true);
    try {
      // 1) Save the deferred Health History (if any) so health + consent land together.
      if (pendingHealthSave) {
        await persistHealthUpdate(pendingHealthSave);
        setPendingHealthSave(null);
        setHealthConsentGiven(true);
      }

      // 2) Persist the full Contact Info the member typed during onboarding.
      //    Only the primary mobile is silently auto-saved; name/DOB/emergency/
      //    address would otherwise be dropped on the post-consent navigation and
      //    the member re-prompted for "mandatory" details they already entered.
      await updateProfile(buildContactPayload(), { silent: true });

      // 3) Single fail-closed gate confirms profile + health + consent server-side
      //    before redirecting; otherwise it stays in-page on the remaining step.
      await resolveNextStepAndRoute();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to finish setup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusInput: AccountProfileCheckInput = {
    emailVerified: Boolean(user?.emailVerified),
    name: profileData.name,
    primaryMobile: profileData.primaryMobile,
    primaryMobileCountryCode: profileData.primaryMobileCountryCode,
    secondaryMobile: profileData.secondaryMobile,
    secondaryMobileCountryCode: profileData.secondaryMobileCountryCode,
    emergencyMobile: profileData.emergencyMobile,
    emergencyMobileCountryCode: profileData.emergencyMobileCountryCode,
    healthUpdateText: profileData.healthUpdateText,
  };
  const isBookingReady =
    isAccountProfileComplete(statusInput) && !consentRequirement?.requiresConsent;
  const healthHistory = parseHealthHistory(user?.healthUpdateHistory);
  const onboardingAnchor = getFirstIncompleteAccountAnchor(statusInput, {
    requiresConsent: consentRequirement?.requiresConsent,
  });
  const needsProfileOnboarding = onboardingAnchor === "profile";
  const needsHealthOnboarding = onboardingAnchor === "health";
  const needsPrivacyOnboarding = onboardingAnchor === "privacy";
  const isSetupInProgress = Boolean(onboardingAnchor);
  const showPrivacyOnboardingForm =
    needsPrivacyOnboarding ||
    (Boolean(consentRequirement?.requiresConsent) &&
      isProfileFieldsSectionComplete(statusInput) &&
      isHealthDisclosureComplete(profileData.healthUpdateText));

  useEffect(() => {
    if (!user || !isSetupInProgress || !onboardingAnchor) return;
    setActiveSection(onboardingAnchor);
    setOpenSections((current) => ({ ...current, [onboardingAnchor]: true }));
  }, [user?.id, onboardingAnchor, isSetupInProgress]);

  // Completeness meter (5 signals) — a friendlier replacement for a binary badge.
  const checks = [
    { ok: Boolean(user?.emailVerified), hint: "verify your email" },
    { ok: profileData.name.trim().length > 0, hint: "add your name" },
    {
      ok:
        dobLocked ||
        (profileData.dateOfBirth.trim().length > 0 &&
          isValidDateOfBirth(profileData.dateOfBirth) &&
          isAdult(profileData.dateOfBirth)),
      hint: "add your date of birth",
    },
    {
      ok: profileData.primaryMobile.trim().length > 0 && mobileValidation.primaryMobile.isValid,
      hint: "add your mobile",
    },
    {
      ok:
        profileData.emergencyMobile.trim().length > 0 && mobileValidation.emergencyMobile.isValid,
      hint: "add an emergency contact",
    },
    {
      ok: isHealthDisclosureComplete(profileData.healthUpdateText),
      hint: "add your Health History",
    },
    {
      ok: !consentRequirement?.requiresConsent,
      hint: "review privacy & consent",
    },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const firstGap = checks.find((c) => !c.ok);
  const pctHint =
    pct === 100
      ? "All set. You're ready to book."
      : onboardingAnchor === "privacy"
        ? "Next: review privacy & consent."
        : `Next: ${firstGap?.hint}.`;
  const consentCopy = CONSENT_COPY[consentLang];

  const isSectionOpen = (id: AccountAnchor) => {
    if (id === "profile" && needsProfileOnboarding) return true;
    if (id === "health" && needsHealthOnboarding) return true;
    if (id === "privacy" && needsPrivacyOnboarding) return true;
    return openSections[id] ?? false;
  };

  const setSectionOpen = (id: AccountAnchor, open: boolean) => {
    if (
      (id === "profile" && needsProfileOnboarding) ||
      (id === "health" && needsHealthOnboarding) ||
      (id === "privacy" && needsPrivacyOnboarding)
    ) {
      return;
    }
    setOpenSections((current) => ({ ...current, [id]: open }));
  };

  const healthSummary = healthSectionSummary(
    profileData.healthUpdateText,
    user?.healthUpdateLastModified,
  );

  const initials = (profileData.name || user?.name || "A W")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!user) return null;

  const phoneRows: {
    field: PhoneField;
    label: string;
    icon: typeof Smartphone;
    required?: boolean;
    placeholder: string;
  }[] = [
    { field: "primaryMobile", label: "Mobile", icon: Smartphone, required: true, placeholder: "Mobile number" },
    { field: "emergencyMobile", label: "Emergency", icon: Siren, required: true, placeholder: "Emergency number" },
    { field: "secondaryMobile", label: "Alternate", icon: Phone, placeholder: "Secondary number" },
  ];

  const profileSummary =
    profileData.name.trim() || profileData.primaryMobile.trim()
      ? [profileData.name.trim(), profileData.primaryMobile.trim() && `+${profileData.primaryMobileCountryCode.replace("+", "")} ${profileData.primaryMobile}`]
          .filter(Boolean)
          .join(" · ")
      : "Add your contact details";

  const privacySummary = consentRequirement?.requiresConsent
    ? "Review and accept required consents"
    : "Manage consent and account erasure";

  const subTabBtn = (active: boolean) =>
    cn(
      "flex-1 rounded-[10px] px-2 py-2 text-[13px] font-semibold transition-colors",
      active ? "bg-primary text-primary-foreground" : "font-semibold text-foreground/75 hover:text-primary",
    );

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background min-[900px]:h-screen min-[900px]:min-h-0 min-[900px]:overflow-hidden">
      <Navigation onBookingClick={scrollToSchedule} />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-24 pt-24 sm:px-6 min-[900px]:flex min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:flex-col min-[900px]:pb-0 min-[900px]:pt-6">
        <button
          onClick={() => setLocation(isBookingReady ? "/dashboard" : "#profile")}
          data-testid="back-to-dashboard"
          className="mb-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />{" "}
          {isBookingReady ? "Back to dashboard" : "Finish setup to reach dashboard"}
        </button>

        {/* Profile band + completeness meter */}
        <section className="mb-6 flex shrink-0 flex-wrap items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-dz-secondary p-5 text-white shadow-[0_12px_34px_rgba(52,25,106,0.22)] sm:gap-7 sm:p-7 min-[900px]:mb-4">
          <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-2 border-white/35 bg-white/15 font-display text-2xl font-bold backdrop-blur">
            {initials}
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl" data-testid="account-name">
              {profileData.name || "Welcome"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
          </div>
          <div className="basis-56 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs text-white/85">
                {isBookingReady ? "Profile complete" : "Profile"}
              </span>
              <span className="font-display text-lg font-bold">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-200 to-white transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-white/80">
              <Lightbulb className="h-3.5 w-3.5 text-orange-200" />
              {pctHint}
            </p>
          </div>
        </section>

        {/* Mobile chip nav — sticky so the section list stays reachable while scrolling */}
        <nav className="sticky top-[64px] z-30 -mx-4 mb-2 flex gap-2 overflow-x-auto border-b border-primary/10 bg-background/95 px-4 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 min-[900px]:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={() => setActiveSection(n.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                activeSection === n.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="grid items-start gap-7 min-[900px]:grid min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:grid-cols-[236px_1fr] min-[900px]:items-stretch min-[900px]:gap-6 min-[900px]:overflow-hidden">
          {/* Static rail (desktop/tablet) — stays put while the content panel scrolls */}
          <nav className="hidden flex-col gap-1 min-[900px]:flex min-[900px]:min-h-0 min-[900px]:self-stretch min-[900px]:overflow-y-auto min-[900px]:pr-1">
            {NAV.map((n) => {
              const isActive = activeSection === n.id;
              return (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  onClick={() => setActiveSection(n.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary font-semibold text-primary-foreground shadow-dz-primary"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                  )}
                >
                  <n.icon className="h-5 w-5" />
                  <span className="flex-1">{n.label}</span>
                  {n.soon && (
                    <AccountComingSoonBadge
                      className={cn(
                        "px-1.5 py-0.5 text-[9px]",
                        isActive && "bg-white/20 text-white",
                      )}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Content panel — scrolls internally on desktop/tablet, page-scrolls on mobile */}
          <div
            id={SCROLL_PANEL_ID}
            className="flex min-w-0 flex-col gap-5 min-[900px]:min-h-0 min-[900px]:overflow-y-auto min-[900px]:pb-10 min-[900px]:pr-2"
          >
            {/* CONTACT INFO (anchor id stays `profile`) */}
            <AccountFoldSection
              id="profile"
              icon={User}
              title="Contact Info"
              subtitle="Your details, kept private"
              required
              open={isSectionOpen("profile")}
              onOpenChange={(open) => setSectionOpen("profile", open)}
              summary={profileSummary}
              testId="profile-content"
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Full name"
                      required
                      data-testid="profile-name-input"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="email"
                      className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                    >
                      Email <Lock className="h-3.5 w-3.5" />
                    </Label>
                    <Input
                      id="email"
                      value={user.email}
                      readOnly
                      className="cursor-not-allowed bg-muted text-muted-foreground"
                      data-testid="profile-email-display"
                    />
                  </div>
                  <div>
                    <DateOfBirthField
                      id="dateOfBirth"
                      label={
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          Date of birth {dobLocked ? <Lock className="h-3.5 w-3.5" /> : null}
                          {!dobLocked ? <span className="font-bold text-dz-secondary">*</span> : null}
                        </span>
                      }
                      value={profileData.dateOfBirth}
                      onChange={(iso) => handleInputChange("dateOfBirth", iso)}
                      disabled={dobLocked}
                      error={dobError}
                      testIdPrefix="profile-dob"
                    />
                  </div>
                </div>

                <AccountFoldSection
                  nested
                  title="Contact numbers"
                  subtitle="Mobile and emergency contacts"
                  defaultOpen={!profileData.primaryMobile.trim()}
                >
                  <div className="space-y-2.5">
                    {phoneRows.map((row) => {
                      const v = mobileValidation[row.field];
                      const showErr =
                        !v.isValid && (row.field !== "secondaryMobile" || !!profileData[row.field]);
                      return (
                        <div key={row.field} className="flex flex-wrap items-center gap-2.5">
                          <div className="flex w-[130px] shrink-0 items-center gap-2">
                            <row.icon className="h-[18px] w-[18px] text-primary" />
                            <span className="text-sm font-medium text-foreground">{row.label}</span>
                            {row.required && <span className="font-bold text-dz-secondary">*</span>}
                          </div>
                          <div className="flex min-w-0 flex-1 basis-60 gap-2">
                            <Select
                              value={
                                profileData[`${row.field}CountryCode` as keyof typeof profileData] as string
                              }
                              onValueChange={(val) =>
                                handleCountryCodeChange(`${row.field}CountryCode`, val)
                              }
                            >
                              <SelectTrigger className="w-[88px] shrink-0" data-testid={`${row.field}-country-select`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60 min-w-[88px]">
                                {countryCodeOptions.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    <span className="flex items-center gap-2">
                                      <span className="text-base leading-none">{o.flag}</span>
                                      <span className="text-sm font-medium">{o.value}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="relative flex-1">
                              <Input
                                type="tel"
                                value={profileData[row.field]}
                                onChange={(e) => handleInputChange(row.field, e.target.value)}
                                placeholder={row.placeholder}
                                required={row.required}
                                maxLength={10}
                                inputMode="numeric"
                                className={showErr ? "border-destructive" : ""}
                                data-testid={`${row.field}-input`}
                              />
                              {showErr && (
                                <div className="mt-1 flex w-full items-center gap-1 break-words text-xs text-destructive">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {v.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccountFoldSection>

                {profileData.primaryMobile.trim().length > 0 ? (
                  <ConsentCheckbox
                    checked={profileData.whatsappConsent}
                    onChange={(checked) =>
                      setProfileData((p) => ({ ...p, whatsappConsent: checked }))
                    }
                    testId="whatsapp-consent-checkbox"
                    label={consentCopy.whatsappConsent}
                  />
                ) : null}

                <AccountFoldSection
                  nested
                  title="Mailing address"
                  subtitle="Optional, so we can send you session materials and local updates"
                  defaultOpen={false}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="addressStreet" className="text-sm font-medium text-foreground">
                        Street address
                      </Label>
                      <Input
                        id="addressStreet"
                        value={profileData.addressStreet}
                        onChange={(e) => handleInputChange("addressStreet", e.target.value)}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="addressLine2" className="text-sm font-medium text-foreground">
                        Apartment, suite, etc. (optional)
                      </Label>
                      <Input
                        id="addressLine2"
                        value={profileData.addressLine2}
                        onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressCity" className="text-sm font-medium text-foreground">
                        City
                      </Label>
                      <Input
                        id="addressCity"
                        value={profileData.addressCity}
                        onChange={(e) => handleInputChange("addressCity", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressCountry" className="text-sm font-medium text-foreground">
                        Country
                      </Label>
                      <Select
                        value={profileData.addressCountry}
                        onValueChange={(val) => {
                          const states = getAddressStatesForCountry(val);
                          const stateStillValid = states.some((s) => s.value === profileData.addressState);
                          setProfileData((p) => ({
                            ...p,
                            addressCountry: val,
                            addressState: stateStillValid ? p.addressState : "",
                          }));
                        }}
                      >
                        <SelectTrigger id="addressCountry" className="mt-1">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {ADDRESS_COUNTRY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="addressState" className="text-sm font-medium text-foreground">
                        State / province
                      </Label>
                      {hasPredefinedAddressStates(profileData.addressCountry) ? (
                        <Select
                          value={profileData.addressState || undefined}
                          onValueChange={(val) => handleInputChange("addressState", val)}
                        >
                          <SelectTrigger id="addressState" className="mt-1">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {getAddressStatesForCountry(profileData.addressCountry).map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="addressState"
                          value={profileData.addressState}
                          onChange={(e) => handleInputChange("addressState", e.target.value)}
                          placeholder="State or region"
                          className="mt-1"
                        />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="addressPincode" className="text-sm font-medium text-foreground">
                        PIN code
                      </Label>
                      <Input
                        id="addressPincode"
                        value={profileData.addressPincode}
                        onChange={(e) =>
                          handleInputChange(
                            "addressPincode",
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        inputMode="numeric"
                        maxLength={6}
                      />
                    </div>
                  </div>
                </AccountFoldSection>

                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="update-profile-button"
                  className="w-full rounded-full bg-primary py-6 font-bold text-white hover:bg-primary/90"
                >
                  {isLoading ? "Saving…" : isSetupInProgress ? "Save & continue" : "Save changes"}
                </Button>
              </form>
            </AccountFoldSection>

            {/* HEALTH */}
            <AccountFoldSection
              id="health"
              icon={Heart}
              title="Health History"
              subtitle="So we keep your practice safe"
              required
              forceOpen={needsHealthOnboarding}
              open={isSectionOpen("health")}
              onOpenChange={(open) => setSectionOpen("health", open)}
              summary={healthSummary}
              testId="health-content"
            >
              <AccountHealthNoteSection
                currentText={profileData.healthUpdateText}
                documentUrls={profileData.healthDocumentUrls}
                mediaLinks={profileData.healthMediaLinks}
                lastModified={user.healthUpdateLastModified ?? null}
                history={healthHistory}
                startInEditMode={needsHealthOnboarding}
                continueLabel={isSetupInProgress ? "Save & continue" : "Save update"}
                onSave={async (payload) => {
                  await handleHealthSave(payload);
                }}
                isLoading={isLoading}
              />
            </AccountFoldSection>

            {/* SESSIONS */}
            <AccountFoldSection
              id="sessions"
              icon={CalendarClock}
              title="Sessions"
              subtitle="Your bookings & history"
              open={isSectionOpen("sessions")}
              onOpenChange={(open) => setSectionOpen("sessions", open)}
              summary="Upcoming, completed, and cancelled sessions"
              testId="sessions-content"
            >
              <SessionHistory userId={user.id} />
            </AccountFoldSection>

            {/* PAYMENTS — Methods + History sub-tabs */}
            <AccountFoldSection
              id="payments"
              icon={CreditCard}
              title="Payments"
              subtitle="Methods & transaction history"
              open={isSectionOpen("payments")}
              onOpenChange={(open) => setSectionOpen("payments", open)}
              summary="Payment methods and transaction history"
              testId="payments-content"
            >
              <div className="mb-4 flex gap-1.5 rounded-[14px] bg-muted p-1.5">
                <button
                  type="button"
                  onClick={() => setPayTab("methods")}
                  className={subTabBtn(payTab === "methods")}
                  data-testid="payments-tab-methods"
                >
                  Payment Methods
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab("history")}
                  className={subTabBtn(payTab === "history")}
                  data-testid="payments-tab-history"
                >
                  Payment History
                </button>
              </div>

              {payTab === "history" ? (
                <PaymentHistory />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <AccountComingSoonBadge />
                    <span className="text-sm font-semibold text-foreground/80">
                      Saved cards for one-tap booking
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.02] p-6">
                    <CreditCard className="h-7 w-7 text-primary/40" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">No cards yet</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Secure card payments arrive soon. For now, pay at the studio.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </AccountFoldSection>

            {/* CREDITS (placeholder) */}
            <AccountFoldSection
              id="credits"
              icon={Coins}
              title="Credits"
              subtitle="Session credits for future bookings"
              soon
              open={isSectionOpen("credits")}
              onOpenChange={(open) => setSectionOpen("credits", open)}
              summary="View and apply session credits"
              testId="credits-content"
            >
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.02] px-6 py-10 text-center">
                <Coins className="h-10 w-10 text-primary/35" />
                <p className="font-display text-lg font-semibold text-primary">Credits coming soon</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  When sessions are converted into credits, for example after an instructor no-show,
                  you&apos;ll be able to view your balance and apply them to any booking here.
                </p>
              </div>
            </AccountFoldSection>

            {/* PREFERENCES (placeholder) */}
            <AccountFoldSection
              id="preferences"
              icon={SlidersHorizontal}
              title="Preferences"
              subtitle="How we reach you"
              soon
              open={isSectionOpen("preferences")}
              onOpenChange={(open) => setSectionOpen("preferences", open)}
              summary="Reminders, updates, and offers"
              testId="preferences-content"
            >
              {(
                [
                  { key: "reminders", label: "Session reminders", desc: "A nudge before each booking" },
                  { key: "updates", label: "Email updates", desc: "New classes, workshops & trips" },
                  { key: "promos", label: "Offers & promos", desc: "Occasional deals" },
                ] as const
              ).map((p) => (
                <div
                  key={p.key}
                  className="flex items-center gap-3.5 border-b border-primary/5 py-3.5 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[p.key]}
                    onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
                  />
                </div>
              ))}
            </AccountFoldSection>

            {/* SECURITY */}
            <AccountFoldSection
              id="security"
              icon={ShieldCheck}
              title="Account & security"
              subtitle="Verification and access"
              open={isSectionOpen("security")}
              onOpenChange={(open) => setSectionOpen("security", open)}
              summary={user.emailVerified ? "Email verified" : "Email verification pending"}
              testId="security-content"
            >
              <div className="mb-3.5 flex items-center gap-3 rounded-2xl border border-primary/10 p-4">
                <ShieldCheck
                  className={`h-5 w-5 ${user.emailVerified ? "text-emerald-600" : "text-amber-500"}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {user.emailVerified ? "Email verified" : "Email not verified"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{user.email}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    user.emailVerified
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {user.emailVerified ? "Verified" : "Pending"}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                data-testid="logout-button"
                className="w-full rounded-full border-destructive/30 py-6 font-bold text-destructive hover:bg-destructive/5"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </AccountFoldSection>

            {/* PRIVACY & CONSENT */}
            <AccountFoldSection
              id="privacy"
              icon={Shield}
              title="Privacy & consent"
              subtitle="Your data choices and legal rights"
              required={needsPrivacyOnboarding}
              forceOpen={needsPrivacyOnboarding}
              open={isSectionOpen("privacy")}
              onOpenChange={(open) => setSectionOpen("privacy", open)}
              summary={privacySummary}
              testId="privacy-content"
            >
              <PrivacyConsentSection
                hideTitle
                onboardingActive={showPrivacyOnboardingForm}
                profileDateOfBirth={profileData.dateOfBirth || user.dateOfBirth || ""}
                needsHealthConsent={!healthConsentGiven && isHealthDisclosureComplete(profileData.healthUpdateText)}
                healthConsentChecked={healthConsentChecked}
                onHealthConsentCheckedChange={setHealthConsentChecked}
                marketingOptIn={marketingOptIn}
                onMarketingOptInChange={setMarketingOptIn}
                onOnboardingComplete={handlePrivacyOnboardingComplete}
                onHealthWithdrawn={() => {
                  setHealthConsentGiven(false);
                  setHealthConsentChecked(false);
                }}
              />
            </AccountFoldSection>
          </div>
        </div>
      </main>

      {/* Mobile-only "Back to top" — returns to the sticky chip nav + section list */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        data-testid="back-to-top"
        className={cn(
          "fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(52,25,106,0.35)] transition-all duration-300 min-[900px]:hidden",
          showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
