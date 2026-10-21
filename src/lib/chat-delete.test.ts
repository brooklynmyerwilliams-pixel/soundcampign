import { describe, expect, it } from "vitest";
import { toggleMessageSelection } from "@/lib/chat";

describe("toggleMessageSelection", () => {
  it("adds an unselected message id", () => {
    expect(toggleMessageSelection(["a"], "b")).toEqual(["a", "b"]);
  });

  it("removes an already selected message id", () => {
    expect(toggleMessageSelection(["a", "b"], "a")).toEqual(["b"]);
  });

  it("toggling twice returns to the original selection", () => {
    const once = toggleMessageSelection([], "x");
    expect(toggleMessageSelection(once, "x")).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const input = ["a", "b"];
    toggleMessageSelection(input, "c");
    expect(input).toEqual(["a", "b"]);
  });
});
