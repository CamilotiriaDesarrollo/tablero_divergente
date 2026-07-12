-- seed.sql
-- Tablero Divergente — datos reales de arranque (BLUEPRINT.md sección 4).
--
-- App de un solo dueño: el seed corre DESPUÉS de que el dueño se registre.
-- Resuelve el user_id del PRIMER usuario existente en auth.users.
-- Idempotente: usa "where not exists" por (user_id, name/title), así que se
-- puede correr varias veces sin duplicar y sin borrar datos que ya tengas.

do $$
declare
  owner uuid;
  p_divergente uuid;
  p_mincultura uuid;
  p_pnmc       uuid;
  p_eventos    uuid;
  p_ministerio uuid;
begin
  -- 1) Dueño = primer usuario registrado.
  select id into owner from auth.users order by created_at asc limit 1;
  if owner is null then
    raise notice 'Sin usuario: regístrate primero, luego corre el seed.';
    return;
  end if;

  -- 2) Proyectos activos (banco de ideas = status 'idea').
  insert into public.projects (user_id, name, status, icon, color, position)
  select owner, 'Divergente Página Web', 'activo', '🌐', 'periwinkle', 0
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'Divergente Página Web'
  );

  insert into public.projects (user_id, name, status, icon, color, position)
  select owner, 'Min Cultura', 'activo', '🏛️', 'ambar', 1
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'Min Cultura'
  );

  insert into public.projects (user_id, name, status, icon, color, position)
  select owner, 'PNMC - SIMUS', 'activo', '📋', 'cian', 2
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'PNMC - SIMUS'
  );

  insert into public.projects (user_id, name, status, icon, color, position)
  select owner, 'Plataforma Eventos', 'activo', '🎫', 'periwinkle', 3
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'Plataforma Eventos'
  );

  insert into public.projects (user_id, name, status, icon, color, position)
  select owner, 'Ministerio', 'activo', '🏢', 'brasa', 4
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'Ministerio'
  );

  -- 3) Un par de ideas de ejemplo (status 'idea') para que el banco no nazca vacío.
  insert into public.projects (user_id, name, status, description, icon, position)
  select owner, 'Podcast Divergente', 'idea',
         'Serie de conversaciones sobre datos, decisiones y creatividad.', '🎙️', 5
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'Podcast Divergente'
  );

  insert into public.projects (user_id, name, status, description, icon, position)
  select owner, 'App de hábitos personal', 'idea',
         'Registro simple de rutinas diarias enlazado a las tareas diarias.', '🌱', 6
  where not exists (
    select 1 from public.projects where user_id = owner and name = 'App de hábitos personal'
  );

  -- 4) Resolver los IDs de los proyectos para asociar tareas por nombre.
  select id into p_divergente from public.projects where user_id = owner and name = 'Divergente Página Web' limit 1;
  select id into p_mincultura from public.projects where user_id = owner and name = 'Min Cultura'           limit 1;
  select id into p_pnmc       from public.projects where user_id = owner and name = 'PNMC - SIMUS'          limit 1;
  select id into p_eventos    from public.projects where user_id = owner and name = 'Plataforma Eventos'    limit 1;
  select id into p_ministerio from public.projects where user_id = owner and name = 'Ministerio'            limit 1;

  -- 5) Tareas (con prioridad), asociadas por proyecto. Idempotentes por título.

  -- PNMC - SIMUS
  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_pnmc, 'Crear el acta de la reunión de hoy', 'alta', 'todo', 0
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'Crear el acta de la reunión de hoy'
  );

  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_pnmc, 'Enviar correo con el acta y la información', 'alta', 'todo', 1
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'Enviar correo con el acta y la información'
  );

  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_pnmc, 'Unificar visuales de Tablero de equipo de desarrollo', 'media', 'todo', 2
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'Unificar visuales de Tablero de equipo de desarrollo'
  );

  -- Plataforma Eventos
  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_eventos, 'FASE 0 MAQUETACIÓN: crear el buscador de eventos, dejarlo funcional y conectar todo', 'alta', 'todo', 0
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'FASE 0 MAQUETACIÓN: crear el buscador de eventos, dejarlo funcional y conectar todo'
  );

  -- Ministerio
  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_ministerio, 'Crear presentación y plan Segunda Fase Piedad', 'media', 'todo', 0
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'Crear presentación y plan Segunda Fase Piedad'
  );

  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_ministerio, 'Crear presentación y puntos para la reunión con la ministra', 'alta', 'todo', 1
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'Crear presentación y puntos para la reunión con la ministra'
  );

  insert into public.tasks (user_id, project_id, title, priority, status, position)
  select owner, p_ministerio, 'Ayudar a editar la página en Front e imagen de SIA', 'media', 'todo', 2
  where not exists (
    select 1 from public.tasks where user_id = owner and title = 'Ayudar a editar la página en Front e imagen de SIA'
  );

  raise notice 'Seed aplicado para el dueño %.', owner;
end $$;
