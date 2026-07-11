# BLUEPRINT // Tablero Divergente

> App de gestión personal (proyectos, tareas, ideas, calendario) construida para un solo dueño, en línea, editable siempre, y conversacional.
> Este archivo es la fuente de verdad. Se lo entregas a Claude Code y él construye desde aquí.
>
> Filosofía de producto (heredada de la marca): **los datos no deciden, las personas sí.** En esta app el color, la urgencia y los avisos son *señal*, nunca *decisión automática*. La app te muestra lo que importa. Tú decides el orden.

---

## 0. Resumen de una línea

Un reemplazo personal de la plantilla de Notion (Lista de Proyectos + Lista de Actividades Maestra + Bandeja + Tareas Diarias + Calendario), en Next.js + Supabase, desplegado en Vercel, instalable como app en el celular (PWA), con un asistente conversacional que crea y consulta tareas en lenguaje natural.

Nombre de trabajo: **Tablero Divergente**. Renómbralo cuando quieras (una variable, `APP_NAME`).

---

## 1. Qué construimos (alcance cerrado)

Cinco módulos pedidos + lo que ya trae la plantilla + tres extras que la vuelven potente.

**Módulos núcleo**

1. **Proyectos.** Galería y tablero de proyectos con estado (idea, activo, pausado, hecho, archivado), tipo, color, icono, portada. Vista detalle con sus tareas.
2. **Tareas y prioridades.** Tabla estilo Notion, tablero Kanban, y las vistas por tiempo de tu plantilla (Hoy, 1-14 días, 15-30 días, 30+ días). Prioridad alta / media / baja. Subtareas (micro-tareas). Bandeja de entrada para captura rápida. Tareas diarias.
3. **Banco de ideas.** No es una tabla aparte: es la vista de proyectos en estado `idea`. Captura rápida de una idea suelta y botón "promover a proyecto activo" sin perder datos.
4. **Calendario básico.** Vista de mes con las tareas ubicadas por fecha de entrega. Clic en un día para crear tarea. Arrastrar para reprogramar (fase 2, opcional).
5. **Todo lo de la plantilla.** Relación proyecto ↔ tarea, categoría, tipo (multi), fecha recibida y fecha de entrega, recurso (url), señal de urgencia y días restantes, casilla de realizada convertida en estado.

**Extras que la diferencian**

6. **Asistente conversacional.** Barra de comando (⌘K) + panel de chat con la API de Anthropic. Escribes "crea una tarea para enviar el acta mañana, prioridad alta, proyecto PNMC" y la app la inserta estructurada. También consulta ("qué tengo para hoy", "muéstrame las de alta sin fecha").
7. **Inicio / Foco.** Panel de hoy: lo vencido, lo de hoy, lo próximo, captura rápida, y una lectura de urgencia que ordena por sugerencia pero nunca reordena solo.
8. **En línea de verdad.** PWA instalable, modo oscuro, y sincronización en tiempo real entre dispositivos (Supabase Realtime). Lo ves y lo editas desde el navegador o el celular, siempre.

**Fuera de alcance (por ahora, para no inflar):** colaboración multi-usuario, edición de bloques tipo documento, adjuntos de archivos pesados, integraciones externas (Slack, GitHub). Todo esto se puede sumar después; el modelo de datos ya lo permite.

---

## 2. Qué investigamos y qué robamos de cada uno

No inventamos desde cero. Estas son las mejores apps abiertas de este tipo y la idea que tomamos de cada una.

- **Focalboard** (open source, alternativa a Trello/Notion/Asana, 13k+ estrellas en GitHub): sus cuatro vistas Kanban, Tabla, Galería y Calendario sobre el mismo dato, más los filtros guardados. Es exactamente el patrón "un dato, muchas vistas" que necesitamos. Fuente: github.com/mattermost-community/focalboard.
- **Anytype**: modelo de objetos tipados con campos propios (Proyecto, Tarea) y colecciones como bases de datos con vista grid y galería. Confirma que separar "tipo de objeto" del "proyecto" es el diseño correcto.
- **Huly** (alternativa a Linear/Jira/Notion, self-host): el *time-blocking* (convertir una tarea en un bloque de tiempo del día) y el planner. Nos guardamos el time-blocking como idea para fase 2 del calendario.
- **AppFlowy** (la más parecida a Notion, self-host con IA incluida): valida meter IA de fábrica en vez de como add-on de pago. Fuente: github.com/AppFlowy-IO/AppFlowy.
- **Patrón GTD / bandeja de entrada**: captura sin fricción primero, clasificas después. Por eso la Bandeja es un estado de tarea, no una tabla aparte.

La diferencia de nuestra app: es de un solo dueño, hecha a tu medida, con tu estructura exacta de la plantilla de Notion, y con el asistente conversacional como puerta de entrada principal. Ninguna de las de arriba junta esas tres cosas.

---

## 3. Decisión de stack (y por qué)

**Elegido: Supabase, no Google Sheets.** Me pediste que decidiera. Sheets no aguanta bien tres cosas que esta app necesita: el árbol de subtareas (tarea que referencia a otra tarea), la seguridad por fila, y la sincronización en tiempo real entre dispositivos. Supabase te da Postgres relacional, autenticación, Row Level Security y Realtime, todo gratis en el tier de arranque. Google Sheets quedaría como un cuello de botella el día que tengas 300 tareas.

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Components, Server Actions), TypeScript | Full-stack en un repo, despliegue directo a Vercel, tú ya lo usas |
| Base de datos + Auth | **Supabase** (Postgres + Auth + RLS + Realtime) | Relacional, seguro, sincronía en vivo, tú ya lo usas |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) | Componentes accesibles, control total del diseño, sin lock-in |
| Estado en cliente | **TanStack Query** (React Query) | Cache y UI optimista para el Kanban con arrastre |
| Arrastrar y soltar | **dnd-kit** | Kanban y reprogramar en calendario |
| Fechas | **date-fns** | Días restantes, buckets de tiempo |
| Animación | **Motion** (ex Framer Motion), con moderación | Micro-interacciones, no decoración |
| Asistente | **@anthropic-ai/sdk** (server-side), modelo Sonnet | Conversacional con tool-use, tú tienes API |
| Despliegue | **Vercel** (front + serverless) + **Supabase** (DB) | Siempre en línea, dominio propio opcional |
| Opcional | **Upstash Redis** | Rate-limit del endpoint de IA (tú ya lo usas) |

Todo corre en local con Claude Code (Next dev server + Supabase local o proyecto en la nube) y se despliega a producción sin cambiar de stack.

---

## 4. Modelo de datos (Supabase / Postgres)

Dos tablas hacen casi todo. El resto son vistas y filtros.

### Tabla `projects`

```
id            uuid  pk  default gen_random_uuid()
user_id       uuid  not null  references auth.users(id) on delete cascade
name          text  not null
description   text
status        text  not null default 'activo'   -- idea | activo | pausado | hecho | archivado
type          text[]                            -- multi-select libre
color         text                              -- token de color
icon          text                              -- emoji
cover_url     text
position      int   default 0                   -- orden manual
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

El **banco de ideas** = `projects` donde `status = 'idea'`. Promover una idea es cambiar `status` a `activo`. Cero migración de datos.

### Tabla `tasks`

```
id             uuid  pk  default gen_random_uuid()
user_id        uuid  not null  references auth.users(id) on delete cascade
project_id     uuid  references projects(id) on delete set null
parent_task_id uuid  references tasks(id) on delete cascade   -- subtareas / micro-tareas
title          text  not null                                -- "Actividad Súper Específica"
notes          text
priority       text                          -- alta | media | baja
status         text  not null default 'todo'  -- inbox | todo | en_progreso | hecho
task_type      text[]                         -- video | publicaciones | estudio | produccion | investigacion | presentacion
category       text                           -- aprendizaje | redes | cursos | video | conferencias | (extensible)
received_at    date                           -- Fecha Recibida
due_at         date                           -- Fecha de Entrega
resource_url   text                           -- Recursos
is_daily       boolean default false          -- Tareas Diarias
completed_at   timestamptz                    -- reemplaza la casilla "Realizada"
position       int   default 0
created_at     timestamptz default now()
updated_at     timestamptz default now()
```

**La bandeja de entrada** = `tasks` donde `status = 'inbox'` (captura rápida sin proyecto ni fecha). **Realizada** = `status = 'hecho'` con `completed_at`.

### Derivados (no son columnas que se editan, se calculan)

- `dias_restantes = due_at - current_date` (se calcula en la app con date-fns, o como columna generada).
- `urgencia` = función de `priority` + `dias_restantes`. Se **muestra** como señal (color/orden sugerido). **Nunca reordena la lista sola.** Esta es la traducción directa de la filosofía de marca al producto.

### Vistas de la plantilla (filtros, no tablas)

- **Hoy**: `due_at = today AND status <> 'hecho'`
- **1-14 días / 15-30 días / 30+ días**: buckets sobre `due_at`
- **Bandeja**: `status = 'inbox'`
- **Diarias**: `is_daily = true`
- **Ideas**: `projects.status = 'idea'`

### Seguridad y rendimiento (obligatorio)

- **RLS activo en las dos tablas.** Política: una fila es visible/editable solo si `user_id = auth.uid()`. Cuatro políticas por tabla (select, insert, update, delete).
- **Índices**: `user_id`, `project_id`, `parent_task_id`, `due_at`, `status`.
- **Realtime**: habilitado en `tasks` y `projects` para sincronía entre dispositivos.
- **updated_at**: trigger que lo actualiza en cada update.

### Semilla (datos reales para arrancar con la app viva)

Insertar como semilla los proyectos reales y sus tareas conocidas:

- Proyectos: `Divergente Página Web`, `Min Cultura`, `PNMC - SIMUS`, `Plataforma Eventos`, `Ministerio` (estado `activo`).
- Tareas (con su prioridad):
  - PNMC - SIMUS: "Crear el acta de la reunión de hoy" (alta), "Enviar correo con el acta y la información" (alta), "Unificar visuales de Tablero de equipo de desarrollo" (media).
  - Plataforma Eventos: "FASE 0 MAQUETACIÓN: crear el buscador de eventos, dejarlo funcional y conectar todo" (alta).
  - Ministerio: "Crear presentación y plan Segunda Fase Piedad" (media), "Crear presentación y puntos para la reunión con la ministra" (alta), "Ayudar a editar la página en Front e imagen de SIA" (media).
- Un par de ideas de ejemplo en el banco (estado `idea`) para que la vista no nazca vacía.

---

## 5. Arquitectura del repo

```
tablero-divergente/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # shell: nav lateral + barra de comando + panel de chat
│   │   ├── page.tsx                # Inicio / Foco (hoy, vencido, próximo, captura)
│   │   ├── proyectos/
│   │   │   ├── page.tsx            # galería + tablero de proyectos
│   │   │   └── [id]/page.tsx       # detalle de proyecto con sus tareas
│   │   ├── tareas/page.tsx         # tabla + Kanban + buckets de tiempo + diarias
│   │   ├── bandeja/page.tsx        # captura rápida
│   │   ├── ideas/page.tsx          # banco de ideas (proyectos status=idea)
│   │   └── calendario/page.tsx     # vista de mes
│   ├── api/
│   │   └── ai/route.ts             # endpoint del asistente (Anthropic SDK + tool-use)
│   ├── globals.css                 # tokens de diseño (variables CSS)
│   └── manifest.ts                 # PWA
├── components/
│   ├── ui/                         # shadcn (button, dialog, select, etc.)
│   ├── shared/                     # nav, command-palette, theme-toggle, empty-state
│   ├── proyectos/
│   ├── tareas/                     # task-card, kanban-board, task-table, priority-badge, urgency-meter
│   ├── calendario/
│   └── assistant/                  # chat-panel, message-list
├── lib/
│   ├── supabase/                   # client.ts, server.ts, middleware.ts
│   ├── db/                         # queries + mutations tipadas: projects.ts, tasks.ts
│   ├── ai/                         # prompt.ts, tools.ts (esquemas de herramientas)
│   └── utils/                      # dates.ts (dias_restantes, buckets), urgency.ts, cn.ts
├── supabase/
│   ├── migrations/                 # SQL de esquema + RLS + índices + triggers
│   └── seed.sql                    # datos reales de arranque
├── types/
│   └── db.ts                       # tipos generados de Supabase + tipos de dominio
├── .claude/
│   └── agents/                     # definiciones de subagentes (sección 8)
├── CLAUDE.md                       # memoria del repo (archivo aparte que te entrego)
├── BLUEPRINT.md                    # este archivo
├── PROGRESS.md                     # bitácora de coordinación entre agentes (se crea en fase 0)
├── .env.local                      # llaves (plantilla en sección 9)
└── package.json
```

---

## 6. Dirección de diseño (para que no quede genérico)

Regla anti-genérico: **no** usar ninguno de los tres "looks de IA" por defecto. Nada de fondo crema con serif de alto contraste y acento terracota. Nada de negro casi puro con un solo verde ácido. Nada de estilo periódico con reglas finas y cero radio. Si el agente de diseño llega a uno de esos por inercia, lo cambia y explica por qué.

**Concepto:** taller analítico que también es espacio contemplativo. Divergente = dos modos que conviven. La interfaz es tranquila y casi monocromática. **El color es significado, no adorno.** Los únicos colores saturados de la app son las prioridades. Eso vuelve la filosofía de marca visible: el color es señal para que tú decidas.

**Tokens de arranque** (el agente los afina, pero parte de aquí):

- **Color**
  - `--ink` fondo profundo azul-pizarra `#101319`
  - `--surface` superficie elevada `#171B23`
  - `--text` casi blanco cálido `#E8E9ED`
  - `--muted` texto secundario `#9BA0AD`
  - `--accent` periwinkle contenido, solo para foco/estado activo `#8A7CFF`
  - Prioridad (semántico, único color saturado): `alta #F0654E` (brasa), `media #E4A951` (ámbar), `baja #5BB3C9` (cian frío). Mapean a 🔥 ⚖️ ❄️.
- **Tipografía** (3 roles, intercambiables pero con carácter)
  - Display (títulos, nombres de proyecto): una grotesca con personalidad (Space Grotesk o General Sans), usada con restricción.
  - Cuerpo / UI: Inter.
  - Datos (fechas, conteos, días restantes, urgencia): mono (IBM Plex Mono o JetBrains Mono). El mono en los datos refuerza la identidad "datos".
- **Layout / firma**
  - El elemento firma es el **medidor de urgencia**: aparece junto a cada tarea, sugiere orden, y nunca reordena la lista por su cuenta. Es la filosofía hecha componente.
  - Vista principal de tareas: los buckets de tiempo en columnas (Hoy / 1-14 / 15-30 / 30+), como tu plantilla.
  - La barra conversacional (⌘K) siempre presente como entrada principal.

**Piso de calidad (sin anunciarlo):** responsive hasta móvil, foco de teclado visible, `prefers-reduced-motion` respetado, estados vacíos que invitan a actuar (no decorativos), estados de carga y de error con voz de la interfaz (el error dice qué pasó y cómo arreglarlo, no pide disculpas).

---

## 7. Cómo se construye en Claude Code (el "un shot" con múltiples agentes)

Seamos honestos sobre el "un solo shot": un único prompt no escupe una app completa perfecta. Lo que sí logramos es que **un solo prompt de arranque dispare todo el build por fases, con subagentes en paralelo donde es seguro, y un panel de revisión al final.** Tú apruebas y confirmas commit entre fases. Eso es lo más cerca de un shot que existe hoy, y es el flujo que usan los equipos serios.

**Modelo mental (de la doc de Claude Code):** tu sesión principal es el orquestador. Los subagentes viven en `.claude/agents/*.md`, tienen su propio contexto, sus propias herramientas, y devuelven solo el resumen. Un subagente **no puede pausar a preguntar**, así que su tarea se le entrega completa. Se paraleliza **solo cuando los archivos no se pisan**. Los contratos compartidos (esquema + tipos) se crean **antes** de la implementación en paralelo.

**Reglas de coordinación (no negociables):**
- Máximo 3 agentes de implementación en paralelo.
- Cada agente es dueño de directorios que no se solapan.
- Ningún agente toca migraciones, lockfile ni config raíz salvo que sea su tarea asignada.
- Cada agente reporta: archivos cambiados, resultado de tests, riesgos abiertos.
- Commit después de cada fase. Merge en orden de dependencia.
- La bitácora vive en `PROGRESS.md`.
- Orquestador en Opus; subagentes en Sonnet (`CLAUDE_CODE_SUBAGENT_MODEL="claude-sonnet-4-5"`) para ahorrar tokens.
- Opcional para paralelo real sin conflictos: git worktrees por agente.

### Plan por fases

**Fase 0 — Andamiaje (orquestador, secuencial).**
Crear repo Next.js + TypeScript, instalar dependencias, iniciar Supabase y shadcn, crear el cliente de Supabase, los tipos base y `lib/utils`, configurar `.env.local`, escribir `PROGRESS.md`. Commit.

**Fase 1 — Cimientos en paralelo (2 agentes, directorios disjuntos).**
- `db-architect`: migraciones (esquema, RLS, índices, triggers) + `seed.sql` con tus datos reales. Dueño de `supabase/`.
- `design-system`: tokens en `globals.css`, `tailwind.config`, tema claro/oscuro, componentes base de shadcn. Dueño de `app/globals.css`, config de tailwind, `components/ui/` y `components/shared/theme-toggle`.
- **Compuerta:** correr migraciones, generar tipos de Supabase (`supabase gen types`), confirmar que compila. Commit.

**Fase 2 — Features en paralelo (hasta 3 agentes, directorios disjuntos).**
- `projects-feature`: dueño de `app/(app)/proyectos/`, `components/proyectos/`, `lib/db/projects.ts`.
- `tasks-feature`: dueño de `app/(app)/tareas/`, `app/(app)/bandeja/`, `components/tareas/`, `lib/db/tasks.ts`. Incluye buckets, Kanban, tabla, prioridad, subtareas, diarias.
- `calendar-feature`: dueño de `app/(app)/calendario/`, `components/calendario/`.
Los tipos ya existen de la fase 1, así que no se pisan. Commit por agente.

**Fase 3 — Integración (orquestador, secuencial, depende de la fase 2).**
- `assistant-feature`: `app/api/ai/route.ts`, `lib/ai/`, `components/assistant/`. Necesita las mutaciones de `lib/db`, por eso va después.
- Cableado global: navegación, `layout.tsx`, command palette (⌘K), suscripciones Realtime, la vista de Inicio/Foco, `ideas/page.tsx`, `manifest.ts` (PWA), toggle de modo oscuro. Commit.

**Fase 4 — Panel de revisión (3 agentes en paralelo, solo lectura).**
- `code-reviewer`: bugs, tipos, rendimiento (N+1, renders), consistencia.
- `security-auditor`: RLS bien puesto, ninguna llave expuesta al cliente, validación de entrada en el endpoint de IA, rate-limit.
- `ux-reviewer`: flujos, estados vacíos, estados de carga, móvil, accesibilidad.
Cada uno devuelve un veredicto con bloqueadores. El orquestador arregla los bloqueadores. Commit.

**Fase 5 — Despliegue (orquestador).**
Conectar Vercel + Supabase, cargar variables de entorno, correr migraciones en producción, prueba de humo. La app queda en línea, instalable en el celular.

---

## 8. Definiciones de subagentes (listas para copiar)

Guarda cada bloque como un archivo en `.claude/agents/`. El nombre del archivo es libre; lo que manda es el campo `name`. Si dos agentes tienen el mismo `name`, Claude Code descarta uno sin avisar, así que mantenlos únicos.

**`.claude/agents/db-architect.md`**
```markdown
---
name: db-architect
description: Diseña y escribe el esquema de Supabase, migraciones SQL, políticas RLS, índices, triggers y seed. Úsalo para cualquier trabajo de base de datos.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Eres el arquitecto de datos. Trabajas solo en la carpeta supabase/ y en types/db.ts.
Implementa el modelo de datos de BLUEPRINT.md sección 4 al pie de la letra: tablas projects y tasks, RLS con user_id = auth.uid() (cuatro políticas por tabla), índices en user_id, project_id, parent_task_id, due_at y status, trigger de updated_at, Realtime habilitado en ambas tablas, y seed.sql con los datos reales de la sección 4.
No toques código de la app ni componentes. Reporta: archivos creados, y el comando exacto para correr las migraciones.
```

**`.claude/agents/design-system.md`**
```markdown
---
name: design-system
description: Sistema de diseño. Tokens de color y tipografía, tema claro/oscuro, config de Tailwind y componentes base de shadcn. Úsalo para estilos y componentes de UI base.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Eres el lead de diseño de un estudio conocido por dar identidad única a cada cliente.
Implementa la dirección de diseño de BLUEPRINT.md sección 6. Guardrail: prohibido caer en los tres looks de IA por defecto (crema+serif+terracota, negro+verde ácido, estilo periódico). El color es significado: los únicos colores saturados son las prioridades.
Trabajas en app/globals.css, tailwind.config, components/ui/ y components/shared/theme-toggle.
Entrega un piso de calidad: foco de teclado visible, prefers-reduced-motion, tipografía con escala clara. Reporta los tokens finales y por qué cada decisión no es genérica.
```

**`.claude/agents/projects-feature.md`**
```markdown
---
name: projects-feature
description: Módulo de proyectos y banco de ideas. Galería, tablero, detalle, CRUD, estados, promover idea a proyecto.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Construyes el módulo de proyectos según BLUEPRINT.md secciones 1, 4 y 5.
Dueño de: app/(app)/proyectos/, components/proyectos/, lib/db/projects.ts.
Usa los tipos de types/db.ts y el cliente de lib/supabase (ya existen, no los crees). El banco de ideas es la vista de proyectos con status=idea; incluye la acción "promover a activo".
No toques tareas, calendario ni el sistema de diseño base. Reporta archivos cambiados, tests corridos y riesgos.
```

**`.claude/agents/tasks-feature.md`**
```markdown
---
name: tasks-feature
description: Módulo de tareas. Tabla, Kanban, vistas por tiempo (Hoy/1-14/15-30/30+), prioridad, subtareas, bandeja de entrada, tareas diarias, medidor de urgencia.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Construyes el módulo de tareas según BLUEPRINT.md secciones 1, 4 y 6.
Dueño de: app/(app)/tareas/, app/(app)/bandeja/, components/tareas/, lib/db/tasks.ts, lib/utils/urgency.ts, lib/utils/dates.ts.
Implementa: tabla estilo Notion, Kanban con dnd-kit, buckets de tiempo, prioridad alta/media/baja, subtareas via parent_task_id, bandeja (status=inbox), diarias (is_daily), y el medidor de urgencia (sugiere orden, nunca reordena solo).
Usa tipos y cliente ya existentes. No toques proyectos ni calendario. Reporta archivos, tests y riesgos.
```

**`.claude/agents/calendar-feature.md`**
```markdown
---
name: calendar-feature
description: Calendario. Vista de mes con tareas por fecha de entrega, crear tarea al hacer clic en un día.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Construyes el calendario según BLUEPRINT.md secciones 1 y 4.
Dueño de: app/(app)/calendario/, components/calendario/.
Vista de mes que ubica tareas por due_at, clic en día para crear tarea. Reprogramar por arrastre es opcional (fase 2). Usa lib/db/tasks.ts y date-fns.
No toques otros módulos. Reporta archivos, tests y riesgos.
```

**`.claude/agents/assistant-feature.md`**
```markdown
---
name: assistant-feature
description: Asistente conversacional. Endpoint con Anthropic SDK y tool-use para crear, consultar, actualizar y completar tareas y proyectos en lenguaje natural.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Construyes el asistente según BLUEPRINT.md secciones 1 y 5.
Dueño de: app/api/ai/route.ts, lib/ai/, components/assistant/.
Server-side con @anthropic-ai/sdk (modelo Sonnet). Define herramientas (tool-use) que mapean a las mutaciones de lib/db: crear_tarea, consultar_tareas, actualizar_tarea, completar_tarea, crear_proyecto. La llave ANTHROPIC_API_KEY vive solo en el server, nunca en el cliente. Valida toda entrada. Añade rate-limit si Upstash está configurado.
Reporta archivos, esquemas de herramientas y riesgos de seguridad.
```

**`.claude/agents/code-reviewer.md`**
```markdown
---
name: code-reviewer
description: Revisa la app completa. Bugs, seguridad de tipos, rendimiento, consistencia. Solo lectura.
tools: Read, Glob, Grep
model: sonnet
---
Revisas todo el código sin modificarlo. Reporta en este formato:
VEREDICTO: [NECESITA CAMBIOS | APROBADO CON SUGERENCIAS]
BLOQUEADORES (archivo:línea, problema, arreglo concreto)
ALTA PRIORIDAD
MEDIA
BUENAS PRÁCTICAS OBSERVADAS
Busca N+1 queries, renders innecesarios, any sin tipar, manejo de errores faltante, y estados de carga/vacío ausentes.
```

**`.claude/agents/security-auditor.md`**
```markdown
---
name: security-auditor
description: Auditoría de seguridad. RLS, llaves expuestas, validación de entrada, rate-limit. Solo lectura.
tools: Read, Glob, Grep
model: sonnet
---
Auditas seguridad sin modificar. Verifica: RLS activo y correcto en projects y tasks (user_id = auth.uid()), que ninguna llave de servicio ni ANTHROPIC_API_KEY llegue al cliente, que el endpoint de IA valide entrada y tenga rate-limit, y que no haya datos personales en URLs.
Reporta bloqueadores con archivo:línea y el arreglo. Sé estricto: en seguridad, ante la duda, es bloqueador.
```

**`.claude/agents/ux-reviewer.md`**
```markdown
---
name: ux-reviewer
description: Revisión de experiencia. Flujos, estados vacíos, carga, móvil, accesibilidad. Solo lectura.
tools: Read, Glob, Grep
model: sonnet
---
Revisas la experiencia sin modificar. Verifica: cada vista tiene estado vacío que invita a actuar, estados de carga, errores con voz de la interfaz (qué pasó y cómo arreglar), responsive hasta móvil, foco de teclado visible, y consistencia de vocabulario (un botón "Publicar" produce un aviso "Publicado").
Reporta hallazgos por vista, priorizados.
```

---

## 9. Requisitos previos y arranque

Antes de darle el prompt a Claude Code:

1. **Node 20+** instalado.
2. Crear proyecto en **Supabase** (supabase.com), copiar `Project URL`, `anon key` y `service_role key`.
3. Tener tu **llave de la API de Anthropic**.
4. Crear la carpeta del repo vacía, meter dentro `BLUEPRINT.md` y `CLAUDE.md`.
5. Crear `.env.local` con esta plantilla:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # solo server
ANTHROPIC_API_KEY=...                # solo server
APP_NAME=Tablero Divergente
# opcional
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

6. (Recomendado) exportar el modelo de subagentes para ahorrar tokens:
```
export CLAUDE_CODE_SUBAGENT_MODEL="claude-sonnet-4-5"
```

---

## 10. El prompt de arranque (pégalo en Claude Code)

Abre Claude Code en la carpeta del repo y pega esto. Recomendación: primero en **Plan Mode** para que te muestre el plan completo, lo apruebas, y luego ejecuta.

```
Lee BLUEPRINT.md y CLAUDE.md completos. Vas a construir la app "Tablero Divergente" siguiendo ese plano al pie de la letra.

Primero crea las 9 definiciones de subagentes de la sección 8 en .claude/agents/, y crea PROGRESS.md como bitácora.

Luego ejecuta el build por fases de la sección 7:
- Fase 0: andamiaje (tú, secuencial). Commit.
- Fase 1: despacha en paralelo db-architect y design-system (directorios disjuntos). Corre migraciones, genera tipos de Supabase, confirma build. Commit.
- Fase 2: despacha en paralelo projects-feature, tasks-feature y calendar-feature (directorios disjuntos). Commit por agente.
- Fase 3: assistant-feature (secuencial, depende de fase 2), luego el cableado global: nav, layout, command palette, Realtime, Inicio/Foco, ideas, PWA, modo oscuro. Commit.
- Fase 4: despacha en paralelo y solo lectura code-reviewer, security-auditor y ux-reviewer sobre toda la app. Recoge veredictos, arregla los bloqueadores. Commit.
- Fase 5: prepárame el despliegue a Vercel + Supabase (variables, migraciones en prod, prueba de humo).

Reglas: máximo 3 agentes de implementación en paralelo, cada uno dueño de directorios que no se pisan, ninguno toca migraciones/lockfile/config raíz salvo asignación, cada uno reporta archivos cambiados y riesgos, commit tras cada fase, y actualiza PROGRESS.md al cerrar cada fase. Detente y pregúntame antes de cada commit de fase para que yo apruebe.
```

---

## 11. Criterios de "quedó lista"

- Inicio/Foco carga hoy, vencido y próximo, y deja capturar rápido.
- Proyectos: crear, editar, cambiar estado, ver detalle con tareas. Banco de ideas con "promover".
- Tareas: tabla + Kanban + buckets de tiempo + prioridad + subtareas + bandeja + diarias + medidor de urgencia que sugiere y no reordena solo.
- Calendario: mes con tareas por fecha, crear al hacer clic.
- Asistente: crea y consulta tareas en lenguaje natural.
- RLS activo, ninguna llave en el cliente, endpoint de IA validado.
- Responsive, modo oscuro, PWA instalable, sincronía en vivo entre dos dispositivos.
- Desplegada y accesible desde una URL.

---

*Fin del blueprint. Fuente de verdad para el build. Todo lo demás se deriva de aquí.*
