import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

/** Authenticate username + password without exposing account emails to anonymous callers. */
export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ username: z.string().trim().min(1).max(60), password: z.string().min(1).max(72) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uname = data.username.replace(/[\\%_]/g, "\\$&");
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", uname)
      .limit(2);
    const prof = profiles?.[0];
    if (profileError || profiles?.length !== 1 || !prof) throw new Error("Invalid login credentials");
    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(prof.id);
    if (error || !userData.user?.email) throw new Error("Invalid login credentials");
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error("Sign-in is temporarily unavailable");
    // A fresh nonprivileged client keeps password authentication isolated from the admin client.
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email: userData.user.email, password: data.password });
    if (signInError || !signedIn.session) throw new Error("Invalid login credentials");
    return { access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token };
  });

/** Checks that an invitation code belongs to an existing, active account. */
export const checkInviteCode = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ code: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedCode = data.code.trim();
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, suspended")
      .ilike("invite_code", normalizedCode)
      .eq("suspended", false)
      .limit(1)
      .maybeSingle();
    return { valid: Boolean(prof) };
  });
