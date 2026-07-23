// app/(app)/marketing/loading.tsx
// Estado de carga de Marketing (piso de calidad: skeleton).
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      <Skeleton className="mt-5 h-28 w-full rounded-xl" />
      <Skeleton className="mt-4 h-14 w-full rounded-xl" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
