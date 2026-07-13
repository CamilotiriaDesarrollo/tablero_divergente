"use client";
// app/(app)/error.tsx
// Boundary de error para las vistas de la app. Voz de interfaz: dice que paso y
// como seguir, sin pedir disculpas.
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-16 text-center">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        No pudimos cargar esta vista
      </h2>
      <p className="text-sm text-muted-foreground">
        Suele ser un problema momentaneo de conexion con la base de datos. Revisa
        que tus llaves de Supabase esten bien y que las migraciones esten
        aplicadas, y vuelve a intentar.
      </p>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RotateCw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
