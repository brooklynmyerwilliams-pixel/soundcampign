import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEventsConfig, saveEventsConfig, type EventsConfig, type LevelConfig } from "@/lib/events";

export function EventsRewardsEditor() {
  const qc = useQueryClient();
  const { data } = useEventsConfig();
  const [draft, setDraft] = useState<EventsConfig | null>(null);
  const value = draft ?? data ?? null;

  const save = useMutation({
    mutationFn: async () => { if (value) await saveEventsConfig(value); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-config"] });
      toast.success("Events & rewards saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!value) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = (patch: Partial<EventsConfig>) => setDraft({ ...value, ...patch });

  return (
    <div className="space-y-5">
      {/* Page texts */}
      <section className="space-y-2">
        <span className="text-sm font-semibold">Page header (user panel)</span>
        <Input className="h-8" value={value.pageTitle} placeholder="Page title"
          onChange={(e) => set({ pageTitle: e.target.value })} />
        <Input className="h-8" value={value.pageSubtitle} placeholder="Subtitle"
          onChange={(e) => set({ pageSubtitle: e.target.value })} />
      </section>

      {/* Reward event banner */}
      <section className="space-y-2 border-t border-border pt-4">
        <span className="text-sm font-semibold">Reward event banner</span>
        <Input className="h-8" value={value.rewardTitle} placeholder="Banner label"
          onChange={(e) => set({ rewardTitle: e.target.value })} />
        <Input className="h-8" value={value.rewardEmptyText} placeholder="Text shown when no event is active"
          onChange={(e) => set({ rewardEmptyText: e.target.value })} />
      </section>

      {/* Salary earning */}
      <section className="space-y-2 border-t border-border pt-4">

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Salary earning</span>
          <Switch checked={value.checkinEnabled} onCheckedChange={(v) => set({ checkinEnabled: v })} />
        </div>
        <Input
          className="h-8"
          value={value.checkinTitle}
          placeholder="Section title"
          onChange={(e) => set({ checkinTitle: e.target.value })}
        />
        <Input
          className="h-8"
          value={value.checkinFooter}
          placeholder="Footer caption"
          onChange={(e) => set({ checkinFooter: e.target.value })}
        />
        {value.checkins.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="h-8 w-16"
              type="number"
              value={c.day}
              placeholder="Day"
              onChange={(e) => {
                const list = [...value.checkins];
                list[i] = { ...c, day: Number(e.target.value) || 0 };
                set({ checkins: list });
              }}
            />
            <Input
              className="h-8"
              value={c.label}
              placeholder="Label"
              onChange={(e) => {
                const list = [...value.checkins];
                list[i] = { ...c, label: e.target.value };
                set({ checkins: list });
              }}
            />
            <Input
              className="h-8 w-28"
              type="number"
              value={c.amount}
              placeholder="Reward"
              onChange={(e) => {
                const list = [...value.checkins];
                list[i] = { ...c, amount: Number(e.target.value) || 0 };
                set({ checkins: list });
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => set({ checkins: value.checkins.filter((_, x) => x !== i) })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => set({ checkins: [...value.checkins, { day: 1, label: "WORKING DAYS 1", amount: 100 }] })}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add milestone
        </Button>
      </section>

      {/* Spin & win */}
      <section className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Spin &amp; Win</span>
          <Switch checked={value.spinEnabled} onCheckedChange={(v) => set({ spinEnabled: v })} />
        </div>
        <Input
          className="h-8"
          value={value.spinTitle}
          placeholder="Event name"
          onChange={(e) => set({ spinTitle: e.target.value })}
        />
        <label className="block text-xs text-muted-foreground">
          Prize amounts shown on the wheel (comma separated)
          <Input
            className="h-8 mt-1"
            value={value.spinPrizes.join(", ")}
            onChange={(e) =>
              set({
                spinPrizes: e.target.value
                  .split(",")
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n)),
              })
            }
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          The amount a user actually wins is the prize you assign in User Management → Reward Event.
        </p>
      </section>

      {/* Magic box */}
      <section className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Magic Box</span>
          <Switch checked={value.magicBoxEnabled} onCheckedChange={(v) => set({ magicBoxEnabled: v })} />
        </div>
        <Input
          className="h-8"
          value={value.magicBoxTitle}
          placeholder="Event name"
          onChange={(e) => set({ magicBoxTitle: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Min reward
            <Input className="h-8 mt-1" type="number" value={value.magicBoxMin}
              onChange={(e) => set({ magicBoxMin: Number(e.target.value) || 0 })} />
          </label>
          <label className="text-xs text-muted-foreground">Max reward
            <Input className="h-8 mt-1" type="number" value={value.magicBoxMax}
              onChange={(e) => set({ magicBoxMax: Number(e.target.value) || 0 })} />
          </label>
        </div>
      </section>


      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Save events
      </Button>
    </div>
  );
}

/** Membership level chart editor — shown on the Activities Management page. */
export function MembershipChartEditor() {
  const qc = useQueryClient();
  const { data } = useEventsConfig();
  const [draft, setDraft] = useState<EventsConfig | null>(null);
  const value = draft ?? data ?? null;

  const save = useMutation({
    mutationFn: async () => { if (value) await saveEventsConfig(value); },
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["events-config"] });
      toast.success("Membership chart saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!value) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const set = (patch: Partial<EventsConfig>) => setDraft({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Membership level chart</span>
        <Switch checked={value.levelsEnabled} onCheckedChange={(v) => set({ levelsEnabled: v })} />
      </div>
      <Input className="h-8" value={value.levelsTitle} placeholder="Section title"
        onChange={(e) => set({ levelsTitle: e.target.value })} />
      {value.levels.map((lv, i) => {
        const patch = (p: Partial<LevelConfig>) => {
          const list = [...value.levels];
          list[i] = { ...lv, ...p };
          set({ levels: list });
        };
        return (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Level name
                <Input className="h-8 mt-1" value={lv.name} onChange={(e) => patch({ name: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Deposit
                <Input className="h-8 mt-1" value={lv.deposit} onChange={(e) => patch({ deposit: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Tasks
                <Input className="h-8 mt-1" value={lv.tasks} onChange={(e) => patch({ tasks: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Profit
                <Input className="h-8 mt-1" value={lv.commission} onChange={(e) => patch({ commission: e.target.value })} />
              </label>
            </div>
            <label className="block text-xs text-muted-foreground">Bullet points (one per line)
              <Textarea
                className="mt-1 text-xs"
                rows={4}
                value={(lv.perks ?? []).join("\n")}
                onChange={(e) => patch({ perks: e.target.value.split("\n").filter((x) => x.trim() !== "") })}
              />
            </label>
          </div>
        );
      })}
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Save membership chart
      </Button>
    </div>
  );
}
