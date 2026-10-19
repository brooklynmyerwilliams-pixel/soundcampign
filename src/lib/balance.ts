import { supabase } from "@/integrations/supabase/client";

/** Adjust a user's balance by `delta` (can be negative → balance may go negative). */
export async function adjustBalance(userId: string, delta: number, earnedDelta = 0) {
  const { data: p } = await supabase
    .from("profiles")
    .select("balance,total_earned")
    .eq("id", userId)
    .maybeSingle();
  const current = Number(p?.balance ?? 0);
  const earned = Number(p?.total_earned ?? 0);
  const next = Number((current + delta).toFixed(2));
  const nextEarned = Number((earned + earnedDelta).toFixed(2));
  const { error } = await supabase
    .from("profiles")
    .update({ balance: next, total_earned: nextEarned })
    .eq("id", userId);
  return { error, balance: next };
}

/**
 * Pending promotions only exist while the balance is negative. As soon as the
 * negative is cleared, every submitted-but-pending promotion becomes approved.
 */
export async function reconcilePendingPromotions(userId: string, balance: number) {
  if (balance < 0) return false;
  const { data } = await supabase
    .from("mock_transactions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("kind", "promotion")
    .eq("status", "pending")
    .select("id");
  return (data?.length ?? 0) > 0;
}

/** On-hold value of a pending row: cost + profit when the note records them, else its amount. */
export function holdValue(tx: { amount: number | string; note?: string | null; kind?: string | null }) {
  const note = tx.note ?? "";
  const c = note.match(/c:(\d+(?:\.\d+)?)/);
  const p = note.match(/p:(\d+(?:\.\d+)?)/);
  if (c && p) return Number((Number(c[1]) + Number(p[1])).toFixed(2));
  return Number(tx.amount);
}
