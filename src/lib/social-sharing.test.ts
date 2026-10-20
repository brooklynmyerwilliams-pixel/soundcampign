import { describe, expect, it } from "vitest";
import { requestOrigin, shareImageMeta } from "./social-sharing";

describe("SoundCampaign preview URLs", () => {
  it("uses the SoundCampaign JPEG on the domain serving the page", () => {
    const origin = requestOrigin(new Request("https://soundcampaign.online/dashboard"));
    const images = shareImageMeta(origin);
    expect(images.find((tag) => "property" in tag && tag.property === "og:image")?.content)
      .toBe("https://soundcampaign.online/og-soundcampaign.jpg");
    expect(images.find((tag) => "name" in tag && tag.name === "twitter:image")?.content)
      .toBe("https://soundcampaign.online/og-soundcampaign.jpg");
  });

  it("uses the published origin rather than untrusted forwarded hosts", () => {
    const request = new Request("https://www.soundcampaign.online/auth", {
      headers: { "x-forwarded-host": "untrusted.example" },
    });
    expect(requestOrigin(request)).toBe("https://www.soundcampaign.online");
  });

  it("resolves the sandbox preview origin without hardcoding a project domain", () => {
    const request = new Request("http://localhost:8080/auth", {
      headers: { "x-forwarded-host": "preview.soundcampaign.online" },
    });
    expect(requestOrigin(request)).toBe("https://preview.soundcampaign.online");
  });
});