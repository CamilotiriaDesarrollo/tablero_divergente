"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PromoteIdeaButton } from "@/components/proyectos/promote-idea-button";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { updateProjectAction } from "@/lib/db/actions";
import { formatFecha } from "@/lib/utils/dates";
import type { Project } from "@/types/db";

const NOTE_LIMIT = 8000;

export function IdeaCard({ idea }: { idea: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(idea.name);
  const [description, setDescription] = useState(idea.description ?? "");
  const accent = projectColorValue(idea.color);
  const icon = idea.icon?.trim() || "Idea";
  const capturada = formatFecha(idea.created_at, "d MMM");

  function saveIdea(event: React.FormEvent) {
    event.preventDefault();
    const title = name.trim();
    if (!title) {
      toast.error("Escribe un titulo para la idea.");
      return;
    }
    startTransition(async () => {
      try {
        await updateProjectAction(idea.id, {
          name: title,
          description: description.trim() || null,
        });
        toast.success("Idea actualizada");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo actualizar la idea", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <>
      <Card
        className="h-full gap-3 border-l-4"
        style={{ borderLeftColor: accent, backgroundColor: `${accent}0d` }}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-xs font-medium"
              style={{ boxShadow: `inset 0 0 0 1.5px ${accent}88` }}
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-base font-medium leading-snug">{idea.name}</h3>
              {capturada ? (
                <p className="font-mono text-xs text-muted-foreground">capturada el {capturada}</p>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {idea.description?.trim() ? (
          <CardContent>
            <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {idea.description}
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">Sin desarrollo todavia.</p>
          </CardContent>
        )}

        <CardFooter className="mt-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil />
            Desarrollar
          </Button>
          <PromoteIdeaButton ideaId={idea.id} />
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Desarrollar idea</DialogTitle>
            <DialogDescription>
              Conserva el contexto y promovela cuando este lista.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveIdea} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`idea-name-${idea.id}`}>Titulo</Label>
              <Input
                id={`idea-name-${idea.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`idea-description-${idea.id}`}>Desarrollo</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {description.length.toLocaleString("es-CO")} / {NOTE_LIMIT.toLocaleString("es-CO")}
                </span>
              </div>
              <Textarea
                id={`idea-description-${idea.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, NOTE_LIMIT))}
                placeholder="Angulo, audiencia, estructura, referencias, datos y siguientes pasos..."
                rows={12}
                maxLength={NOTE_LIMIT}
                className="resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default IdeaCard;
