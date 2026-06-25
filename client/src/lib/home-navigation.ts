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

/** Navigate to home carousel or a home section from any route. */
export function navigateToHomeSection(sectionId: string): void {
  if (isOnHomePage() && scrollToHomeSection(sectionId)) {
    return;
  }

  const hash = sectionId === "home" ? "" : `#${sectionId}`;
  window.location.assign(`/${hash}`);
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
