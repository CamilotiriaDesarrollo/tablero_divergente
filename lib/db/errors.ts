// lib/db/errors.ts
// Codigos de "tabla inexistente": Postgres crudo (42P01) y PostgREST (PGRST205).
// Cuando una migracion aditiva (marketing, tareas semanales, completions) aun no
// se aplico, lib/db degrada a vacio en vez de romper la pagina.
export function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}
