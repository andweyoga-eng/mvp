# SPEC — weDiet Track Diet v2 (locked decisions)

**Status:** Product decisions locked (2026-09-21)  
**Surface:** Member `/fuel` → **Track your Diet** flow  
**Related:** `docs/andWeFuel Diet Tracker v2 - Handoff.md`, `docs/HANDOFF-WEDIET-DESIGNER.md`, `docs/SPEC-FUEL-01-IMPLEMENTATION.md`  
**Gemini reference (provider ideas only):** Downloads / `Gemini_Vision_Nutrition_Integration_Guide _21092026.md` — **not** a drop-in API contract

Do not reopen D1–D9 / F1–F9 without an explicit product change. Implement against this document.

---

## 1. Decision log (locked)

### Product (D1–D9)

| ID | Choice | Resolution |
|---|---|---|
| **D1** | **B** | Item confirm shows **macros** plus name / calories / confidence / weight. Macros optional to store. |
| **D2** | **A** | Persist as **N `fuel_meals` rows** (one per item) sharing `meal_group_id` + meal title. |
| **D3** | **A** | Extend **`POST /api/fuel/estimate`**: image optional; if no image, require `name` + `weightGrams`. |
| **D4** | **C** | Prefer admin `fuelMealPlan` slots when present; else Breakfast / Lunch / Snack / Dinner. **Custom meal name always allowed.** |
| **D5** | **A** | Drafts in **localStorage**, expire at member-local EOD. Soft under-note that draft clears on its own. |
| **D6** | **A** | Keep slim vision path + add text/weight path. Do **not** adopt full clinical Gemini guide UI (no healthScore / recommendations as medical advice). |
| **D7** | **A** | Keep **HEIC reject** with clear reject-reason copy (JPG / PNG / WebP only). |
| **D8** | **A** | Today’s meals + Calorie Statement: **meal group row**, expand to items. |
| **D9** | **`gemini-3.1-flash-lite`** | Primary via `GEMINI_FUEL_MODEL`. Optional fallback via `GEMINI_FUEL_FALLBACK_MODEL` only (no hardcoded dead models). |

### Follow-ups (F1–F9)

| ID | Choice | Resolution |
|---|---|---|
| **F1** | **A** | Photo **and** weight-only estimates both return a small macro set (protein / carbs / fat / fiber). |
| **F2** | **Confirm** | Add columns: `meal_group_id`, `meal_title`, `weight_g`, `capture_method`, `confidence`, optional `macros` JSON (and density only if needed client-side). |
| **F3** | **Both** | Delete **whole meal group** and **single item** inside a group. |
| **F4** | **C** | Prefer admin plan labels when configured; else default B/L/S/D; custom name always. |
| **F5** | **Yes** | Draft clears at **member-local midnight** (same local date basis as logging). |
| **F6** | **Yes** | Smoke-test primary model; optional env fallback only. Member UI never shows model IDs. |
| **F7** | Custom name wins | Group label: **custom name** when set (e.g. `Sunday brunch · 3 items · 640 cal`); else slot label. |
| **F8** | **Yes** | Weight-only estimate blocked without food name — inline “Add a food name first…”. |
| **F9** | **A** | Atomic **`POST /api/fuel/meals/batch`** with `{ mealGroupId, mealTitle, slotIndex, items[] }`. |

---

## 2. Flow (member UX)

Tracking a meal is two nested levels: pick the **meal**, then add one or more **items**.

1. **Select meal** — slot (admin plan or B/L/S/D) + optional custom meal name.  
2. **Items list** — running list; add via Take photo / Upload / Manual; edit or delete any item; live running total.  
3. **Capture / Upload** — live camera or library/dropzone; Retake before send.  
4. **Scanning** — photo estimate in progress (full-step).  
5. **Item confirm** — editable name, calories, weight (g/oz toggle), macros; Retake or Add item. Weight-only re-estimate uses inline spinner (stay on confirm).  
6. **Review** — all items, **read-only** meal total (= sum of item calories), **Add to Calorie Bank**.

Cancel is always allowed (no confirm dialog). Items already added stay as a **same-day draft** keyed by `(localDate, slotIndex)` until submitted or EOD clear.

### Draft under-note (soft copy)

> We’ll keep a draft on this device while you build this meal. It clears on its own at the end of the day.

---

## 3. Weight → nutrition (client)

- Weight field always visible on confirm (all capture methods).  
- Canonical store: **grams**. Oz is display-only (`1 oz = 28.3495 g`).  
- Density model: first calorie value on screen when weight is entered = cal/100g density (default reference 100 g).  
  `calories = density × weight / 100`  
- Recalc live on weight keystrokes.  
- Editing calories after weight is set recomputes density from `(new cal) / (weight/100)`; weight unchanged.  
- If calories cleared while weight present → call estimate with **name + weightGrams** (no photo), after ~700ms debounce.  
- Badge: distinct **“Estimated from weight”** (not the photo high/low confidence banner).

---

## 4. Estimate API contract

### `POST /api/fuel/estimate` (extended)

**Photo mode**

- Input: image (multipart and/or existing base64 path).  
- Output: `name`, `calories`, `confidence`, `macros` `{ protein, carbs, fat, fiber }`, optional `items[]`, reviewState.  
- Keep `is_food_detected` / `422 no_food` → Retake primary CTA.  
- Photos transit only — never persisted.

**Weight-only mode**

- Input: `name` (required) + `weightGrams` (required); **no image**.  
- Output: `calories` + `macros` (same shape).  
- Missing name → client blocks; server validates and 400s.

**Confidence**

- Thresholds stay as today (success ≥ 0.75, low ≥ 0.4) — **per item**, not per meal.

**Model**

- Prefer `process.env.GEMINI_FUEL_MODEL` (`gemini-3.1-flash-lite`).  
- Optional `process.env.GEMINI_FUEL_FALLBACK_MODEL` — if unset, **no** automatic fallback.  
- Still gated by `FUEL_ESTIMATION_ENABLED=true` + `GEMINI_API_KEY` (exact lowercase `true`).  
- Member errors: never surface model names / provider payloads. Use soft copy; `model_unavailable` hints that the studio should check estimate setup.  
- Admin estimation status may show primary + fallback model labels.  
- Member estimate success JSON does **not** include `model`.

**Food name autocomplete**

1. Personal history (`fuel_meals` names for this user) first.  
2. Catalog seed `data/nutrition/fuel-food-catalog-v1.json` (from ICMR-NIN / curated workbook) when history misses.  
3. Logging a meal strengthens personal history for next time.  
Source workbook + rebuild notes: `data/nutrition/README.md`.

**Out of scope for this ship (D6)**

- Full FDA/ICMR clinical dossier UI, healthScore, recommendations-as-advice, micronutrient %DV panels.  
- Do not present estimates as medical advice (keep andWeDiet disclaimer).

**HEIC (D7)**

- Reject with informational copy (existing formats copy / HEIC save-as-JPG message). No client convert in this ship.

---

## 5. Persistence

### Schema additions on `fuel_meals` (per item row)

| Column | Purpose |
|---|---|
| `meal_group_id` | UUID shared by all items in one tracked meal |
| `meal_title` | Custom name or resolved slot label at save time |
| `weight_g` | nullable integer/numeric grams |
| `capture_method` | `capture` \| `upload` \| `manual` |
| `confidence` | nullable 0–1 |
| `macros` | nullable JSON `{ protein, carbs, fat, fiber }` |

Existing: `name`, `calories`, `meal_slot_index`, `logged_date`, `client_local_time`, `target_at_log_cal`, etc.

### Save

`POST /api/fuel/meals/batch`

```ts
{
  mealGroupId: string;
  mealTitle: string;
  mealSlotIndex: number | null;
  clientLocalDate: string; // YYYY-MM-DD
  clientLocalTime: string; // HH:mm
  clientTimeZone?: string;
  items: Array<{
    name: string;
    calories: number;
    weightG?: number | null;
    captureMethod: "capture" | "upload" | "manual";
    confidence?: number | null;
    macros?: { protein: number; carbs: number; fat: number; fiber: number } | null;
  }>;
}
```

Atomic insert of N rows. Meal total is always sum of item calories (no override).

### Delete

- Delete **item**: remove one row.  
- Delete **group**: remove all rows with that `meal_group_id` for the user.

### Read models

- Dashboard / statement aggregate by `meal_group_id` for display.  
- Group row copy: **custom `meal_title` when set**; include item count + total cal. Expand → item rows.

---

## 6. Drafts

- Storage: **localStorage** only (this device).  
- Key: `(localDate, slotIndex)` → `{ items[], customName }`.  
- Clear on successful batch save.  
- Clear at **member-local midnight** (EOD).  
- Show soft under-note (see §2).

---

## 7. Implementation phases (suggested)

1. DB patch + types + `POST /api/fuel/meals/batch` + group-aware reads/deletes  
2. Track Diet multi-item modal UX (select → items → capture → confirm → review)  
3. Extended estimate (macros on photo + weight-only mode) + model fallback  
4. Today’s meals + Calorie Statement group rows / expand / delete group+item  
5. Drafts + soft under-note + HEIC reject copy polish  

---

## 8. Explicit non-goals

- Replacing `/api/fuel/estimate` with a separate `/api/analyze-nutrition` from the Gemini sample guide.  
- 50mb base64 payloads; keep existing size/MIME limits (~4 MB, jpeg/png/webp).  
- Server-side drafts in v1 of this redesign.  
- Manual override of meal total on review.  
- Presenting Gemini output as clinical / medical advice.

---

## 9. Draft under-note — locked soft wording

```
We’ll keep a draft on this device while you build this meal. It clears on its own at the end of the day.
```

---

## 10. QA follow-ups (locked 2026-09-21)

| Item | Resolution |
|---|---|
| Vibe Check | Above Diet Control / Calorie Statement pills |
| Macros | Bolder card on item confirm |
| Estimate errors | Soft copy for network/quota; **`model_unavailable`**: soft studio-hint copy (no model IDs). Admin status may show model labels. |
| Group chevron | Larger, primary, stroke 2.5 |
| Item numbering | `1) 2) …` in modal, Today, Statement |
| Autocomplete | Personal history first, then catalog seed (`data/nutrition/`); logging strengthens personal |
| Append after save | `+` on Today’s meals group only → `POST /api/fuel/meals/group/:groupId/items` |
| Out of slot window | Prompt on **append +** and on **new meal Continue** when a named slot is outside its window; Outside slots bucket on select |
| Late log stamp | Show `Eaten HH:mm · logged HH:mm` when `eatenLocalTime` set |
