import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RewardKind = "spin" | "checkin";

export type UserReward = {
  id: string;
  user_id: string;
  kind: RewardKind;
  amount: number;
  status: "available" | "claimed";
  note: string | null;
  claimed_at: string | null;
  created_at: string;
};

/** The reward event an admin has enabled for this user (if any). */
export function useAvailableReward(userId?: string) {
  return useQuery({
    queryKey: ["reward", userId],
    enabled: !!userId,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_rewards")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "available")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data as UserReward | null) ?? null;
    },
  });
}

/** Claim history for the user. */
export function useRewardHistory(userId?: string) {
  return useQuery({
    queryKey: ["reward-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_rewards")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(10);
      return (data ?? []) as UserReward[];
    },
  });
}
