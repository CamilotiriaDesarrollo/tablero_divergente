// app/(app)/proyectos/[id]/loading.tsx
// Estado de carga del detalle de proyecto (piso de calidad: skeleton).
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <Skeleton className="mb-4 h-4 w-24" />
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-6 w-28" />
        <div className="space-y-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
