import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { translateTexts } from "@/lib/translate.functions";

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT", "SVG"]);
const CACHE_PREFIX = "sc_tr_";
const originals = new WeakMap<Text, string>();
const applied = new WeakMap<Text, string>();
const placeholderOrig = new WeakMap<Element, string>();

function loadCache(lang: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + lang) || "{}"); } catch { return {}; }
}
function saveCache(lang: string, c: Record<string, string>) {
  try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(c)); } catch { /* full */ }
}
function skippable(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName.toUpperCase()) || e.getAttribute("translate") === "no" || e.hasAttribute("data-no-translate")) return true;
  }
  return false;
}
function needs(s: string) { return /\p{L}{2,}/u.test(s); }

function collect(): { nodes: Text[]; inputs: Element[] } {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (!needs(t.nodeValue || "") || skippable(t.parentElement)) continue;
    nodes.push(t);
  }
  const inputs = Array.from(document.querySelectorAll("[placeholder]")).filter((e) => !skippable(e.parentElement));
  return { nodes, inputs };
}

export function AutoTranslate() {
  const { lang } = useI18n();

  useEffect(() => {
    let cancelled = false;
    const cache = lang === "en" ? {} : loadCache(lang);
    const inflight = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const origOf = (t: Text) => {
      const cur = t.nodeValue || "";
      if (applied.get(t) !== cur) originals.set(t, cur); // app changed it
      return originals.get(t) ?? cur;
    };
    const setText = (t: Text, v: string) => {
      if (t.nodeValue !== v) t.nodeValue = v;
      applied.set(t, v);
    };
    const translateKey = (orig: string) => {
      const core = orig.trim();
      const tr = cache[core];
      return tr ? orig.replace(core, tr) : undefined;
    };

    const run = async () => {
      if (cancelled) return;
      const { nodes, inputs } = collect();
      if (lang === "en") {
        nodes.forEach((t) => { const o = originals.get(t); if (o !== undefined && applied.get(t) === t.nodeValue) setText(t, o); });
        inputs.forEach((e) => { const o = placeholderOrig.get(e); if (o) e.setAttribute("placeholder", o); });
        return;
      }
      const missing = new Set<string>();
      for (const t of nodes) {
        const o = origOf(t);
        const v = translateKey(o);
        if (v) setText(t, v); else missing.add(o.trim());
      }
      for (const e of inputs) {
        if (!placeholderOrig.has(e)) placeholderOrig.set(e, e.getAttribute("placeholder") || "");
        const o = placeholderOrig.get(e)!;
        if (!needs(o)) continue;
        if (cache[o]) e.setAttribute("placeholder", cache[o]); else missing.add(o);
      }
      const todo = [...missing].filter((s) => s && !inflight.has(s));
      const batches: string[][] = [];
      for (let i = 0; i < todo.length; i += 25) batches.push(todo.slice(i, i + 25));
      await Promise.all(batches.map(async (batch) => {
        batch.forEach((s) => inflight.add(s));
        try {
          const out = await translateTexts({ data: { lang, texts: batch } });
          batch.forEach((s, j) => { cache[s] = out[j]; });
          saveCache(lang, cache);
          if (!cancelled) schedule(0);
        } catch { /* keep original text */ }
      }));
      if (cancelled) return;
      if (todo.length) schedule(0);
    };
    const schedule = (ms = 150) => { if (timer) return; timer = setTimeout(() => { timer = undefined; void run(); }, ms); };

    const observer = new MutationObserver((muts) => {
      if (muts.some((m) => m.type !== "characterData" || applied.get(m.target as Text) !== m.target.nodeValue)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    schedule(0);
    return () => { cancelled = true; clearTimeout(timer); observer.disconnect(); };
  }, [lang]);

  return null;
}
