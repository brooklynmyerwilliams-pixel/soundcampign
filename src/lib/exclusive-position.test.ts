import { describe, it, expect } from "vitest";
import { buildTaskQueue, type ExclusiveTask } from "./exclusive";
import type { Song } from "./warehouse";

const songs: Song[] = Array.from({ length: 10 }, (_, i) => ({
  id: `s${i}`, name: `Song ${i + 1}`, poster: "p", audio: "a", description: "", amount: 10, commission: 1,
}));
const ex = (position: number, consumed = false): ExclusiveTask => ({
  id: `e${position}`, user_id: "u", position, name: `Premium ${position}`, amount: 500, commission: 5, poster: null, consumed,
});
const posOf = (q: Song[], done: number, name: string) => done + q.findIndex((s) => s.name === name) + 1;

describe("premium placement", () => {
  it("lands on its set task number with no progress", () => {
    const q = buildTaskQueue(songs, [ex(5)], new Set(), 0, 10);
    expect(posOf(q, 0, "Premium 5")).toBe(5);
    expect(q.length).toBe(10);
  });
  it("lands on its set number after some submissions, even with unrelated history", () => {
    const done = new Set(["Song 1", "Old song X", "Song 3"]);
    const q = buildTaskQueue(songs, [ex(6)], done, 3, 10);
    expect(posOf(q, 3, "Premium 6")).toBe(6);
  });
  it("shows a premium whose number already passed as the next task", () => {
    const q = buildTaskQueue(songs, [ex(2)], new Set(["Song 1", "Song 2", "Song 3"]), 3, 10);
    expect(q[0].name).toBe("Premium 2");
  });
  it("skips consumed premiums", () => {
    const q = buildTaskQueue(songs, [ex(1, true)], new Set(), 0, 10);
    expect(q[0].name).toBe("Song 1");
  });
});

describe("multiple premiums", () => {
  it("places each premium at its own set number", () => {
    const q = buildTaskQueue(songs, [ex(3), ex(7), ex(9)], new Set(["Song 1"]), 1, 10);
    expect(posOf(q, 1, "Premium 3")).toBe(3);
    expect(posOf(q, 1, "Premium 7")).toBe(7);
    expect(posOf(q, 1, "Premium 9")).toBe(9);
    expect(q.length).toBe(9);
  });
  it("keeps later premiums in place after an earlier one is submitted", () => {
    const q = buildTaskQueue(songs, [ex(2, true), ex(5)], new Set(["Song 1", "Premium 2"]), 2, 10);
    expect(posOf(q, 2, "Premium 5")).toBe(5);
  });
});
