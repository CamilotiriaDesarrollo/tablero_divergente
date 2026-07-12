// app/(app)/calendario/page.tsx
// Vista de mes (RSC). Acepta ?mes=YYYY-MM (opcional, por defecto el mes actual).
// Expande el mes a semanas completas (lunes a domingo), consulta las tareas de
// ese rango por due_at con getTasksInRange y las entrega al Client Component.
// La page.tsx nunca consulta Supabase directo: usa lib/db (arquitectura).
import { getTasksInRange } from "@/lib/db/tasks";
import { CalendarMonth } from "@/components/calendario/calendar-month";
import {
  getMonthGridRange,
  parseMonthParam,
  toMonthParam,
} from "@/components/calendario/month-range";

export const metadata = {
  title: "Calendario",
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const ref = parseMonthParam(mes);
  const { from, to } = getMonthGridRange(ref);
  const tasks = await getTasksInRange(from, to);

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8">
      <CalendarMonth monthISO={toMonthParam(ref)} tasks={tasks} />
    </main>
  );
}
