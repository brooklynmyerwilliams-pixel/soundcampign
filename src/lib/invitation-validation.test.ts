import { describe, expect, it } from "vitest";

async function validateInvitation(code: string) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/is_registration_invite_valid`, {
    method: "POST",
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error(`Invitation validation failed: ${response.status}`);
  return response.json();
}

describe("registration invitation validation", () => {
  it("accepts the administrator invitation F76B1E16", async () => {
    expect(await validateInvitation("F76B1E16")).toBe(true);
  });
  it("accepts an active regular member invitation", async () => {
    expect(await validateInvitation("A4178CCD")).toBe(true);
  });
  it("normalizes casing and surrounding spaces", async () => {
    expect(await validateInvitation(" f76b1e16 ")).toBe(true);
  });
  it("rejects an unknown invitation", async () => {
    expect(await validateInvitation("INVALID000000000000")).toBe(false);
  });
});