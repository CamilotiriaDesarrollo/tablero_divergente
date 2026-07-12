"use client";
// Captura rapida de una linea (BLUEPRINT: patron GTD, capturar sin friccion).
// Foco automatico, Enter agrega y limpia manteniendo el foco. Va a la bandeja
// (quickCaptureAction: status inbox, sin proyecto ni fecha).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { quickCaptureAction } from "@/lib/db/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function QuickCapture({
  placeholder = "Captura una tarea y presiona Enter",
  autoFocus = true,
}: {
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function capture() {
    const title = value.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await quickCaptureAction(title);
      setValue("");
      router.refresh();
      inputRef.current?.focus();
    } catch {
      toast.error("No se pudo capturar la tarea. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void capture();
          }
        }}
        placeholder={placeholder}
        aria-label="Captura rapida"
        className="h-10 flex-1"
      />
      <Button
        onClick={() => void capture()}
        disabled={busy || value.trim().length === 0}
        className="h-10"
      >
        <Plus />
        Agregar
      </Button>
    </div>
  );
}
