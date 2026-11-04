# Platform Feature Gates — Spec & Locked Decisions

| Field | Value |
|-------|-------|
| **Spec** | SPEC-PLATFORM-FEATURE-GATES-01 |
| **Status** | Decisions locked (21 Sep 2026) · **v1 implementation shipped** |
| **Decided by** | You (product owner) |
| **Related** | Platform Controls (`guest_checkout_enabled`, `maintenance_window_enabled`), Programs (`programs` table), launcher (`dashboard-shell.tsx`) |
| **Product log** | [`ANDWEYOGA-PRODUCT-DECISIONS.md`](./ANDWEYOGA-PRODUCT-DECISIONS.md) §15 |

---

## 1. Purpose

Site-wide and program-scoped controls for member hub features:

| Launcher label | Route / id | Role in this spec |
|----------------|------------|-------------------|
| **weDiet** | `/fuel` (`fuel`) | Gated feature |
| **weBuild** | `/workshops` (`workshops`) | Gated feature |
| **weEmo** | `/emojou` (`emojou`) | Gated feature |
| **andWeYOGa** | `/dashboard` (`sessions`) | Always available by default |

**Goals**

1. Super admin can freeze CTAs/inputs or hide/unhide tabs from **Platform Controls** without a redeploy.
2. Programs can declare which feature tabs they unlock (persist now; enforce later).
3. Values are **exclusive** (one key → one concern) and **atomic** (boolean), with integrity matching existing `platform_settings`.

---

## 2. Locked decisions (Q&A lock)

| ID | Topic | Decision |
|----|-------|----------|
| A1 | andWeYOGa | Always available for members; not gated by program checkboxes |
| A2 | Program UI | andWeYOGa checkbox **greyed / always on** (implied) |
| A3 | Policy escape hatch | Platform Controls atomic toggle to change “andWeYOGa always available” later |
| B1 | Two levers | **Visible** and **Interactive** are **independent** per weDiet / weEmo / weBuild |
| B2 | Platform Hidden | Non-entitled: tab hidden. **Active entitled** members still open the feature |
| B3 | Platform Interactive off | Non-entitled: CTAs/inputs frozen; page stays open. **Active entitled** stay Live |
| B4 | Entitlement wins | Subscribing to a program that checks a tab → that tab is **Visible + Live** for the member |
| B5 | Program completed | Feature access ends for gated tabs; member keeps **My Account** + **andWeYOGa** |
| C5 | Onboarding gate | Uses **current account gate** (profile + privacy consents) |
| C6 | Non-entitled UX | Page shell still open; CTAs frozen + prompt (when gating ships) |
| C7 | Entitlement source | Only programs that check that tab |
| C8 | Program kinds | Trial and drop-in count (same as recurring) |
| C9 | Multi-program | **Union (OR)** of checked tabs across active programs |
| D10 | v1 programs | UI + **store only** — no member entitlement / freeze / upsell yet |
| D11 | Mid-program edit | **Super admin only**; OTP + written reason; default locked. Not admin / not instructor |
| D12 | New programs | andWeYOGa always implied |
| E13–15 | Upsell (deferred) | List active programs with that tab → generic programs page → deep-link booking |
| F16 | Launcher | One visible tab left → **collapse, no strip** |
| F17 | Deep link | Soft redirect when tab unavailable |
| G18 | Enforcement | Server-side when gating goes live (not UI-only) |

---

## 3. Platform Controls — v1 (build for real)

### 3.1 Atomic keys (`platform_settings`)

Each key is exclusive; value is a strict boolean (`true` / `false` only after parse). Unknown keys rejected by allowlist.

| Key | Default | Meaning |
|-----|---------|---------|
| `feature_wediet_visible` | `true` | Show weDiet in launcher |
| `feature_wediet_interactive` | `true` | weDiet CTAs/inputs live (when not overridden by future entitlement rules) |
| `feature_weemo_visible` | `true` | Show weEmo in launcher |
| `feature_weemo_interactive` | `true` | weEmo CTAs/inputs live |
| `feature_webuild_visible` | `true` | Show weBuild in launcher |
| `feature_webuild_interactive` | `true` | weBuild CTAs/inputs live |
| `feature_andweyoga_always_available` | `true` | When `true`: Sessions always on; program checkbox greyed. When `false`: future gating of andWeYOGa allowed |

Existing keys unchanged: `guest_checkout_enabled`, `maintenance_window_enabled`.

### 3.2 Integrity (same class as guest checkout / maintenance)

1. One key → one boolean; no compound blobs for these gates.
2. PATCH allowlist via `z.enum([...])`; `setPlatformSettingByKey` rejects unknowns.
3. Parsers: accept only `true` / `false` / `"true"` / `"false"`; else fail-closed to documented default.
4. Upsert on PK `key`; audit `oldValue` / `newValue`; bust server cache on write.
5. Seed missing rows on boot (`ensureDefaultPlatformSettings`).
6. Public `/api/platform/config` exposes booleans only — never secrets.

### 3.3 UX rules (platform level)

- **Hide/unhide:** launcher reflows on mobile / tablet / desktop; superior density, no empty slots.
- **One tab remaining:** collapse launcher strip entirely.
- **Freeze interactive:** page route stays active; inputs and CTAs disabled for non-entitled (and for everyone when entitlement is not yet enforced — see §5).
- Soft-redirect deep links to hidden/unavailable features.

### 3.4 Precedence (when entitlement enforcement ships)

```
if member has active program (trial|drop_in|recurring) that checks tab T:
  → T is Visible + Live for that member
else:
  → apply platform visible / interactive for T
if membership completed / expired:
  → gated tabs off; andWeYOGa + My Account remain
```

Multi-program: **union** of checked tabs (OR). Example: We Run checks weDiet; We Lift checks weBuild → member gets both.

---

## 4. Programs — v1 (store only)

### 4.1 Create / edit UI

- Checkboxes: **weDiet**, **weEmo**, **weBuild** (one or many).
- **andWeYOGa** greyed, always checked (implied).
- Persist with the program row (boolean columns or typed `featureTabs` array — implementation choice; must stay exclusive per tab flag).

### 4.2 Enforcement

| Phase | Behavior |
|-------|----------|
| **v1** | Persist checkboxes only. **No** member freeze, upsell prompt, or API reject based on tabs |
| **Later** | Enforce C6–C9, E13–15, G18; Super-admin mid-program change with OTP + reason (D11) |

### 4.3 Mid-program change (deferred wire-up, policy locked)

- Default: tab ticks **cannot** change mid-flight for Admin / Instructor.
- Super admin only, rare: OTP validation + clear written reasoning + audit log.

---

## 5. v1 build scope vs deferred

### Build now

- [x] Platform Controls UI: visible + interactive toggles for weDiet / weEmo / weBuild
- [x] Platform Controls: `feature_andweyoga_always_available`
- [x] Wire keys into `platform_settings` + `/api/platform/config` + launcher hide/reflow + freeze CTAs (platform-level only)
- [x] Programs admin: checkboxes (store only); andWeYOGa greyed
- [x] Soft redirect + single-tab strip collapse for platform visibility

### Do not build yet

- Default freeze after onboarding + “explore programs” upsell
- Entitlement from active subscriptions
- Union enforcement across programs
- Server reject of writes when not entitled
- Super-admin OTP flow for mid-program tab edits (policy reserved)
- Upsell listing / generic programs CTA / booking deep-link from frozen CTAs

---

## 6. Explicitly out of Platform Controls

Do **not** move into Platform Controls:

- Per-user flags (`isActive`, prefs, consents)
- Per-instructor status / license / onboard
- Per-session publish/pause, per-schedule `flexiEnabled`, per-program `flexiAllowed` (booking shape — separate from feature tabs)
- Secrets and host env (`JWT_SECRET`, Razorpay, Gemini key, `DATABASE_*`, `ALLOWED_ORIGIN`, etc.)
- WeFuel photo estimation: product flag may later join Platform Controls; **API key stays in env** (see prior Fuel platform-controls guidance)

Safe candidates already discussed elsewhere: `flexi_booking_enabled`, `fuel_estimation_enabled` — **not** required for this spec’s v1.

---

## 7. Acceptance checklist (v1)

1. Super admin can toggle each of the six visible/interactive keys independently; values persist and audit.
2. Turning visibility off removes the tab from the launcher and reflows layout; one tab → no strip.
3. Turning interactive off disables CTAs/inputs on that page while the route remains reachable (platform-level).
4. `feature_andweyoga_always_available` default true; program form shows andWeYOGa greyed.
5. Creating a program can check weDiet / weEmo / weBuild in any combination; values round-trip on save/load.
6. Member entitlement, upsell, and mid-program OTP are **not** required to pass v1.

---

## 8. Document maintenance

| When | Action |
|------|--------|
| Entitlement phase starts | Move items from §5 deferred into a SPEC revision (§2 stays history) |
| Key rename | Update §3.1 + allowlist tests + product log §15 |
| New launcher tab | Add pair of visible/interactive keys; extend program checkboxes |

**Decided:** 21 Sep 2026 · **Locked in chat** then written here.

---

*End of SPEC-PLATFORM-FEATURE-GATES-01.*
