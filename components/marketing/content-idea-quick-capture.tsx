"use client";
// components/marketing/content-idea-quick-capture.tsx
// Captura rapida de una idea de contenido para el avatar activo. Titulo
// obligatorio, formato opcional. El desarrollo (notas) se hace despues desde la
// tarjeta. Boton "Guardar idea" produce el aviso "Idea guardada".
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTENT_FORMATS } from "@/components/marketing/marketing-constants";
import { createContentIdeaAction } from "@/lib/db/actions";

const NONE_VALUE = "none";

export function ContentIdeaQuickCapture({
  avatarId,
  avatarName,
}: {
  avatarId: string;
  avatarName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState(NONE_VALUE);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Escribe la idea de contenido", {
        description: "Un titulo corto basta; luego la desarrollas.",
      });
      return;
    }
    startTransition(async () => {
      try {
        await createContentIdeaAction({
          avatar_id: avatarId,
          title: trimmed,
          format: format !== NONE_VALUE ? format : null,
        });
        toast.success("Idea guardada");
        setTitle("");
        setFormat(NONE_VALUE);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo guardar la idea", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-shadow focus-within:ring-2 focus-within:ring-ring sm:flex-row sm:items-center"
    >
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={`Nueva idea de contenido para ${avatarName}`}
        maxLength={300}
        className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        aria-label={`Nueva idea de contenido para ${avatarName}`}
      />
      <div className="flex items-center gap-2">
        <Select value={format} onValueChange={(v) => setFormat(v as string)}>
          <SelectTrigger size="sm" aria-label="Formato del contenido">
            <SelectValue>
              {(v: string) => (v && v !== NONE_VALUE ? v : "Formato")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sin formato</SelectItem>
            {CONTENT_FORMATS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={pending}>
          <Plus />
          {pending ? "Guardando..." : "Guardar idea"}
        </Button>
      </div>
    </form>
  );
}

export default ContentIdeaQuickCapture;
