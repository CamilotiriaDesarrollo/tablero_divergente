"use client";
// components/marketing/planner-item-card.tsx
// Tarjeta de una pieza del planeador: titulo, red (con logo), tipo, avatares
// objetivo, hook y bullets, con estado editable y borrado con confirmacion. El
// estado es senal, no decision: cambiarlo no reordena nada (CLAUDE.md). El clic
// en "Editar" abre el formato completo (lo maneja el tablero via onEdit).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
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
  plannerNetworkMeta,
} from "@/components/marketing/marketing-constants";
import type { PlannerAvatarOption } from "@/components/marketing/planner-item-form";
import { projectColorValue } from "@/components/proyectos/project-colors";
import {
  deletePlannerItemAction,
  setPlannerItemStatusAction,
} from "@/lib/db/actions";
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
}: {
  item: MarketingPlannerItem;
  avatars: PlannerAvatarOption[];
  onEdit: (item: MarketingPlannerItem) => void;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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

  return (
    <>
      <Card className="h-full gap-3">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 font-heading text-base font-medium leading-snug">
              {item.title}
            </h3>
            {network && network.slug ? (
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `#${network.color}14` }}
                title={network.name}
              >
                <ChannelMark name={network.name} slug={network.slug} color={network.color} />
              </span>
            ) : item.network ? (
              <Badge variant="outline" className="shrink-0">
                {item.network}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.content_type ? (
              <Badge variant="secondary">{item.content_type}</Badge>
            ) : null}
            {targets.map((avatar) => {
              const accent = projectColorValue(avatar.color);
              return (
                <span
                  key={avatar.id}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  />
                  {avatar.name}
                </span>
              );
            })}
          </div>
        </CardHeader>

        {item.hook?.trim() || item.bullets.length ? (
          <CardContent className="space-y-2">
            {item.hook?.trim() ? (
              <p className="line-clamp-2 text-sm leading-snug text-foreground/80">
                <span className="text-muted-foreground">Hook: </span>
                {item.hook}
              </p>
            ) : null}
            {item.bullets.length ? (
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground marker:text-muted-foreground/40">
                {item.bullets.slice(0, 3).map((bullet, index) => (
                  <li key={index} className="line-clamp-1">
                    {bullet}
                  </li>
                ))}
                {item.bullets.length > 3 ? (
                  <li className="list-none text-muted-foreground/70">
                    +{item.bullets.length - 3} mas
                  </li>
                ) : null}
              </ul>
            ) : null}
          </CardContent>
        ) : null}

        <CardFooter className="mt-auto flex flex-wrap items-center gap-2">
          <Select
            value={item.status}
            onValueChange={(v) => changeStatus(v as MarketingPlannerStatus)}
          >
            <SelectTrigger size="sm" aria-label="Estado del contenido" disabled={pending}>
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
          {scheduled ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {scheduled}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Editar contenido"
              onClick={() => onEdit(item)}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar contenido"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </CardFooter>
      </Card>

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
