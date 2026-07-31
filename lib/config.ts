// lib/config.ts
// Configuracion de app disponible en cliente y servidor.

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Tablero Divergente";

export const APP_DESCRIPTION =
  "Gestion personal de proyectos, tareas, ideas y calendario. Los datos no deciden, las personas si.";

// Modulo Marketing: activo por defecto (usuario 001). Un clon de la app para
// otro dueno lo apaga con NEXT_PUBLIC_ENABLE_MARKETING=false.
export const MARKETING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MARKETING !== "false";

// Funciones de IA: asistente conversacional (/api/ai, ANTHROPIC_API_KEY) y
// transcripcion de voz (/api/transcribe, GROQ_API_KEY). Activas por defecto. Un
// clon SIN esas llaves las apaga con NEXT_PUBLIC_ENABLE_IA=false: asi no quedan
// botones que fallan al tocarlos (el asistente responderia 503 y el microfono
// grabaria para nada).
export const IA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_IA !== "false";

// True cuando Supabase tiene credenciales reales (no el placeholder de arranque).
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("placeholder") &&
      !key.includes("placeholder"),
  );
}
