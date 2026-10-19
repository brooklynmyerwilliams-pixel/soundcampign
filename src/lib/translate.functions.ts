import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LANG_NAMES: Record<string, string> = {
  fr: "French", es: "Spanish", ar: "Arabic", nl: "Dutch", zh: "Simplified Chinese",
  ru: "Russian", ja: "Japanese", ko: "Korean", hi: "Hindi", th: "Thai", vi: "Vietnamese",
};

export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      lang: z.enum(Object.keys(LANG_NAMES) as [string, ...string[]]),
      texts: z.array(z.string().max(2000)).min(1).max(80),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Translation unavailable");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: `Translate each website UI string in the given JSON array into ${LANG_NAMES[data.lang]}. Keep brand names (SoundCampaign, Spotify, SoundCloud, Apple Music, YouTube, TikTok, Deezer, Tidal), song titles, artist names, numbers, currency amounts, emails and URLs unchanged. Return the translations in field "t" with the same number of items in the same order.`,
        input: JSON.stringify(data.texts),
        text: {
          format: {
            type: "json_schema",
            name: "translations",
            strict: true,
            schema: {
              type: "object",
              properties: { t: { type: "array", items: { type: "string" } } },
              required: ["t"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Translation failed (${res.status})`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch { /* ignore partial */ }
      }
    }
    let parsed: { t?: unknown } = {};
    try { parsed = JSON.parse(text); } catch { return data.texts; }
    const out: unknown = parsed.t;
    if (!Array.isArray(out) || out.length !== data.texts.length) return data.texts;
    return out.map((v, i) => (typeof v === "string" && v ? v : data.texts[i]));
  });
