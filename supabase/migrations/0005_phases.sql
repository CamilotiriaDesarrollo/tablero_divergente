-- 0005_phases.sql
-- Fases / modulos dentro de un proyecto. Una fase agrupa tareas para organizarlas
-- (ej. "Fase 0", "Modulo 1", "Investigacion"). Modo dueno unico: sin FK a
-- auth.users, sin RLS, permisos a la anon key (igual que 0004_single_owner.sql).
-- Idempotente: se puede correr mas de una vez sin dano.

create extension if not exists pgcrypto;

-- Tabla de fases.
create table if not exists public.phases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null,
  position    int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Columna phase_id en tasks (una tarea pertenece a lo sumo a una fase).
alter table public.tasks
  add column if not exists phase_id uuid references public.phases (id) on delete set null;

-- Indices.
create index if not exists idx_phases_project_id on public.phases (project_id);
create index if not exists idx_phases_user_id    on public.phases (user_id);
create index if not exists idx_tasks_phase_id    on public.tasks  (phase_id);

-- updated_at (la funcion public.set_updated_at ya existe desde 0001_schema.sql).
drop trigger if exists set_updated_at on public.phases;
create trigger set_updated_at
  before update on public.phases
  for each row
  execute function public.set_updated_at();

-- Modo dueno unico: permisos a la anon key + politica permisiva.
-- (En este proyecto Supabase, "disable row level security" no siempre persiste en
-- tablas nuevas; una politica permisiva es el camino confiable y equivale a abrir
-- la tabla para la anon key, igual que projects/tasks en modo dueno unico.)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.phases to anon, authenticated;

alter table public.phases enable row level security;
drop policy if exists phases_all on public.phases;
create policy phases_all on public.phases
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime (envuelto para no fallar si ya esta o si la publicacion no existe).
do $$
begin
  begin
    alter publication supabase_realtime add table public.phases;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
