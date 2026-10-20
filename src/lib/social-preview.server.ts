import { requestOrigin, shareImageMeta } from "./social-sharing";

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Give client-only pages a public, branded preview without rendering any account data. */
export async function ensureBrandedPreview(response: Response, request: Request): Promise<Response> {
  if (request.method !== "GET" || !response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }

  const html = await response.clone().text();
  const endOfHead = html.search(/<\/head\s*>/i);
  if (endOfHead < 0) return response;
  const head = html.slice(0, endOfHead);
  const hasImage = /<meta\b[^>]*\bproperty\s*=\s*["']og:image["']/i.test(head);
  const hasTwitterImage = /<meta\b[^>]*\bname\s*=\s*["']twitter:image["']/i.test(head);
  if (hasImage && hasTwitterImage) return response;

  // Keep page-specific share images intact. The fallback is only for pages with no image.
  const tags = shareImageMeta(requestOrigin(request)).filter((tag) => {
    if ("property" in tag) return !hasImage;
    return !hasTwitterImage;
  }).map((tag) => {
    const attribute = "property" in tag ? `property="${tag.property}"` : `name="${tag.name}"`;
    return `<meta ${attribute} content="${escapeAttribute(tag.content)}"/>`;
  }).join("");

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(`${html.slice(0, endOfHead)}${tags}${html.slice(endOfHead)}`, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}