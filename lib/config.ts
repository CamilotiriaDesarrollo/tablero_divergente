// lib/config.ts
// Configuracion de app disponible en cliente y servidor.

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Tablero Divergente";

export const APP_DESCRIPTION =
  "Gestion personal de proyectos, tareas, ideas y calendario. Los datos no deciden, las personas si.";

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
