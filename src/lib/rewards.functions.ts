import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Claim the reward event (spin or daily check-in) the admin enabled for the caller.
 * Credits the prize to the user's balance and disables the event until an admin sets a new one.
 */
export const claimReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reward, error } = await supabaseAdmin
      .from("user_rewards")
      .select("id, kind, amount, status")
      .eq("user_id", context.userId)
      .eq("status", "available")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reward) throw new Error("No reward event is available for your account right now.");

    const amount = Number(reward.amount) || 0;

    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("user_rewards")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("id", reward.id)
      .eq("status", "available")
      .select("id")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) throw new Error("This reward has already been claimed.");

    if (amount > 0) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("balance, total_earned").eq("id", context.userId).maybeSingle();
      await supabaseAdmin.from("profiles").update({
        balance: Number((Number(prof?.balance ?? 0) + amount).toFixed(2)),
        total_earned: Number((Number(prof?.total_earned ?? 0) + amount).toFixed(2)),
      }).eq("id", context.userId);

      await supabaseAdmin.from("mock_transactions").insert({
        user_id: context.userId,
        kind: "reward",
        amount,
        status: "approved",
        note: reward.kind === "spin" ? "Spin & Win prize" : "Daily check-in reward",
        reviewed_at: new Date().toISOString(),
      });
    }

    return { ok: true, kind: reward.kind as "spin" | "checkin", amount };
  });
