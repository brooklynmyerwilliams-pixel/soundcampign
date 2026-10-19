/** Public, versioned cover URL; crawlers cannot resolve bundled relative URLs. */
export const SOUND_CAMPAIGN_SHARE_IMAGE = "https://soundscampaign.com/soundcampaign-music-promotion.jpg";

export const soundCampaignImageMeta = [
  { property: "og:image", content: SOUND_CAMPAIGN_SHARE_IMAGE },
  { property: "og:image:secure_url", content: SOUND_CAMPAIGN_SHARE_IMAGE },
  { property: "og:image:type", content: "image/jpeg" },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: "SoundCampaign Music Promotion — headphones, microphone and SoundCampaign logo" },
  { name: "twitter:image", content: SOUND_CAMPAIGN_SHARE_IMAGE },
  { name: "twitter:image:alt", content: "SoundCampaign Music Promotion" },
];
