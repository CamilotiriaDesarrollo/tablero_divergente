// app/(app)/calendario/page.tsx
// Vista de mes (RSC). Acepta ?mes=YYYY-MM (opcional, por defecto el mes actual).
// Expande el mes a semanas completas (lunes a domingo), consulta las tareas de
// ese rango por due_at con getTasksInRange y las entrega al Client Component.
// La page.tsx nunca consulta Supabase directo: usa lib/db (arquitectura).
import { getTasks, getTasksInRange } from "@/lib/db/tasks";
import { CalendarMonth } from "@/components/calendario/calendar-month";
import { esSemanal } from "@/lib/utils/weekdays";
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

  // Las tareas con fecha se buscan por rango. Las semanales no tienen una fecha
  // sola (se repiten), asi que se traen aparte y el cliente las reparte en los
  // dias que correspondan. Se filtran en memoria y no por SQL a proposito: asi
  // la pantalla no se cae si la migracion 0014 todavia no esta aplicada.
  const [tasks, todas] = await Promise.all([
    getTasksInRange(from, to),
    getTasks({
      status: ["todo", "en_progreso"],
      topLevelOnly: true,
      withProject: true,
    }),
  ]);
  const weeklyTasks = todas.filter(esSemanal);

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8">
      <CalendarMonth
        monthISO={toMonthParam(ref)}
        tasks={tasks}
        weeklyTasks={weeklyTasks}
      />
    </main>
  );
}
