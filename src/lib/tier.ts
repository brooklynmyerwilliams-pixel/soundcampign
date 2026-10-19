import { WAREHOUSE_TIERS, tierIndexForLevel } from "@/lib/warehouse";

/**
 * Returns the user's tier from their stored level. Balance never upgrades a user
 * automatically — upgrades require an admin-approved request or an admin change.
 */
export function useStickyTier(
  _userId: string | undefined,
  _balance: number | null | undefined,
  level: number | null | undefined,
  _locked?: boolean | null,
) {
  return WAREHOUSE_TIERS[tierIndexForLevel(level)];
}
