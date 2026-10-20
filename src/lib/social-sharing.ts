/** Branded 1200x630 share card served from /public; crawlers need an absolute URL. */
export const SHARE_IMAGE_PATH = "/og-soundcampaign.jpg";

/** Only trust proxy-provided hosts in the sandbox; published URLs use the request origin. */
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return sandboxHost ? `https://${sandboxHost}` : url.origin;
}

export function shareImageMeta(origin: string | undefined) {
  if (!origin) return [];
  const url = `${origin}${SHARE_IMAGE_PATH}`;
  return [
    { property: "og:image", content: url },
    ...(url.startsWith("https://") ? [{ property: "og:image:secure_url", content: url }] : []),
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "SoundCampaign logo — Music promotion with proven results" },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: "SoundCampaign — Music promotion with proven results" },
  ];
}
