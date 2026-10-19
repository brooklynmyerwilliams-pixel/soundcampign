import { expect, it } from "vitest";
import { WAREHOUSE_TIERS } from "./warehouse";

it("provides exactly the five requested VIP membership levels", () => {
  expect(WAREHOUSE_TIERS).toHaveLength(5);
  expect(WAREHOUSE_TIERS.map((tier) => tier.label)).toEqual(["Normal", "Silver", "Gold", "Platinum", "Diamond"]);
});