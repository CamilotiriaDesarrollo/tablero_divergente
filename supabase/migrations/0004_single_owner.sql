-- 0004_single_owner.sql
-- MODO DUENO UNICO (sin login). La app deja de depender de Supabase Auth:
--   1) Se sueltan las FK user_id -> auth.users, para poder usar un uuid fijo del
--      dueno (lib/owner.ts) sin crear un usuario en auth.users.
--   2) Se DESACTIVA RLS: sin sesion, la anon key opera libremente (un solo dueno).
--   3) Se garantizan los permisos de la anon key sobre las tablas.
-- Idempotente: puede correrse dos veces sin fallar.
--
-- SEGURIDAD: con RLS desactivada, la anon key (que es publica) puede leer/escribir
-- estas tablas. En LOCAL (localhost) no hay exposicion. Si se despliega en una URL
-- publica, hay que anteponer una barrera (ver DEPLOY.md). Para un solo dueno en su
-- maquina es el modo correcto.

-- 1) Soltar las FK a auth.users (las demas FK entre projects/tasks se conservan).
alter table public.projects            drop constraint if exists projects_user_id_fkey;
alter table public.tasks               drop constraint if exists tasks_user_id_fkey;
alter table public.bot_messages        drop constraint if exists bot_messages_user_id_fkey;
alter table public.bot_pending_actions drop constraint if exists bot_pending_actions_user_id_fkey;
alter table public.bot_state           drop constraint if exists bot_state_user_id_fkey;

-- 2) Desactivar RLS (un solo dueno; la anon key opera sin sesion).
alter table public.projects            disable row level security;
alter table public.tasks               disable row level security;
alter table public.bot_messages        disable row level security;
alter table public.bot_pending_actions disable row level security;
alter table public.bot_state           disable row level security;

-- 3) Asegurar permisos de la anon key (Supabase suele concederlos por defecto;
--    explicito para no depender de ello).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.projects, public.tasks, public.bot_messages,
     public.bot_pending_actions, public.bot_state
  to anon, authenticated;
