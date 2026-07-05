import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deliveryModeLabel,
  hasPhysicalVenue,
  normalizeDeliveryMode,
  toMapEmbedUrl,
  formatSessionDeliverySummary,
} from "../client/src/lib/session-delivery-display.ts";

describe("session delivery display", () => {
  it("normalizeDeliveryMode defaults to online", () => {
    assert.equal(normalizeDeliveryMode(null), "online");
    assert.equal(normalizeDeliveryMode("hybrid"), "hybrid");
  });

  it("deliveryModeLabel for hybrid", () => {
    assert.equal(deliveryModeLabel("hybrid"), "Hybrid — Online");
  });

  it("hasPhysicalVenue for hybrid with address", () => {
    assert.equal(
      hasPhysicalVenue({ deliveryMode: "hybrid", venueAddress: "Lotus Sky Studio" }),
      true,
    );
    assert.equal(hasPhysicalVenue({ deliveryMode: "online" }), false);
  });

  it("toMapEmbedUrl from address", () => {
    const url = toMapEmbedUrl(null, "123 Main St, Bengaluru");
    assert.ok(url?.includes("google.com/maps"));
    assert.ok(url?.includes(encodeURIComponent("123 Main St, Bengaluru")));
  });

  it("toMapEmbedUrl passes through embed links", () => {
    const embed = "https://www.google.com/maps/embed?pb=abc123";
    assert.equal(toMapEmbedUrl(embed, null), embed);
  });
});
