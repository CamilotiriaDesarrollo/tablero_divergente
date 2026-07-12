-- 0002_rls.sql
-- Tablero Divergente — Row Level Security (BLUEPRINT.md sección 4).
-- Regla única: una fila es visible/editable solo si user_id = auth.uid().
-- Cuatro políticas por tabla (select, insert, update, delete).
-- Idempotente: drop policy if exists antes de cada create.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select
  using (auth.uid() = user_id);

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete
  using (auth.uid() = user_id);
