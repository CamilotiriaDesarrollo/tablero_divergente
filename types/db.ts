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

// --- Vocabulario del bot (BLUEPRINT-BOT seccion 4) ---
export type BotRole = "user" | "assistant";
export type BotMessageStatus = "processing" | "done";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "idea",
  "activo",
  "pausado",
  "hecho",
  "archivado",
];
export const TASK_STATUSES: TaskStatus[] = ["inbox", "todo", "en_progreso", "hecho"];
export const PRIORITIES: Priority[] = ["alta", "media", "baja"];

// --- Vocabulario de Marketing (avatares e ideas de contenido) ---
// Una idea de contenido nace como 'idea', pasa a 'en_proceso' y termina
// 'publicado'. No hay reordenamiento automatico: el estado es senal, no decision.
export type MarketingContentStatus = "idea" | "en_proceso" | "publicado";
export type MarketingObservationKind = "nota" | "hipotesis" | "evidencia";
export type MarketingObservationStatus =
  | "en_observacion"
  | "por_validar"
  | "confirmada"
  | "refutada";
// Bloques de la ficha completa de un avatar (buyer persona extenso, transcrito
// 1:1 desde el documento fuente). "grid" = 2-3 columnas lado a lado con su
// propio encabezado cada una (se apilan en pantallas angostas).
export type PersonaBlock =
  | { type: "text"; label?: string; body: string }
  | { type: "quote"; label?: string; body: string }
  | { type: "list"; label?: string; body?: string; items: string[] }
  | { type: "table"; label?: string; headers: string[]; rows: string[][] }
  | {
      type: "grid";
      label?: string;
      columns: { label: string; body?: string; items?: string[] }[];
    };

export interface PersonaSection {
  title: string;
  blocks: PersonaBlock[];
}

export const MARKETING_CONTENT_STATUSES: MarketingContentStatus[] = [
  "idea",
  "en_proceso",
  "publicado",
];

// Planeador de contenidos: una pieza pasa de 'borrador' a 'en_proceso', queda
// 'listo' para publicar y termina 'publicado'. El estado es senal, no decision:
// cambiarlo no reordena nada (CLAUDE.md).
export type MarketingPlannerStatus =
  | "borrador"
  | "en_proceso"
  | "listo"
  | "publicado";

export const MARKETING_PLANNER_STATUSES: MarketingPlannerStatus[] = [
  "borrador",
  "en_proceso",
  "listo",
  "publicado",
];

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
          phase_id: string | null;
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
          // Dias de repeticion semanal (1=lunes .. 7=domingo). Nullable a
          // proposito: si la migracion 0014 aun no se aplico, la columna no
          // llega en el select y hay que leerla siempre con `?? []`.
          weekly_days: number[] | null;
          completed_at: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          phase_id?: string | null;
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
          weekly_days?: number[];
          completed_at?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          phase_id?: string | null;
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
          weekly_days?: number[];
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
            foreignKeyName: "tasks_phase_id_fkey";
            columns: ["phase_id"];
            referencedRelation: "phases";
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
      phases: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          name: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id: string;
          name: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          name?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "phases_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      bot_messages: {
        Row: {
          id: string;
          user_id: string;
          chat_id: number;
          telegram_update_id: number | null;
          status: BotMessageStatus;
          role: BotRole;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chat_id: number;
          telegram_update_id?: number | null;
          status?: BotMessageStatus;
          role: BotRole;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chat_id?: number;
          telegram_update_id?: number | null;
          status?: BotMessageStatus;
          role?: BotRole;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bot_pending_actions: {
        Row: {
          id: string;
          user_id: string;
          chat_id: number;
          tool_name: string;
          tool_input: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chat_id: number;
          tool_name: string;
          tool_input: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chat_id?: number;
          tool_name?: string;
          tool_input?: Json;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bot_state: {
        Row: {
          key: string;
          user_id: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          user_id: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          user_id?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      marketing_avatars: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          headline: string | null;
          description: string | null;
          color: string | null;
          icon: string | null;
          photo_url: string | null;
          persona_sections: PersonaSection[] | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          slug: string;
          headline?: string | null;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          photo_url?: string | null;
          persona_sections?: PersonaSection[] | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          headline?: string | null;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          photo_url?: string | null;
          persona_sections?: PersonaSection[] | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marketing_content_ideas: {
        Row: {
          id: string;
          user_id: string;
          avatar_id: string;
          task_id: string | null;
          title: string;
          notes: string | null;
          format: string | null;
          status: MarketingContentStatus;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          avatar_id: string;
          task_id?: string | null;
          title: string;
          notes?: string | null;
          format?: string | null;
          status?: MarketingContentStatus;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          avatar_id?: string;
          task_id?: string | null;
          title?: string;
          notes?: string | null;
          format?: string | null;
          status?: MarketingContentStatus;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_content_ideas_avatar_id_fkey";
            columns: ["avatar_id"];
            referencedRelation: "marketing_avatars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_content_ideas_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_avatar_observations: {
        Row: {
          id: string;
          user_id: string;
          avatar_id: string;
          kind: MarketingObservationKind;
          title: string;
          content: string | null;
          status: MarketingObservationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          avatar_id: string;
          kind?: MarketingObservationKind;
          title: string;
          content?: string | null;
          status?: MarketingObservationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          avatar_id?: string;
          kind?: MarketingObservationKind;
          title?: string;
          content?: string | null;
          status?: MarketingObservationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_avatar_observations_avatar_id_fkey";
            columns: ["avatar_id"];
            referencedRelation: "marketing_avatars";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_planner_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          network: string | null;
          content_type: string | null;
          avatar_ids: string[];
          hook: string | null;
          angle: string | null;
          bullets: string[];
          script: string | null;
          cta: string | null;
          status: MarketingPlannerStatus;
          scheduled_for: string | null;
          source_idea_id: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          network?: string | null;
          content_type?: string | null;
          avatar_ids?: string[];
          hook?: string | null;
          angle?: string | null;
          bullets?: string[];
          script?: string | null;
          cta?: string | null;
          status?: MarketingPlannerStatus;
          scheduled_for?: string | null;
          source_idea_id?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          network?: string | null;
          content_type?: string | null;
          avatar_ids?: string[];
          hook?: string | null;
          angle?: string | null;
          bullets?: string[];
          script?: string | null;
          cta?: string | null;
          status?: MarketingPlannerStatus;
          scheduled_for?: string | null;
          source_idea_id?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_planner_items_source_idea_id_fkey";
            columns: ["source_idea_id"];
            referencedRelation: "marketing_content_ideas";
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

// Fase / modulo dentro de un proyecto (agrupa tareas para organizarlas).
export type Phase = Database["public"]["Tables"]["phases"]["Row"];
export type PhaseInsert = Database["public"]["Tables"]["phases"]["Insert"];
export type PhaseUpdate = Database["public"]["Tables"]["phases"]["Update"];
// Fase con sus tareas ya agrupadas (uso en el detalle de proyecto).
export type PhaseWithTasks = Phase & { tasks: Task[] };
// Opcion ligera de fase para selects.
export type PhaseOption = Pick<Phase, "id" | "name" | "position">;

// Tarea con sus subtareas ya anidadas (uso en UI).
export type TaskWithSubtasks = Task & { subtasks?: Task[] };
// Tarea con el proyecto asociado resuelto (uso en listas/calendario).
export type TaskWithProject = Task & {
  project?: Pick<Project, "id" | "name" | "color" | "icon"> | null;
};
// Proyecto con conteo de tareas (uso en galeria/tablero).
export type ProjectWithCount = Project & { task_count?: number; open_count?: number };
export type ProjectWithMetrics = ProjectWithCount & {
  done_count: number;
  high_priority_count: number;
  overdue_count: number;
};

// --- Tablas del bot (BLUEPRINT-BOT seccion 4) ---

export type BotMessage = Database["public"]["Tables"]["bot_messages"]["Row"];
export type BotMessageInsert = Database["public"]["Tables"]["bot_messages"]["Insert"];
export type BotPendingAction =
  Database["public"]["Tables"]["bot_pending_actions"]["Row"];
export type BotPendingActionInsert =
  Database["public"]["Tables"]["bot_pending_actions"]["Insert"];
export type BotStateRow = Database["public"]["Tables"]["bot_state"]["Row"];

// --- Marketing: avatares (buyer personas) e ideas de contenido ---

export type MarketingAvatar = Database["public"]["Tables"]["marketing_avatars"]["Row"];
export type MarketingAvatarInsert =
  Database["public"]["Tables"]["marketing_avatars"]["Insert"];
export type MarketingAvatarUpdate =
  Database["public"]["Tables"]["marketing_avatars"]["Update"];

export type MarketingContentIdea =
  Database["public"]["Tables"]["marketing_content_ideas"]["Row"];
export type MarketingContentIdeaInsert =
  Database["public"]["Tables"]["marketing_content_ideas"]["Insert"];
export type MarketingContentIdeaUpdate =
  Database["public"]["Tables"]["marketing_content_ideas"]["Update"];
export type MarketingAvatarObservation =
  Database["public"]["Tables"]["marketing_avatar_observations"]["Row"];
export type MarketingAvatarObservationInsert =
  Database["public"]["Tables"]["marketing_avatar_observations"]["Insert"];
export type MarketingAvatarObservationUpdate =
  Database["public"]["Tables"]["marketing_avatar_observations"]["Update"];

// Avatar con sus ideas de contenido ya agrupadas (uso en la vista de Marketing).
export type MarketingAvatarWithIdeas = MarketingAvatar & {
  ideas: MarketingContentIdea[];
  observations: MarketingAvatarObservation[];
};

// Planeador de contenidos: la pieza completa (red, tipo, avatares, hook, angulo,
// bullets, guion y CTA) que se planea y publica.
export type MarketingPlannerItem =
  Database["public"]["Tables"]["marketing_planner_items"]["Row"];
export type MarketingPlannerItemInsert =
  Database["public"]["Tables"]["marketing_planner_items"]["Insert"];
export type MarketingPlannerItemUpdate =
  Database["public"]["Tables"]["marketing_planner_items"]["Update"];
