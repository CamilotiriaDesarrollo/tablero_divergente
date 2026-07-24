-- 0013_marketing_planner.sql
-- Planeador de contenidos: cada fila es una pieza de contenido lista para
-- planear, con todo lo que un buen contenido necesita: red, tipo, avatares
-- objetivo (varios), hook inicial, angulo/problema, bullets principales, guion
-- general y llamada a la accion. Las ideas de cada avatar (o ideas generales)
-- "pasan" aqui para desarrollarse como formato completo.
-- Modo dueno unico: sin FK a auth.users, permisos a la anon key + politica
-- permisiva (mismo patron confiable que 0006_marketing.sql). Idempotente.

create extension if not exists pgcrypto;

create table if not exists public.marketing_planner_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  title          text not null,
  network        text,
  content_type   text,
  -- Avatares objetivo (varios): arreglo jsonb de ids de marketing_avatars.
  avatar_ids     jsonb not null default '[]'::jsonb,
  hook           text,
  angle          text,
  -- Bullets principales: arreglo jsonb de textos.
  bullets        jsonb not null default '[]'::jsonb,
  script         text,
  cta            text,
  status         text not null default 'borrador'
                 check (status in ('borrador', 'en_proceso', 'listo', 'publicado')),
  scheduled_for  date,
  -- Idea de origen (opcional): de que idea de contenido nacio esta pieza.
  source_idea_id uuid references public.marketing_content_ideas (id) on delete set null,
  position       int default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_marketing_planner_user_id
  on public.marketing_planner_items (user_id);
create index if not exists idx_marketing_planner_status
  on public.marketing_planner_items (user_id, status);
create index if not exists idx_marketing_planner_source_idea
  on public.marketing_planner_items (source_idea_id)
  where source_idea_id is not null;

-- updated_at (public.set_updated_at existe desde 0001_schema.sql).
drop trigger if exists set_updated_at on public.marketing_planner_items;
create trigger set_updated_at
  before update on public.marketing_planner_items
  for each row
  execute function public.set_updated_at();

-- Modo dueno unico: permisos a la anon key + politica permisiva. "disable row
-- level security" no siempre persiste en tablas nuevas de este proyecto; la
-- politica permisiva es el camino confiable (leccion de 0005/0006).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.marketing_planner_items to anon, authenticated;

alter table public.marketing_planner_items enable row level security;
drop policy if exists marketing_planner_items_all on public.marketing_planner_items;
create policy marketing_planner_items_all on public.marketing_planner_items
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime (envuelto para no fallar si ya esta o si la publicacion no existe).
do $$
begin
  begin
    alter publication supabase_realtime add table public.marketing_planner_items;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Refresca el cache de esquema de PostgREST para que la tabla quede disponible
-- de inmediato (evita el PGRST205 "table not found in schema cache").
notify pgrst, 'reload schema';
