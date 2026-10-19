import { useCallback, useEffect, useState } from "react";

const KEY = "gotrends-admin-seen";

type SeenMap = Record<string, true>;

function read(): SeenMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as SeenMap; } catch { return {}; }
}

const listeners = new Set<(m: SeenMap) => void>();
let cache: SeenMap | null = null;

function get(): SeenMap {
  if (cache === null) cache = read();
  return cache;
}

export function markSeen(id: string) {
  const next = { ...get(), [id]: true as const };
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l(next));
}

/** Tracks which overview items (messages, transactions, upgrades) the admin has already opened. */
export function useSeen() {
  const [map, setMap] = useState<SeenMap>({});

  useEffect(() => {
    setMap(get());
    const l = (m: SeenMap) => setMap(m);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const isSeen = useCallback((id: string) => !!map[id], [map]);
  return { isSeen, markSeen };
}
