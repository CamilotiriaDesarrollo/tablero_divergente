"use client";
// components/tareas/weekday-picker.tsx
// Selector de dias para una tarea semanal: siete botones que se encienden.
// Se usa igual en la captura rapida y en el formulario completo, para que
// "todos los lunes" se marque de la misma forma en toda la app.
import { cn } from "@/lib/utils";
import {
  WEEKDAYS,
  WEEKDAY_INITIAL,
  WEEKDAY_NAME,
  repeticionSemanalLabel,
} from "@/lib/utils/weekdays";

export function WeekdayPicker({
  value,
  onChange,
  disabled = false,
  idPrefix = "weekday",
}: {
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  function toggle(day: number) {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day].sort();
    onChange(next);
  }

  const resumen = repeticionSemanalLabel(value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Dias de repeticion">
        {WEEKDAYS.map((day) => {
          const activo = value.includes(day);
          return (
            <button
              key={day}
              id={`${idPrefix}-${day}`}
              type="button"
              onClick={() => toggle(day)}
              disabled={disabled}
              aria-pressed={activo}
              aria-label={WEEKDAY_NAME[day]}
              title={WEEKDAY_NAME[day]}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-xs font-medium",
                "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                activo
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {WEEKDAY_INITIAL[day]}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">
        {resumen || "Sin repeticion semanal. Toca los dias en que se repite."}
      </span>
    </div>
  );
}

export default WeekdayPicker;
