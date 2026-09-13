# Design Language Consistency Guide — "Digital Zen"

> **Purpose of this document.** The dashboard in this package is the *reference
> implementation* of andWeYOGa's design language. The rest of the web app currently
> uses a **different, inconsistent visual scheme.** This guide explains the
> philosophy, the framework approach, and the concrete rules a developer/design team
> should bake in so that **every page of the app speaks one language** — not just
> this screen. Treat it as the north star when migrating existing pages and building
> new ones.

---

## 1. Design Philosophy — what we are protecting

**"Digital Zen": high-performance wellness wrapped in soft, approachable minimalism.**
The product should feel like a *digital sanctuary* — calm, spacious, human. Every
page, no matter how functional (billing, settings, schedules), must still feel like
it belongs to a wellness brand, not a generic SaaS dashboard.

Five principles to carry to **every** screen:

1. **Prana (breathing room).** Generous whitespace is the brand. When in doubt, add
   space, not borders. Section rhythm 40–64px; never crowd.
2. **Calm hierarchy.** One clear focal point per screen, a quiet secondary layer,
   and muted supporting text. Reduce cognitive load — fewer competing elements.
3. **Soft depth, not hard edges.** Depth comes from glassmorphism + tonal layering +
   diffused ambient shadow, never from heavy drop-shadows or harsh 1px grey borders.
4. **Human warmth.** Real photography, soft organic shapes, a single serif-italic
   flourish for voice. Avoid clinical, "data-slop" UI.
5. **Restraint = premium.** The palette is purple-dominant; accents are rare; the
   italic is one word; gradients are subtle. Consistency and restraint read as
   "world-class," decoration reads as cheap.

---

## 2. Framework Approach — how to make consistency *structural*, not manual

Consistency fails when each page re-styles from scratch. Bake it into the
architecture so pages **inherit** the language instead of re-deciding it.

### 2a. Single source of truth for tokens
- Lift every value from `DESIGN_SYSTEM.md` into **one** theme layer in the existing
  stack — a Tailwind `theme.extend` block (the config is already shaped for this in
  the original code), **or** a `:root` CSS-variable sheet, **or** a JS/TS tokens
  module. Pick one and let *all* pages import it.
- **No hard-coded hex, px, or font names in page code.** Every color/space/radius/
  font references a token. This is the #1 lever for cross-page consistency.

### 2b. A shared primitive/component library
Build these once, use them everywhere (Storybook or a `/components/ui` folder):
`Button` (primary / glass-outline / text), `Card` (glass), `StatTile`, `Chip`,
`Avatar` (gradient-initials + photo), `Input` (bottom-border focus), `Tabs`,
`Drawer/SideNav`, `SectionHeader`, `Badge` ("Coming Soon"/"Soon"), `FAB`.
Every page composes these — it should be *hard* to build an off-brand button.

### 2c. Layout shells
Standardize a `PageShell` (sticky glass header + max-width 1280 container + responsive
gutters `clamp(16px,4vw,24px)`) and the `AccountDrawer` so navigation/chrome is
identical on every route. New pages drop their content into the shell.

### 2d. Responsive contract (same on every page)
Mobile `<768` · Tablet `768–1023` · Desktop `≥1024`. Prefer fluid techniques
(`clamp()`, CSS grid `auto-fit/minmax`, flex-wrap) so layouts adapt continuously;
reserve hard breakpoints for true layout switches (e.g. nav → hamburger at 980).

### 2e. Governance
- A visual-regression / Storybook review gate for new components.
- A lint rule (or PR checklist) banning raw hex/px in feature code.
- A living Figma library mirroring the token set and primitives.

---

## 3. The Token System (carry verbatim to every page)
Full set in `DESIGN_SYSTEM.md`. The decisions that keep pages on-brand:

**Color roles — use by *meaning*, not by taste**
- **Primary — Deep Purple `#34196a`** (+ container `#4b3282`, light `#6850a1`): all
  primary actions, branding, active states, headings. The dominant color on every page.
- **Secondary — Terracotta `#9a4612`** (+ `#fd9259`): *accent only* — highlights,
  energy, a single CTA, the warm tip of a gradient. Never the page's main color.
- **Tertiary — Sage `#1b3120`/`#cfe9d1`:** reserve for **success / health / nature**
  semantics (metrics, confirmations, eco/retreat content) — not as decoration.
  *(Design decision already made: the mentor avatars deliberately use purple→terracotta
  gradients at ~80/20, with NO green, because green there read as semantic noise.)*
- **Neutrals:** warm off-whites `#fbf9f7`/`#ffffff`/`#f5f3f1`, text `#1b1c1b` /
  `#494550`. Keep neutrals *warm* — never pure cold grey (that breaks the "airy" feel).
- **Error `#ba1a1a`** for destructive/sign-out only.

**Elevation (depth recipe — identical everywhere)**
1. Solid warm off-white base.
2. Surfaces = glass: `rgba(255,255,255,0.7)` + `backdrop-filter: blur(20px)`.
3. Borders = `1px solid rgba(75,50,130,0.1)` (low-opacity primary), **not** grey.
4. Hover/active = soft ambient shadow `0 8px 30px rgba(0,0,0,0.04)` (heavier only on interactive cards).

**Shape:** inputs/buttons/small cards 8–18px; large modules/bento 22–24px; pills full.

**Spacing rhythm:** 4 / 8 / 16 / 24 / 40 / 64. Card padding 24; mobile safe margin 16;
section gaps 40–64.

---

## 3b. Navigation pattern — section boxes, not horizontal tabs
The signed-in app does **not** use a horizontal tab strip. Primary section navigation
is a **responsive grid of equal "section boxes"** that sits in a band directly under
the logo bar and spans the full content width.

- **Grid:** `display:grid; grid-template-columns:repeat(auto-fit, minmax(112px,1fr)); gap:12px` inside the 1280px container. This naturally yields 6-up on desktop, 3–4-up on tablet, 2–3-up on mobile — boxes always fill the screen width, never scroll horizontally.
- **Box:** vertical stack (24px Material icon over a 13px/600 label), `padding:14px 8px`, `border-radius:16px`. **Inactive** = glass (`rgba(255,255,255,0.7)`) + low-opacity purple border + muted text; hover lifts `-3px` with soft shadow and turns text purple. **Active** = solid `#34196a`, white, `0 8px 22px rgba(52,25,106,0.28)` shadow.
- **Sections:** Sessions (`self_improvement`), Calendar (`calendar_month`), Emojou (`mood`), Workshops (`school`), Trips (`hiking`), Explore (`explore`). Each box links to its page; the current page's box is the active one.
- **Why:** larger touch targets (≥44px), works identically across mac/tablet/mobile with no clipped overflow, and reads as a calm launcher rather than dense tabs. Reuse the same band on every signed-in page.

## 3c. Auth & entry flow
- **Logged-out (all viewports):** the primary header CTA reads **"Book Session."** Clicking it opens the **sign-in modal** — a centered glass card offering **Continue with Google** and **Continue as Guest** (guest = trial/drop-in). Either choice authenticates and routes to the member dashboard.
- **Signed-in:** the header CTA becomes **"My Account"** (dropdown: Book Session, My Account, Sign Out). **My Account → the dashboard ("Sessions").**
- **Sign Out** clears auth and returns to the public Home page (hero carousels), where the CTA is "Book Session" again.
- Prototype models auth with a `localStorage` flag (`awy_auth`); production wires the same states to real session auth.

---

## 4. Typography — the rule that makes pages feel unified
- **Display / headings → Bricolage Grotesque** (the chosen v2 direction). Characterful,
  modern, editorial.
- **Body / UI / labels / numbers → Onest.** Clean, legible, neutral.
- **Voice accent → Instrument Serif, italic — ONE word only.** Used for a single
  evocative word in a hero headline or a personal name in a greeting (e.g.
  "*mindful*", "*Priya*"). This is the brand's signature flourish.

**Italic discipline (applies app-wide):**
- Italic = *emphasis / brand voice*, **never function.** Never italicize buttons,
  nav, labels, table data, prices, or numbers.
- One italic word per view, maximum. More than that = inconsistent, not elegant.
- Always use the *true* serif italic (Instrument Serif) for the accent — never a
  synthetic oblique of the grotesque (it looks cheap).

Type scale (from `DESIGN_SYSTEM.md`): display 48 (→30 fluid), headline 32/24, body
18/16, label 14/12. Headlines tighten letter-spacing −0.02em; reset to normal on the
serif-italic accent.

---

## 5. Signature components — standardize these exact behaviors
- **Buttons:** primary = solid purple, radius 12, soft purple shadow, lift -2px on
  hover; secondary = glass (translucent white + 1px purple border); tertiary = text +
  chevron that widens its gap on hover.
- **Cards / tiles:** glass surface, 18–24 radius, hover lift + ambient shadow. Stat
  tiles carry a 4px colored left-border keyed to their metric.
- **Avatars:** gradient-initials fallback (purple-dominant, ~80% purple / ~20%
  terracotta, direction varied per person) until a real photo is supplied.
- **Chips/badges:** pill, low-saturation tint of the *semantic* color (sage = success,
  terracotta = energy, purple = neutral/info). "Coming Soon"/"Soon" badges in their
  section's accent.
- **Inputs:** minimalist — bottom-border or light tint; focus transitions border to
  primary purple.
- **Nav:** sticky glass header; active tab in primary with a rounded underline;
  scrollable tab strip + hamburger + right-anchored glass `AccountDrawer` on mobile.
- **Header proportion rule (apply on EVERY page):** the logo is the anchor of the
  header's visual scale — every other header control sizes *down* from it, never up.
  With the **48px logo**, header icon-buttons are **40px** (20px glyphs) and the
  account button uses **~9px/16px padding, 13px label, 17px menu glyph, 22px avatar**.
  Header controls must never appear larger or heavier than the logo; keep the logo the
  most prominent mark in the bar. Size all header controls consistently across pages so
  the chrome reads identically everywhere.
- **Section launcher = single-line rule (apply on EVERY launcher page):** the section
  tabs (Sessions / Calendar / Emojou / Workshops / Trips / Explore) are compact
  icon-over-title items — a 3D gradient icon chip (diffused, identifiable drop shadow +
  inset highlight) above the label, with **no outer card**. The row MUST always fit on
  **one horizontal line and never wrap an icon to a second row**: use a fixed equal-width
  track (`grid-template-columns:repeat(N,minmax(0,1fr))`) so the tabs auto-resize down to
  fit the viewport rather than wrapping. Active tab = soft glow ring + purple bold label
  (not a card).

---

## 6. Migrating the rest of the app (page-by-page plan)
1. **Audit.** Inventory every existing page and list its current colors, fonts,
   spacings, components. Flag everything that isn't a token.
2. **Stand up the foundation first.** Ship the token layer + `PageShell` +
   primitive library before touching feature pages. Migration is mostly *swapping*
   after that.
3. **Map old → new.** Build a translation table (old hex/font → token). Replace
   globally where safe.
4. **Roll out by surface, highest-traffic first:** auth/login → dashboard (done) →
   booking/schedule → profile/settings → billing/subscriptions → content (workshops/
   trips). Convert one surface fully before the next so users never see a half-themed flow.
5. **Re-skin, don't rebuild.** Keep existing logic/data; replace presentation with
   primitives. Resist redesigning behavior during a styling migration.
6. **QA each page against the checklist below.**

---

## 7. Consistency checklist (run on every page, old or new)
- [ ] All colors/spacing/radii/fonts come from tokens — zero raw values.
- [ ] Purple is dominant; terracotta is an accent; sage only means success/health.
- [ ] Neutrals are warm, not cold grey. Background `#fbf9f7`.
- [ ] Surfaces use glass + low-opacity purple borders + soft ambient shadow (no hard shadows/grey 1px lines).
- [ ] Bricolage for headings, Onest for body/UI/numbers.
- [ ] At most one serif-italic accent word; nothing functional is italic.
- [ ] Generous whitespace; section rhythm 40–64; card padding 24.
- [ ] Same `PageShell` chrome + `AccountDrawer`; responsive at 768 / 1024 (nav at 980).
- [ ] Buttons/cards/chips/inputs are the shared primitives, not one-offs.
- [ ] Real photography or branded gradient placeholders — no clinical empty blocks.

---

## 8. Do / Don't
**Do:** reuse primitives · lean on whitespace · keep one focal point · use color by
meaning · let the serif italic be a rare flourish · keep motion soft (0.15–0.35s, gentle lifts).
**Don't:** introduce new fonts or off-token colors per page · use cold grey or hard
borders · stack multiple accent colors on one element · italicize UI/data · add
decorative stats/icons ("data slop") · redesign behavior mid-migration.
