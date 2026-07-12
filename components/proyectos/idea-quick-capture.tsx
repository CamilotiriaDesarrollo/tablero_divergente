"use client";
// components/proyectos/idea-quick-capture.tsx
// Captura rapida de una idea suelta. Crea un proyecto con status 'idea' usando
// solo el nombre (createProjectAction). Sin friccion: escribes y guardas.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "@/lib/db/actions";

export function IdeaQuickCapture() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Escribe la idea", {
        description: "Aunque sea una linea. Luego la desarrollas.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await createProjectAction({ name: trimmed, status: "idea" });
        toast.success("Idea guardada");
        setName("");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Intenta de nuevo en un momento.";
        toast.error("No se pudo guardar la idea", { description: message });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10 transition-shadow focus-within:ring-2 focus-within:ring-ring"
    >
      <Lightbulb
        aria-hidden="true"
        className="ml-1.5 size-4 shrink-0 text-muted-foreground"
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Anota una idea antes de que se escape"
        aria-label="Nueva idea"
        maxLength={200}
        className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
      <Button type="submit" disabled={pending} className="shrink-0">
        {pending ? "Guardando..." : "Guardar idea"}
      </Button>
    </form>
  );
}

export default IdeaQuickCapture;
