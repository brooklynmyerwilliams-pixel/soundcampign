import { test, expect } from "vitest";
import { makeSongs, WAREHOUSE_TIERS, WAREHOUSE_GROUPS } from "@/lib/warehouse";
test("groups distinct", () => {
  const sets: string[] = [];
  for (const t of WAREHOUSE_TIERS) for (const g of WAREHOUSE_GROUPS) {
    const a = makeSongs(t.key, g.day, g.group, t.perSub).map(s=>s.name);
    expect(new Set(a).size).toBe(a.length);
    expect(makeSongs(t.key,1,"A",t.perSub,g.seed).map(s=>s.name.replace(/ \(G\d+\)$/,""))).toEqual(a);
    sets.push(a.join("|"));
    if (t.key==="basic" && g.seed===1) console.log("overlap A/B", a.filter(x=>makeSongs(t.key,1,"A",30).map(s=>s.name).includes(x)).length);
  }
  expect(new Set(sets).size).toBe(50);
});
