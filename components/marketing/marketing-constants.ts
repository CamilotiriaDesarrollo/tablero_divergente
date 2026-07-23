// components/marketing/marketing-constants.ts
// Vocabulario de la seccion Marketing (CLAUDE.md: un control mantiene su nombre
// en todo el flujo). Estados de una idea de contenido y formatos sugeridos.
import type { MarketingContentStatus } from "@/types/db";

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
