import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CheckinMilestone = { day: number; label: string; amount: number };

export type LevelConfig = {
  name: string;
  deposit: string;
  tasks: string;
  commission: string;
  perks: string[];
};

export type EventsConfig = {
  pageTitle: string;
  pageSubtitle: string;
  rewardTitle: string;
  rewardEmptyText: string;
  checkinEnabled: boolean;
  checkinTitle: string;
  checkinFooter: string;
  checkins: CheckinMilestone[];
  spinEnabled: boolean;
  spinTitle: string;
  spinPrizes: number[];
  magicBoxEnabled: boolean;
  magicBoxTitle: string;
  magicBoxMin: number;
  magicBoxMax: number;
  levelsEnabled: boolean;
  levelsTitle: string;
  levels: LevelConfig[];
};

const perks = (name: string, commission: string, tasks: string) => [
  `${name.charAt(0) + name.slice(1).toLowerCase()} users get general usage access to data collection`,
  "Applicable to light-to-medium usage involving the Products",
  `Profits of ${commission} per Product — ${tasks.replace("/day", "")} products per set`,
  "No access to other premium features",
];

export const DEFAULT_LEVELS: LevelConfig[] = [
  { name: "NORMAL", deposit: "$99", tasks: "30/day", commission: "0.50%", perks: perks("NORMAL", "0.50%", "30/day") },
  { name: "SILVER", deposit: "$399", tasks: "35/day", commission: "0.75%", perks: perks("SILVER", "0.75%", "35/day") },
  { name: "GOLD", deposit: "$999", tasks: "40/day", commission: "1.00%", perks: perks("GOLD", "1.00%", "40/day") },
  { name: "PLATINUM", deposit: "$3,999", tasks: "45/day", commission: "1.25%", perks: perks("PLATINUM", "1.25%", "45/day") },
  { name: "DIAMOND", deposit: "$7,999", tasks: "50/day", commission: "1.50%", perks: perks("DIAMOND", "1.50%", "50/day") },
];

export const DEFAULT_EVENTS: EventsConfig = {
  pageTitle: "Activities & Rewards",
  pageSubtitle: "Elevate • Earn • Excel — higher levels, greater returns.",
  rewardTitle: "REWARD EVENT",
  rewardEmptyText:
    "Spin & Win and Salary Earning rewards unlock when support enables an event for your account.",
  checkinEnabled: true,
  checkinTitle: "SALARY EARNING",
  checkinFooter: "ELEVATE • EARN • EXCEL",
  checkins: [
    { day: 5, label: "Five working days", amount: 800 },
    { day: 15, label: "Fifteen working days", amount: 1500 },
    { day: 30, label: "Thirty working days", amount: 3800 },
  ],
  spinEnabled: true,
  spinTitle: "Spin & Win",
  spinPrizes: [1, 5, 10, 20, 50, 100],
  magicBoxEnabled: false,
  magicBoxTitle: "Magic Box",
  magicBoxMin: 1,
  magicBoxMax: 50,
  levelsEnabled: true,
  levelsTitle: "Membership Level Chart",
  levels: DEFAULT_LEVELS,
};

export const EVENTS_KEY = "events_config";

export async function fetchEventsConfig(): Promise<EventsConfig> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", EVENTS_KEY)
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<EventsConfig>;
  return { ...DEFAULT_EVENTS, ...value };
}

export function useEventsConfig() {
  return useQuery({ queryKey: ["events-config"], queryFn: fetchEventsConfig });
}

export async function saveEventsConfig(value: EventsConfig) {
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key: EVENTS_KEY, value: value as any, updated_at: new Date().toISOString() });
  if (error) throw error;
}
