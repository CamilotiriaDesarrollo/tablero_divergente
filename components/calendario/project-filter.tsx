"use client";
// components/calendario/project-filter.tsx
// Filtro de proyectos del calendario, que hace tambien de LEYENDA: en la grilla
// cada tarea se identifica por color e icono, y aqui se ve a que proyecto
// corresponde cada uno. Un clic deja el mes con un solo proyecto; otro clic en
// el mismo chip vuelve a mostrarlos todos.
//
// Solo aparecen los proyectos que TIENEN tareas en el mes visible, para que la
// fila no se llene de proyectos irrelevantes al navegar entre meses.
import { cn } from "@/lib/utils";
import { projectColorValue } from "@/components/proyectos/project-colors";

/** Valor del filtro cuando no se filtra por nada. */
export const ALL_PROJECTS = "todos";
/** Cubo para las tareas que no pertenecen a ningun proyecto. */
export const NO_PROJECT = "sin-proyecto";

export interface ProjectFacet {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
}

export function ProjectFilter({
  facets,
  total,
  selected,
  onSelect,
}: {
  facets: ProjectFacet[];
  total: number;
  selected: string;
  onSelect: (id: string) => void;
}) {
  // Con un solo proyecto en el mes, filtrar no aporta nada: no lo mostramos.
  if (facets.length < 2) return null;

  return (
    <div
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      role="group"
      aria-label="Filtrar el calendario por proyecto"
    >
      <FilterChip
        label="Todos"
        count={total}
        active={selected === ALL_PROJECTS}
        onClick={() => onSelect(ALL_PROJECTS)}
      />
      {facets.map((facet) => (
        <FilterChip
          key={facet.id}
          label={facet.name}
          icon={facet.icon}
          color={facet.id === NO_PROJECT ? null : projectColorValue(facet.color)}
          count={facet.count}
          active={selected === facet.id}
          // Volver a tocar el proyecto activo quita el filtro: sin callejon sin salida.
          onClick={() => onSelect(selected === facet.id ? ALL_PROJECTS : facet.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  icon,
  color,
  count,
  active,
  onClick,
}: {
  label: string;
  icon?: string | null;
  color?: string | null;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Quitar el filtro de ${label}` : `Ver solo ${label}`}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-transparent font-medium text-foreground"
          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
      )}
      // El color del proyecto tine el chip activo, sin gritar: la grilla sigue
      // siendo lo importante de la pantalla.
      style={
        active && color
          ? { backgroundColor: `${color}22`, borderColor: `${color}66` }
          : undefined
      }
    >
      {icon ? (
        <span className="text-[11px] leading-none" aria-hidden>
          {icon}
        </span>
      ) : color ? (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      <span className="max-w-36 truncate">{label}</span>
      <span className="font-mono text-[10px] tabular-nums opacity-60">{count}</span>
    </button>
  );
}
