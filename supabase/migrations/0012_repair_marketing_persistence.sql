-- 0012_repair_marketing_persistence.sql
-- Reparacion idempotente para instalaciones remotas que quedaron en 0008.

create table if not exists public.marketing_avatar_observations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  avatar_id   uuid not null references public.marketing_avatars (id) on delete cascade,
  kind        text not null default 'nota'
              check (kind in ('nota', 'hipotesis', 'evidencia')),
  title       text not null,
  content     text,
  status      text not null default 'en_observacion'
              check (status in ('en_observacion', 'por_validar', 'confirmada', 'refutada')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_marketing_observations_avatar_id
  on public.marketing_avatar_observations (avatar_id, created_at desc);
create index if not exists idx_marketing_observations_user_id
  on public.marketing_avatar_observations (user_id);

drop trigger if exists set_updated_at on public.marketing_avatar_observations;
create trigger set_updated_at
  before update on public.marketing_avatar_observations
  for each row
  execute function public.set_updated_at();

grant select, insert, update, delete
  on public.marketing_avatar_observations
  to anon, authenticated;

alter table public.marketing_avatar_observations enable row level security;
drop policy if exists marketing_avatar_observations_all
  on public.marketing_avatar_observations;
create policy marketing_avatar_observations_all
  on public.marketing_avatar_observations
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.marketing_content_ideas
  add column if not exists task_id uuid
  references public.tasks (id) on delete set null;

create unique index if not exists idx_marketing_content_ideas_task_id
  on public.marketing_content_ideas (task_id)
  where task_id is not null;

with persona_sections as (
  select
    avatar.id as avatar_id,
    avatar.user_id,
    case jsonb_typeof(avatar.persona_sections)
      when 'array' then avatar.persona_sections
      else coalesce(avatar.persona_sections -> 'sections', '[]'::jsonb)
    end as sections
  from public.marketing_avatars as avatar
), hypothesis_items as (
  select
    persona.avatar_id,
    persona.user_id,
    section.value ->> 'title' as section_title,
    item.value #>> '{}' as title
  from persona_sections as persona
  cross join lateral jsonb_array_elements(persona.sections) as section(value)
  cross join lateral jsonb_array_elements(
    coalesce(section.value -> 'blocks', '[]'::jsonb)
  ) as block(value)
  cross join lateral jsonb_array_elements(
    coalesce(block.value -> 'items', '[]'::jsonb)
  ) as item(value)
  where block.value ->> 'label' ilike '%hip%'
)
insert into public.marketing_avatar_observations (
  user_id,
  avatar_id,
  kind,
  title,
  content,
  status
)
select
  hypothesis.user_id,
  hypothesis.avatar_id,
  'hipotesis',
  hypothesis.title,
  concat('Ficha del avatar: ', hypothesis.section_title),
  'por_validar'
from hypothesis_items as hypothesis
where hypothesis.title <> ''
  and not exists (
    select 1
    from public.marketing_avatar_observations as existing
    where existing.avatar_id = hypothesis.avatar_id
      and existing.kind = 'hipotesis'
      and existing.title = hypothesis.title
  );

do $$
begin
  begin
    alter publication supabase_realtime
      add table public.marketing_avatar_observations;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
