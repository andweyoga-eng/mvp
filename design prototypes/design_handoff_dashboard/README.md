# Handoff: andWeYOGa — Member Dashboard ("Digital Zen")

## Overview
The authenticated member home screen for **andWeYOGa**, a wellness/yoga booking
platform. It greets the member, surfaces today's live session, shows wellness
stats, lists upcoming bookable sessions + a featured event, the member's mentors,
their booked sessions, and two "coming soon" verticals (Workshops, Trips). It also
contains a slide-in **My Account** drawer.

Live frontend reference: https://mvp-production-d49f.up.railway.app/

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype
showing the intended look, layout, and behavior. They are **not production code to
copy verbatim.** The task is to **recreate this design inside the andWeYOGa
codebase** (the React/whatever stack already powering the Railway app) using its
existing components, routing, data layer, and patterns. If a given primitive
(button, card, drawer) already exists in the codebase, use it and skin it to match
the tokens below rather than introducing new one-off styles.

- `andWeYOGa Dashboard.dc.html` — the full responsive prototype. Open it in any
  browser to see every breakpoint (resize the window). Built with inline styles for
  portability; **do not ship the inline styles** — translate them to the codebase's
  styling system (Tailwind/CSS-modules/styled-components/etc).
- `DESIGN_SYSTEM.md` — the complete "Digital Zen" design system: color tokens,
  typography scale, spacing, radii, elevation, and component rules. **This is the
  source of truth for all tokens.** It is already shaped for a Tailwind theme
  `extend` block.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, and interaction
states are all defined. Recreate pixel-perfectly using the codebase's existing
libraries. The only placeholders are photographic regions (see **Assets**).

---

## Screens / Views

### 1. Dashboard (single scrolling page)
**Purpose:** Member's home — see today's session, book new ones, track progress.

**Page shell**
- Max content width **1280px**, centered, horizontal padding `clamp(16px, 4vw, 24px)`.
- Background `#fbf9f7`. Body font Inter, headings Plus Jakarta Sans.
- Vertical section rhythm: 24px (hero→stats), 56px between major sections.

**Sticky header (height 76px)**
- Background `rgba(251,249,247,0.82)` + `backdrop-filter: blur(20px)`, 1px bottom
  border `rgba(75,50,130,0.08)`.
- Left: wordmark `andWe` (`#1b1c1b`, weight 600) + `YOG` (`#34196a`) + `a` (`#9a4612`), Plus Jakarta Sans 800, 22px.
- Center (desktop ≥980px only): nav links — Upcoming Sessions (active: `#34196a` bold 18px with a 3px rounded underline 26px below), then Calendar / My Emojou / Workshops / Trips / Explore (15px, `#494550`, hover `#34196a`).
- Right: search icon btn, notifications icon btn (with `#9a4612` unread dot), and a primary "My Account" button (`#34196a` bg, white, radius 12px, shadow `0 4px 14px rgba(52,25,106,0.22)`) that opens the drawer. Label hidden <980px; menu icon remains.
- Below 980px: center nav is replaced by a horizontally-scrollable tab strip under the header (same labels, active = `#34196a` with 2px underline).

**Hero (radius 24px, min-height `clamp(360px,46vw,440px)`)**
- Full-bleed photo background (placeholder gradient now) with a left-to-right scrim
  `linear-gradient(90deg,#fbf9f7,rgba(251,249,247,0.86) 34%,…,transparent)` so text stays legible.
- Pill badge "Good Morning, Priya" — `rgba(52,25,106,0.1)` bg, `#34196a` text, radius full, 13px/600.
- H1 "Your sanctuary for / mindful movement." — Plus Jakarta Sans 700, `clamp(30px,5.4vw,48px)`, line-height 1.12, letter-spacing -0.02em, `#34196a`.
- Sub `clamp(15px,1.4vw,18px)`, `#494550`, max-width 420px.
- **Session detail card** (glass: `rgba(255,255,255,0.72)` + blur 16px, 1px border `rgba(75,50,130,0.1)`, radius 18px, padding 20px): a flex-wrap row of 4 labeled stats (TIME / INSTRUCTOR / TYPE / DURATION — 10px/700 caps label over 14px/600 value, each with a 20px `#34196a` Material icon), then two CTAs:
  - **Enter Live Session** (primary `#34196a`, white, radius 12px, blinking `#ff6b6b` dot + "LIVE", hover lifts -2px).
  - **Browse Schedule** (glass outline: `rgba(255,255,255,0.6)`, 1px `rgba(52,25,106,0.2)` border, `#34196a` text).

**Stats row** — `grid` `repeat(auto-fit, minmax(258px, 1fr))`, gap 20px. Three glass
cards (radius 18px, padding 22px), each with a colored 4px left border + a round
48px icon chip:
- Calories Burnt — left border `#34196a`, chip `rgba(52,25,106,0.1)`, `local_fire_department`, value **1,240 kcal**.
- Sessions Attended — left border `#9a4612`, chip `rgba(154,70,18,0.1)`, `calendar_month`, **18 this month**.
- Wellness Streak — left border `#354c3a`, chip `#cfe9d1`, `stars`, **4 days**.
- Value type: Plus Jakarta Sans 700 24px `#34196a`; unit 14px/400 `#494550`; label 11px/700 caps `#494550`. Hover: `translateY(-3px)` + soft shadow.

**Bento section** — `display:flex; flex-wrap:wrap; gap:28px; align-items:flex-start`.
- **Main column** `flex: 3 1 540px`:
  - Header row: "Upcoming Sessions" (Plus Jakarta Sans 700 `clamp(24px,3vw,32px)`) + sub "Handpicked sessions to match your progress"; right-aligned links "View Booked" (with `event_available` icon) and "Explore All →".
  - Session card grid `repeat(auto-fit, minmax(248px,1fr))`, gap 18px:
    - **Morning Hatha Flow** — chip "Beginner Friendly" (`#cfe9d1`/`#354c3a`), $15, 60 min · Arjun P., button **Reserve Spot** (outline → fills `#34196a` on hover).
    - **Deep Core Hydro** — chip "High Intensity" (`#ffdbcb`/`#793000`), $22, 45 min · Alice K., **Reserve Spot**.
    - **Tibetan Sound Bath** (full-width, `grid-column:1/-1`, flex-wrap: image `flex:1 1 240px` + content `flex:1 1 280px`) — eyebrow "POPULAR EVENT" (`#9a4612`), title, 2-line desc, meta (This Saturday · Main Studio), primary button **Reserve Your Spot**.
  - Cards: glass, radius 18px, image area 184px; hover `translateY(-4px)` + shadow `0 16px 40px rgba(27,28,27,0.1)`.
- **Side column** `flex: 1 1 320px` (wraps below main under ~900px):
  - "Your Mentors" + 3 mentor rows (glass, radius 16px): 54px gradient avatar with initials, name (Plus Jakarta Sans 600 16px), specialty (12px `#494550`), rating pill (`#cfe9d1`/`#354c3a`). Hover `translateX(6px)`. → Priya Sharma 4.9, Arjun Patel 5.0, Allice Kumari 4.8.
  - **Your Booked Sessions** card — `linear-gradient(150deg,#4b3282,#34196a)`, radius 22px, white heading, 2 translucent rows (Vinyasa Flow / Thu 6:00 PM, Kundalini Awakening / Sat 11:30 AM) each with `arrow_forward`; a large rotated `calendar_today` watermark at `rgba(255,255,255,0.08)`.

**Coming-soon section** — `grid` `repeat(auto-fit, minmax(320px,1fr))`, gap 24px,
two glass cards (radius 22px, padding 30px): icon chip (radius 14px) + "COMING SOON"
tag, H3 26px, body 15px, and a text link with chevron that widens its gap on hover.
- Workshops & Events — secondary-tinted (`#9a4612`), `explore` icon, link "Get Notified".
- Trips & Treks — primary-tinted, `hiking` icon, link "Early Access".

**Floating action button** — fixed bottom-right, 60px circle `#34196a`, `add` icon,
shadow `0 10px 30px rgba(52,25,106,0.4)`, hover scale 1.08. Opens the account drawer.

### 2. My Account drawer (overlay)
**Purpose:** Account navigation + role switch.
- Right-anchored panel, width `min(360px, 88vw)`, full height, glass
  `rgba(251,249,247,0.92)` + blur 24px, left border `rgba(75,50,130,0.1)`, shadow
  `-12px 0 40px rgba(27,28,27,0.12)`. Slides via `transform: translateX(100%↔0)`,
  `transition: transform .32s cubic-bezier(.4,0,.2,1)`.
- Scrim behind: `rgba(27,28,27,0.28)` + blur 3px, fades opacity .3s; click to close.
- Header: 48px gradient avatar ("P"), "My Account" + "Manage your wellness journey", close button (`arrow_forward`).
- Nav items (radius 12px, 13px/14px padding, icon + label): **Book Sessions** (active = `#34196a` bg, white), Profile, Health Updates, My Subscriptions, Payment History, Link Devices (with `SOON` tag in `#9a4612`), Session History. Hover = `rgba(52,25,106,0.06)` bg + `#34196a` text.
- Footer: **Switch to Instructor** (full-width `#9a4612` button, `school` icon), then text links Help Center, Privacy, and Sign Out (`#ba1a1a`).

---

## Interactions & Behavior
- **Drawer open/close:** header "My Account" button and the FAB toggle `navOpen`; scrim click or close button sets it false. Drawer transform + scrim opacity/pointer-events are driven by that one boolean.
- **Responsive breakpoints:**
  - `<768px` mobile, `768–1023px` tablet, `≥1024px` desktop. Most reflow is fluid
    (grid `auto-fit/minmax`, flex-wrap, `clamp()` type) so it adapts continuously.
  - `980px` is the hard switch for header nav (inline center nav ↔ scrollable tab strip + icon-only account button).
- **Hover/active states** are specified per component above (lifts, fills, gap growth, `translateX`). Transitions 0.15–0.35s.
- **Animation:** "LIVE" dot blinks (`opacity 1↔0.2`, 1.5s ease-in-out infinite).
- No real navigation/data is wired in the prototype — all links are placeholders.

## State Management
- `navOpen: boolean` — the only UI state in the prototype (drawer + scrim).
- In production, the dashboard needs: current member (name, avatar), today's session, wellness stats, upcoming sessions list, featured event, mentors list, booked sessions list, and the student/instructor role flag (drives "Switch to Instructor").

## Responsive Behavior
- Hero text + detail-card stats wrap; CTAs go `flex:1 1 200px/150px` so they stack on narrow screens.
- Stats: 3-up → 1-up via `auto-fit minmax(258px,1fr)`.
- Bento: main + side side-by-side → side wraps full-width below main.
- Session cards: 2-up → 1-up; Sound Bath image/content stack vertically when narrow.
- Coming-soon: 2-up → 1-up.

## Design Tokens
**Full token set is in `DESIGN_SYSTEM.md`.** Key values used here:
- Colors: primary `#34196a`, primary-container `#4b3282`, on-primary-container `#baa0f8`, secondary/terracotta `#9a4612`, on-secondary-fixed-variant `#793000`, secondary-fixed `#ffdbcb`, tertiary-container `#314736`/`#354c3a`, tertiary-fixed `#cfe9d1`, surface/bg `#fbf9f7`, white `#ffffff`, on-surface `#1b1c1b`, on-surface-variant `#494550`, error `#ba1a1a`.
- Glass surface: `rgba(255,255,255,0.7)` + `backdrop-filter: blur(20px)`, border `1px solid rgba(75,50,130,0.1)`.
- Active elevation shadow: `0 8px 30px rgba(0,0,0,0.04)` (and the heavier hover shadows noted per component).
- Radii: cards 16–18px, large modules/bento 22–24px, pills/full `9999px`, small `0.25rem`.
- Spacing scale: 4 / 8 / 16 / 24 / 40 / 64 px.
- Type: Plus Jakarta Sans (display/headings: display 48, headline-lg 32→28 mobile, headline-md 24), Inter (body-lg 18, body-md 16, label-md 14, label-sm 12).

## Assets
- **Fonts:** Plus Jakarta Sans + Inter (Google Fonts). **Icons:** Material Symbols Outlined (ligature font). Use the codebase's existing icon set if it already has one; otherwise Material Symbols.
- **Photography:** the hero, the two session cards, and the Sound Bath card use
  **placeholder gradients labeled `/ photo: …`**. Replace with real grayscale-leaning
  wellness photography (matching the muted look of the original reference). Mentor
  avatars use initial-circles in the prototype — swap for real member/instructor
  photos.
- **Logo:** wordmark is recreated in text; substitute the real andWeYOGa SVG logo.

## Files
- `andWeYOGa Dashboard.dc.html` — the prototype (open in a browser; resize to test breakpoints).
- `DESIGN_SYSTEM.md` — Digital Zen tokens (source of truth).
- `README.md` — this document.
