-- 0001_schema.sql
-- Tablero Divergente — Esquema base (BLUEPRINT.md sección 4).
-- Contrato: types/db.ts. El SQL debe corresponder EXACTO a esos tipos.
-- Se usa text + CHECK (NO enums nativos) para casar con los union types de TS.
-- Idempotente donde es razonable.

-- Extensión para gen_random_uuid() (por si el proyecto no la tiene activa).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabla: public.projects
-- El banco de ideas = projects donde status = 'idea'.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'activo'
              check (status in ('idea', 'activo', 'pausado', 'hecho', 'archivado')),
  type        text[],                                 -- multi-select libre
  color       text,                                   -- token de color
  icon        text,                                   -- emoji
  cover_url   text,
  position    int default 0,                          -- orden manual
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Tabla: public.tasks
-- Bandeja = status = 'inbox'. Realizada = status = 'hecho' + completed_at.
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  project_id     uuid references public.projects (id) on delete set null,
  parent_task_id uuid references public.tasks (id) on delete cascade,  -- subtareas
  title          text not null,
  notes          text,
  priority       text check (priority is null or priority in ('alta', 'media', 'baja')),
  status         text not null default 'todo'
                 check (status in ('inbox', 'todo', 'en_progreso', 'hecho')),
  task_type      text[],                              -- video | publicaciones | ...
  category       text,                                -- aprendizaje | redes | ...
  received_at    date,                                -- Fecha Recibida
  due_at         date,                                -- Fecha de Entrega
  resource_url   text,                                -- Recursos
  is_daily       boolean not null default false,      -- Tareas Diarias
  completed_at   timestamptz,                         -- reemplaza casilla "Realizada"
  position       int default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Índices (BLUEPRINT sección 4: user_id, project_id, parent_task_id, due_at, status)
-- ---------------------------------------------------------------------------
create index if not exists idx_projects_user_id       on public.projects (user_id);

create index if not exists idx_tasks_user_id           on public.tasks (user_id);
create index if not exists idx_tasks_project_id        on public.tasks (project_id);
create index if not exists idx_tasks_parent_task_id    on public.tasks (parent_task_id);
create index if not exists idx_tasks_due_at            on public.tasks (due_at);
create index if not exists idx_tasks_status            on public.tasks (status);

-- ---------------------------------------------------------------------------
-- updated_at: función + triggers BEFORE UPDATE en ambas tablas.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime: habilitar en projects y tasks (envuelto para no fallar si ya están).
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.projects;
  exception
    when duplicate_object then null;   -- ya está en la publicación
    when undefined_object then null;   -- publicación aún no existe (entorno mínimo)
  end;
  begin
    alter publication supabase_realtime add table public.tasks;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
