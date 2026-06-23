import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("health document upload validation", async () => {
  const {
    isAllowedHealthDocumentMeta,
    isHealthDocumentWithinSizeLimit,
  } = await import("../shared/health-document-validation.ts");
  const { HEALTH_DOCUMENT_MAX_BYTES } = await import("../shared/health-disclosure.ts");

  it("accepts pdf and image metadata", () => {
    assert.equal(isAllowedHealthDocumentMeta("report.pdf", "application/pdf"), true);
    assert.equal(isAllowedHealthDocumentMeta("scan.jpg", "image/jpeg"), true);
    assert.equal(isAllowedHealthDocumentMeta("scan.png", "image/png"), true);
  });

  it("rejects unsupported types", () => {
    assert.equal(isAllowedHealthDocumentMeta("notes.txt", "text/plain"), false);
    assert.equal(isAllowedHealthDocumentMeta("archive.zip", "application/zip"), false);
  });

  it("enforces 1MB size limit", () => {
    assert.equal(isHealthDocumentWithinSizeLimit(1), true);
    assert.equal(isHealthDocumentWithinSizeLimit(HEALTH_DOCUMENT_MAX_BYTES), true);
    assert.equal(isHealthDocumentWithinSizeLimit(HEALTH_DOCUMENT_MAX_BYTES + 1), false);
  });
});
