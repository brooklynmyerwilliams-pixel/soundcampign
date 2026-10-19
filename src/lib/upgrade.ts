import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LEVEL_FOR_TIER_INDEX, WAREHOUSE_TIERS } from "@/lib/warehouse";

export const UPGRADE_KIND = "upgrade";

/** note format: "Upgrade to GOLD · tier:2 · level:3" */
export function upgradeNote(tierIndex: number) {
  const t = WAREHOUSE_TIERS[tierIndex];
  return `Upgrade to ${t.label} · tier:${tierIndex} · level:${LEVEL_FOR_TIER_INDEX[tierIndex]}`;
}

export function parseUpgradeNote(note: string | null) {
  const tier = Number(/tier:(\d+)/.exec(note || "")?.[1] ?? NaN);
  const level = Number(/level:(\d+)/.exec(note || "")?.[1] ?? NaN);
  return {
    tierIndex: isFinite(tier) ? tier : null,
    level: isFinite(level) ? level : null,
  };
}

/** Create a pending upgrade request an admin must approve. */
export async function requestUpgrade(userId: string, tierIndex: number) {
  const t = WAREHOUSE_TIERS[tierIndex];
  const { error } = await supabase.from("mock_transactions").insert({
    user_id: userId,
    kind: UPGRADE_KIND,
    amount: t.minBalance,
    status: "pending",
    note: upgradeNote(tierIndex),
  });
  if (error) throw error;
}

/** The user's pending upgrade request, if any. */
export function usePendingUpgrade(userId: string | undefined) {
  return useQuery({
    queryKey: ["pending-upgrade", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mock_transactions")
        .select("id, note, amount, created_at")
        .eq("user_id", userId!)
        .eq("kind", UPGRADE_KIND)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });
}
