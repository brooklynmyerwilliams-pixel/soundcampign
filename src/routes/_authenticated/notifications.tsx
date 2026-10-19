import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { Bell, Megaphone, Trash2, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      {"title": "Notifications \u2014 SoundCampaign"},
      {"name": "description", "content": "Review your SoundCampaign account notifications and announcements."},
      {"property": "og:title", "content": "Notifications \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Review your SoundCampaign account notifications and announcements."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: NotificationsPage,
});

type N = { id: string; title: string; body: string; date: string; unread: boolean; tone: "alert" | "info" };

const SEED: N[] = [
  { id: "1", title: "Deposit Received", body: "$25.00 has been deposited to your wallet.", date: "2026-06-16", unread: true, tone: "alert" },
  { id: "2", title: "Deposit Received", body: "$25.00 has been deposited to your wallet.", date: "2026-06-16", unread: true, tone: "alert" },
  { id: "3", title: "Negative Balance Cleared", body: "$25.00 has been applied to clear your negative balance, and $25.00 moved to on-hold balance.", date: "2026-06-16", unread: true, tone: "alert" },
  { id: "4", title: "Priority Review", body: "🎉 New feature: Diamond members now get priority review!", date: "2026-03-27", unread: true, tone: "info" },
  { id: "5", title: "Maintenance", body: "📢 System maintenance scheduled for April 2nd, 2026.", date: "2026-03-27", unread: true, tone: "info" },
  { id: "6", title: "Fast Approvals", body: "🚀 Submit your tracks early to get faster approvals!", date: "2026-03-27", unread: true, tone: "info" },
  { id: "7", title: "Platinum Upgrade", body: "💎 Upgrade to Platinum for 50 promotions per cycle.", date: "2026-03-26", unread: true, tone: "info" },
  { id: "8", title: "Leaderboard", body: "🏆 Weekly leaderboard results are now live — check Records!", date: "2026-03-26", unread: false, tone: "info" },
];

function NotificationsPage() {
  const { data: me } = useMe();
  const [items, setItems] = useState(SEED);
  if (!me) return <Navigate to="/auth" />;
  const unread = items.filter((i) => i.unread).length;

  return (
    <AppShell title="Notifications" isAdmin={me.isAdmin}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay updated with announcements and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[var(--nrc-green)] text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">{unread} unread</span>
          <button onClick={() => setItems([])} className="inline-flex items-center gap-1 text-xs font-semibold border border-border rounded-md px-3 py-1.5">
            <Trash2 className="w-3 h-3" /> Clear All
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.length === 0 && (
          <li className="bg-card border border-border rounded-xl py-14 text-center text-sm text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" /> No notifications.
          </li>
        )}
        {items.map((n) => {
          const alert = n.tone === "alert";
          return (
            <li key={n.id} className={`flex items-start gap-3 px-4 py-3 border rounded-xl ${n.unread ? "bg-card" : "bg-muted/30"} border-border`}>
              <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${alert ? "bg-rose-100 text-rose-600" : "bg-[var(--nrc-green)]/15 text-[var(--nrc-green)]"}`}>
                {alert ? <Bell className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  {n.title} {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[var(--nrc-green)]" />}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">{n.date}</span>
                <button onClick={() => setItems((arr) => arr.filter((x) => x.id !== n.id))} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}