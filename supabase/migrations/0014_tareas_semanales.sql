-- 0014_tareas_semanales.sql
-- Tareas semanales: una tarea puede repetirse en dias fijos de la semana.
-- 1 = lunes ... 7 = domingo (ISO-8601, el mismo criterio que usa el calendario,
-- que empieza las semanas en lunes).
--
-- La migracion es ADITIVA y no toca ningun dato existente: las tareas actuales
-- quedan con el arreglo vacio, que significa "no es semanal", y se comportan
-- exactamente igual que antes. Es seguro correrla sobre la base compartida:
-- el tablero que no use la columna simplemente la ignora.

alter table public.tasks
  add column if not exists weekly_days smallint[] not null default '{}'::smallint[];

-- Solo se aceptan dias validos. Se recrea por si la migracion se corre dos veces.
alter table public.tasks
  drop constraint if exists tasks_weekly_days_validos;

alter table public.tasks
  add constraint tasks_weekly_days_validos
  check (weekly_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);

comment on column public.tasks.weekly_days is
  'Dias de la semana en que la tarea se repite (1=lunes .. 7=domingo). Arreglo vacio = no es semanal.';
