// app/(app)/layout.tsx
// Shell autenticado (placeholder de Fase 0). La Fase 3 lo reemplaza con la
// navegacion lateral, la barra de comando (Cmd/Ctrl+K) y el panel de chat.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard de sesion en el servidor (defensa en profundidad ademas del middleware).
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
}
