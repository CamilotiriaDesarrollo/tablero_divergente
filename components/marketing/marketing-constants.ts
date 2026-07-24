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
 * editoriales (YouTube, LinkedIn, Instagram) y la extension Shorts. El campo es
 * texto libre en la base; esta lista solo alimenta el selector.
 */
export const PLANNER_NETWORKS: PlannerNetwork[] = [
  { name: "YouTube", slug: "youtube", color: "FF0000" },
  { name: "LinkedIn", slug: "linkedin", color: "0A66C2" },
  { name: "Instagram", slug: "instagram", color: "E4405F" },
  { name: "YouTube Shorts", slug: "youtube", color: "FF0000" },
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
