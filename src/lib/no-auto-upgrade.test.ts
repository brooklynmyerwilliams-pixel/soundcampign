import { describe, it, expect } from "vitest";
import { stickyTierIndex, effectiveTier, WAREHOUSE_TIERS } from "@/lib/warehouse";

describe("no automatic upgrades", () => {
  it("a huge balance does not raise a level-0 user's tier", () => {
    expect(stickyTierIndex(1_000_000, 0)).toBe(0);
    expect(effectiveTier(1_000_000, 0, false)).toBe(WAREHOUSE_TIERS[0]);
  });
});
