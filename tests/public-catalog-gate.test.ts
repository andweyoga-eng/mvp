import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isExcludedFromPublicCatalog,
  isPublicCatalogSession,
  isQaFixtureClassTypeName,
  isQaFixtureInstructorName,
  QA_AGENT_CLASS_TYPE_PREFIX,
  QA_SMOKE_CLASS_TYPE_PREFIX,
} from "../shared/seed-catalog.ts";
import { isSessionAllowedInPublicCatalog } from "../server/public-catalog-gate.ts";
import { isQaInternalApiRequest } from "../server/qa-internal-api.ts";

describe("public catalog gate — fixture detection", () => {
  it("flags smoke and agent session type prefixes", () => {
    assert.equal(isQaFixtureClassTypeName(`${QA_SMOKE_CLASS_TYPE_PREFIX}123`), true);
    assert.equal(isQaFixtureClassTypeName(`${QA_AGENT_CLASS_TYPE_PREFIX}run-1`), true);
    assert.equal(isQaFixtureClassTypeName("Mudit Yoga"), false);
  });

  it("excludes fixture type or instructor from public catalog", () => {
    assert.equal(
      isExcludedFromPublicCatalog({
        classTypeName: "Smoke QA 99",
        instructorName: "Real Instructor",
      }),
      true,
    );
    assert.equal(
      isExcludedFromPublicCatalog({
        classTypeName: "Meditation",
        instructorName: "Smoke QA Instructor 99",
      }),
      true,
    );
    assert.equal(
      isExcludedFromPublicCatalog({
        classTypeName: "Deepti Flow",
        instructorName: "Deepti Kukreja",
      }),
      false,
    );
  });

  it("requires both production type and instructor for public sessions", () => {
    assert.equal(
      isPublicCatalogSession(
        { name: "Vinyasa" },
        { name: "Smoke QA Instructor 1" },
      ),
      false,
    );
    assert.equal(
      isPublicCatalogSession({ name: "Vinyasa" }, { name: "Active Teacher" }),
      true,
    );
    assert.equal(isPublicCatalogSession(null, { name: "Active Teacher" }), false);
  });
});

describe("public catalog gate — QA internal bypass", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalToken = process.env.QA_INTERNAL_API_TOKEN;

  it("allows fixture sessions when dev token header matches", () => {
    process.env.NODE_ENV = "development";
    process.env.QA_INTERNAL_API_TOKEN = "smoke-secret";
    const req = { get: (name: string) => (name.toLowerCase() === "x-awy-qa-internal" ? "smoke-secret" : undefined) };
    assert.equal(isQaInternalApiRequest(req), true);
    assert.equal(
      isSessionAllowedInPublicCatalog(
        { name: "Smoke QA 1" },
        { name: "Smoke QA Instructor 1" },
        req,
      ),
      true,
    );
    process.env.NODE_ENV = originalEnv;
    process.env.QA_INTERNAL_API_TOKEN = originalToken;
  });

  it("never bypasses in production", () => {
    process.env.NODE_ENV = "production";
    process.env.QA_INTERNAL_API_TOKEN = "smoke-secret";
    const req = { get: () => "smoke-secret" };
    assert.equal(isQaInternalApiRequest(req), false);
    assert.equal(
      isSessionAllowedInPublicCatalog(
        { name: "Smoke QA 1" },
        { name: "Smoke QA Instructor 1" },
        req,
      ),
      false,
    );
    process.env.NODE_ENV = originalEnv;
    process.env.QA_INTERNAL_API_TOKEN = originalToken;
  });
});

describe("public catalog gate — instructor fixtures", () => {
  it("flags demo seed and smoke instructor names", () => {
    assert.equal(isQaFixtureInstructorName("Sarah Johnson"), true);
    assert.equal(isQaFixtureInstructorName("Smoke QA Instructor 42"), true);
    assert.equal(isQaFixtureInstructorName("Deepti Kukreja"), false);
  });
});
