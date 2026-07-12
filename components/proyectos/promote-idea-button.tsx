"use client";
// components/proyectos/promote-idea-button.tsx
// Promueve una idea a proyecto activo SIN perder datos (promoteIdeaAction solo
// cambia el status). Consistencia de vocabulario: el boton "Promover a activo"
// produce el aviso "Promovida a activo".
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { promoteIdeaAction } from "@/lib/db/actions";

export function PromoteIdeaButton({
  ideaId,
  className,
}: {
  ideaId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function promote() {
    startTransition(async () => {
      try {
        await promoteIdeaAction(ideaId);
        toast.success("Promovida a activo");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Intenta de nuevo en un momento.";
        toast.error("No se pudo promover la idea", { description: message });
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={promote}
      disabled={pending}
      className={className}
    >
      <ArrowUpRight />
      {pending ? "Promoviendo..." : "Promover a activo"}
    </Button>
  );
}

export default PromoteIdeaButton;
