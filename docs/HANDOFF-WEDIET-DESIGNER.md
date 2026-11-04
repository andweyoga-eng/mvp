# weDiet — Designer handoff

**Product surface:** Member calorie awareness (formerly WeFuel / andWeFuel)  
**Live route:** `/fuel`  
**Branch / ship context:** `cursor/webapp-redesign`  
**Audience:** Product design (UX / UI polish, not engineering implementation)  
**As of:** Sep 2026

> **Upcoming Track Diet v2 (locked engineering decisions):** [`SPEC-WEDIET-TRACK-DIET-V2.md`](./SPEC-WEDIET-TRACK-DIET-V2.md). This handoff still describes **what is shipped today** (single-item modal).

This document describes **what members see today** so design can audit, refine, or restyle without reverse-engineering the app.

---

## 1. Where it lives

### Launcher (dashboard shell)

Four circular module tabs:

| Label (shipped) | Opens |
|---|---|
| **weDiet** | `/fuel` |
| **weBuild** | workshops |
| **weEmo** | emojou |
| **andWeYOGa** | sessions dashboard |

Naming rule: module names that start with “We…” use lowercase **w** (`weDiet`, `weBuild`, `weEmo`). Exception: **andWeYOGa** stays as branded.

### In-page tabs (inside `/fuel`)

Pill toggle under the launcher:

1. **Diet Control** (default)
2. **Calorie Statement**

---

## 2. Information architecture

```
weDiet (/fuel)
├── Diet Control
│   ├── Header + “Track your Diet” CTA
│   ├── Today summary card (consumed / target / band status)
│   ├── Today’s meals list (delete)
│   ├── Daily inspiration (recipe + practice-along)
│   └── Vibe check (shuffleable coaching line)
└── Calorie Statement
    ├── Target / band chip
    ├── Status legend
    └── Collapsible day trays (this week → today)
```

Secondary flow (modal, portaled above header):

```
Track your Diet
├── Capture (if photo estimation enabled)
│   ├── Take photo (live camera)
│   ├── Choose from library / drag-drop
│   └── Skip, enter manually
├── Scanning…
├── Error (retake / manual)
└── Confirm your meal → Add to Calorie Bank
```

If photo estimation is **off** (no Gemini key / flag), members go straight to **manual Confirm**.

---

## 3. Diet Control — screen map

### Header

| Element | Copy / behavior |
|---|---|
| Title | **Your daily** *diet* (accent italic on “diet”) |
| Chip | `Target: {N} cal/day · band −{D}` |
| Primary CTA | Camera icon + **Track your Diet** |

**CTA sizing (mobile-aware):** compact height (`~36–40px`), content-width (not full-bleed). Intentionally smaller than earlier “Log a meal” bar so it does not dominate the phone viewport.

### Today card

| Element | Notes |
|---|---|
| Label | `TODAY` (uppercase micro-label) |
| Hero metric | `{consumed} / {target} cal` (mono) |
| Helper | e.g. “{N} left to stay within today’s budget” / over-budget variant |
| Status pill | Shown only when day verdict is ready: green = on track, red = over/under |

### Today’s meals

| Element | Notes |
|---|---|
| Section title | **Today’s meals** |
| Subcopy | `Entries for today against your target band (−{D} cal).` |
| Empty | “No meals logged today yet.” |
| Row | Utensils glyph · meal name · local time · calories · trash |
| Delete | Inline confirm: Cancel / Delete (red treatment) |

**Removed from this view (by design):** week bar chart, multi-day ledger. History lives on **Calorie Statement**.

### Supporting blocks (unchanged pattern)

- **Recipe / Practice-along** glass cards (admin-curated daily content)
- **Vibe check** purple gradient strip with shuffle

---

## 4. Calorie Statement — screen map

### Header

| Element | Copy |
|---|---|
| Breadcrumb-style | `My Account > Calorie Bank & Statement` |
| Title | **Your calorie** *statement* |
| Target chip | `Target set: {N} cal/day · maintain {floor}–{N} (band −{D})` where floor = target − deficit |

### Legend

| Swatch | Meaning |
|---|---|
| Green filled circle | **Target Hit** (within band) |
| Red filled circle | **Target missed — over / under eating** |
| **White fill + black ring** | **In progress** |
| Soft purple chip | **This week** (scope label) |

### Day tray (accordion)

One tray per day from **Monday of the week → today**, newest first.

**Collapsed / top level (color lives here):**

| Piece | Spec |
|---|---|
| Date | `dd/mm` + short weekday (e.g. `11/09 Thu`) |
| Chevron | Expand / collapse |
| Verdict pill | See status table below |
| Metrics line | `Target set {T} · Consumed {C} · vs target {±delta}` (delta hidden while In progress) |

**Expanded:**

- List of meals for that day (name, time, calories)
- Empty today (In progress): “No meals logged yet today.”
- Empty past day: “No meals logged this day.”

Meal rows are **neutral** (no red/green fill). Status color is **only** on the day tray.

### Day status rules (designer-facing)

| Condition | Tray label | Fill |
|---|---|---|
| Consumed within `[target − deficit, target]` | **Target Hit** | Soft green |
| Consumed **above** target | **Target missed — Over eating** | Soft red + rose text |
| Consumed **below** band floor (incl. past day with **zero** meals) | **Target missed — Under eating** | Soft red + rose text |
| **Today**, no meals yet *or* day verdict not closed yet | **In progress** | **White fill + black border**; pill = white + black border |

---

## 5. Track your Diet — modal

**Chrome**

- Centered card, max width ~400px
- Dimmed scrim (`black/40`)
- Renders **above** frosted header / launcher (portaled to body)
- Close (X)

### Steps when photo estimation is on

| Step | Title / key UI |
|---|---|
| Upload | **Log a meal** · dashed drop zone · **Take photo** · **Choose from library** · **Skip, enter manually** · format helper (JPG/PNG/WebP, 4 MB; HEIC not supported) |
| Camera | Live preview · Capture when ready · Cancel |
| Scanning | Photo thumb + progress copy |
| Error | Message + **Retake photo** / manual fallback (no-food → retake primary) |
| Confirm | **Confirm your meal** · photo thumb or utensils placeholder · advisory banner · Meal / Calories / optional Meal slot · **Add to Calorie Bank** · optional **Retake photo** |

### Advisory banners on Confirm

| Confidence / path | Tone | Copy |
|---|---|---|
| High confidence | Green soft | “Advisory estimate. Check it before saving.” |
| Low confidence | Warm amber | “The plate was hard to read…” |
| Failed estimate | Neutral | Manual / failure guidance |
| Manual skip | Neutral microcopy | “Manual entry — nothing was estimated.” |

Photos are **not stored**; only confirmed name + calories are saved.

---

## 6. Color & status tokens (as shipped)

| Role | Treatment |
|---|---|
| Brand / primary text & CTA | Purple primary (`text-primary` / filled button) |
| Accent italic in titles | Secondary brand accent (`dz-secondary`) |
| Target Hit | Green pill `#cfe9d1` / text `#354c3a`; tray wash `#f3faf4` |
| Target missed | Red wash `bg-red-50`, text `#9f1239`; pill `bg-red-100` |
| In progress | White + **black** border (legend dot + tray + pill) |
| Glass surfaces | Existing Digital Zen glass cards |

---

## 7. Copy deck (member-facing, current)

### Navigation & tabs
- weDiet · weBuild · weEmo · andWeYOGa
- Diet Control · Calorie Statement

### Diet Control
- Your daily *diet*
- Track your Diet
- Today’s meals
- No meals logged today yet.

### Calorie Statement
- Your calorie *statement*
- Target Hit
- Target missed — Over eating
- Target missed — Under eating
- In progress
- Target missed — over / under eating *(legend short form)*

### Modal (still mixes “meal” language)
- Log a meal *(modal title — consider aligning to Diet)*
- Take photo · Choose from library · Skip, enter manually
- Confirm your meal · Add to Calorie Bank · Retake photo

### Legal / support
- Disclaimer: *andWeDiet is a self-awareness aid and not medical or nutritional advice.*
- Support off-ramp: *If tracking food feels stressful, here is support* → tel link

---

## 8. Gates designers should know about

Members may not always see the full Diet Control experience:

1. **Health consent required** → consent explainer + link to My Account privacy  
2. **Not configured** → coach has not set target / deficit / meal plan yet (“Almost ready”)  
3. **Photo estimation off** → no camera/library path; manual confirm only  

Admin configures member targets under admin WeFuel tooling; photo estimation depends on host env (`FUEL_ESTIMATION_ENABLED=true` + Gemini key).

---

## 9. Suggested design follow-ups

Non-blocking polish ideas for the next design pass:

1. **Copy consistency** — Modal still says “Log a meal” / “Confirm your meal” while CTA says “Track your Diet”; align voice to Diet.  
2. **In progress tray** — Confirm black-ring white treatment reads clearly on glass + light backgrounds across devices.  
3. **Day tray hierarchy** — Typography scale for `dd/mm` vs verdict pill vs metrics line (especially on narrow phones).  
4. **Empty past days** — Under-eating red trays for zero-log days may feel harsh; explore softer “No log” state vs “Under eating”.  
5. **CTA placement** — Validate compact **Track your Diet** placement next to title on very small widths.  
6. **Iconography** — Launcher still uses Apple for weDiet; consider a diet-specific glyph if brand wants clearer differentiation from food-as-fruit.

---

## 10. Reference for engineers / QA

| Concern | Primary files |
|---|---|
| Member UI | `client/src/pages/fuel.tsx` |
| Launcher labels | `client/src/components/dashboard/dashboard-shell.tsx` |
| Copy / band math constants | `shared/fuel.ts` |
| APIs | `server/fuel-routes.ts`, `server/fuel-estimation.ts` |
| Implementation notes | `docs/SPEC-FUEL-01-IMPLEMENTATION.md` |

---

## 11. One-line summary for design kickoff

**weDiet** is a two-tab member surface: **Diet Control** for today’s tracking + photo/manual log modal, and **Calorie Statement** for week-day trays that roll up to Target Hit / Missed (Over|Under) / In progress — with In progress coded as white + black ring.