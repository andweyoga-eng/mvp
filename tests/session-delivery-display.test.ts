import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deliveryModeLabel,
  externalMapUrl,
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
    assert.equal(deliveryModeLabel("hybrid"), "Hybrid (Online)");
  });

  it("hasPhysicalVenue for hybrid with address", () => {
    assert.equal(
      hasPhysicalVenue({ deliveryMode: "hybrid", venueAddress: "Lotus Sky Studio" }),
      true,
    );
    assert.equal(hasPhysicalVenue({ deliveryMode: "online" }), false);
  });

  it("toMapEmbedUrl ignores a street address", () => {
    assert.equal(toMapEmbedUrl(null, "123 Main St, Bengaluru"), null);
  });

  it("toMapEmbedUrl passes through embed links", () => {
    const embed = "https://www.google.com/maps/embed?pb=abc123";
    assert.equal(toMapEmbedUrl(embed, null), embed);
  });

  it("externalMapUrl keeps a normal maps link", () => {
    const shortLink = "https://maps.app.goo.gl/gbALDx1aKxxrAzH46";
    assert.equal(externalMapUrl(shortLink, "Indiranagar"), shortLink);
  });

  it("externalMapUrl opens the studio address when the saved link is an embed", () => {
    const embed = "https://www.google.com/maps/embed?pb=!1m17!1sen";
    const iframe = `<iframe src="${embed}" width="600" height="450"></iframe>`;
    const address = "12 Residency Road, Bengaluru";
    assert.equal(
      externalMapUrl(iframe, address),
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    );
    assert.equal(externalMapUrl(iframe, null), null);
    assert.equal(toMapEmbedUrl(iframe, address), embed);
  });
});
