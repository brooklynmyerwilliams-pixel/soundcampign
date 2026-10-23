import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { adminAccountSchema, provisionAdminAccount } from "./admin-account";
import { hasAdminAccess } from "./auth-roles";

const input = { email: " CreatedAdmin@Example.com ", username: "SoundCamp26", password: "AssignedTestPassword26" };

function clientMock(failure?: "profile" | "role") {
  const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "created-admin" } }, error: null });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const upsert = vi.fn().mockResolvedValue({ error: failure === "profile" ? { message: "profile failed" } : null });
  const insert = vi.fn().mockResolvedValue({ error: failure === "role" ? { message: "role failed" } : null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const lookup = { select: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle };
  const client = { auth: { admin: { createUser, deleteUser } }, from: vi.fn((table) => table === "profiles" ? { ...lookup, upsert } : { insert }) };
  return { client: client as unknown as SupabaseClient<Database>, createUser, deleteUser, upsert, insert, maybeSingle };
}

describe("Super Admin-created administrator login", () => {
  it("creates a confirmed identity with the exact assigned password and administrator role", async () => {
    const mock = clientMock();
    await expect(provisionAdminAccount(mock.client, input)).resolves.toEqual({ ok: true, userId: "created-admin" });
    expect(mock.createUser).toHaveBeenCalledWith({ email: "createdadmin@example.com", password: input.password, email_confirm: true, user_metadata: { username: "SoundCamp26", display_name: "SoundCamp26" } });
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "created-admin", username: "SoundCamp26" }));
    expect(mock.insert).toHaveBeenCalledWith({ user_id: "created-admin", role: "admin" });
    expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it.each(["profile", "role"] as const)("does not leave an unloginable account when %s setup fails", async (failure) => {
    const mock = clientMock(failure);
    await expect(provisionAdminAccount(mock.client, input)).rejects.toThrow(`${failure} failed`);
    expect(mock.deleteUser).toHaveBeenCalledWith("created-admin");
  });
  it("rejects case-insensitive duplicate usernames before creating auth credentials", async () => {
    const mock = clientMock();
    mock.maybeSingle.mockResolvedValue({ data: { id: "existing-user" }, error: null });
    await expect(provisionAdminAccount(mock.client, input)).rejects.toThrow("username is already taken");
    expect(mock.createUser).not.toHaveBeenCalled();
  });
  it("requires new admin usernames to be one word containing letters and optional numbers", () => {
    expect(adminAccountSchema.safeParse({ ...input, username: "SoundCamp" }).success).toBe(true);
    expect(adminAccountSchema.safeParse({ ...input, username: "SoundCamp26" }).success).toBe(true);
    for (const username of ["Sound Camp", "Sound_Camp", "123456"]) {
      expect(adminAccountSchema.safeParse({ ...input, username }).success).toBe(false);
    }
  });
  it("gives ordinary admins administrator panel access", () => {
    expect(hasAdminAccess([{ role: "user" }, { role: "admin" }])).toBe(true);
  });
  it("gives Super Admin access without requiring a second admin role row", () => {
    expect(hasAdminAccess([{ role: "super_admin" }])).toBe(true);
  });
  it("does not give members or missing roles administrator access", () => {
    expect(hasAdminAccess([{ role: "user" }])).toBe(false);
    expect(hasAdminAccess([])).toBe(false);
  });
});