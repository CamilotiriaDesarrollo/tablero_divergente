// components/proyectos/project-colors.ts
// Paleta pequena de acentos de proyecto. GUARDRAIL de diseno (BLUEPRINT seccion 6):
// el unico color saturado de la app son las prioridades. El color del proyecto es
// un acento SUTIL (punto/anillo), nunca llena la tarjeta. Por eso son tonos
// contenidos y solo aparecen en un punto o un anillo fino.

export interface ProjectColor {
  /** Token que se guarda en projects.color. */
  token: string;
  /** Nombre humano para el selector. */
  label: string;
  /** Hex del acento (tono contenido, no saturado). */
  value: string;
}

export const PROJECT_COLORS: ProjectColor[] = [
  { token: "pizarra", label: "Pizarra", value: "#6b7280" },
  { token: "periwinkle", label: "Periwinkle", value: "#8a7cff" },
  { token: "salvia", label: "Salvia", value: "#6b9b7a" },
  { token: "oceano", label: "Oceano", value: "#5a8fb5" },
  { token: "arena", label: "Arena", value: "#b08968" },
  { token: "ciruela", label: "Ciruela", value: "#9b6b9e" },
];

const BY_TOKEN = new Map(PROJECT_COLORS.map((c) => [c.token, c]));

/** Token de color por defecto cuando el proyecto no tiene uno. */
export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0].token;

/** Devuelve el hex del acento a partir del token guardado (o el neutro por defecto). */
export function projectColorValue(token: string | null | undefined): string {
  if (!token) return PROJECT_COLORS[0].value;
  return BY_TOKEN.get(token)?.value ?? PROJECT_COLORS[0].value;
}
