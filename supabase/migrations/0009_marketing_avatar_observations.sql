-- 0009_marketing_avatar_observations.sql
-- Registro de aprendizaje por avatar: notas, hipotesis y evidencia observada.

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

grant select, insert, update, delete on public.marketing_avatar_observations to anon, authenticated;

alter table public.marketing_avatar_observations enable row level security;
drop policy if exists marketing_avatar_observations_all on public.marketing_avatar_observations;
create policy marketing_avatar_observations_all on public.marketing_avatar_observations
  for all to anon, authenticated
  using (true) with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.marketing_avatar_observations;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
