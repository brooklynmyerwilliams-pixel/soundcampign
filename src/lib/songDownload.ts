import JSZip from "jszip";
import type { Song } from "./warehouse";

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80).trim() || "song";
const ext = (url: string, type: string, fallback: string) => {
  const m = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1];
  const t = type.split("/")[1];
  return t ? t.split(";")[0] : fallback;
};
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Bundle songs (titles CSV + photos + audio files) into a ZIP and trigger download. */
export async function downloadSongsZip(songs: Song[], label: string) {
  const zip = new JSZip();
  const photos = zip.folder("photos")!;
  const audio = zip.folder("audio")!;
  const cache = new Map<string, Blob | null>();
  const grab = async (url: string) => {
    if (!url) return null;
    if (cache.has(url)) return cache.get(url)!;
    try {
      const r = await fetch(url);
      const b = r.ok ? await r.blob() : null;
      cache.set(url, b);
      return b;
    } catch {
      cache.set(url, null);
      return null;
    }
  };

  const rows = [["#", "Title", "Photo file", "Audio file", "Photo URL", "Audio URL"].map(csvCell).join(",")];
  let failed = 0;
  await Promise.all(
    songs.map(async (s, i) => {
      const base = `${String(i + 1).padStart(3, "0")} - ${safe(s.name)}`;
      const [p, a] = await Promise.all([grab(s.poster), grab(s.audio)]);
      let pf = "", af = "";
      if (p) { pf = `${base}.${ext(s.poster, p.type, "jpg")}`; photos.file(pf, p); } else if (s.poster) failed++;
      if (a) { af = `${base}.${ext(s.audio, a.type, "mp3")}`; audio.file(af, a); } else if (s.audio) failed++;
      rows[i + 1] = [i + 1, s.name, pf && `photos/${pf}`, af && `audio/${af}`, s.poster, s.audio].map(csvCell).join(",");
    }),
  );
  zip.file("titles.csv", rows.join("\n"));
  zip.file("titles.txt", songs.map((s) => s.name).join("\n"));

  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe(label)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return { failed };
}
