"use client";
// components/marketing/content-idea-card.tsx
// Tarjeta de una idea de contenido: titulo, formato, estado y notas, con
// edicion en dialogo y borrado con confirmacion. El estado es senal, no
// decision: cambiarlo no reordena nada (CLAUDE.md).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTENT_FORMATS,
  CONTENT_STATUS_LABEL,
} from "@/components/marketing/marketing-constants";
import {
  deleteContentIdeaAction,
  setContentIdeaStatusAction,
  updateContentIdeaAction,
} from "@/lib/db/actions";
import { formatFecha } from "@/lib/utils/dates";
import { MARKETING_CONTENT_STATUSES } from "@/types/db";
import type { MarketingContentIdea, MarketingContentStatus } from "@/types/db";

const NOTE_LIMIT = 8000;
const NONE_VALUE = "none";

export function ContentIdeaCard({ idea }: { idea: MarketingContentIdea }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(idea.title);
  const [notes, setNotes] = useState(idea.notes ?? "");
  const [format, setFormat] = useState(idea.format ?? NONE_VALUE);
  const capturada = formatFecha(idea.created_at, "d MMM");

  function changeStatus(status: MarketingContentStatus) {
    if (status === idea.status) return;
    startTransition(async () => {
      try {
        await setContentIdeaStatusAction(idea.id, status);
        toast.success(`Marcada como ${CONTENT_STATUS_LABEL[status].toLocaleLowerCase("es-CO")}`);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo cambiar el estado", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  function saveIdea(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Escribe un titulo para la idea.");
      return;
    }
    startTransition(async () => {
      try {
        await updateContentIdeaAction(idea.id, {
          title: trimmed,
          notes: notes.trim() || null,
          format: format !== NONE_VALUE ? format : null,
        });
        toast.success("Idea actualizada");
        setEditOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo actualizar la idea", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteContentIdeaAction(idea.id);
        toast.success("Idea eliminada");
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo eliminar la idea", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <>
      <Card className="h-full gap-3">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-base font-medium leading-snug">
                {idea.title}
              </h3>
              {capturada ? (
                <p className="font-mono text-xs text-muted-foreground">
                  capturada el {capturada}
                </p>
              ) : null}
            </div>
            {idea.format?.trim() ? (
              <Badge variant="outline">{idea.format}</Badge>
            ) : null}
          </div>
        </CardHeader>

        {idea.notes?.trim() ? (
          <CardContent>
            <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {idea.notes}
            </p>
          </CardContent>
        ) : null}

        <CardFooter className="mt-auto flex flex-wrap items-center gap-2">
          <Select
            value={idea.status}
            onValueChange={(v) => changeStatus(v as MarketingContentStatus)}
          >
            <SelectTrigger size="sm" aria-label="Estado de la idea" disabled={pending}>
              <SelectValue>
                {(v: string) =>
                  CONTENT_STATUS_LABEL[v as MarketingContentStatus] ?? "Estado"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MARKETING_CONTENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {CONTENT_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Desarrollar idea"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar idea"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Desarrollar idea</DialogTitle>
            <DialogDescription>
              Angulo, gancho, estructura y referencias de esta pieza.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveIdea} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`idea-title-${idea.id}`}>Titulo</Label>
              <Input
                id={`idea-title-${idea.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={300}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => (v && v !== NONE_VALUE ? v : "Sin formato")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sin formato</SelectItem>
                  {CONTENT_FORMATS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                  {idea.format && !CONTENT_FORMATS.includes(idea.format as (typeof CONTENT_FORMATS)[number]) ? (
                    <SelectItem value={idea.format}>{idea.format}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`idea-notes-${idea.id}`}>Desarrollo</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {notes.length.toLocaleString("es-CO")} /{" "}
                  {NOTE_LIMIT.toLocaleString("es-CO")}
                </span>
              </div>
              <Textarea
                id={`idea-notes-${idea.id}`}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value.slice(0, NOTE_LIMIT))
                }
                placeholder="Gancho, guion, llamado a la accion, referencias..."
                rows={10}
                maxLength={NOTE_LIMIT}
                className="resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar idea</DialogTitle>
            <DialogDescription>
              Se elimina &quot;{idea.title}&quot; y sus notas. Esta accion no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? "Eliminando..." : "Eliminar idea"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ContentIdeaCard;
