// app/(app)/calendario/loading.tsx
// Estado de carga del calendario mientras se consulta el mes (navegacion entre
// meses). Esqueleto con la misma forma de la grilla para evitar saltos de layout.
import { Skeleton } from "@/components/ui/skeleton";
import { WEEKDAY_LABELS } from "@/components/calendario/month-range";

export default function CalendarioLoading() {
  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-40" />
          <div className="flex items-center gap-1">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="size-7 rounded-md" />
          </div>
        </div>

        {/* Grilla (tablet y escritorio). */}
        <div className="hidden overflow-hidden rounded-xl border border-border md:block">
          <div className="grid grid-cols-7 gap-px bg-border">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-24 bg-card p-1 sm:min-h-28">
                <Skeleton className="size-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Lista (movil). */}
        <div className="overflow-hidden rounded-xl border border-border md:hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b border-border p-2 last:border-b-0">
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
