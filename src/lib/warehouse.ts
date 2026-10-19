export type Song = {
  id: string;
  name: string;
  poster: string;
  audio: string;
  description: string;
  amount: number;
  commission: number;
  exclusive?: boolean;
  exclusiveId?: string;
};


export const WAREHOUSE_TIERS = [
  { key: "basic",     label: "Normal",   perSub: 30, minBalance: 50,   commission: 0.5 },
  { key: "advance",   label: "Silver",   perSub: 35, minBalance: 399,  commission: 1 },
  { key: "pro",       label: "Gold",     perSub: 40, minBalance: 999,  commission: 1.5 },
  { key: "elite",     label: "Platinum", perSub: 45, minBalance: 3999, commission: 2 },
  { key: "unlimited", label: "Diamond",  perSub: 50, minBalance: 7999, commission: 2.5 },
] as const;

/** Commission rate (%) for a tier key; exclusive tasks override this per-song. */
export function commissionForTierKey(tierKey: string): number {
  return WAREHOUSE_TIERS.find((t) => t.key === tierKey)?.commission ?? 0.5;
}

/** Song price range (USD) per membership tier. */
export const TIER_PRICE_RANGES: Record<string, [number, number]> = {
  basic: [10, 50],
  advance: [51, 399],
  pro: [400, 999],
  elite: [1000, 3999],
  unlimited: [4000, 7999],
};

/** Deterministic price within the tier's range. */
export function priceForTier(tierKey: string, seed: number): number {
  const [min, max] = TIER_PRICE_RANGES[tierKey] ?? TIER_PRICE_RANGES.basic;
  const span = max - min + 1;
  return min + (Math.abs(Math.floor(seed)) % span);
}

// Tier is driven by the user's available balance
export function tierIndexForBalance(balance: number | null | undefined): number {
  const b = Number(balance ?? 0);
  if (b >= 7999) return 4;
  if (b >= 3999) return 3;
  if (b >= 999) return 2;
  if (b >= 399) return 1;
  return 0;
}

export function tierForBalance(balance: number | null | undefined): typeof WAREHOUSE_TIERS[number] {
  return WAREHOUSE_TIERS[tierIndexForBalance(balance)];
}

// vip_level (0-7) <-> tier index mapping. Levels are the persisted, never-downgraded rank.
export const LEVEL_FOR_TIER_INDEX = [0, 2, 3, 5, 7];

export function tierIndexForLevel(level: number | null | undefined): number {
  const l = Number(level ?? 0);
  if (l >= 7) return 4;
  if (l >= 5) return 3;
  if (l >= 3) return 2;
  if (l >= 2) return 1;
  return 0;
}

/** Effective tier never downgrades: it's the best of earned level and current balance. */
export function stickyTierIndex(balance: number | null | undefined, level: number | null | undefined) {
  return Math.max(tierIndexForBalance(balance), tierIndexForLevel(level));
}

export function stickyTier(balance: number | null | undefined, level: number | null | undefined) {
  return WAREHOUSE_TIERS[stickyTierIndex(balance, level)];
}

/** A user can promote only when their balance covers their own tier's requirement. */
export function canPromote(balance: number | null | undefined, level?: number | null) {
  const tier = stickyTier(balance, level);
  return Number(balance ?? 0) >= tier.minBalance;
}


export const POSTERS = [
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400",
  "https://images.unsplash.com/photo-1501612780327-45045538702b?w=400",
  "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400",
  "https://images.unsplash.com/photo-1520166012956-add9ba0835cb?w=400",
  "https://images.unsplash.com/photo-1445375011782-2384686778a0?w=400",
];
import { MUSICIANS, REAL_SONGS } from "./musicians";
import { SONG_PREVIEWS } from "./songPreviews";
export const ARTISTS = MUSICIANS;
const _OLD_ARTISTS = [
  "Nova Rains", "Echo Vale", "Kairo Sky", "Lumen West", "Sable Moon",
  "Rio Vega", "Astra Belle", "Odessa Grey", "Milo Frost", "Juno Lark",
];
export const WORDS = ["Midnight", "Golden", "Neon", "Silver", "Velvet", "Wildfire", "Paper", "Ocean", "Diamond", "Sunset", "Electric", "Crimson"];
export const AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
/** Real clip for a title: bundled iTunes preview, else live catalog lookup. */
export function realAudio(title: string, artist: string): string {
  return SONG_PREVIEWS[`${title} — ${artist}`]?.audio
    ?? `/api/public/preview?t=${encodeURIComponent(title)}&a=${encodeURIComponent(artist)}`;
}

/** Deterministic shuffle of the catalog so neighbouring groups never start alike. */
const SHUFFLED_SONGS = (() => {
  const arr = REAL_SONGS.map((_, i) => i);
  let x = 2463534242;
  for (let i = arr.length - 1; i > 0; i--) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    const j = (x >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.map((i) => REAL_SONGS[i]);
})();

/** Unique slot for every level + group (10 groups per level, then premium). */
export function warehouseSlot(tierKey: string, day: number, group: string, groupSeed = 0): number {
  const tierIdx = Math.max(0, WAREHOUSE_TIERS.findIndex((t) => t.key === tierKey));
  const groupIdx = groupSeed || ((Math.max(1, day) - 1) * 2 + (group === "B" ? 1 : 0));
  return tierIdx * WAREHOUSE_GROUPS_PER_TIER + (groupIdx % WAREHOUSE_GROUPS_PER_TIER);
}
const WAREHOUSE_GROUPS_PER_TIER = 10;
/** Step between slot start points; coprime with the catalog size so starts never repeat. */
const SLOT_STEP = 53;

/** Songs for one level + group: a consecutive, duplicate-free window unique to that slot. */
export function makeSongs(tierKey: string, day: number, group: string, count: number, groupSeed = 0): Song[] {
  const commission = commissionForTierKey(tierKey);
  const slot = warehouseSlot(tierKey, day, group, groupSeed);
  const n = SHUFFLED_SONGS.length;
  const start = (slot * SLOT_STEP) % n;
  return Array.from({ length: Math.min(count, n) }, (_, i) => {
    const seed = slot * 1000 + i;
    const real = SHUFFLED_SONGS[(start + i) % n];
    const title = real.title;
    const artist = real.artist;
    const preview = SONG_PREVIEWS[`${title} — ${artist}`];
    return {
      id: `${tierKey}-${day}-${group}-${groupSeed}-${i}`,
      name: `${title} — ${artist}${groupSeed ? ` (G${groupSeed})` : ""}`,
      poster: preview?.poster ?? POSTERS[seed % POSTERS.length],
      audio: realAudio(title, artist),
      description: "Promotable track curated for the SoundCampaign catalog.",
      amount: priceForTier(tierKey, seed * 7919 + i * 104729),
      commission,
    };
  });
}


/** Five premium songs per tier — exclusive tracks priced at the top of the tier range. */
export function premiumSongs(tierKey: string): Song[] {
  const [min, max] = TIER_PRICE_RANGES[tierKey] ?? TIER_PRICE_RANGES.basic;
  const commission = commissionForTierKey(tierKey) + 1; // premium pays +1% over the tier rate
  return Array.from({ length: 5 }, (_, i) => {
    const seed = (i + 1) * 97 + tierKey.length * 13;
    const tierIdx = Math.max(0, WAREHOUSE_TIERS.findIndex((t) => t.key === tierKey));
    const real = SHUFFLED_SONGS[(SHUFFLED_SONGS.length - 1 - tierIdx * 5 - i + SHUFFLED_SONGS.length) % SHUFFLED_SONGS.length];
    const preview = SONG_PREVIEWS[`${real.title} — ${real.artist}`];
    // prices sit in the top fifth of the tier range
    const span = Math.max(1, Math.floor((max - min + 1) / 5));
    const amount = max - span + 1 + (seed % span);
    return {
      id: `${tierKey}-premium-${i}`,
      name: `${real.title} — ${real.artist} (Premium)`,
      poster: preview?.poster ?? POSTERS[(seed + 3) % POSTERS.length],
      audio: realAudio(real.title, real.artist),
      description: "Premium exclusive track with elevated commission.",
      amount,
      commission,
      exclusive: true,
    };
  });
}

// Map a user's VIP level (0-7) to a warehouse tier
export function tierForLevel(level: number | null | undefined): typeof WAREHOUSE_TIERS[number] {
  const l = Number(level ?? 0);
  if (l >= 7) return WAREHOUSE_TIERS[4]; // unlimited
  if (l >= 5) return WAREHOUSE_TIERS[3]; // elite
  if (l >= 3) return WAREHOUSE_TIERS[2]; // pro
  if (l >= 2) return WAREHOUSE_TIERS[1]; // advance
  return WAREHOUSE_TIERS[0]; // basic
}

export function pickSongForUser(level: number | null | undefined, index: number): Song {
  const tier = tierForLevel(level);
  const day = (index % 5) + 1;
  const group = index % 2 === 0 ? "A" : "B";
  const songs = makeSongs(tier.key, day, group, tier.perSub);
  return songs[index % songs.length];
}
/**
 * Tier that respects an admin override. When `locked` is true the persisted
 * vip_level wins outright (so admins can downgrade); otherwise it never downgrades.
 */
export function effectiveTier(
  balance: number | null | undefined,
  level: number | null | undefined,
  locked?: boolean | null,
) {
  return locked ? WAREHOUSE_TIERS[tierIndexForLevel(level)] : stickyTier(balance, level);
}

/** Warehouse groups an admin can assign: Day 1 Group A/B → Day 5 Group A/B. */
export const WAREHOUSE_GROUPS = Array.from({ length: 10 }, (_, i) => ({
  seed: i,
  day: Math.floor(i / 2) + 1,
  group: i % 2 === 0 ? "A" : "B",
  label: `Day ${Math.floor(i / 2) + 1} · Group ${i % 2 === 0 ? "A" : "B"}`,
}));

export function groupLabelForSeed(seed: number | null | undefined) {
  const g = WAREHOUSE_GROUPS.find((x) => x.seed === Number(seed ?? 0));
  return g ? g.label : `Group G${seed ?? 0}`;
}

/** Promotion notes carry `g:<seed>` so used groups can never be reassigned. */
export function groupSeedFromNote(note: string | null | undefined): number | null {
  const m = /(?:^|·)\s*g:(\d+)/.exec(note ?? "");
  return m ? Number(m[1]) : null;
}

/**
 * Cost / profit for a promotion transaction.
 * New rows carry `c:<cost>` and `p:<profit>` in the note so records always match
 * exactly what the submit dialog showed. Legacy rows fall back to the 1.5% rule.
 */
export function promoAmounts(
  note: string | null | undefined,
  amount: number | string | null | undefined,
  status?: string | null,
) {
  const c = /(?:^|·)\s*c:([\d.]+)/.exec(note ?? "");
  const p = /(?:^|·)\s*p:([\d.]+)/.exec(note ?? "");
  if (c && p) {
    const cost = Number(c[1]);
    const profit = Number(p[1]);
    return { cost, profit, total: Number((cost + profit).toFixed(2)) };
  }
  const commission = 1.5;
  const amt = Number(amount ?? 0);
  const cost = status === "pending" ? amt : amt / (commission / 100);
  const profit = status === "pending" ? Number((amt * commission / 100).toFixed(2)) : amt;
  return { cost, profit, total: Number((cost + profit).toFixed(2)) };
}
