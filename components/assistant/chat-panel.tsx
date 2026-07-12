"use client";
// components/assistant/chat-panel.tsx
// Panel de chat con el asistente. Envia el historial a /api/ai, muestra la
// respuesta y, si hubo mutaciones, avisa y refresca los Server Components.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageList, type ChatMessage } from "@/components/assistant/message-list";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Que tengo para hoy",
  "Crea una tarea para enviar el acta manana, prioridad alta",
  "Muestrame las de alta sin fecha",
];

export function ChatPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "El asistente no respondio.");
      }
      setMessages([
        ...next,
        { role: "assistant", content: data.reply ?? "Listo." },
      ]);
      const actions: { type: string; summary: string }[] = data.actions ?? [];
      if (actions.length) {
        toast.success(
          actions.length === 1
            ? actions[0].summary
            : `${actions.length} cambios aplicados`,
        );
        router.refresh();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Algo fallo con el asistente.";
      setMessages([...next, { role: "assistant", content: message }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 font-heading">
            <Sparkles className="size-4 text-primary" />
            Asistente
          </SheetTitle>
          <SheetDescription className="text-xs">
            Escribe en lenguaje natural: crea, consulta o completa tareas.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          <div ref={scrollRef} className="h-full">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Prueba con:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <MessageList messages={messages} pending={pending} />
            )}
          </div>
        </ScrollArea>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-3"
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="max-h-32 min-h-9 resize-none"
              aria-label="Mensaje para el asistente"
            />
            <Button
              type="submit"
              size="icon"
              disabled={pending || !input.trim()}
              aria-label="Enviar"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
