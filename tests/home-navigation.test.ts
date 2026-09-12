import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("home navigation", () => {
  it("carousel images use empty decorative alt text (no slide index leak)", () => {
    const source = readFileSync(
      join(root, "client/src/components/hero-carousel.tsx"),
      "utf8",
    );
    assert.match(source, /alt=""/);
    assert.doesNotMatch(source, /alt=\{`Slide \$\{/);
  });

  it("header logo goes to dashboard when signed in, marketing home when guest", () => {
    const navSource = readFileSync(
      join(root, "client/src/components/navigation.tsx"),
      "utf8",
    );
    const logoSource = readFileSync(
      join(root, "client/src/components/brand-logo.tsx"),
      "utf8",
    );
    assert.match(navSource, /BrandLogo/);
    assert.match(logoSource, /MEMBER_DASHBOARD_URL/);
    assert.match(logoSource, /navigateToHomeSection\("home"\)/);
  });

  it("AWY menu uses cross-page home section navigation", () => {
    const source = readFileSync(
      join(root, "client/src/components/navigation.tsx"),
      "utf8",
    );
    assert.match(source, /id: "care"/);
    assert.match(source, /id: "ally"/);
    assert.doesNotMatch(source, /id: "connect"/);
    assert.match(source, /goToHomeSection\(link\.id\)/);
    assert.doesNotMatch(source, /scrollToSection/);
  });

  it("home page applies hash scroll for deep links", () => {
    const source = readFileSync(join(root, "client/src/pages/home.tsx"), "utf8");
    assert.match(source, /applyHomeHashScroll/);
  });
});
