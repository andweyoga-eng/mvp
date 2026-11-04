# weDiet — Multi-item meal capture + weight-based nutrition
### Engineering handoff

Covers the redesigned "Track your Diet" flow in `andWeFuel Diet Tracker v2.dc.html` — replaces the single-item modal described in the original weDiet designer handoff. All decisions below were confirmed with product during this build; nothing here is assumed.

> **Canonical locked decisions (D1–D9, F1–F9, API, schema, drafts):** [`SPEC-WEDIET-TRACK-DIET-V2.md`](./SPEC-WEDIET-TRACK-DIET-V2.md). Prefer that spec if this prototype handoff conflicts.

---

## 1. Flow overview

Tracking a meal is now two nested levels: pick the **meal** first, then add one or more **items** to it. Each item can use a different capture method. Steps, in order:

1. **Select meal** — meal slot (Breakfast / Lunch / Snack / Dinner) + optional custom meal name.
2. **Items list** — running list of items added so far; add another via Take photo / Upload / Manual; edit or delete any item; see a live running total.
3. **Capture / Upload** — live-preview or dropzone mock, with Retake before the photo is sent.
4. **Scanning** — simulated `POST /api/fuel/estimate` call.
5. **Item confirm** — editable name + calories (+ optional weight, see §3); Retake or Add item.
6. **Review** — full item list, computed meal total, final Add to Calorie Bank.

---

## 2. Meal-level decisions

| Decision | Resolution |
|---|---|
| Meal selection step | Slot + optional custom meal name (e.g. "Sunday brunch"). |
| Adding items UI pattern | Items accumulate in a running list on one screen (not a full-screen wizard per item) — "Take photo / Upload / Manual" buttons sit above the list. |
| Cancel meal capture | Always allowed, no confirm dialog. Items already added are **kept as a same-day draft**, keyed by meal slot — reopening the same slot the same day restores them. |
| Wizard back-navigation | User can jump back into any already-added item mid-flow to edit or retake it directly (not review-only editing). |
| Final review screen | Yes — separate review step lists all items with a total row before the final "Add to Calorie Bank". *(A manual override of the total was added, then removed per product — total is always the computed sum of items, read-only.)* |
| Per-item editable scope | Name, calories, weight, photo (retake), and capture method are all editable per item after it's added. |
| Meal total | Sum of item calories, computed live, shown on the review screen. No override control. |

---

## 3. Weight → nutrition precedence

Every item — capture, upload, or manual — gets an optional **Weight** field next to Calories on the confirm step, with a g / oz toggle (canonical storage is always grams; oz is a display-only conversion, `1 oz = 28.3495 g`).

| Decision | Resolution |
|---|---|
| Field visibility | Always shown on the confirm step (not hidden behind a toggle), for all three capture methods. |
| Recalculation model | Density-based: whatever calorie value is on screen when a weight is first entered is treated as the cal/100g density (default reference = 100 g). Entering/changing weight recomputes `calories = density × weight/100`. |
| Recalc timing | Live, on every keystroke in the weight field — no blur/debounce for this path. |
| Editing calories after weight is set | Calories stays hand-editable. Typing a new calorie value silently recomputes the stored density from `(new calories) / (current weight/100)` — the weight value itself is untouched. |
| Applies to manual entry? | Yes, same precedence rule — manual has no photo, so its typed calorie figure is the density seed instead of an estimate. |
| Where weight is surfaced | Both: item-list row (e.g. "150g · ~92 cal/100g") and the review screen row. |

---

## 4. Weight-only nutrition estimate (calories cleared)

If the user clears Calories entirely while a weight is present, the product calls the estimator with **food name + weight** (no calorie value) to fill nutrition in, instead of leaving the field blank.

| Decision | Resolution |
|---|---|
| Trigger | Live — fires automatically once Calories is empty and Weight has a value, after a short debounce (700ms idle, prototype value — tune against real API latency). |
| Applies to manual entry? | Yes — manual entry also triggers a model call, keyed on the typed food name + weight (no photo needed). |
| Name required? | Yes — the call is blocked with an inline message ("Add a food name first…") until a food name is present. |
| Loading state | Inline spinner next to the Calories field; user stays on the confirm step (no full-step transition to the "Scanning" screen). |
| Result presentation | A distinct "Estimated from weight" badge (purple pill + density readout), deliberately separate from the photo high/low confidence banner treatment in §5 of the base spec. |
| Failure | Inline error text ("Couldn't estimate from weight — enter calories by hand"); no value is filled in, no retry auto-scheduled. |

**Prototype note:** the demo simulates this call with a fixed density per the existing `estimateOutcome` tweak (success/low/error). The real integration should call the Gemini endpoint with `{name, weightGrams}` and no photo payload for this path.

---

## 5. Data model (per item)

```
{
  id: number,
  method: 'capture' | 'upload' | 'manual',
  name: string,
  calories: number,
  confidence: number | null,   // 0–1, null for manual or weight-derived
  weightG: number | null,      // canonical grams; null = no weight set
}
```

A meal is `{ id, title, slotLabel, time, total, itemCount, items[] }` where `total` is the sum of item calories at save time. Drafts persist client-side keyed by `(date, slotIndex)` → `{ items[], customName }`, cleared once the meal is finally submitted.

---

## 6. Open items for engineering

- Confirm real endpoint contracts: item-level estimate (photo→name+cal+confidence) vs. the new weight-only estimate (name+weight→cal, no photo). Likely two distinct request shapes on the same estimation service.
- Confidence threshold stays 0.75 (per base spec), applied per item, not per meal.
- Photos are still never stored — same as the base spec — including for the weight re-estimate path, which sends no photo at all.
- Draft persistence above is prototyped in component state only; production needs to decide storage (localStorage vs. server-side draft) and expiry (end of day / device-local).
