import { describe, expect, it } from "vitest";
import { validateRegistrationInvite } from "./invitation";

describe("registration invitations", () => {
  it("accepts administrator invitation codes", async () => {
    const valid = await validateRegistrationInvite(" F76B1E16 ", async (code) => ({
      data: code === "F76B1E16", error: null,
    }));
    expect(valid).toBe(true);
  });
  it("accepts regular member invitation codes", async () => {
    const valid = await validateRegistrationInvite("MEMBER26", async (code) => ({
      data: code === "MEMBER26", error: null,
    }));
    expect(valid).toBe(true);
  });
  it("rejects a nonexistent invitation code", async () => {
    expect(await validateRegistrationInvite("UNKNOWN26", async () => ({ data: false, error: null }))).toBe(false);
  });
  it("does not mislabel service failures as invalid codes", async () => {
    await expect(validateRegistrationInvite("F76B1E16", async () => ({ data: null, error: new Error("Unavailable") })))
      .rejects.toThrow("could not be checked");
  });
});