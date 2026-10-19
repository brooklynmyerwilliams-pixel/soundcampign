import { describe, it, expect } from "vitest";
import { holdValue } from "./balance";
describe("holdValue", () => {
  it("holds cost plus profit", () => {
    expect(holdValue({ amount: 4000, note: "PENDING: Strange Fruit · c:4000.00 · p:400.00" })).toBe(4400);
  });
  it("falls back to amount", () => {
    expect(holdValue({ amount: 50, note: "Admin hold adjustment" })).toBe(50);
  });
});
