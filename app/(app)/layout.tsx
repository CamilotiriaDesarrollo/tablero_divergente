// app/(app)/layout.tsx
// Shell de la app. MODO DUENO UNICO: sin login ni guard de sesion; la app
// siempre actua como el dueno fijo (lib/owner.ts). Monta nav, barra de comando,
// asistente y Realtime.
import { AppShell } from "@/components/shared/app-shell";
import { OWNER_USER_ID } from "@/lib/owner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell userId={OWNER_USER_ID}>{children}</AppShell>;
}
