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

- **Modo dueño único (sin login).** La app no tiene autenticación: siempre opera como el dueño fijo `OWNER_USER_ID` (`lib/owner.ts`). RLS activa con política permisiva para `anon`/`authenticated` (ver nota abajo), la anon key opera sin sesión. Toda fila lleva ese `user_id` y `lib/db` filtra por él. El bot mantiene su propia seguridad (allowlist de Telegram), independiente de esto.
- **RLS: activa siempre, nunca "disable row level security".** En este proyecto Supabase el Security Advisor puede re-activar RLS por fuera de las migraciones (ya pasó una vez y rompió la lectura en producción). El patrón correcto, usado desde `0005_phases.sql` en adelante, es dejar RLS **encendida** con una política `for all to anon, authenticated using (true) with check (true)`. Nunca vuelvas a usar `disable row level security` en una migración nueva.
- **Barrera de acceso en despliegues públicos.** Sin login, cualquiera con la URL opera como el dueño. `middleware.ts` (raíz) exige HTTP Basic Auth cuando `SITE_PASSWORD` está configurada; si está vacía (local), no hay barrera. Todo despliegue público debe tener `SITE_USER`/`SITE_PASSWORD` propios en Vercel.
- `SUPABASE_SERVICE_ROLE_KEY` (solo el bot) y `ANTHROPIC_API_KEY` viven solo en el server. Nunca llegan al cliente ni a un `NEXT_PUBLIC_*`.
- El endpoint `/api/ai` valida toda entrada. Rate-limit si Upstash está configurado.
- Cero datos personales en parámetros de URL.

## Clones para otros dueños (multi-instancia, un solo repo)

Este repo puede desplegarse varias veces para distintos dueños (ej. "usuario 001", "usuario 002"), cada uno con su propio proyecto Vercel pero **compartiendo el mismo código**. Un `git push` a `main` redespliega todos los clones; lo único que cambia entre ellos son las variables de entorno.

Cada clon puede tener **su propio proyecto Supabase** (aislamiento real) o **compartir uno**, distinguiéndose solo por `OWNER_USER_ID`. Compartir base evita duplicar migraciones, pero entonces **el aislamiento lo da únicamente el filtro `user_id` de `lib/db`, no la base**: la RLS es permisiva y la anon key es pública y compartida, así que un dueño con conocimientos técnicos podría leer los datos del otro consultando PostgREST directamente. Compartir base solo es aceptable entre personas de confianza mutua; para separación real hace falta base propia por clon (o login + RLS por `auth.uid()`).

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — proyecto Supabase de ese dueño (propio o compartido).
- `OWNER_USER_ID` — uuid fijo propio (ej. `...002` para el segundo dueño). Con base compartida, esta variable es lo ÚNICO que separa los datos de un dueño de los del otro: nunca la dejes vacía ni repetida entre clones.
- `NEXT_PUBLIC_ENABLE_IA` — enciende/apaga toda la IA del clon (`lib/config.ts` define `IA_ENABLED`): botón Asistente y su entrada en la barra de comando, `ChatPanel`, y el micrófono/subir-audio de las capturas rápidas. El bloqueo real de `/api/ai` y `/api/transcribe` con 404 vive en `middleware.ts`, con guarda repetida dentro de cada route. Ponlo en `false` en clones sin `ANTHROPIC_API_KEY`/`GROQ_API_KEY`: si no, quedan botones que fallan al tocarlos.
- `NEXT_PUBLIC_ENABLE_MARKETING` — enciende/apaga el módulo Marketing por clon (`lib/config.ts` define `MARKETING_ENABLED`, filtra `lib/nav.ts` y las suscripciones de `realtime-refresher.tsx`). El bloqueo real de `/marketing` y `/api/marketing/*` con status 404 vive en `middleware.ts`, no en `notFound()` dentro de la página: un `notFound()` en un segmento anidado sin `not-found.tsx` propio no siempre setea el status HTTP a 404 en Next.js (se comprobó en pruebas locales), así que el middleware es la fuente de verdad.
- `SITE_USER` / `SITE_PASSWORD` — contraseña propia de cada clon.

**Lo que NO se sincroniza solo: el esquema de base de datos.** Cada migración nueva en `supabase/migrations/` hay que aplicarla a mano en CADA proyecto Supabase de cada clon (CLI `db push` o Editor SQL, una vez por proyecto). No dar una fase por cerrada sin haberlo hecho en todos los clones activos.

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

## Bot de Telegram (Asistente Divergente)

Fuente de verdad: `BLUEPRINT-BOT.md`. Reglas que no se negocian:

- El webhook (`app/api/telegram/route.ts`) valida SIEMPRE en este orden: config completa (fail-fast), secret token del header, allowlist de `TELEGRAM_OWNER_ID`. Falla en silencio (200 vacío) ante extraños.
- `lib/supabase/admin.ts` (service_role) SOLO se importa desde el canal del bot (`lib/bot/*`). Jamás desde componentes ni rutas web.
- El bot corre TODO dentro de `runWithDbContext` (cliente admin + `OWNER_USER_ID`). La web nunca cambia de contexto.
- `completar_tarea` y `actualizar_tarea` en el canal telegram son PROPUESTAS con botones Confirmar/Cancelar (`bot_pending_actions`, expiran en 10 min). Nunca ejecutar directo.
- Sin herramientas de borrado en el bot. El dedup por `telegram_update_id` es idempotente: done → aviso; processing → reprocesar.
- En local se usa el token del bot de DESARROLLO (`scripts/dev-bot.ts`, puente por long polling hacia localhost). El token de producción solo vive en Vercel.

### Runbook (operación)

- Rotar token del bot: BotFather → `/revoke` → actualizar `TELEGRAM_BOT_TOKEN` en Vercel → redeploy → `npx tsx scripts/set-webhook.ts https://<dominio>/api/telegram`.
- Rotar `SUPABASE_SERVICE_ROLE_KEY`: panel Supabase → API Keys → regenerar → actualizar en Vercel → redeploy.
- Verificar webhook: `npx tsx scripts/set-webhook.ts` sin argumento imprime el estado (`getWebhookInfo`); la URL debe ser la de producción.
- Bot en pausa: enviar `/pausa` desde Telegram; `/reanudar` para despertarlo.
- Tope de gasto: `BOT_DAILY_LIMIT` (default 200 respuestas/24 h) + límite mensual en console.anthropic.com.
- Probar en local: `npm run dev` + `npx tsx scripts/dev-bot.ts` (borra el webhook del bot de dev y reenvía updates a localhost).
