// app/(app)/page.tsx
// Inicio / Foco (placeholder de Fase 0). La Fase 3 construye el panel real:
// vencido, hoy, proximo, captura rapida y lectura de urgencia.
import { APP_NAME } from "@/lib/config";

export default function InicioPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {APP_NAME}
      </h1>
      <p className="text-muted-foreground">
        Andamiaje listo. Los modulos se construyen por fases.
      </p>
    </main>
  );
}
