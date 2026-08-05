-- 0015_task_weekly_completions.sql
-- Registro de "esta sesion semanal se hizo tal dia": una tarea con weekly_days
-- (migracion 0014) recurre indefinidamente, asi que NO tiene sentido marcar la
-- tarea entera como 'hecho' (eso la daria por terminada para siempre). En su
-- lugar, cada dia concreto en que se completa la sesion queda como una fila
-- aqui (tarea + fecha), lo que permite ver el avance semana a semana sin
-- perder el historial ni tocar tasks.status.
--
-- Modo dueno unico: sin FK a auth.users, permisos a la anon key + politica
-- permisiva (mismo patron confiable que 0013_marketing_planner.sql). Idempotente.

create extension if not exists pgcrypto;

create table if not exists public.task_weekly_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  task_id        uuid not null references public.tasks (id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  -- Una sola marca por tarea y dia: repetir el mismo dia no duplica la fila.
  unique (task_id, completed_date)
);

create index if not exists idx_task_weekly_completions_user_id
  on public.task_weekly_completions (user_id);
create index if not exists idx_task_weekly_completions_task_date
  on public.task_weekly_completions (task_id, completed_date);

-- Modo dueno unico: permisos a la anon key + politica permisiva. "disable row
-- level security" no siempre persiste en tablas nuevas de este proyecto; la
-- politica permisiva es el camino confiable (leccion de 0005/0006).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.task_weekly_completions to anon, authenticated;

alter table public.task_weekly_completions enable row level security;
drop policy if exists task_weekly_completions_all on public.task_weekly_completions;
create policy task_weekly_completions_all on public.task_weekly_completions
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime (envuelto para no fallar si ya esta o si la publicacion no existe).
do $$
begin
  begin
    alter publication supabase_realtime add table public.task_weekly_completions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Refresca el cache de esquema de PostgREST para que la tabla quede disponible
-- de inmediato (evita el PGRST205 "table not found in schema cache").
notify pgrst, 'reload schema';
