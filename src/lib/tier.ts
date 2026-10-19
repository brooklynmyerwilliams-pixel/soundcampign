import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LEVEL_FOR_TIER_INDEX,
  WAREHOUSE_TIERS,
  stickyTierIndex,
  tierIndexForBalance,
  tierIndexForLevel,
} from "@/lib/warehouse";

/**
 * Returns the user's effective tier. Tiers upgrade when the balance qualifies
 * (persisted to profiles.vip_level) and never downgrade afterwards.
 */
export function useStickyTier(
  userId: string | undefined,
  balance: number | null | undefined,
  level: number | null | undefined,
  locked?: boolean | null,
) {
  const qc = useQueryClient();
  const index = locked ? tierIndexForLevel(level) : stickyTierIndex(balance, level);

  useEffect(() => {
    if (!userId || locked) return;
    const fromBalance = tierIndexForBalance(balance);
    if (fromBalance <= tierIndexForLevel(level)) return; // no upgrade needed
    const nextLevel = Math.max(Number(level ?? 0), LEVEL_FOR_TIER_INDEX[fromBalance]);
    (async () => {
      await supabase.from("profiles").update({ vip_level: nextLevel }).eq("id", userId);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    })();
  }, [userId, balance, level, locked, qc]);

  return WAREHOUSE_TIERS[index];
}
