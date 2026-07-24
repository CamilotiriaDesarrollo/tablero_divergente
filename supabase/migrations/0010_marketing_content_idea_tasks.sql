-- 0010_marketing_content_idea_tasks.sql
-- Cada idea puede promoverse una sola vez a una tarea, conservando el enlace.

alter table public.marketing_content_ideas
  add column if not exists task_id uuid references public.tasks (id) on delete set null;

create unique index if not exists idx_marketing_content_ideas_task_id
  on public.marketing_content_ideas (task_id)
  where task_id is not null;
