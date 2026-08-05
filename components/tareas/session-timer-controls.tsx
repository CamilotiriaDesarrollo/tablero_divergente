"use client";
// components/tareas/session-timer-controls.tsx
// Controles de "Hacer ahora": boton para activar, y una vez activo, pausar/
// reanudar + cuenta regresiva + detener. Extraido de KanbanCard para que el
// panel semanal de sesiones use EXACTAMENTE el mismo control (misma logica,
// mismos iconos, mismo cronometro de 50 min) en vez de duplicarlo.
import { useEffect, useState } from "react";
import { CirclePlay, Pause, Play, Square } from "lucide-react";
import {
  doingTimerRemainingMs,
  formatCountdown,
  type DoingTimer,
} from "@/lib/utils/doing-timer";
import { cn } from "@/lib/utils";

export function SessionTimerControls({
  taskId,
  isDoing,
  timer,
  onToggleDoing,
  onPauseTimer,
  onResumeTimer,
  activateLabel = "Hacer ahora",
  activateTitle = "Marcar como haciendo (arranca un cronometro de 50 minutos)",
}: {
  taskId: string;
  isDoing: boolean;
  /** Cronometro de esta tarea, si esta "haciendo". */
  timer?: DoingTimer;
  onToggleDoing: (taskId: string) => void;
  onPauseTimer: (taskId: string) => void;
  onResumeTimer: (taskId: string) => void;
  activateLabel?: string;
  activateTitle?: string;
}) {
  // El cronometro guarda un instante absoluto (endsAt), no "segundos
  // restantes": este tick solo fuerza un re-render cada segundo mientras
  // corre, para que el reloj se vea avanzar. En pausa no hay intervalo (queda
  // congelado) y no se desperdicia nada cuando la tarea no esta "haciendo".
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timer?.running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [timer?.running]);

  const remainingMs = timer ? doingTimerRemainingMs(timer) : 0;

  if (isDoing && timer) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => (timer.running ? onPauseTimer(taskId) : onResumeTimer(taskId))}
          aria-label={timer.running ? "Pausar cronometro" : "Continuar cronometro"}
          title={timer.running ? "Pausar" : "Continuar"}
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {timer.running ? (
            <Pause className="size-3.5 fill-current" />
          ) : (
            <Play className="size-3.5 fill-current" />
          )}
        </button>
        <span
          className={cn(
            "min-w-12 text-center font-mono text-sm font-semibold tabular-nums",
            remainingMs === 0
              ? "text-destructive"
              : "text-emerald-700 dark:text-emerald-400",
          )}
          aria-live="polite"
          title={timer.running ? "Tiempo restante" : "Tiempo restante (en pausa)"}
        >
          {formatCountdown(remainingMs)}
        </span>
        <button
          type="button"
          onClick={() => onToggleDoing(taskId)}
          aria-label="Dejar de hacer esta tarea"
          title="Dejar de hacer esta tarea"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Square className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggleDoing(taskId)}
      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      title={activateTitle}
    >
      <CirclePlay className="size-3.5" />
      {activateLabel}
    </button>
  );
}
