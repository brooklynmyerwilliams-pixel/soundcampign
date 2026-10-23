import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(), authUser: vi.fn(), signIn: vi.fn(), ilike: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { inputValidator: () => builder, handler: (handler: (args: unknown) => unknown) => handler };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ ilike: mocks.ilike.mockImplementation(() => ({ limit: mocks.lookup })) }) }),
    auth: { admin: { getUserById: mocks.authUser } },
  },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signInWithPassword: mocks.signIn } }) }));

import { signInWithUsername } from "./auth.functions";
const callSignIn = signInWithUsername as unknown as (args: { data: { username: string; password: string } }) => Promise<unknown>;

describe("username password authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "https://test.invalid");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    mocks.lookup.mockResolvedValue({ data: [{ id: "admin-id" }], error: null });
    mocks.authUser.mockResolvedValue({ data: { user: { email: "stored-admin@example.com" } }, error: null });
    mocks.signIn.mockResolvedValue({ data: { session: { access_token: "test-access", refresh_token: "test-refresh" } }, error: null });
  });
  it("authenticates the assigned password against the saved email before returning session tokens", async () => {
    await expect(callSignIn({ data: { username: "SoundCamp26", password: "AssignedTestPassword26" } })).resolves.toEqual({ access_token: "test-access", refresh_token: "test-refresh" });
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "stored-admin@example.com", password: "AssignedTestPassword26" });
  });
  it("rejects a wrong password without exposing the saved email", async () => {
    mocks.signIn.mockResolvedValue({ data: { session: null }, error: { message: "invalid credentials" } });
    await expect(callSignIn({ data: { username: "SoundCamp26", password: "wrong-password" } })).rejects.toThrow("Invalid login credentials");
  });
  it("rejects ambiguous usernames instead of authenticating an arbitrary account", async () => {
    mocks.lookup.mockResolvedValue({ data: [{ id: "a" }, { id: "b" }], error: null });
    await expect(callSignIn({ data: { username: "SoundCamp26", password: "wrong-password" } })).rejects.toThrow("Invalid login credentials");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("escapes wildcard characters so legacy usernames match literally", async () => {
    await callSignIn({ data: { username: "legacy_admin", password: "AssignedTestPassword26" } });
    expect(mocks.ilike).toHaveBeenCalledWith("username", "legacy\\_admin");
  });
});