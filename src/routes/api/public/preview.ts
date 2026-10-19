import { createFileRoute } from "@tanstack/react-router";

// Resolves "title + artist" to the artist's real 30s preview clip (Deezer catalog) and redirects to it.
// Public, read-only: returns nothing private.
export const Route = createFileRoute("/api/public/preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const t = (url.searchParams.get("t") ?? "").slice(0, 120);
        const a = (url.searchParams.get("a") ?? "").slice(0, 120);
        if (!t) return new Response("missing title", { status: 400 });
        const norm = (s: string) =>
          s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ");
        const queries = [`artist:"${a}" track:"${t}"`, `${t} ${a}`, t.replace(/\s*\(.*\)/, "").split(":")[0]];
        for (const q of queries) {
          const r = await fetch(`https://api.deezer.com/search?limit=10&q=${encodeURIComponent(q)}`);
          if (!r.ok) continue;
          const j: any = await r.json();
          const list: any[] = (j?.data ?? []).filter((x: any) => x?.preview);
          const words = norm(a).split(" ").filter((w) => w.length > 2);
          const hit =
            list.find((x) => words.some((w) => norm(x.artist?.name ?? "").includes(w))) ?? list[0];
          if (hit) {
            return new Response(null, {
              status: 302,
              headers: { Location: hit.preview, "Cache-Control": "public, max-age=600" },
            });
          }
        }
        return new Response("not found", { status: 404 });
      },
    },
  },
});
