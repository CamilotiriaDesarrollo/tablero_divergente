-- 0003_bot.sql
-- Tablero Divergente - Tablas del bot de Telegram (BLUEPRINT-BOT seccion 4).
-- Contrato: types/db.ts (bot_messages, bot_pending_actions, bot_state).
-- El SQL debe corresponder EXACTO a esos tipos. Idempotente: puede correrse
-- dos veces sin fallar.

-- Extension para gen_random_uuid() (ya la crea 0001; repetida por idempotencia).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabla: public.bot_messages
-- Historial de conversacion del bot. telegram_update_id unique = deduplicacion
-- de reintentos del webhook de Telegram (null en mensajes del asistente).
-- ---------------------------------------------------------------------------
create table if not exists public.bot_messages (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  chat_id            bigint not null,
  telegram_update_id bigint unique,
  status             text not null default 'done'
                     check (status in ('processing', 'done')),
  role               text not null check (role in ('user', 'assistant')),
  content            text not null,
  created_at         timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Tabla: public.bot_pending_actions
-- Acciones destructivas pendientes de confirmacion (expiran a los 10 minutos).
-- ---------------------------------------------------------------------------
create table if not exists public.bot_pending_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  chat_id    bigint not null,
  tool_name  text not null,
  tool_input jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Tabla: public.bot_state
-- Estado clave/valor del bot (p. ej. key 'paused' con value jsonb true/false).
-- ---------------------------------------------------------------------------
create table if not exists public.bot_state (
  key        text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  value      jsonb not null,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Indices: historial por chat (orden cronologico inverso) y poda de expiradas.
-- ---------------------------------------------------------------------------
create index if not exists idx_bot_messages_chat_id_created_at
  on public.bot_messages (chat_id, created_at desc);

create index if not exists idx_bot_pending_actions_expires_at
  on public.bot_pending_actions (expires_at);

-- ---------------------------------------------------------------------------
-- RLS: misma regla unica que 0002_rls.sql (auth.uid() = user_id) con las
-- cuatro politicas por tabla. El bot usa service_role (bypassa RLS); estas
-- politicas protegen el acceso web/anon.
-- ---------------------------------------------------------------------------

-- bot_messages
alter table public.bot_messages enable row level security;

drop policy if exists bot_messages_select on public.bot_messages;
create policy bot_messages_select on public.bot_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists bot_messages_insert on public.bot_messages;
create policy bot_messages_insert on public.bot_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists bot_messages_update on public.bot_messages;
create policy bot_messages_update on public.bot_messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bot_messages_delete on public.bot_messages;
create policy bot_messages_delete on public.bot_messages
  for delete
  using (auth.uid() = user_id);

-- bot_pending_actions
alter table public.bot_pending_actions enable row level security;

drop policy if exists bot_pending_actions_select on public.bot_pending_actions;
create policy bot_pending_actions_select on public.bot_pending_actions
  for select
  using (auth.uid() = user_id);

drop policy if exists bot_pending_actions_insert on public.bot_pending_actions;
create policy bot_pending_actions_insert on public.bot_pending_actions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists bot_pending_actions_update on public.bot_pending_actions;
create policy bot_pending_actions_update on public.bot_pending_actions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bot_pending_actions_delete on public.bot_pending_actions;
create policy bot_pending_actions_delete on public.bot_pending_actions
  for delete
  using (auth.uid() = user_id);

-- bot_state
alter table public.bot_state enable row level security;

drop policy if exists bot_state_select on public.bot_state;
create policy bot_state_select on public.bot_state
  for select
  using (auth.uid() = user_id);

drop policy if exists bot_state_insert on public.bot_state;
create policy bot_state_insert on public.bot_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists bot_state_update on public.bot_state;
create policy bot_state_update on public.bot_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bot_state_delete on public.bot_state;
create policy bot_state_delete on public.bot_state
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Poda automatica: job diario 'bot_messages_poda' via pg_cron (04:00 UTC).
-- Idempotente: si el job ya existe se desprograma antes de reprogramarlo.
-- Si pg_cron no esta disponible (entorno local minimo), se captura la
-- excepcion y la poda queda manual (lib/db/bot.ts: pruneOldMessages).
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    create extension if not exists pg_cron;

    -- Reprogramacion idempotente: quitar el job previo si ya existe.
    if exists (select 1 from cron.job where jobname = 'bot_messages_poda') then
      perform cron.unschedule('bot_messages_poda');
    end if;

    perform cron.schedule(
      'bot_messages_poda',
      '0 4 * * *',
      $job$
        delete from public.bot_messages
          where created_at < now() - interval '30 days';
        delete from public.bot_pending_actions
          where expires_at < now();
      $job$
    );
  exception
    when others then
      raise notice
        'pg_cron no disponible (%: %). La poda de bot_messages queda manual (pruneOldMessages).',
        sqlstate, sqlerrm;
  end;
end $$;
