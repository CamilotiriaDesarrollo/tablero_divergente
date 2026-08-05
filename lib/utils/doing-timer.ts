// lib/utils/doing-timer.ts
// Cronometro de foco para "Hacer ahora" en el Kanban: cuenta regresiva de 50
// minutos por tarea, con pausa y reanudacion.
//
// Guarda un instante absoluto (endsAt), no "segundos restantes": asi el
// cronometro sobrevive un refresco de pagina calculando el tiempo real
// transcurrido, en vez de reiniciarse a 50:00 cada vez.

export const DOING_DURATION_MS = 50 * 60 * 1000;

export interface DoingTimer {
  /** Corriendo o en pausa. */
  running: boolean;
  /** Instante (epoch ms) en que llega a cero. Solo valido si running=true. */
  endsAt: number | null;
  /** Restante congelado: autoritativo en pausa; al arrancar/reanudar se
   * recalcula desde endsAt en cada render mientras corre. */
  remainingMs: number;
}

export function startDoingTimer(now = Date.now()): DoingTimer {
  return { running: true, endsAt: now + DOING_DURATION_MS, remainingMs: DOING_DURATION_MS };
}

export function pauseDoingTimer(timer: DoingTimer, now = Date.now()): DoingTimer {
  if (!timer.running || timer.endsAt === null) return timer;
  return { running: false, endsAt: null, remainingMs: Math.max(0, timer.endsAt - now) };
}

export function resumeDoingTimer(timer: DoingTimer, now = Date.now()): DoingTimer {
  if (timer.running) return timer;
  return { running: true, endsAt: now + timer.remainingMs, remainingMs: timer.remainingMs };
}

/** Restante en vivo: recalculado desde endsAt si corre, congelado si esta en pausa. */
export function doingTimerRemainingMs(timer: DoingTimer, now = Date.now()): number {
  if (!timer.running || timer.endsAt === null) return timer.remainingMs;
  return Math.max(0, timer.endsAt - now);
}

/** "49:32" a partir de milisegundos restantes. Nunca baja de "0:00". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
