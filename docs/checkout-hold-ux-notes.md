# Checkout hold UX — future considerations

**Epic A-01 · Updated July 2026**

## Current behaviour (agreed for launch scale)

When a member taps the header **Back** control during an active payment hold, we show a confirmation dialog. If they confirm, we **release the spot immediately** (same as “Release my spot”) and navigate away.

This matches explicit user intent to leave checkout and keeps capacity accurate at our current session volume.

## Revisit when scale increases

At higher booking volume or shorter hold windows, consider:

1. **Navigate-only back (no auto-release)** — Header back returns to Calendar while the hold continues until `heldUntil` expires. Only “Release my spot” and confirmed destructive exits would call `cancel-checkout`.
2. **Analytics on back-vs-abandon** — Measure how often users confirm back release vs. let holds expire to tune the default.
3. **Resume deep links** — Ensure email/SMS retry links remain the primary path for returning users so back-button policy does not strand intent.

Document any change in product spec section A-02 before altering behaviour.
