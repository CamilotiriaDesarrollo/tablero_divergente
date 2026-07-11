# CLAUDE.md — Tablero Divergente

Memoria del repo. Reglas que aplican siempre. El plano completo está en `BLUEPRINT.md`; este archivo es el resumen operativo que no se negocia.

## Qué es esto

App personal de gestión (proyectos, tareas, ideas, calendario) de un solo dueño. Reemplaza una plantilla de Notion. En línea, editable siempre, conversacional. Filosofía: **los datos no deciden, las personas sí.** El color y la urgencia son señal, nunca decisión automática. Nada en la app reordena listas por su cuenta.

## Stack

- Next.js 15 (App Router, Server Components, Server Actions) + TypeScript
- Supabase (Postgres + Auth + RLS + Realtime)
- Tailwind + shadcn/ui (Radix)
- TanStack Query para UI optimista
- dnd-kit (Kanban, calendario), date-fns (fechas), Motion (animación con moderación)
- @anthropic-ai/sdk server-side para el asistente (modelo Sonnet)
- Despliegue: Vercel + Supabase

## Convenciones de código

- TypeScript estricto. Nada de `any` sin justificar.
- Server Components por defecto. Client Components solo donde hay interacción.
- Data access centralizado en `lib/db/*`. Los componentes no consultan Supabase directo.
- Tipos de dominio y generados en `types/db.ts`. Un solo lugar.
- Nombres de rutas y UI en español (proyectos, tareas, bandeja, ideas, calendario).
- Nombres de tablas y columnas en el idioma del BLUEPRINT sección 4.
- `cn()` para clases condicionales. Sin CSS suelto fuera de `globals.css` y Tailwind.

## Seguridad (obligatorio)

- RLS activo en `projects` y `tasks`. Toda fila: `user_id = auth.uid()`.
- `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY` viven solo en el server. Nunca llegan al cliente ni a un `NEXT_PUBLIC_*`.
- El endpoint `/api/ai` valida toda entrada. Rate-limit si Upstash está configurado.
- Cero datos personales en parámetros de URL.

## Diseño (guardrail)

- Prohibido el look de IA por defecto: nada de crema+serif+terracota, nada de negro+verde ácido, nada de estilo periódico.
- El color saturado se reserva para prioridades (alta/media/baja). El resto de la UI es tranquila y casi monocromática.
- Piso de calidad sin anunciarlo: responsive a móvil, foco de teclado visible, `prefers-reduced-motion`, estados vacíos que invitan a actuar, errores con voz de la interfaz.
- Sin em-dashes en la copy de la interfaz.

## Trabajo con subagentes

- Orquestador coordina; subagentes en `.claude/agents/` hacen el trabajo aislado.
- Paralelo solo con directorios que no se pisan. Máximo 3 de implementación a la vez.
- Contratos compartidos (esquema + tipos) se crean antes de la implementación en paralelo.
- Ningún subagente toca migraciones, lockfile ni config raíz salvo asignación.
- Cada subagente reporta archivos cambiados, tests y riesgos.
- Commit tras cada fase. Actualizar `PROGRESS.md` al cerrar fase.
- Detente y pide aprobación antes de cada commit de fase.

## Comandos

- `npm run dev` desarrollo local
- `npx supabase start` Supabase local (opcional)
- `npx supabase db push` correr migraciones
- `npx supabase gen types typescript` regenerar tipos
- `npm run build` verificar que compila antes de cerrar fase

## Estados y vocabulario

- Proyecto: `idea | activo | pausado | hecho | archivado`. Banco de ideas = `status = idea`.
- Tarea: `inbox | todo | en_progreso | hecho`. Bandeja = `status = inbox`. Realizada = `hecho` + `completed_at`.
- Prioridad: `alta | media | baja` (🔥 ⚖️ ❄️).
- Un control mantiene su nombre en todo el flujo: el botón "Publicar" produce el aviso "Publicado".
