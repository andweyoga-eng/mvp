# andWeYOGa — Developer Integration Guide ("Digital Zen")

Everything a developer needs to integrate this design into the andWeYOGa codebase.
Read this first, then `DESIGN_LANGUAGE_GUIDE.md` (philosophy + rules) and
`DESIGN_SYSTEM.md` (tokens). Wireframes + flow diagram are in
`FLOW_AND_WIREFRAMES.md`.

Live app reference: https://mvp-production-d49f.up.railway.app/

---

## 0. What this package is (and is not)
- **Is:** a high-fidelity, fully-interactive design reference for the whole logged-in
  experience + the public landing, expressed as standalone HTML prototypes you can open
  in any browser. It defines the final look, layout, responsive behavior, copy, and
  interaction states.
- **Is not:** production code to paste in. The prototypes use **inline styles** for
  portability and a small in-house template runtime (`support.js`). **Do not ship either.**
  Re-implement each screen in the andWeYOGa stack (React/Next + your styling system),
  reusing existing components and wiring real data/routes. Translate the inline styles
  into your token layer (see §6).

## 1. How to open the prototypes
Open any file in `prototype/` directly in a browser (double-click). Resize the window to
see mobile / tablet / desktop. The pages link to each other, so you can **click through
the entire flow** exactly as a user would. Fonts + icons load from Google Fonts (online).

Start at **`prototype/andWeYOGa Home.dc.html`** (logged-out landing) and follow the flow.

## 2. Screen inventory (9 screens)
| # | Screen | File | Role |
|---|--------|------|------|
| 1 | **Home** (public landing) | `andWeYOGa Home.dc.html` | Logged-out marketing landing + auth entry. Hero carousel, weekly schedule block, brand sections, footer. |
| 2 | **Hub** (signed-in home) | `andWeYOGa Hub.dc.html` | The post-login landing. A bento matrix of navigable tiles — the launch pad for all sections. |
| 3 | **Sessions / Dashboard** | `andWeYOGa Dashboard v2.dc.html` | "My Account" member dashboard: today's live session, stats, upcoming-sessions carousel, mentors, booked sessions. |
| 4 | **Calendar** | `andWeYOGa Calendar.dc.html` | Practice schedule: compact month calendar + Available Today + weekly schedule with sold-out marking. |
| 5 | **Emojou** | `andWeYOGa Emojou.dc.html` | Mood/feeling tracking (placeholder/coming-soon body, full chrome). |
| 6 | **Workshops** | `andWeYOGa Workshops.dc.html` | Deep-dive intensives (coming-soon). |
| 7 | **Trips** | `andWeYOGa Trips.dc.html` | Wellness retreats (coming-soon). |
| 8 | **Explore** | `andWeYOGa Explore.dc.html` | Discovery (coming-soon). |
| 9 | **Reserve** | `andWeYOGa Reserve.dc.html` | Booking / reserve-a-spot detail + confirmation page (reached from any "Reserve"/"Book" CTA). |

## 3. Auth flow (must implement exactly)
**State:** a single boolean "is the member signed in" (prototype persists it in
`localStorage['awy_auth']='1'`). In production back this with your real session/JWT.

```
            ┌─────────────── LOGGED OUT ───────────────┐
            │  Home (public landing)                    │
            │  Header CTA reads: "Book Session"         │
            └───────────────┬──────────────────────────┘
                            │ click "Book Session"
                            ▼
            ┌──────────────────────────────────────────┐
            │  Sign-in modal                            │
            │   • Continue with Google                  │
            │   • [✓] Keep me signed in (default on,    │
            │         shown under Google only)          │
            │   • Continue as Guest                     │
            └───────┬───────────────────────┬──────────┘
          Google ▼ (sign in)        Guest ▼ (no auth)
            ┌──────────────────┐     proceeds without
            │  set auth = true │     a session
            │  → go to HUB     │
            └──────────────────┘
                            │
   LOGGED IN: Home header CTA becomes "My Account" (→ Hub).
   Sign Out (in the account drawer) → clear auth → return to Home.
```

Rules:
- **Logged-out**, on Home and mobile: primary CTA label = **"Book Session"**.
- **Logged-in**: that CTA becomes **"My Account"** → routes to the **Hub**.
- **Sign in (Google)** → set auth → land on **Hub** (the bento launcher), NOT the dashboard directly.
- **"Keep me signed in"** checkbox: default **checked**, sits **under the Google button only** (it governs Google sign-in persistence; not relevant to Guest).
- **Continue as Guest** → proceed without a session (browse only; gate booking behind sign-in in production as you see fit).
- **Sign Out** (account drawer, every signed-in page) → clear auth → **Home**.

## 4. Navigation model
Two complementary navigation surfaces — implement both:

**A. Hub bento matrix** (signed-in home, screen 2). Full-bleed grid of tiles that ARE the
UI: a large **Your Sessions** hero tile (purple, spans 2×2), **Emojou** (terracotta),
then **Calendar / Workshops / Trips / Explore** tiles. Each tile is a link to its section.
Tile sizes/spans are defined in the Hub file's `<helmet>` grid rules (responsive: 4-col →
2-col → 1-col).

**B. Section launcher strip** (on every section page: Sessions, Calendar, Emojou,
Workshops, Trips, Explore). A compact horizontal row of **icon-over-title** items (3D
gradient icon chip + label, no card). **Hard rule:** the strip is always a single
horizontal line — it auto-resizes to fit and never wraps an icon to a second row
(`grid-template-columns:repeat(6,minmax(0,1fr))`). Active tab = soft glow ring + purple
bold label. See the launcher rule in `DESIGN_LANGUAGE_GUIDE.md` §5.

**Chrome (shared on every signed-in page):** sticky glass header with the **48px logo**
(links to Hub), search + notifications icon-buttons (40px), and the **My Account** button
that opens a right-anchored glass **account drawer** (Profile, Booking History, Payment
Methods, Preferences, Help, Switch to Instructor, Sign Out). Header controls always size
*down* from the logo (header proportion rule, guide §5). A floating action button (FAB)
also opens the drawer on scroll.

## 5. Per-screen build notes
For each screen, the prototype is the spec. Key functional pieces to wire to real data:

- **Home:** hero **carousel** (auto-advancing, dot nav); **weekly schedule block** =
  Available Today carousel + compact calendar + Weekly Schedule list that **scrolls
  vertically with ▲/▼ buttons** (a day can hold many sessions; the list clips inside a
  fixed-height card, arrows nudge it — do not let it blow out the page). Brand sections
  (Teach/Care/Vibe/Believe/Connect/About/Meet the Yogis/Contact) + footer. Auth-aware
  header CTA + sign-in modal.
- **Hub:** greeting with the one serif-italic accent ("…where to *today*?"); the bento
  tiles (§4A); account drawer + header controls per the proportion rule.
- **Sessions/Dashboard:** **today's session card** is a compact **2×2 grid** — A Time,
  B Instructor (top row); C Session type, D **"Enter Session"** button with blinking LIVE
  badge (bottom row). Stats row (Calories / Sessions attended / Wellness streak — 4px
  colored left border each). **Upcoming Sessions = horizontal carousel** with ‹ › arrows
  in a dedicated non-overlapping gutter; a card's **Reserve** CTA routes to **Reserve**.
  Mentors list (gradient-initial avatars, purple-dominant ~80/20, no green). Booked
  sessions card.
- **Calendar:** compact month grid (selectable days, availability dots, **SOLD OUT**
  marking when every session that day is full); **Available Today** cards (each with a
  session **photo** placeholder, time, intensity chip, instructor avatar, Book Now →
  Reserve); **Weekly Schedule** showing all sessions per day; Grid/List view toggle;
  intensity filter chips.
- **Emojou / Workshops / Trips / Explore:** full shared chrome (launcher strip + drawer)
  with a polished **coming-soon** body. Replace bodies with real features as built.
- **Reserve:** booking detail / reserve-a-spot + confirmation. Wire to your booking API.

## 6. Tokens & styling (do this first)
1. Lift every value from **`DESIGN_SYSTEM.md`** into ONE theme layer (Tailwind
   `theme.extend`, CSS variables, or a tokens module). No hard-coded hex/px/font names in
   feature code — everything references a token. This is the #1 lever for consistency.
2. Headline font **Bricolage Grotesque**, body/UI **Onest**, voice accent **Instrument
   Serif italic** (one word only; never italicize functional text).
3. Build the shared **primitives** once (Button, Card/glass surface, StatTile, Chip,
   Avatar, Drawer, SectionHeader, Badge, FAB, the **SectionLauncher**, the **HubTile**)
   and compose every screen from them. See `DESIGN_LANGUAGE_GUIDE.md` §2 (framework
   approach) and §5 (component specs).

## 7. Responsive contract
Mobile `<768` · Tablet `768–1023` · Desktop `≥1024`. Most layout is fluid (`clamp()`,
CSS grid `auto-fit/minmax`, flex-wrap). Hard switches: header nav at ~980px; Hub grid
4→2→1 col at 920px. The section launcher never wraps (always one line). Verify all three
form factors per screen.

## 8. Assets
- **Logo:** `prototype/assets/awy-logo.png` (the transparent TM lockup) — used at 48px in
  every header. Swap for your canonical SVG if available.
- **Fonts/icons:** Google Fonts (Bricolage Grotesque, Onest, Instrument Serif) + Material
  Symbols Outlined. Use your existing icon set if you have one.
- **Photography:** all image regions are gradient placeholders labeled `/ photo: …`.
  Replace with real, muted wellness photography. Avatars are gradient-initials until real
  photos exist.

## 9. Integration order (recommended)
1. Token layer + fonts (§6.1–2).
2. Shared primitives + the **PageShell** (header/drawer/FAB) + **SectionLauncher** + **HubTile** (§4, §6.3).
3. Auth flow + sign-in modal + route guards (§3).
4. Screens in traffic order: Home → Hub → Sessions/Dashboard → Calendar → Reserve → Emojou/Workshops/Trips/Explore.
5. Wire real data into the carousels, calendar, schedule, booking.
6. QA each screen against §7 and the checklist in `DESIGN_LANGUAGE_GUIDE.md` §7.

## 10. Acceptance checklist
- [ ] All colors/space/radii/fonts come from tokens — zero raw values in feature code.
- [ ] Auth: logged-out CTA = "Book Session"; Google → Hub; Sign Out → Home; Guest path works.
- [ ] "Keep me signed in" default-checked, under Google only.
- [ ] Header logo 48px; icon-buttons 40px; account button sized down from logo — identical on every page.
- [ ] Section launcher always one line, never wraps; active = glow ring + purple bold label.
- [ ] Today's-session card is the 2×2 grid with "Enter Session" + LIVE badge.
- [ ] Upcoming Sessions carousel arrows don't overlap content; Reserve CTA routes to Reserve.
- [ ] Calendar marks SOLD OUT days; Available Today cards carry photos.
- [ ] Weekly Schedule scrolls inside its card via ▲/▼ (no page blow-out).
- [ ] One serif-italic accent per view; nothing functional italicized.
- [ ] Mentor/avatars purple-dominant (~80/20), no green.
- [ ] Mobile / tablet / desktop all verified per screen.

## Files in this package
- `prototype/` — all 9 interactive screens (+ `support.js` runtime, `assets/awy-logo.png`). Open in a browser; click through the flow.
- `INTEGRATION_GUIDE.md` — this document.
- `FLOW_AND_WIREFRAMES.md` — end-to-end flow diagram + per-screen wireframes.
- `DESIGN_LANGUAGE_GUIDE.md` — philosophy, framework approach, component specs, migration plan, consistency checklist.
- `DESIGN_SYSTEM.md` — Digital Zen tokens (source of truth).
