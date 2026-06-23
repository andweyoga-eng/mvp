import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("profile phone field mobile layout", () => {
  it("renders errors below the input row without absolute positioning", () => {
    const source = readFileSync(
      join(root, "client/src/components/profile-phone-field.tsx"),
      "utf8",
    );
    assert.doesNotMatch(source, /absolute/);
    assert.match(source, /mt-1 flex w-full/);
    assert.match(source, /break-words/);
  });

  it("uses 48px controls and 110px country select on mobile", () => {
    const source = readFileSync(
      join(root, "client/src/components/profile-phone-field.tsx"),
      "utf8",
    );
    assert.match(source, /h-12 w-\[110px\]/);
    assert.match(source, /md:h-10 md:w-40/);
    assert.match(source, /mb-5 md:mb-0/);
  });

  it("shows compact country code on mobile only", () => {
    const source = readFileSync(
      join(root, "client/src/components/profile-phone-field.tsx"),
      "utf8",
    );
    assert.match(source, /md:hidden/);
    assert.match(source, /hidden truncate text-xs md:inline/);
  });

  it("uses shortened placeholders and validation copy", () => {
    const account = readFileSync(
      join(root, "client/src/components/account/account-profile-page.tsx"),
      "utf8",
    );
    assert.match(account, /placeholder="Mobile number"/);
    assert.match(account, /placeholder="Secondary number"/);
    assert.match(account, /placeholder="Emergency number"/);
    assert.doesNotMatch(account, /Enter mobile number/);
    assert.doesNotMatch(account, /absolute -bottom-5/);
  });

  it("submit button is full width with mobile height via sticky actions", () => {
    const account = readFileSync(
      join(root, "client/src/components/account/account-profile-page.tsx"),
      "utf8",
    );
    assert.match(account, /AccountStickyActions/);
    assert.match(account, /h-12 w-full/);
  });
});
