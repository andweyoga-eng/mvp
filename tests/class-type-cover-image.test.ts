import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const CHECKOUT_SURFACES = [
  "client/src/pages/reserve.tsx",
  "client/src/components/booking-modal.tsx",
] as const;

const BROWSE_SURFACES = [
  "client/src/components/classes-section.tsx",
  "client/src/pages/dashboard.tsx",
] as const;

describe("ClassTypeCoverImage — checkout UX consistency", () => {
  it("exports mobile-safe cover classes", () => {
    const source = readFileSync(
      join(root, "client/src/components/class-type-cover-image.tsx"),
      "utf8",
    );
    assert.match(source, /max-h-48/);
    assert.match(source, /md:h-56 md:max-h-56/);
    assert.match(source, /object-cover object-center/);
    assert.match(source, /ClassTypeCoverFrame/);
    assert.match(source, /lg:w-\[40%\]/);
  });

  it("all checkout surfaces use ClassTypeCoverImage (no raw class-type hero imgs)", () => {
    for (const file of CHECKOUT_SURFACES) {
      const source = readFileSync(join(root, file), "utf8");
      assert.match(source, /ClassTypeCoverImage/);
      assert.doesNotMatch(
        source,
        /<img[^>]*classType\.imageUrl/,
        `${file} must not render class-type images with raw <img>`,
      );
      assert.doesNotMatch(
        source,
        /classType\.imageUrl[\s\S]{0,120}<img/,
        `${file} must route class-type images through ClassTypeCoverImage`,
      );
    }
  });

  it("browse-to-checkout cards use the same cover component", () => {
    for (const file of BROWSE_SURFACES) {
      const source = readFileSync(join(root, file), "utf8");
      assert.match(
        source,
        /ClassTypeCoverImage/,
        `${file} should use ClassTypeCoverImage for seamless checkout handoff`,
      );
    }
  });

  it("reserve checkout uses the sidebar frame variant on desktop", () => {
    const reserve = readFileSync(join(root, "client/src/pages/reserve.tsx"), "utf8");
    assert.match(reserve, /ClassTypeCoverFrame/);
    assert.match(reserve, /variant="checkout-sidebar"/);
    assert.match(reserve, /fillColumn/);
    assert.match(reserve, /lg:flex-row/);
  });
});
