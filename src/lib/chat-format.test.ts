import { describe, expect, it } from "vitest";
import { chatBodyText, decodeChatDocument, encodeChatDocument } from "./chat-format";

const document = (content: unknown[]) => ({ type: "doc", content });
const paragraph = (content: unknown[] = []) => ({ type: "paragraph", content });
const text = (value: string, marks?: unknown[]) => ({ type: "text", text: value, marks });
const roundTrip = (value: unknown) => decodeChatDocument(encodeChatDocument(value));

describe("administrator chat formatting", () => {
  it("retains bold on the administrator's chosen text", () => {
    expect(roundTrip(document([paragraph([text("Important", [{ type: "bold" }]), text(" notice")])]))?.content[0].content)
      .toEqual([{ type: "text", text: "Important", marks: [{ type: "bold" }] }, { type: "text", text: " notice" }]);
  });
  it("preserves repeated spaces rather than collapsing them", () => {
    expect(chatBodyText(encodeChatDocument(document([paragraph([text("Hello    Bess")])])))).toBe("Hello    Bess");
  });
  it("preserves separate paragraphs, empty paragraphs and line breaks", () => {
    const body = encodeChatDocument(document([paragraph([text("Hello"), { type: "hardBreak" }, text("Bess")]), paragraph(), paragraph([text("Thank you")])]));
    expect(decodeChatDocument(body)?.content).toHaveLength(3);
    expect(chatBodyText(body)).toBe("Hello\nBess\n\n\n\nThank you");
  });
  it("retains highlighting on only the selected text", () => {
    expect(roundTrip(document([paragraph([text("Notice", [{ type: "highlight" }]), text(" today")])]))?.content[0].content)
      .toEqual([{ type: "text", text: "Notice", marks: [{ type: "highlight" }] }, { type: "text", text: " today" }]);
  });
  it("keeps existing text and literal HTML unchanged", () => {
    const legacy = "Hello  Bess\n\n<strong>literal text</strong>";
    expect(decodeChatDocument(legacy)).toBeNull();
    expect(chatBodyText(legacy)).toBe(legacy);
    expect(chatBodyText("sc-chat:v1:{not-json}")).toBe("sc-chat:v1:{not-json}");
  });
  it("drops arbitrary attributes and unsafe marks, and refuses executable nodes", () => {
    expect(roundTrip(document([paragraph([text("Safe", [{ type: "link", attrs: { href: "javascript:alert(1)" } }, { type: "highlight", attrs: { style: "color:red" } }])])]))?.content[0].content)
      .toEqual([{ type: "text", text: "Safe", marks: [{ type: "highlight" }] }]);
    expect(encodeChatDocument(document([paragraph([{ type: "script", text: "alert(1)" }])]))).toBe("");
  });
});