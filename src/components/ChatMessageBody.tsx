import { decodeChatDocument } from "@/lib/chat-format";

export function ChatMessageBody({ body, formatted = false }: { body: string; formatted?: boolean }) {
  const document = formatted ? decodeChatDocument(body) : null;
  if (!document) return <div className="chat-message-content">{body}</div>;
  return (
    <div className="chat-message-content">
      {document.content.map((block, i) => (
        <p key={i}>
          {block.content.length === 0 ? <br /> : block.content.map((node, j) => {
            if (node.type === "hardBreak") return <br key={j} />;
            let text = <span>{node.text}</span>;
            if (node.marks?.some((mark) => mark.type === "bold")) text = <strong>{text}</strong>;
            if (node.marks?.some((mark) => mark.type === "highlight")) text = <mark>{text}</mark>;
            return <span key={j}>{text}</span>;
          })}
        </p>
      ))}
    </div>
  );
}