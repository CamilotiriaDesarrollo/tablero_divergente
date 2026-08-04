// components/marketing/marketing-constants.ts
// Vocabulario de la seccion Marketing (CLAUDE.md: un control mantiene su nombre
// en todo el flujo). Estados de una idea de contenido y formatos sugeridos.
import type { MarketingContentStatus, MarketingPlannerStatus } from "@/types/db";

export const CONTENT_STATUS_LABEL: Record<MarketingContentStatus, string> = {
  idea: "Idea",
  en_proceso: "En proceso",
  publicado: "Publicado",
};

/** Formatos de contenido sugeridos para el selector (texto libre en la base). */
export const CONTENT_FORMATS = [
  "Reel",
  "Carrusel",
  "Historia",
  "Video largo",
  "Post",
  "Blog",
  "Email",
] as const;

// ---------- Planeador de contenidos ----------

/** Metadatos de una red para el planeador (logo via ChannelMark + acento). */
export interface PlannerNetwork {
  name: string;
  /** slug de simpleicons (logo). */
  slug: string;
  /** color hex sin '#' para el logo/acento. */
  color: string;
}

/**
 * Redes donde Divergente crea o extiende contenido (ficha de canales): las tres
 * editoriales (YouTube, LinkedIn, Instagram), la extension Shorts y Skool, la
 * comunidad. El campo es texto libre en la base; esta lista solo alimenta el
 * selector, asi que agregar una red aqui no requiere tocar la base.
 *
 * Skool no esta en simpleicons: ChannelMark cae solo a la abreviatura "SK".
 */
export const PLANNER_NETWORKS: PlannerNetwork[] = [
  { name: "YouTube", slug: "youtube", color: "FF0000" },
  { name: "LinkedIn", slug: "linkedin", color: "0A66C2" },
  { name: "Instagram", slug: "instagram", color: "E4405F" },
  { name: "YouTube Shorts", slug: "youtube", color: "FF0000" },
  { name: "Skool", slug: "skool", color: "F59E0B" },
];

const NETWORK_BY_NAME = new Map(PLANNER_NETWORKS.map((n) => [n.name, n]));

/** Metadatos de una red por nombre, con respaldo neutro para texto libre. */
export function plannerNetworkMeta(name: string | null | undefined): PlannerNetwork {
  if (name && NETWORK_BY_NAME.has(name)) return NETWORK_BY_NAME.get(name)!;
  return { name: name?.trim() || "Sin red", slug: "", color: "64748b" };
}

/** Tipos de contenido sugeridos (texto libre en la base). */
export const PLANNER_CONTENT_TYPES = [
  "Video largo",
  "Short",
  "Reel",
  "Carrusel",
  "Historia",
  "Publicacion",
  "Documento",
  "Entrevista",
  "Caso",
  "Serie",
  "Directo",
] as const;

export const PLANNER_STATUS_LABEL: Record<MarketingPlannerStatus, string> = {
  borrador: "Borrador",
  en_proceso: "En proceso",
  listo: "Listo",
  publicado: "Publicado",
};

/** Descripcion corta de cada estado para el encabezado de columna del planeador. */
export const PLANNER_STATUS_HINT: Record<MarketingPlannerStatus, string> = {
  borrador: "Idea capturada, sin desarrollar",
  en_proceso: "En desarrollo o produccion",
  listo: "Listo para publicar",
  publicado: "Ya publicado",
};

/**
 * Color de cada estado del planeador. Es la misma senal repetida en tres sitios
 * (barra lateral de la tarjeta, punto del encabezado y chip del estado), para
 * que al mirar el tablero se sepa donde esta cada pieza sin leer una palabra.
 * El avance va de gris (sin empezar) a azul (publicado).
 */
export interface PlannerStatusTone {
  /** Barra vertical de la tarjeta y punto del encabezado de columna. */
  accent: string;
  /** Fondo tenue del chip y de la tarjeta expandida. */
  soft: string;
  /** Texto del chip, legible en claro y oscuro. */
  text: string;
}

export const PLANNER_STATUS_TONE: Record<MarketingPlannerStatus, PlannerStatusTone> = {
  borrador: {
    accent: "bg-slate-400 dark:bg-slate-500",
    soft: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
  },
  en_proceso: {
    accent: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
  },
  listo: {
    accent: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  publicado: {
    accent: "bg-sky-500",
    soft: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
  },
};
