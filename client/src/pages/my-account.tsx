import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
  CalendarClock,
  CreditCard,
  SlidersHorizontal,
  ShieldCheck,
  BadgeCheck,
  LogOut,
  Lightbulb,
  AtSign,
  ArrowUp,
} from "lucide-react";
import Navigation from "@/components/navigation";
import { SessionHistory } from "@/components/session-history";
import { PaymentHistory } from "@/components/payment-history";
import { useAuth, getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  countryCodeOptions,
  validateMobileNumber,
  formatMobileNumber,
} from "@shared/mobile-validation";
import {
  MIN_HEALTH_UPDATE_CHARS,
  isAccountProfileComplete,
  type AccountProfileCheckInput,
} from "@shared/profileCompleteness";
import { anchorFromLegacyTab, type AccountAnchor } from "@/lib/account-routes";

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
  { id: "health", label: "Health note", icon: Heart },
  { id: "sessions", label: "Sessions", icon: CalendarClock },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal, soon: true },
  { id: "security", label: "Account & security", icon: ShieldCheck },
];

/** Desktop breakpoint (Tailwind `md`). Below this the page scrolls; at/above it the
 * content panel scrolls internally while the left rail stays static. */
const DESKTOP_MQ = "(min-width: 768px)";
/** Id of the internally-scrolling content panel (desktop/tablet). */
const SCROLL_PANEL_ID = "account-scroll";

export default function MyAccount() {
  const { user, updateProfile, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [payTab, setPayTab] = useState<"history" | "methods">("history");
  const [activeSection, setActiveSection] = useState<AccountAnchor>("profile");
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    primaryMobile: "",
    primaryMobileCountryCode: "+91",
    secondaryMobile: "",
    secondaryMobileCountryCode: "+91",
    emergencyMobile: "",
    emergencyMobileCountryCode: "+91",
    healthUpdateText: "",
    healthDocumentUrls: [] as string[],
  });
  const [mobileValidation, setMobileValidation] = useState({
    primaryMobile: { isValid: true, error: "" },
    secondaryMobile: { isValid: true, error: "" },
    emergencyMobile: { isValid: true, error: "" },
  });
  // Preferences are UI-only placeholders until the notifications backend ships.
  const [prefs, setPrefs] = useState({ reminders: true, updates: true, promos: false });

  useEffect(() => {
    if (!user) setLocation("/");
  }, [user, setLocation]);

  useEffect(() => {
    if (!user) return;
    const next = {
      name: user.name || "",
      primaryMobile: user.primaryMobile || "",
      primaryMobileCountryCode: user.primaryMobileCountryCode || "+91",
      secondaryMobile: user.secondaryMobile || "",
      secondaryMobileCountryCode: user.secondaryMobileCountryCode || "+91",
      emergencyMobile: user.emergencyMobile || "",
      emergencyMobileCountryCode: user.emergencyMobileCountryCode || "+91",
      healthUpdateText: user.healthUpdateText || "",
      healthDocumentUrls: user.healthDocumentUrls || [],
    };
    setProfileData(next);
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

  const handleHealthFill = () =>
    setProfileData((p) => ({ ...p, healthUpdateText: "No current concerns" }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim())
      return toast({ title: "Name is required", variant: "destructive" });
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
    if (profileData.healthUpdateText.trim().length < MIN_HEALTH_UPDATE_CHARS) {
      toast({
        title: "Add a health note",
        description: `At least ${MIN_HEALTH_UPDATE_CHARS} characters — or tap "No current concerns".`,
        variant: "destructive",
      });
      document.getElementById("health")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile(profileData);
      toast({ title: "Profile saved" });
    } catch {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHealthSave = async () => {
    if (!user?.id) return;
    if (profileData.healthUpdateText.trim().length < MIN_HEALTH_UPDATE_CHARS) {
      return toast({
        title: "Health note too short",
        description: `At least ${MIN_HEALTH_UPDATE_CHARS} characters.`,
        variant: "destructive",
      });
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/health-update`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          healthUpdateText: profileData.healthUpdateText,
          healthDocumentUrls: profileData.healthDocumentUrls,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to save");
      }
      await refreshUser();
      toast({ title: "Health note saved" });
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
  const isBookingReady = isAccountProfileComplete(statusInput);

  // Completeness meter (5 signals) — a friendlier replacement for a binary badge.
  const checks = [
    { ok: Boolean(user?.emailVerified), hint: "verify your email" },
    { ok: profileData.name.trim().length > 0, hint: "add your name" },
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
      ok: profileData.healthUpdateText.trim().length >= MIN_HEALTH_UPDATE_CHARS,
      hint: "add a health note",
    },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const firstGap = checks.find((c) => !c.ok);
  const pctHint = pct === 100 ? "All set — you're ready to book." : `Next: ${firstGap?.hint}.`;

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

  const sectionCard =
    "scroll-mt-36 md:scroll-mt-4 rounded-[20px] border border-primary/10 bg-white/70 backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(27,28,27,0.04)]";
  const sectionHead = (Icon: typeof User, title: string, sub: string, soon?: boolean) => (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
      </div>
      {soon && (
        <span className="rounded-full bg-dz-secondary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-dz-secondary">
          SOON
        </span>
      )}
    </div>
  );

  const subTabBtn = (active: boolean) =>
    cn(
      "flex-1 rounded-[10px] px-2 py-2 text-[13px] font-semibold transition-colors",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
    );

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background md:h-screen md:min-h-0 md:overflow-hidden">
      <Navigation onBookingClick={scrollToSchedule} />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-24 pt-24 sm:px-6 md:flex md:min-h-0 md:flex-1 md:flex-col md:pb-0 md:pt-6">
        <button
          onClick={() => setLocation("/dashboard")}
          data-testid="back-to-hub"
          className="mb-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        {/* Profile band + completeness meter */}
        <section className="mb-6 flex shrink-0 flex-wrap items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-dz-secondary p-5 text-white shadow-[0_12px_34px_rgba(52,25,106,0.22)] sm:gap-7 sm:p-7 md:mb-4">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-2 border-white/35 bg-white/15 font-display text-2xl font-bold backdrop-blur">
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
        <nav className="sticky top-[64px] z-30 -mx-4 mb-2 flex gap-2 overflow-x-auto border-b border-primary/10 bg-background/95 px-4 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        <div className="grid items-start gap-7 md:grid md:min-h-0 md:flex-1 md:grid-cols-[220px_1fr] md:items-stretch md:gap-6 md:overflow-hidden">
          {/* Static rail (desktop/tablet) — stays put while the content panel scrolls */}
          <nav className="hidden flex-col gap-1 md:flex md:min-h-0 md:self-stretch md:overflow-y-auto md:pr-1">
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
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
                        isActive ? "bg-white/20 text-white" : "bg-dz-secondary/10 text-dz-secondary",
                      )}
                    >
                      SOON
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Content panel — scrolls internally on desktop/tablet, page-scrolls on mobile */}
          <div
            id={SCROLL_PANEL_ID}
            className="flex min-w-0 flex-col gap-5 md:min-h-0 md:overflow-y-auto md:pb-10 md:pr-2"
          >
            {/* CONTACT INFO (anchor id stays `profile`) */}
            <section id="profile" className={sectionCard} data-testid="profile-content">
              {sectionHead(User, "Contact Info", "Your details, kept private")}
              <div className="my-5 h-px bg-primary/10" />
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
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
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
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
                </div>

                <div>
                  <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Contact numbers</p>
                  <div className="space-y-2.5">
                    {phoneRows.map((row) => {
                      const v = mobileValidation[row.field];
                      const showErr =
                        !v.isValid && (row.field !== "secondaryMobile" || !!profileData[row.field]);
                      return (
                        <div key={row.field} className="flex flex-wrap items-center gap-2.5">
                          <div className="flex w-[130px] shrink-0 items-center gap-2">
                            <row.icon className="h-[18px] w-[18px] text-primary" />
                            <span className="text-sm font-medium">{row.label}</span>
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
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="update-profile-button"
                  className="w-full rounded-full bg-primary py-6 font-bold text-white hover:bg-primary/90"
                >
                  {isLoading ? "Saving…" : isBookingReady ? "Save changes" : "Complete profile"}
                </Button>
              </form>
            </section>

            {/* HEALTH */}
            <section id="health" className={sectionCard} data-testid="health-content">
              {sectionHead(Heart, "Health note", "So we keep your practice safe")}
              <div className="my-5 h-px bg-primary/10" />
              <Label htmlFor="health-update" className="mb-2.5 block text-sm text-foreground">
                Anything we should know before you practice? Recent injuries, surgeries, or doctor's
                notes.
              </Label>
              <Textarea
                id="health-update"
                value={profileData.healthUpdateText}
                onChange={(e) => handleInputChange("healthUpdateText", e.target.value)}
                placeholder="Share anything relevant — or tap below if all clear."
                className="min-h-[104px]"
                data-testid="health-update-text"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleHealthFill}
                  className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  data-testid="health-no-concerns"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  No current concerns
                </Button>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AtSign className="h-3.5 w-3.5" />
                  Detailed reports → mudit@andweyoga.com
                </span>
              </div>
              <Button
                onClick={handleHealthSave}
                disabled={
                  isLoading || profileData.healthUpdateText.trim().length < MIN_HEALTH_UPDATE_CHARS
                }
                className="mt-5 w-full rounded-full bg-primary py-6 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                data-testid="save-health-update"
              >
                {isLoading ? "Saving…" : "Save health note"}
              </Button>
            </section>

            {/* SESSIONS */}
            <section id="sessions" className={sectionCard} data-testid="sessions-content">
              {sectionHead(CalendarClock, "Sessions", "Your bookings & history")}
              <div className="mt-5">
                <SessionHistory userId={user.id} />
              </div>
            </section>

            {/* PAYMENTS — Methods + History sub-tabs */}
            <section id="payments" className={sectionCard} data-testid="payments-content">
              {sectionHead(CreditCard, "Payments", "Methods & transaction history")}
              <div className="mb-4 mt-5 flex gap-1.5 rounded-[14px] bg-muted p-1.5">
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
                    <span className="rounded-full bg-dz-secondary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-dz-secondary">
                      SOON
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Saved cards for one-tap booking
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.02] p-6">
                    <CreditCard className="h-7 w-7 text-primary/40" />
                    <div>
                      <p className="text-sm font-semibold">No cards yet</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Secure card payments arrive soon — for now, pay at the studio.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* PREFERENCES (placeholder) */}
            <section id="preferences" className={sectionCard} data-testid="preferences-content">
              {sectionHead(SlidersHorizontal, "Preferences", "How we reach you", true)}
              <div className="my-4 h-px bg-primary/10" />
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
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[p.key]}
                    onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
                  />
                </div>
              ))}
            </section>

            {/* SECURITY */}
            <section id="security" className={sectionCard} data-testid="security-content">
              {sectionHead(ShieldCheck, "Account & security", "Verification and access")}
              <div className="my-5 h-px bg-primary/10" />
              <div className="mb-3.5 flex items-center gap-3 rounded-2xl border border-primary/10 p-4">
                <ShieldCheck
                  className={`h-5 w-5 ${user.emailVerified ? "text-emerald-600" : "text-amber-500"}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">
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
            </section>
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
          "fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(52,25,106,0.35)] transition-all duration-300 md:hidden",
          showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
