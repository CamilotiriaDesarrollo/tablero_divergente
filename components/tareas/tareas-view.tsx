"use client";
// Vista principal de tareas: Tabs (Tabla / Kanban / Tiempo / Diarias) sobre el
// mismo dato, mas el boton redondo de captura. Mantiene el estado del dialogo
// de edicion. Los datos llegan como props desde el RSC.
//
// Crear es el MISMO boton y el MISMO dialogo de Inicio (con microfono): una
// tarea se captura igual desde donde sea. Editar sigue usando TaskForm, que
// ademas muestra las subtareas y la fase.
import { useState } from "react";
import { List, Columns3, Clock, Repeat } from "lucide-react";
import type { Project, Task, TaskWeeklyCompletion, TaskWithProject } from "@/types/db";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { TaskCaptureButton } from "@/components/shared/quick-capture-buttons";
import { WorkloadHeatmap } from "@/components/inicio/workload-heatmap";
import { TaskTable } from "@/components/tareas/task-table";
import { KanbanBoard } from "@/components/tareas/kanban-board";
import { TimeBucketsBoard } from "@/components/tareas/time-buckets-board";
import { RepeatingTasks } from "@/components/tareas/daily-tasks";
import { TaskForm } from "@/components/tareas/task-form";
import { DoingSessionsProvider } from "@/components/tareas/doing-sessions-context";
import { esSemanal } from "@/lib/utils/weekdays";
import type { WorkloadDay } from "@/lib/utils/workload";

type ProjectOption = Pick<Project, "id" | "name" | "color" | "icon" | "status">;

export function TareasView({
  boardTasks,
  dailyTasks,
  projects,
  workloadDays,
  weeklyCompletions,
}: {
  boardTasks: TaskWithProject[];
  dailyTasks: TaskWithProject[];
  projects: ProjectOption[];
  workloadDays: WorkloadDay[];
  weeklyCompletions: TaskWeeklyCompletion[];
}) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Las semanales se derivan de las tareas que ya trajimos, sin consultar de
  // nuevo: asi la pantalla sigue funcionando aunque la migracion 0014 aun no
  // este aplicada (sin columna, ninguna tarea es semanal y ya).
  const weeklyTasks = boardTasks.filter(esSemanal);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Arriba del todo y plegado: su titulo ya avisa si hay dias cargados, y
          se despliega solo cuando quieres mirar como vienes de carga. */}
      <WorkloadHeatmap days={workloadDays} collapsible />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Tareas
          </h1>
          <p className="text-sm text-muted-foreground">
            El mismo dato en cuatro vistas. La urgencia sugiere, tu decides.
          </p>
        </div>
        <div className="shrink-0">
          <TaskCaptureButton projects={projects} />
        </div>
      </header>

      {/*
        El Provider vive AQUI, por encima de <Tabs>, no dentro de KanbanBoard
        ni de RepeatingTasks: Base UI Tabs desmonta el contenido de la pestana
        inactiva (verificado en su codigo fuente), asi que si cada pestana
        tuviera su propio estado de "haciendo", cambiar de pestana mataria el
        cronometro en marcha. Con el Provider aqui arriba, las dos pestanas
        comparten la MISMA sesion activa en vivo.
      */}
      <DoingSessionsProvider tasks={boardTasks}>
        <Tabs defaultValue="tabla" className="gap-4">
          <TabsList className="h-9 w-full max-w-md">
            <TabsTrigger value="tabla">
              <List />
              Tabla
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <Columns3 />
              Proceso
            </TabsTrigger>
            <TabsTrigger value="tiempo">
              <Clock />
              Tiempo
            </TabsTrigger>
            <TabsTrigger value="repetitivas">
              <Repeat />
              Repetitivas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tabla">
            <TaskTable tasks={boardTasks} onEdit={setEditingTask} />
          </TabsContent>

          <TabsContent value="kanban">
            <KanbanBoard tasks={boardTasks} onEdit={setEditingTask} />
          </TabsContent>

          <TabsContent value="tiempo">
            <TimeBucketsBoard tasks={boardTasks} onEdit={setEditingTask} />
          </TabsContent>

          <TabsContent value="repetitivas">
            <RepeatingTasks
              dailyTasks={dailyTasks}
              weeklyTasks={weeklyTasks}
              initialWeeklyCompletions={weeklyCompletions}
              onEdit={setEditingTask}
            />
          </TabsContent>
        </Tabs>
      </DoingSessionsProvider>

      {/* Editar */}
      <TaskForm
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        projects={projects}
        task={editingTask}
      />
    </div>
  );
}
