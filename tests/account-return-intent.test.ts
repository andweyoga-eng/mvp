import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  setAccountReturnIntent,
  peekAccountReturnIntent,
  consumeAccountReturnIntent,
  clearAccountReturnIntent,
} from "../client/src/lib/account-return-intent.ts";

const root = join(import.meta.dirname, "..");

describe("account return intent", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      get length() {
        return memory.size;
      },
    };
  });

  afterEach(() => {
    clearAccountReturnIntent();
  });

  it("stores only allowed WeDiet / weEmo paths", () => {
    setAccountReturnIntent("/fuel");
    assert.equal(peekAccountReturnIntent(), "/fuel");
    setAccountReturnIntent("/emojou?x=1#y");
    assert.equal(peekAccountReturnIntent(), "/emojou");
    setAccountReturnIntent("/dashboard");
    assert.equal(peekAccountReturnIntent(), "/emojou");
  });

  it("consume clears after read", () => {
    setAccountReturnIntent("/fuel");
    assert.equal(consumeAccountReturnIntent(), "/fuel");
    assert.equal(peekAccountReturnIntent(), null);
  });
});

describe("health consent lives on Health History", () => {
  it("My Account health section owns the consent checkbox; privacy does not", () => {
    const health = readFileSync(
      join(root, "client/src/components/account-health-note-section.tsx"),
      "utf8",
    );
    const privacy = readFileSync(
      join(root, "client/src/components/privacy-consent-section.tsx"),
      "utf8",
    );
    const fuel = readFileSync(join(root, "client/src/pages/fuel.tsx"), "utf8");
    const emojou = readFileSync(join(root, "client/src/pages/emojou.tsx"), "utf8");
    const landing = readFileSync(join(root, "client/src/lib/member-landing.ts"), "utf8");

    assert.match(health, /health-consent-checkbox/);
    assert.match(health, /needsHealthConsent/);
    assert.doesNotMatch(privacy, /health-consent-checkbox/);
    assert.doesNotMatch(privacy, /needsHealthConsent/);
    assert.match(privacy, /statusRevision/);
    assert.match(privacy, /withdraw-health-consent/);

    assert.match(fuel, /setAccountReturnIntent\("\/fuel"\)/);
    assert.match(fuel, /\/my-account#health/);
    assert.match(emojou, /setAccountReturnIntent\("\/emojou"\)/);
    assert.match(emojou, /\/my-account#health/);
    assert.match(landing, /consumeAccountReturnIntent/);
  });
});
