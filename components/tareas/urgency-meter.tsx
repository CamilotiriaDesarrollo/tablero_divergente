"use client";
// EL ELEMENTO FIRMA (BLUEPRINT seccion 6): medidor compacto que se llena segun
// urgencySignal().score y se colorea segun el nivel usando el color de prioridad
// (el unico color saturado de la app). SUGIERE orden, NUNCA reordena solo. El
// tooltip explica el porque; el texto deja claro que es solo una sugerencia.
import type { Priority } from "@/types/db";
import {
  urgencySignal,
  type UrgencyLevel,
} from "@/lib/utils/urgency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Nivel -> color de prioridad (clases estaticas para Tailwind).
const LEVEL_FILL: Record<UrgencyLevel, string> = {
  critica: "bg-priority-alta",
  elevada: "bg-priority-media",
  moderada: "bg-priority-baja",
  tranquila: "bg-muted-foreground/40",
};

const LEVEL_LABEL: Record<UrgencyLevel, string> = {
  critica: "Urgencia critica",
  elevada: "Urgencia elevada",
  moderada: "Urgencia moderada",
  tranquila: "Urgencia tranquila",
};

export function UrgencyMeter({
  priority,
  dueAt,
  done = false,
  showValue = false,
  className,
}: {
  priority: Priority | null;
  dueAt: string | null;
  done?: boolean;
  showValue?: boolean;
  className?: string;
}) {
  const signal = urgencySignal({ priority, dueAt, done });

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              role="meter"
              aria-label={`${LEVEL_LABEL[signal.level]}. ${signal.reason}`}
              aria-valuenow={signal.score}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              className={cn(
                "flex items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                className,
              )}
            />
          }
        >
          <span className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-300",
                LEVEL_FILL[signal.level],
              )}
              style={{ width: `${signal.score}%` }}
            />
          </span>
          {showValue && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {signal.score}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-56">
          <span className="flex flex-col gap-0.5 text-left">
            <span className="font-medium">{LEVEL_LABEL[signal.level]}</span>
            <span className="opacity-90">{signal.reason}</span>
            <span className="mt-0.5 opacity-70">
              Es una sugerencia. Tu decides el orden.
            </span>
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
