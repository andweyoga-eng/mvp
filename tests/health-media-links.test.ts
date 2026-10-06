import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  healthMediaPreviewUrl,
  normalizeHealthMediaUrl,
  sanitizeHealthMediaLinksForSave,
  validateHealthMediaUrl,
} from "../shared/health-media-links.ts";

describe("health-media-links", () => {
  it("normalizes Google Docs URLs", () => {
    const url = normalizeHealthMediaUrl(
      "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    );
    assert.equal(url, "https://docs.google.com/document/d/abc123/edit?usp=sharing");
  });

  it("rejects non-Google hosts", () => {
    assert.equal(normalizeHealthMediaUrl("https://dropbox.com/s/abc"), null);
  });

  it("builds Drive preview URLs for video", () => {
    const preview = healthMediaPreviewUrl(
      "https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
    );
    assert.equal(preview, "https://drive.google.com/file/d/FILE_ID/preview");
  });

  it("validates document vs drive file types", () => {
    const doc = validateHealthMediaUrl(
      "https://docs.google.com/document/d/abc/edit",
      "document",
    );
    assert.equal(doc.valid, true);

    const video = validateHealthMediaUrl(
      "https://docs.google.com/document/d/abc/edit",
      "video",
    );
    assert.equal(video.valid, false);
  });

  it("sanitizes duplicate links", () => {
    const links = sanitizeHealthMediaLinksForSave([
      {
        id: "1",
        type: "document",
        url: "https://docs.google.com/document/d/abc/edit",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        type: "document",
        url: "https://docs.google.com/document/d/abc/edit",
        addedAt: "2026-01-02T00:00:00.000Z",
      },
    ]);
    assert.equal(links.length, 1);
  });
});
