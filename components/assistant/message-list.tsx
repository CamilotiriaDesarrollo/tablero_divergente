"use client";
// components/assistant/message-list.tsx
import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function MessageList({
  messages,
  pending,
}: {
  messages: ChatMessage[];
  pending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={cn(
            "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
            m.role === "user"
              ? "self-end bg-primary text-primary-foreground"
              : "self-start bg-muted text-foreground",
          )}
        >
          {m.content}
        </div>
      ))}
      {pending && (
        <div className="self-start rounded-lg bg-muted px-3 py-2">
          <span className="inline-flex gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
        </div>
      )}
    </div>
  );
}
