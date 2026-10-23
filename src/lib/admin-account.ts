import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const adminAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid login email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  username: z.string().trim().min(3).max(30)
    .regex(/^(?=.*[A-Za-z])[A-Za-z0-9]+$/, "Username must contain letters and optional numbers, without spaces or symbols"),
  displayName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});

/** Provision only a complete, confirmed admin; undo this new account on failure. */
export async function provisionAdminAccount(client: SupabaseClient<Database>, input: z.infer<typeof adminAccountSchema>) {
  const data = adminAccountSchema.parse(input);
  const { data: existing, error: lookupError } = await client.from("profiles")
    .select("id").ilike("username", data.username).limit(1).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) throw new Error("This username is already taken");

  const { data: created, error } = await client.auth.admin.createUser({
    email: data.email, password: data.password, email_confirm: true,
    user_metadata: { username: data.username, display_name: data.displayName || data.username },
  });
  if (error) throw new Error(error.message);
  if (!created.user) throw new Error("Could not create administrator account");
  const uid = created.user.id;
  try {
    const { error: profileError } = await client.from("profiles").upsert({
      id: uid, username: data.username, display_name: data.displayName || data.username,
      phone: data.phone || null,
    });
    if (profileError) throw new Error(profileError.message);
    const { error: roleError } = await client.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (roleError) throw new Error(roleError.message);
    return { ok: true, userId: uid };
  } catch (cause) {
    const { error: cleanupError } = await client.auth.admin.deleteUser(uid);
    if (cleanupError) throw new Error("Administrator setup failed. Remove the incomplete new account before retrying.");
    throw cause;
  }
}