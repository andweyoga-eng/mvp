import { navigate } from "wouter/use-browser-location";
import type { HeroSlideCta } from "@shared/hero-cta";
import { DEFAULT_HERO_CTA_SECTION } from "@shared/hero-cta";

const HEADER_HEIGHT = 76;

export function isOnHomePage(): boolean {
  const path = window.location.pathname;
  return path === "/" || path === "";
}

/** Scroll to a home-page section when already on `/`. */
export function scrollToHomeSection(sectionId: string): boolean {
  const element = document.getElementById(sectionId);
  if (!element) return false;

  const headerOffset = sectionId === "home" ? 0 : HEADER_HEIGHT;
  const top = element.getBoundingClientRect().top + window.pageYOffset - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  return true;
}

/** Navigate to home carousel or a home section from any route.
 * Logged-in members should prefer dashboard — BrandLogo handles that separately.
 */
export function navigateToHomeSection(sectionId: string): void {
  if (isOnHomePage() && scrollToHomeSection(sectionId)) {
    return;
  }

  // Client-side navigation (no full reload) so the auth session is preserved and
  // the header doesn't flash the logged-out "Book Session" CTA. Home's mount
  // effect reads the hash via applyHomeHashScroll() and scrolls to the section.
  const hash = sectionId === "home" ? "" : `#${sectionId}`;
  navigate(`/${hash}`);
}

/** Prefer dashboard when a member is signed in; otherwise marketing home. */
export function navigateMemberHomeOrMarketing(isSignedIn: boolean): void {
  if (isSignedIn) {
    navigate("/dashboard");
    return;
  }
  navigateToHomeSection("home");
}

/** Activate a hero CTA (home section or custom URL/path). */
export function activateHeroCta(cta: HeroSlideCta): void {
  if (cta.mode === "section") {
    navigateToHomeSection(cta.sectionId || DEFAULT_HERO_CTA_SECTION);
    return;
  }

  const url = (cta.customUrl || "").trim();
  if (!url) {
    navigateToHomeSection(DEFAULT_HERO_CTA_SECTION);
    return;
  }

  if (/^https?:\/\//i.test(url)) {
    window.location.assign(url);
    return;
  }

  if (url.startsWith("#")) {
    navigateToHomeSection(url.slice(1) || DEFAULT_HERO_CTA_SECTION);
    return;
  }

  if (url.startsWith("/")) {
    navigate(url);
    return;
  }

  navigateToHomeSection(url);
}

/** Apply `/#section` scroll after home mounts (e.g. from AWY menu on another page). */
export function applyHomeHashScroll(): void {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return;

  const run = () => {
    scrollToHomeSection(hash);
  };

  requestAnimationFrame(() => {
    if (!scrollToHomeSection(hash)) {
      window.setTimeout(run, 50);
    }
  });
}
