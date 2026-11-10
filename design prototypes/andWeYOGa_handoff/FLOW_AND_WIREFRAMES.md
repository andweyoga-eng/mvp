# andWeYOGa — Flow & Wireframes

Companion to `INTEGRATION_GUIDE.md`. ASCII wireframes communicate **structure and
hierarchy**, not pixels — the prototypes in `prototype/` are the pixel-level spec.

---

## A. End-to-end flow map

```
                         ┌──────────────────────────┐
                         │   HOME  (public landing) │
                         │   CTA: "Book Session"    │
                         └───────────┬──────────────┘
                                     │ Book Session
                                     ▼
                         ┌──────────────────────────┐
                         │     SIGN-IN MODAL         │
                         │  Google · Guest           │
                         └─────┬──────────────┬──────┘
                      Google ▼               ▼ Guest
                     (auth = true)        (browse only)
                                     │
                                     ▼
              ╔═══════════════════════════════════════════╗
              ║                 HUB                        ║
              ║   bento launcher (signed-in home)         ║
              ╚══╦════════╦════════╦════════╦════════╦════╝
                 ▼        ▼        ▼        ▼        ▼     ▼
            SESSIONS  CALENDAR  EMOJOU  WORKSHOPS  TRIPS  EXPLORE
            (Dash)       │
                 │       │
       Reserve ◄─┘       └─► Book Now ─► RESERVE ─► confirmation
       (from card CTAs)

   • Logo (any signed-in page) ─────────────► HUB
   • Section launcher strip ─── jumps between SESSIONS/CALENDAR/EMOJOU/
     WORKSHOPS/TRIPS/EXPLORE (always one line, never wraps)
   • Account drawer ▸ Sign Out ─► clears auth ─► HOME
   • Logged-in: HOME header CTA = "My Account" ─► HUB
```

---

## B. Shared chrome (every signed-in page)

```
┌──────────────────────────────────────────────────────────────┐
│  [LOGO 48px→Hub]              (search)(bell)  [ My Account ▾ ] │  sticky glass header
├──────────────────────────────────────────────────────────────┤
│  ⌂        📅       🙂        🎓        🥾        🧭             │  section launcher
│ Sessions Calendar Emojou  Workshops  Trips   Explore           │  (icon-over-title,
│  ▲active = glow ring + purple bold label                       │   ONE line, no wrap)
└──────────────────────────────────────────────────────────────┘
                                                  [ + ] FAB → drawer

Account drawer (slides from right): Profile · Booking History · Payment
Methods · Preferences · Help · Switch to Instructor · — · Sign Out
```

---

## C. Screen wireframes

### 1. Home (public landing)
```
┌──────────────────────────────────────────────┐
│ [aWY ☰]        [LOGO]            [Book Session]│  header (logo centered)
├──────────────────────────────────────────────┤
│  ◀  HERO CAROUSEL (auto)  ▶     ● ● ○ ○       │
│     headline + CTA                            │
├──────────────────────────────────────────────┤
│  WEEKLY SCHEDULE BLOCK                         │
│  ┌ Available Today ◀▶ ┐ ┌ Calendar ┐ ┌Weekly┐ │
│  │ card card card     │ │  M T W.. │ │  ▲    │ │
│  │                    │ │  grid    │ │ list  │ │
│  └────────────────────┘ └──────────┘ │  ▼    │ │
│                                       └───────┘ │
├──────────────────────────────────────────────┤
│  Teach · Care · Vibe · Believe · Connect       │  brand sections
│  About · Meet the Yogis · Contact              │
├──────────────────────────────────────────────┤
│  FOOTER                                        │
└──────────────────────────────────────────────┘
```

### 2. Hub (signed-in home — bento launcher)
```
┌──────────────────────────────────────────────┐
│ [LOGO]            (search)(bell)[My Account ▾]│
│  Good morning, Priya. Where to *today*?       │
├───────────────────────┬──────────────────────┤
│                       │   EMOJOU (terracotta) │
│   YOUR SESSIONS        ├──────────┬───────────┤
│   (big purple 2×2)     │ Calendar │ Workshops │
│                       │          │           │
├───────────┬───────────┴──────────┴───────────┤
│   TRIPS    │            EXPLORE               │
└───────────┴──────────────────────────────────┘
   (4-col desktop → 2-col tablet → 1-col mobile)
```

### 3. Sessions / Dashboard
```
┌──────────── shared chrome (header + launcher) ───────────┐
│  Good Morning, *Priya*                                    │
│  Your sanctuary for *mindful* movement.                   │
│  ┌ Today's session — 2×2 grid ─────────────┐              │
│  │ A ⏱ TIME 10:00      │ B 👤 Arjun Patel  │              │
│  │ C 🧘 Hatha · 60 min │ D [Enter Session ●LIVE]│          │
│  └─────────────────────┴───────────────────┘              │
├───────────────────────────────────────────────────────────┤
│ [Calories]   [Sessions attended]   [Wellness streak]      │  stat tiles
├───────────────────────────────────────────────────────────┤
│  Upcoming Sessions        ‹  [card][card][card]  ›        │  carousel (gutter arrows)
│                              each card ▸ Reserve → RESERVE │
├───────────────────────────────────────────────────────────┤
│  Mentors (avatars)        │   Booked sessions card        │
└───────────────────────────────────────────────────────────┘
```

### 4. Calendar
```
┌──────────── shared chrome ───────────────────────────────┐
│  Find your *flow*                       [Grid | List]     │
│  ┌ Month grid ───────────┐  ┌ Available Today ──────────┐ │
│  │ M T W T F S S         │  │ [photo] Hatha  8:00  [chip]│ │
│  │ · · • · · SOLD-OUT ·  │  │ [photo] Vinyasa 6:00 [chip]│ │
│  │ (selectable, dots)    │  │  Book Now → RESERVE        │ │
│  └───────────────────────┘  └───────────────────────────┘ │
│  Weekly Schedule (all sessions/day)   · intensity chips   │
└───────────────────────────────────────────────────────────┘
```

### 5–8. Emojou / Workshops / Trips / Explore (coming-soon)
```
┌──────────── shared chrome (launcher active = this tab) ───┐
│              [ 3D icon ]                                   │
│              Section title                                 │
│         Polished "coming soon" body + teaser CTA          │
└───────────────────────────────────────────────────────────┘
```

### 9. Reserve (booking detail / confirmation)
```
┌──────────── header (logo → Hub) ─────────────────────────┐
│  ‹ back                                                   │
│  ┌ Session summary ┐   ┌ Reserve panel ───────────┐      │
│  │ [photo] title    │   │ date · time · instructor │      │
│  │ details/intensity│   │ price                    │      │
│  │                  │   │ [ Confirm Reservation ]  │      │
│  └──────────────────┘   └──────────────────────────┘      │
│            → confirmation state                           │
└───────────────────────────────────────────────────────────┘
```

---

## D. Notes
- Arrows (‹ › / ▲ ▼) are real controls, not decoration: Upcoming-Sessions carousel uses
  horizontal ‹ ›; Weekly-Schedule list uses vertical ▲ ▼ to scroll inside a fixed-height
  card so long days don't overflow the page.
- `*word*` marks the single Instrument-Serif italic accent allowed per view.
- "SOLD OUT" appears on a calendar day only when every session that day is full.
