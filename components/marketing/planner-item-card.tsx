"use client";
// components/marketing/planner-item-card.tsx
// Tarjeta de una pieza del planeador, plegada por defecto. Con 20 piezas en el
// tablero lo util es ver los titulos apilados, no el detalle de todas a la vez:
// por eso la tarjeta cerrada siempre mide lo mismo (dos lineas de titulo y una
// de datos) y solo la que abres muestra hook, bullets y acciones. Se abre una
// a la vez, como un acordeon; de eso se encarga el tablero.
//
// El color de la barra izquierda es el estado. Es la misma senal del encabezado
// de columna, repetida en la tarjeta para que al mirar de lejos se vea donde
// esta cada pieza. El estado sigue siendo senal, no decision: cambiarlo no
// reordena nada (CLAUDE.md).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChannelMark } from "@/components/marketing/channel-mark";
import {
  PLANNER_STATUS_LABEL,
  PLANNER_STATUS_TONE,
  plannerNetworkMeta,
} from "@/components/marketing/marketing-constants";
import type { PlannerAvatarOption } from "@/components/marketing/planner-item-form";
import { projectColorValue } from "@/components/proyectos/project-colors";
import {
  deletePlannerItemAction,
  setPlannerItemStatusAction,
} from "@/lib/db/actions";
import { cn } from "@/lib/utils";
import { formatFecha } from "@/lib/utils/dates";
import {
  MARKETING_PLANNER_STATUSES,
  type MarketingPlannerItem,
  type MarketingPlannerStatus,
} from "@/types/db";

export function PlannerItemCard({
  item,
  avatars,
  onEdit,
  expanded,
  onToggle,
}: {
  item: MarketingPlannerItem;
  avatars: PlannerAvatarOption[];
  onEdit: (item: MarketingPlannerItem) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const tone = PLANNER_STATUS_TONE[item.status];
  const network = item.network ? plannerNetworkMeta(item.network) : null;
  const targets = item.avatar_ids
    .map((id) => avatars.find((a) => a.id === id))
    .filter((a): a is PlannerAvatarOption => Boolean(a));
  const scheduled = formatFecha(item.scheduled_for, "d MMM");

  function changeStatus(status: MarketingPlannerStatus) {
    if (status === item.status) return;
    startTransition(async () => {
      try {
        await setPlannerItemStatusAction(item.id, status);
        toast.success(
          `Marcado como ${PLANNER_STATUS_LABEL[status].toLocaleLowerCase("es-CO")}`,
        );
        router.refresh();
      } catch (error) {
        toast.error("No se pudo cambiar el estado", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deletePlannerItemAction(item.id);
        toast.success("Contenido eliminado");
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo eliminar", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  const hasDetail = Boolean(item.hook?.trim()) || item.bullets.length > 0;

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-lg bg-card ring-1 transition-shadow",
          expanded ? "ring-foreground/20 shadow-sm" : "ring-foreground/10",
        )}
      >
        {/* Tinte del estado sobre el fondo de la tarjeta: al mirar de lejos, cada
            columna se distingue por color sin perder el contraste del texto. */}
        <span className={cn("pointer-events-none absolute inset-0", tone.soft)} aria-hidden />
        {/* La barra es la misma senal, mas fuerte, para el ojo que recorre rapido. */}
        <span className={cn("absolute inset-y-0 left-0 w-1", tone.accent)} aria-hidden />

        <div className="relative flex items-start gap-1.5 py-2 pl-3 pr-1.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-start gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
            <span className="min-w-0 flex-1">
              {/* Alto fijo: dos lineas de titulo aunque el titulo sea corto, para
                  que todas las tarjetas cerradas midan igual. */}
              <span className="line-clamp-2 min-h-9 break-words text-sm font-medium leading-tight">
                {item.title}
              </span>
              {/* Una sola linea, siempre: si se permite que envuelva, las tarjetas
                  con mas datos crecen y la columna deja de leerse pareja. */}
              <span className="mt-0.5 flex h-4 items-center gap-x-2 overflow-hidden text-[11px] leading-4 text-muted-foreground">
                {item.content_type ? (
                  <span className="shrink-0">{item.content_type}</span>
                ) : null}
                {scheduled ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <CalendarDays className="size-3" aria-hidden />
                    {scheduled}
                  </span>
                ) : null}
                {targets.length === 1 ? (
                  <span className="truncate">{targets[0].name}</span>
                ) : targets.length > 1 ? (
                  <span className="truncate">{targets.length} avatares</span>
                ) : null}
              </span>
            </span>
          </button>

          {network && network.slug ? (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `#${network.color}14` }}
              title={network.name}
            >
              <ChannelMark
                name={network.name}
                slug={network.slug}
                color={network.color}
              />
            </span>
          ) : item.network ? (
            <Badge variant="outline" className="shrink-0">
              {item.network}
            </Badge>
          ) : null}
        </div>

        {expanded ? (
          <div className={cn("relative space-y-3 border-t px-3 py-3 pl-4", tone.soft)}>
            {targets.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {targets.map((avatar) => (
                  <span
                    key={avatar.id}
                    className="flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: projectColorValue(avatar.color) }}
                      aria-hidden
                    />
                    {avatar.name}
                  </span>
                ))}
              </div>
            ) : null}

            {item.hook?.trim() ? (
              <p className="break-words text-sm leading-snug text-foreground/80">
                <span className="text-muted-foreground">Hook: </span>
                {item.hook}
              </p>
            ) : null}

            {item.bullets.length ? (
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground marker:text-muted-foreground/40">
                {item.bullets.map((bullet, index) => (
                  <li key={index} className="break-words">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}

            {!hasDetail ? (
              <p className="text-xs text-muted-foreground/70">
                Esta pieza aun no tiene hook ni bullets. Abre Editar para
                desarrollarla.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Select
                value={item.status}
                onValueChange={(v) => changeStatus(v as MarketingPlannerStatus)}
              >
                <SelectTrigger
                  size="sm"
                  className="bg-background"
                  aria-label="Mover a otro estado"
                  disabled={pending}
                >
                  <SelectValue>
                    {(v: string) =>
                      PLANNER_STATUS_LABEL[v as MarketingPlannerStatus] ?? "Estado"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_PLANNER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PLANNER_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(item)}
                >
                  <Pencil />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar contenido"
                  title="Eliminar"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar contenido</DialogTitle>
            <DialogDescription>
              Se elimina &quot;{item.title}&quot; y todo su guion. Esta accion no se
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
              {pending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PlannerItemCard;
