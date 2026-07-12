// app/(app)/layout.tsx
// Shell autenticado. Guard de sesion en el servidor (ademas del middleware) y
// montaje del cascaron con nav, barra de comando, asistente y Realtime.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { AppShell } from "@/components/shared/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Antes de configurar Supabase se puede ver el cascaron con un usuario ficticio.
  if (!isSupabaseConfigured()) {
    return (
      <AppShell userEmail="configura .env.local" userId="">
        {children}
      </AppShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell userEmail={user.email ?? "Cuenta"} userId={user.id}>
      {children}
    </AppShell>
  );
}
