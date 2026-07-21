// components/proyectos/project-colors.ts
// Paleta de proyectos: tonos bien separados para identificar cada iniciativa
// rapidamente en el calendario y en sus tarjetas.

export interface ProjectColor {
  /** Token que se guarda en projects.color. */
  token: string;
  /** Nombre humano para el selector. */
  label: string;
  /** Hex del acento. */
  value: string;
}

export const PROJECT_COLORS: ProjectColor[] = [
  { token: "pizarra", label: "Indigo", value: "#5b6ee1" },
  { token: "periwinkle", label: "Violeta", value: "#a879f7" },
  { token: "salvia", label: "Esmeralda", value: "#35bd87" },
  { token: "oceano", label: "Azul", value: "#2f9de8" },
  { token: "arena", label: "Ambar", value: "#eba540" },
  { token: "ciruela", label: "Fucsia", value: "#d96dc5" },
  { token: "turquesa", label: "Turquesa", value: "#24bfae" },
  { token: "coral", label: "Coral", value: "#ed6d6d" },
  { token: "lima", label: "Lima", value: "#a4c85a" },
  { token: "frambuesa", label: "Frambuesa", value: "#ea6f9c" },
];

const BY_TOKEN = new Map(PROJECT_COLORS.map((c) => [c.token, c]));

/** Token de color por defecto cuando el proyecto no tiene uno. */
export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0].token;

/** Devuelve el hex del acento a partir del token guardado (o el neutro por defecto). */
export function projectColorValue(token: string | null | undefined): string {
  if (!token) return PROJECT_COLORS[0].value;
  return BY_TOKEN.get(token)?.value ?? PROJECT_COLORS[0].value;
}
