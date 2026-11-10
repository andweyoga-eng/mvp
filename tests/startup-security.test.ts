import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAllowedCorsOrigin } from "../server/startup-security.ts";

describe("startup security helpers", () => {
  it("uses https for configured production origin", () => {
    assert.equal(
      getAllowedCorsOrigin({ NODE_ENV: "production", ALLOWED_ORIGIN: "andweyoga.com" }),
      "https://andweyoga.com",
    );
  });

  it("uses http for localhost during development", () => {
    assert.equal(
      getAllowedCorsOrigin({ NODE_ENV: "development", ALLOWED_ORIGIN: "localhost:3000" }),
      "http://localhost:3000",
    );
  });

  it("defaults to localhost in development when ALLOWED_ORIGIN is unset", () => {
    assert.equal(getAllowedCorsOrigin({ NODE_ENV: "development" }), "http://localhost:3000");
  });

  it("throws when ALLOWED_ORIGIN is missing in production", () => {
    assert.throws(
      () => getAllowedCorsOrigin({ NODE_ENV: "production" }),
      /ALLOWED_ORIGIN must be set in production/,
    );
  });
});
