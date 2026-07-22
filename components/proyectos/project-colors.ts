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
  { token: "rojo", label: "Rojo", value: "#dc2626" },
  { token: "mandarina", label: "Mandarina", value: "#f97316" },
  { token: "amarillo", label: "Amarillo", value: "#eab308" },
  { token: "oliva", label: "Oliva", value: "#718b2e" },
  { token: "bosque", label: "Verde bosque", value: "#16803c" },
  { token: "jade", label: "Jade", value: "#00a77e" },
  { token: "petroleo", label: "Petroleo", value: "#0f766e" },
  { token: "cian", label: "Cian", value: "#0891b2" },
  { token: "azul-real", label: "Azul real", value: "#2563eb" },
  { token: "zafiro", label: "Zafiro", value: "#3f51c5" },
  { token: "purpura", label: "Purpura", value: "#7c3aed" },
  { token: "orquidea", label: "Orquidea", value: "#a21caf" },
  { token: "magenta", label: "Magenta", value: "#d11f8a" },
  { token: "vino", label: "Vino", value: "#a61b4a" },
  { token: "cobre", label: "Cobre", value: "#c65a25" },
  { token: "mostaza", label: "Mostaza", value: "#b88917" },
  { token: "gris-azul", label: "Gris azul", value: "#64748b" },
];

const BY_TOKEN = new Map(PROJECT_COLORS.map((c) => [c.token, c]));

/** Token de color por defecto cuando el proyecto no tiene uno. */
export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0].token;

/** Devuelve el hex del acento a partir del token guardado (o el neutro por defecto). */
export function projectColorValue(token: string | null | undefined): string {
  if (!token) return PROJECT_COLORS[0].value;
  if (/^#[0-9a-f]{6}$/i.test(token)) return token;
  return BY_TOKEN.get(token)?.value ?? PROJECT_COLORS[0].value;
}
