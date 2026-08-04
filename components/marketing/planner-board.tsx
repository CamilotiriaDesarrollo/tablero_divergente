"use client";
// components/marketing/planner-board.tsx
// Pestana Planeador: banco de contenidos organizados por estado (borrador, en
// proceso, listo, publicado). Cada pieza lleva su formato completo (red, tipo,
// avatares, hook, bullets, guion, CTA). Filtros por red, avatar y busqueda. El
// estado ordena las columnas pero no reordena nada por su cuenta (CLAUDE.md).
//
// Las tarjetas van plegadas y se abre una sola en todo el tablero: con 20
// piezas, tenerlas todas abiertas convierte la columna en un muro y obliga a
// hacer scroll para comparar. Cada estado tiene su color, repetido en el punto
// del encabezado y en la barra de la tarjeta.
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PLANNER_NETWORKS,
  PLANNER_STATUS_HINT,
  PLANNER_STATUS_LABEL,
  PLANNER_STATUS_TONE,
} from "@/components/marketing/marketing-constants";
import {
  PlannerItemForm,
  type PlannerAvatarOption,
} from "@/components/marketing/planner-item-form";
import { PlannerItemCard } from "@/components/marketing/planner-item-card";
import {
  MARKETING_PLANNER_STATUSES,
  type MarketingPlannerItem,
} from "@/types/db";

const ALL = "todos";

export function PlannerBoard({
  items,
  avatars,
}: {
  items: MarketingPlannerItem[];
  avatars: PlannerAvatarOption[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingPlannerItem | null>(null);
  const [query, setQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState(ALL);
  const [avatarFilter, setAvatarFilter] = useState(ALL);
  // Acordeon: una sola pieza abierta en todo el tablero. Volver a tocarla la cierra.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const term = query.trim().toLocaleLowerCase("es-CO");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (networkFilter !== ALL && item.network !== networkFilter) return false;
      if (avatarFilter !== ALL && !item.avatar_ids.includes(avatarFilter)) return false;
      if (!term) return true;
      const haystack = [
        item.title,
        item.hook ?? "",
        item.angle ?? "",
        item.script ?? "",
        item.cta ?? "",
        item.bullets.join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("es-CO");
      return haystack.includes(term);
    });
  }, [items, networkFilter, avatarFilter, term]);

  const byStatus = useMemo(() => {
    const map = new Map<string, MarketingPlannerItem[]>();
    for (const status of MARKETING_PLANNER_STATUSES) map.set(status, []);
    for (const item of filtered) map.get(item.status)?.push(item);
    return map;
  }, [filtered]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: MarketingPlannerItem) {
    setEditing(item);
    setFormOpen(true);
  }

  const hasAny = items.length > 0;
  const hasFiltered = filtered.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar contenido"
              aria-label="Buscar contenido"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={networkFilter} onValueChange={(v) => setNetworkFilter(v ?? ALL)}>
              <SelectTrigger size="sm" aria-label="Filtrar por red">
                <SelectValue>
                  {(v: string) => (v === ALL ? "Todas las redes" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las redes</SelectItem>
                {PLANNER_NETWORKS.map((n) => (
                  <SelectItem key={n.name} value={n.name}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={avatarFilter} onValueChange={(v) => setAvatarFilter(v ?? ALL)}>
              <SelectTrigger size="sm" aria-label="Filtrar por avatar">
                <SelectValue>
                  {(v: string) =>
                    v === ALL
                      ? "Todos los avatares"
                      : (avatars.find((a) => a.id === v)?.name ?? "Avatar")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los avatares</SelectItem>
                {avatars.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" onClick={openNew} className="shrink-0">
          <Plus />
          Nuevo contenido
        </Button>
      </div>

      {!hasAny ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Aun no hay contenidos en el planeador. Crea el primero o llevalo desde
            una idea de avatar.
          </p>
        </div>
      ) : !hasFiltered ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
          Ningun contenido coincide con estos filtros.
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MARKETING_PLANNER_STATUSES.map((status) => {
            const columnItems = byStatus.get(status) ?? [];
            const tone = PLANNER_STATUS_TONE[status];
            return (
              <section
                key={status}
                aria-label={PLANNER_STATUS_LABEL[status]}
                className="flex min-w-0 flex-col rounded-xl bg-muted/40"
              >
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", tone.accent)}
                      aria-hidden
                    />
                    <h3 className="text-sm font-medium">
                      {PLANNER_STATUS_LABEL[status]}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-1.5 font-mono text-[11px] tabular-nums",
                        tone.soft,
                        tone.text,
                      )}
                    >
                      {columnItems.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {PLANNER_STATUS_HINT[status]}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {columnItems.map((item) => (
                    <PlannerItemCard
                      key={item.id}
                      item={item}
                      avatars={avatars}
                      onEdit={openEdit}
                      expanded={expandedId === item.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                    />
                  ))}
                  {columnItems.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground/60">
                      Sin piezas
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <PlannerItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        avatars={avatars}
        item={editing}
      />
    </div>
  );
}

export default PlannerBoard;
