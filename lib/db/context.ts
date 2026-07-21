// lib/db/context.ts
// Contexto inyectable de acceso a datos. Permite que lib/db/* funcione en DOS
// mundos sin cambiar firmas:
//   - Web (default): MODO DUENO UNICO. Cliente por cookies (anon) + identidad
//     fija OWNER_USER_ID (lib/owner.ts). No hay login: la app siempre actua como
//     el dueno. lib/db anade .eq('user_id', OWNER_USER_ID) en cada consulta.
//   - Bot (runWithDbContext): cliente service_role + el mismo user_id del dueno.
// En ambos casos ownerId() devuelve el uuid del dueno, y lib/db filtra por el.
import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { createClient } from "@/lib/supabase/server";
import { OWNER_USER_ID } from "@/lib/owner";

// Memoiza la construccion del cliente web por-request (React cache): los 3-4
// lectores paralelos de un mismo render comparten UN cliente en vez de crear uno
// por consulta. Solo memoiza la CONSTRUCCION, no los resultados: cada .select()
// sigue pegandole a la DB, asi que la frescura no cambia.
const getWebClient = cache(
  () => createClient() as unknown as Promise<SupabaseClient<Database>>,
);

export interface DbContext {
  /** Cliente de Supabase a usar en esta ejecucion. */
  getClient(): Promise<SupabaseClient<Database>>;
  /**
   * uuid del dueno con el que operan todas las consultas/mutaciones.
   * En modo dueno unico siempre esta definido (web y bot).
   */
  userId: string | null;
}

const storage = new AsyncLocalStorage<DbContext>();

const defaultContext: DbContext = {
  // La web en modo dueno unico: cliente por cookies (anon), identidad FIJA.
  getClient: () => getWebClient(),
  userId: OWNER_USER_ID,
};

/** Contexto activo (bot si estamos dentro de runWithDbContext; web si no). */
export function dbContext(): DbContext {
  return storage.getStore() ?? defaultContext;
}

/**
 * Ejecuta fn con un contexto explicito (el bot envuelve TODO su procesamiento
 * aqui). Las llamadas anidadas a lib/db resuelven cliente e identidad de este
 * contexto sin tocar cookies.
 */
export function runWithDbContext<T>(ctx: DbContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/**
 * Filtro de dueno para defensa en profundidad: devuelve el user_id fijo cuando
 * el contexto lo define (bot / service_role, donde RLS no aplica) y null en la
 * web (donde RLS ya filtra y anadir el filtro exigiria una llamada extra de auth).
 */
export function ownerId(): string | null {
  return dbContext().userId;
}
