// A versioned document in the existing body field keeps legacy messages readable.
const PREFIX = "sc-chat:v1:";

export type ChatInline =
  | { type: "text"; text: string; marks?: { type: "bold" | "highlight" }[] }
  | { type: "hardBreak" };
export type ChatDocument = {
  type: "doc";
  content: { type: "paragraph"; content: ChatInline[] }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Only known text nodes and marks are retained; never render submitted HTML. */
function normalizeDocument(value: unknown): ChatDocument | null {
  if (!isRecord(value) || value.type !== "doc" || !Array.isArray(value.content)) return null;
  if (value.content.length > 1000) return null;
  const content: ChatDocument["content"] = [];
  for (const block of value.content) {
    if (!isRecord(block) || block.type !== "paragraph") return null;
    if (block.content !== undefined && !Array.isArray(block.content)) return null;
    const children = Array.isArray(block.content) ? block.content : [];
    if (children.length > 10000) return null;
    const inlines: ChatInline[] = [];
    for (const node of children) {
      if (!isRecord(node)) return null;
      if (node.type === "hardBreak") {
        inlines.push({ type: "hardBreak" });
      } else if (node.type === "text" && typeof node.text === "string") {
        const marks: { type: "bold" | "highlight" }[] = [];
        if (Array.isArray(node.marks)) {
          for (const mark of node.marks) {
            if (isRecord(mark) && (mark.type === "bold" || mark.type === "highlight")) {
              if (!marks.some((m) => m.type === mark.type)) marks.push({ type: mark.type });
            }
          }
        }
        inlines.push({ type: "text", text: node.text, ...(marks.length ? { marks } : {}) });
      } else return null;
    }
    content.push({ type: "paragraph", content: inlines });
  }
  return { type: "doc", content };
}

export function encodeChatDocument(document: unknown): string {
  const normalized = normalizeDocument(document);
  return normalized ? PREFIX + JSON.stringify(normalized) : "";
}

export function decodeChatDocument(body: string): ChatDocument | null {
  if (!body.startsWith(PREFIX)) return null;
  try {
    return normalizeDocument(JSON.parse(body.slice(PREFIX.length)));
  } catch {
    return null;
  }
}

export function chatBodyText(body: string): string {
  const document = decodeChatDocument(body);
  if (!document) return body;
  return document.content.map((block) =>
    block.content.map((node) => node.type === "text" ? node.text : "\n").join(""),
  ).join("\n\n");
}