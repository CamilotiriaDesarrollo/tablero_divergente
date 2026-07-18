// lib/supabase/admin.ts
// Cliente de Supabase con service_role para el BOT (sin cookies, bypassa RLS).
// SOLO servidor: el import de "server-only" rompe el build si algun codigo de
// cliente lo importa por accidente. Jamas exportar desde componentes.
// Regla (BLUEPRINT-BOT seccion 6): este modulo solo se importa desde el canal
// del bot (lib/bot/*, app/api/telegram/*). La web sigue en anon key + RLS.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

let cached: SupabaseClient<Database> | null = null;

/** True cuando la service_role key esta configurada de verdad. */
export function isAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && !url.includes("placeholder") && !key.includes("placeholder"));
}

/**
 * Cliente admin (service_role). Lanza si falta configuracion: fail-fast,
 * nunca degradar en silencio a un cliente sin permisos.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no esta configurada. El bot la necesita para operar sin cookies.",
    );
  }
  if (!cached) {
    cached = createSupabaseClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
