import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Resolve a username to the account's email so users can sign in with username + password. */
export const resolveLoginEmail = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ username: z.string().trim().min(1).max(60) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uname = data.username.toLowerCase();
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", uname)
      .limit(1)
      .maybeSingle();
    if (!prof) throw new Error("Invalid login credentials");
    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(prof.id);
    if (error || !userData.user?.email) throw new Error("Invalid login credentials");
    return { email: userData.user.email };
  });

