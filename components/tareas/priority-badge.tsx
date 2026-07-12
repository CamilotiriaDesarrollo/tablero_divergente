// Insignia de prioridad: color + emoji + etiqueta. La prioridad es el UNICO
// color saturado de la app (BLUEPRINT seccion 6). Clases estaticas para que
// Tailwind las detecte (nada de bg-priority-${p} dinamico).
import type { Priority } from "@/types/db";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import { cn } from "@/lib/utils";

const PRIORITY_CLASSES: Record<Priority, string> = {
  alta: "bg-priority-alta/15 text-priority-alta border-priority-alta/30",
  media: "bg-priority-media/15 text-priority-media border-priority-media/30",
  baja: "bg-priority-baja/15 text-priority-baja border-priority-baja/30",
};

export function PriorityBadge({
  priority,
  showLabel = true,
  className,
}: {
  priority: Priority | null;
  showLabel?: boolean;
  className?: string;
}) {
  if (!priority) {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-fit items-center gap-1 rounded-full border border-border/60 px-2 text-xs text-muted-foreground",
          className,
        )}
      >
        Sin prioridad
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-2 text-xs font-medium",
        PRIORITY_CLASSES[priority],
        className,
      )}
    >
      <span aria-hidden>{PRIORITY_EMOJI[priority]}</span>
      {showLabel && <span>{PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}
