"use client";
// components/calendario/day-create-dialog.tsx
// Al hacer clic en un dia se abre este dialog para crear una tarea con la fecha
// de entrega ya prefijada a ese dia. Muta via createTaskAction dentro de
// useTransition y refresca el RSC al terminar (arquitectura obligatoria).
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { createTaskAction } from "@/lib/db/actions";
import { toDateColumn } from "@/lib/utils/dates";
import { PRIORITY_EMOJI } from "@/lib/utils/urgency";
import type { Priority } from "@/types/db";
import { formatDayLong } from "./month-range";

const PRIO_OPTIONS: { value: string; label: string }[] = [
  { value: "sin", label: "Sin prioridad" },
  { value: "alta", label: `${PRIORITY_EMOJI.alta} Alta` },
  { value: "media", label: `${PRIORITY_EMOJI.media} Media` },
  { value: "baja", label: `${PRIORITY_EMOJI.baja} Baja` },
];

export function DayCreateDialog({
  day,
  open,
  onOpenChange,
}: {
  day: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [prio, setPrio] = React.useState<string>("sin");

  // Reinicia el formulario cada vez que se abre para un dia nuevo.
  React.useEffect(() => {
    if (open) {
      setTitle("");
      setNotes("");
      setPrio("sin");
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Escribe un titulo para crear la tarea.");
      return;
    }
    if (!day) return;

    const priority = prio === "sin" ? null : (prio as Priority);
    startTransition(async () => {
      try {
        await createTaskAction({
          title: cleanTitle,
          notes: notes.trim() || null,
          priority,
          status: "todo",
          due_at: toDateColumn(day),
        });
        toast.success("Tarea creada");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("No se pudo crear la tarea. Revisa la conexion e intenta de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlusIcon className="size-4 text-muted-foreground" />
              Nueva tarea
            </DialogTitle>
            <DialogDescription>
              {day ? `Con fecha de entrega el ${formatDayLong(day)}.` : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="day-create-title">Titulo</Label>
            <Input
              id="day-create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Que hay que hacer"
              autoFocus
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="day-create-prio">Prioridad</Label>
            <Select value={prio} onValueChange={(v) => setPrio(v as string)}>
              <SelectTrigger id="day-create-prio" className="w-full">
                <SelectValue>
                  {(v: string) =>
                    PRIO_OPTIONS.find((o) => o.value === v)?.label ?? "Sin prioridad"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRIO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="day-create-notes">Notas</Label>
            <Textarea
              id="day-create-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
