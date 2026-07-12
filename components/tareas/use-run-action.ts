"use client";
// Helper compartido de mutacion para los Client Components de tareas.
// Envuelve una Server Action en un useTransition, refresca los RSC tras exito
// y traduce el error a la voz de la interfaz (que paso, como seguir; sin
// disculpas, sin em-dashes). ARQUITECTURA: mutar solo via *Action de
// lib/db/actions dentro de una transicion, luego router.refresh().
import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RunOptions {
  /** Aviso de exito. Si se omite, no muestra toast al terminar bien. */
  success?: string;
  /** Mensaje de error con voz de la interfaz. */
  error?: string;
  /** Se ejecuta tras un exito (por ejemplo, cerrar un dialogo). */
  onSuccess?: () => void;
  /** Refrescar los RSC tras exito. Por defecto true. */
  refresh?: boolean;
}

export function useRunAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (action: () => Promise<unknown>, options: RunOptions = {}) => {
      startTransition(async () => {
        try {
          await action();
          if (options.success) toast.success(options.success);
          if (options.refresh !== false) router.refresh();
          options.onSuccess?.();
        } catch {
          toast.error(
            options.error ??
              "No se pudo guardar el cambio. Revisa tu conexion e intenta de nuevo.",
          );
        }
      });
    },
    [router],
  );

  return { run, pending };
}
