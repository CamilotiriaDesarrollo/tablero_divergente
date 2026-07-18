// lib/db/context.ts
// Contexto inyectable de acceso a datos. Permite que lib/db/* funcione en DOS
// mundos sin cambiar firmas:
//   - Web (default): cliente por cookies de lib/supabase/server + identidad por
//     sesion (auth.getUser). RLS protege. Comportamiento identico al historico.
//   - Bot (runWithDbContext): cliente service_role + user_id fijo del dueno.
//     Como service_role bypassa RLS, lib/db anade .eq('user_id', ownerId()) como
//     defensa en profundidad en lecturas y mutaciones.
// TODO: si la app deja de ser de un solo dueno, revisar TODAS las consultas que
// corren bajo contexto bot (hoy asumen que cada fila visible es del dueno).
import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { createClient } from "@/lib/supabase/server";

export interface DbContext {
  /** Cliente de Supabase a usar en esta ejecucion. */
  getClient(): Promise<SupabaseClient<Database>>;
  /**
   * uuid del dueno cuando la identidad NO viene de la sesion (bot).
   * null = resolver por sesion de cookies (web, comportamiento historico).
   */
  userId: string | null;
}

const storage = new AsyncLocalStorage<DbContext>();

const defaultContext: DbContext = {
  // La web: cliente por cookies, identidad por sesion. Identico a antes.
  getClient: () => createClient() as unknown as Promise<SupabaseClient<Database>>,
  userId: null,
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
