import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/faq")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Help and FAQ \u2014 SoundCampaign"},
      {"name": "description", "content": "Find answers to common SoundCampaign account and promotion questions."},
      {"property": "og:title", "content": "Help and FAQ \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Find answers to common SoundCampaign account and promotion questions."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  { q: "What is SoundCampaign?", a: "SoundCampaign is a music promotion platform that helps artists get their tracks placed on curated playlists across Spotify, Apple Music, YouTube Music, SoundCloud, Tidal and Deezer." },
  { q: "How do daily tasks work?", a: "Every day your tier unlocks a set number of promotion tasks. Each task lets you rate and submit a track from our warehouse; approved tasks credit commission to your balance." },
  { q: "How do I upgrade my tier?", a: "Open Activities → Membership Level Chart and tap Upgrade on the tier you want. Deposits activate the new task quota and commission rate immediately." },
  { q: "When can I withdraw?", a: "Withdrawals can be requested from the Wallet page during platform operating hours (10:00 – 22:59). Admin review typically completes within one business day." },
  { q: "What are the operating hours?", a: "Tasks and withdrawals are available daily from 10:00 to 22:59 local time. Outside those hours the START button will be disabled." },
  { q: "How do I contact support?", a: "Tap Services on the dashboard to open Live Chat, WhatsApp or Telegram — an admin will respond as soon as possible." },
  { q: "Is my music safe?", a: "Yes. You retain full ownership of your tracks. SoundCampaign only uses uploaded material for the promotion campaign you request." },
  { q: "Do you guarantee streams?", a: "We guarantee delivery of the promotion tasks in your tier. Stream lift depends on the track, market and campaign duration — historical averages are shown on the About page." },
];

function FaqPage() {
  const { data: me } = useMe();
  return (
    <AppShell title="FAQ" isAdmin={me?.isAdmin}>
      <h1 className="text-2xl md:text-3xl font-black">Frequently Asked Questions</h1>
      <p className="text-sm text-muted-foreground">Can't find your answer? Tap Services on the dashboard to talk to an admin.</p>
      <div className="mt-5 bg-card border border-border rounded-xl p-2 md:p-4">
        <Accordion type="single" collapsible>
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`i-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppShell>
  );
}