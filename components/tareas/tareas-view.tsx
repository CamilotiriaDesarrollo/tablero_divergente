"use client";
// Vista principal de tareas: Tabs (Tabla / Kanban / Tiempo / Diarias) sobre el
// mismo dato, mas el boton global "Nueva tarea". Mantiene el estado de los
// dialogos de crear y editar. Los datos llegan como props desde el RSC.
import { useState } from "react";
import { Plus, List, Columns3, Clock, Repeat } from "lucide-react";
import type { Project, Task, TaskWithProject } from "@/types/db";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TaskTable } from "@/components/tareas/task-table";
import { KanbanBoard } from "@/components/tareas/kanban-board";
import { TimeBucketsBoard } from "@/components/tareas/time-buckets-board";
import { DailyTasks } from "@/components/tareas/daily-tasks";
import { TaskForm } from "@/components/tareas/task-form";

type ProjectOption = Pick<Project, "id" | "name" | "color" | "icon" | "status">;

export function TareasView({
  boardTasks,
  dailyTasks,
  projects,
}: {
  boardTasks: TaskWithProject[];
  dailyTasks: TaskWithProject[];
  projects: ProjectOption[];
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Tareas
          </h1>
          <p className="text-sm text-muted-foreground">
            El mismo dato en cuatro vistas. La urgencia sugiere, tu decides.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus />
          Nueva tarea
        </Button>
      </header>

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
          <TabsTrigger value="diarias">
            <Repeat />
            Diarias
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

        <TabsContent value="diarias">
          <DailyTasks tasks={dailyTasks} onEdit={setEditingTask} />
        </TabsContent>
      </Tabs>

      {/* Crear */}
      <TaskForm
        open={newOpen}
        onOpenChange={setNewOpen}
        projects={projects}
        defaultStatus="todo"
      />

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
