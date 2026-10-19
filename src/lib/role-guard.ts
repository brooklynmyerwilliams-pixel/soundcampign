import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getViewAsId } from "@/lib/hooks";

/** Panel a signed-in account belongs to, based on its server-stored role. */
export function panelFor(isAdmin: boolean): "/admin" | "/dashboard" {
  return isAdmin ? "/admin" : "/dashboard";
}

async function currentUserIsAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth" });
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  return !!isAdmin;
}

/** Admin Panel gate: regular users are sent to the User Panel. */
export async function requireAdminPanel() {
  if (!(await currentUserIsAdmin())) throw redirect({ to: "/dashboard" });
}

/** User Panel gate: admins go to the Admin Panel unless they are previewing a member ("view as"). */
export async function requireUserPanel() {
  if ((await currentUserIsAdmin()) && !getViewAsId()) throw redirect({ to: "/admin" });
}
