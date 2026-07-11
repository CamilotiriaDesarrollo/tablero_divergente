// types/db.ts
// Fuente unica de tipos de dominio y de base de datos (BLUEPRINT seccion 4).
// Escrito a mano para servir de CONTRATO compartido antes de la implementacion
// en paralelo. db-architect (Fase 1) escribe el SQL que corresponde EXACTO a
// estos tipos; si se regeneran con `supabase gen types`, deben coincidir.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Vocabulario de estados (CLAUDE.md / BLUEPRINT seccion 4) ---

export type ProjectStatus = "idea" | "activo" | "pausado" | "hecho" | "archivado";
export type TaskStatus = "inbox" | "todo" | "en_progreso" | "hecho";
export type Priority = "alta" | "media" | "baja";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "idea",
  "activo",
  "pausado",
  "hecho",
  "archivado",
];
export const TASK_STATUSES: TaskStatus[] = ["inbox", "todo", "en_progreso", "hecho"];
export const PRIORITIES: Priority[] = ["alta", "media", "baja"];

// --- Forma generada estilo Supabase (para createClient<Database>) ---

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: ProjectStatus;
          type: string[] | null;
          color: string | null;
          icon: string | null;
          cover_url: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
          type?: string[] | null;
          color?: string | null;
          icon?: string | null;
          cover_url?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
          type?: string[] | null;
          color?: string | null;
          icon?: string | null;
          cover_url?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          parent_task_id: string | null;
          title: string;
          notes: string | null;
          priority: Priority | null;
          status: TaskStatus;
          task_type: string[] | null;
          category: string | null;
          received_at: string | null;
          due_at: string | null;
          resource_url: string | null;
          is_daily: boolean;
          completed_at: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          notes?: string | null;
          priority?: Priority | null;
          status?: TaskStatus;
          task_type?: string[] | null;
          category?: string | null;
          received_at?: string | null;
          due_at?: string | null;
          resource_url?: string | null;
          is_daily?: boolean;
          completed_at?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          title?: string;
          notes?: string | null;
          priority?: Priority | null;
          status?: TaskStatus;
          task_type?: string[] | null;
          category?: string | null;
          received_at?: string | null;
          due_at?: string | null;
          resource_url?: string | null;
          is_daily?: boolean;
          completed_at?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey";
            columns: ["parent_task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
      task_status: TaskStatus;
      priority: Priority;
    };
    CompositeTypes: Record<string, never>;
  };
}

// --- Tipos de dominio de conveniencia (importar desde aqui en toda la app) ---

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

// Tarea con sus subtareas ya anidadas (uso en UI).
export type TaskWithSubtasks = Task & { subtasks?: Task[] };
// Tarea con el proyecto asociado resuelto (uso en listas/calendario).
export type TaskWithProject = Task & {
  project?: Pick<Project, "id" | "name" | "color" | "icon"> | null;
};
// Proyecto con conteo de tareas (uso en galeria/tablero).
export type ProjectWithCount = Project & { task_count?: number; open_count?: number };
