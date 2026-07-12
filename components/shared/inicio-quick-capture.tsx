"use client";
// components/shared/inicio-quick-capture.tsx
// Captura rapida desde Inicio: crea una tarea en la bandeja (status inbox).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { quickCaptureAction } from "@/lib/db/actions";
import { toast } from "sonner";

export function InicioQuickCapture() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      try {
        await quickCaptureAction(text);
        setValue("");
        toast.success("Capturado en la bandeja");
        router.refresh();
      } catch {
        toast.error("No se pudo capturar", { description: "Intenta de nuevo." });
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Captura rapida: escribe algo y presiona Enter"
        aria-label="Captura rapida"
        disabled={pending}
      />
      <Button type="submit" size="icon" disabled={pending || !value.trim()} aria-label="Capturar">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
