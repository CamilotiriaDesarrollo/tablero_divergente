-- 0006_marketing.sql
-- Seccion Marketing: avatares (buyer personas) e ideas de contenido para cada uno.
-- Un avatar agrupa ideas de contenido. Los 4 avatares base (Mateo, Diana, Juan,
-- Laura) se siembran al final de esta migracion (idempotente por slug), asi que
-- con solo aplicar este archivo la pagina /marketing ya funciona.
-- Modo dueno unico: sin FK a auth.users, permisos a la anon key + politica
-- permisiva (mismo patron que 0005_phases.sql). Idempotente: se puede correr
-- mas de una vez sin dano.

create extension if not exists pgcrypto;

-- Avatares / buyer personas (los 4 fijos, con perfil editable por el dueno).
create table if not exists public.marketing_avatars (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  slug        text not null,
  headline    text,
  description text,
  color       text,
  icon        text,
  position    int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Un slug por dueno (permite el seed idempotente y evita duplicar avatares).
create unique index if not exists idx_marketing_avatars_user_slug
  on public.marketing_avatars (user_id, slug);

-- Ideas de contenido, cada una asociada a un avatar.
create table if not exists public.marketing_content_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  avatar_id   uuid not null references public.marketing_avatars (id) on delete cascade,
  title       text not null,
  notes       text,
  format      text,
  status      text not null default 'idea'
              check (status in ('idea', 'en_proceso', 'publicado')),
  position    int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Indices.
create index if not exists idx_marketing_ideas_avatar_id on public.marketing_content_ideas (avatar_id);
create index if not exists idx_marketing_ideas_user_id   on public.marketing_content_ideas (user_id);
create index if not exists idx_marketing_avatars_user_id on public.marketing_avatars (user_id);

-- updated_at (la funcion public.set_updated_at ya existe desde 0001_schema.sql).
drop trigger if exists set_updated_at on public.marketing_avatars;
create trigger set_updated_at
  before update on public.marketing_avatars
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.marketing_content_ideas;
create trigger set_updated_at
  before update on public.marketing_content_ideas
  for each row
  execute function public.set_updated_at();

-- Modo dueno unico: permisos a la anon key + politica permisiva (igual que
-- projects/tasks/phases). "disable row level security" no siempre persiste en
-- tablas nuevas en este proyecto; la politica permisiva es el camino confiable.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.marketing_avatars       to anon, authenticated;
grant select, insert, update, delete on public.marketing_content_ideas to anon, authenticated;

alter table public.marketing_avatars enable row level security;
drop policy if exists marketing_avatars_all on public.marketing_avatars;
create policy marketing_avatars_all on public.marketing_avatars
  for all to anon, authenticated
  using (true) with check (true);

alter table public.marketing_content_ideas enable row level security;
drop policy if exists marketing_content_ideas_all on public.marketing_content_ideas;
create policy marketing_content_ideas_all on public.marketing_content_ideas
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime (envuelto para no fallar si ya esta o si la publicacion no existe).
do $$
begin
  begin
    alter publication supabase_realtime add table public.marketing_avatars;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.marketing_content_ideas;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Siembra de los 4 avatares base (idempotente por slug). El dueno completa su
-- perfil (headline/description) despues desde la interfaz.
do $$
declare
  owner uuid := coalesce(
    nullif(current_setting('app.owner_id', true), ''),
    '00000000-0000-4000-8000-000000000001'
  );
begin
  insert into public.marketing_avatars (user_id, name, slug, color, position)
  select owner, 'Mateo', 'mateo', 'oceano', 0
  where not exists (
    select 1 from public.marketing_avatars where user_id = owner and slug = 'mateo'
  );

  insert into public.marketing_avatars (user_id, name, slug, color, position)
  select owner, 'Diana', 'diana', 'ciruela', 1
  where not exists (
    select 1 from public.marketing_avatars where user_id = owner and slug = 'diana'
  );

  insert into public.marketing_avatars (user_id, name, slug, color, position)
  select owner, 'Juan', 'juan', 'salvia', 2
  where not exists (
    select 1 from public.marketing_avatars where user_id = owner and slug = 'juan'
  );

  insert into public.marketing_avatars (user_id, name, slug, color, position)
  select owner, 'Laura', 'laura', 'arena', 3
  where not exists (
    select 1 from public.marketing_avatars where user_id = owner and slug = 'laura'
  );
end $$;
