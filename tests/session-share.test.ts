import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildBookedSessionSharePayload,
  buildClassTypeSharePayload,
  buildClassTypeShareUrl,
  buildWhatsAppShareUrl,
  formatSessionShareDateIst,
} from "../shared/session-share.ts";

describe("session share", () => {
  it("builds class type share url and message", () => {
    const url = buildClassTypeShareUrl("ct-1", "https://andweyoga.com");
    assert.match(url, /openBooking=true/);
    assert.match(url, /classTypeId=ct-1/);

    const payload = buildClassTypeSharePayload(
      { name: "Morning Flow", price: "500" },
      "ct-1",
      "https://andweyoga.com",
    );
    assert.equal(payload.title, "Morning Flow at andWeYoga");
    assert.match(payload.text, /Morning Flow/);
    assert.match(payload.text, /₹500\/session/);
  });

  it("builds booked session share without meet link", () => {
    const payload = buildBookedSessionSharePayload(
      {
        className: "Yin Yoga",
        instructorName: "Priya",
        date: "2026-07-15T10:30:00.000Z",
        classId: "class-9",
      },
      "https://andweyoga.com",
    );
    assert.match(payload.text, /Yin Yoga/);
    assert.match(payload.text, /Priya/);
    assert.match(payload.text, /sessionId=class-9/);
    assert.doesNotMatch(payload.text, /meet\.google/);
  });

  it("formats share date in IST", () => {
    const formatted = formatSessionShareDateIst("2026-07-15T10:30:00.000Z");
    assert.match(formatted, /2026/);
  });

  it("encodes whatsapp share url", () => {
    const href = buildWhatsAppShareUrl("Hello andWeYoga");
    assert.match(href, /^https:\/\/wa\.me\/\?text=/);
  });
});
