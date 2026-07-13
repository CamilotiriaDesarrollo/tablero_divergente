# Tablero Divergente

App personal de gestion (proyectos, tareas, ideas, calendario) de un solo dueno.
En linea, editable siempre, conversacional. Filosofia: **los datos no deciden, las
personas si.** El color y la urgencia son senal, nunca decision automatica.

Reemplaza una plantilla de Notion con: Proyectos, Tareas (tabla + Kanban + buckets
de tiempo + diarias), Bandeja de entrada, Banco de ideas, Calendario, un asistente
conversacional (lenguaje natural), sincronizacion en vivo entre dispositivos e
instalacion como PWA.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions) + TypeScript estricto
- **Supabase** (Postgres + Auth + RLS + Realtime)
- **Tailwind CSS v4** + **shadcn/ui** (Base UI)
- **TanStack Query** (UI optimista) · **dnd-kit** (Kanban, calendario) · **date-fns**
- **@anthropic-ai/sdk** server-side (modelo Sonnet, tool-use) para el asistente

## Arranque local

1. `npm install`
2. Copia `.env.example` a `.env.local` y completa tus llaves (Supabase + Anthropic).
   Para crear tu cuenta la primera vez pon `NEXT_PUBLIC_ALLOW_SIGNUP=true`.
3. Aplica las migraciones (`supabase/migrations/`) y, tras registrarte, el seed
   (`supabase/seed.sql`). Ver [DEPLOY.md](./DEPLOY.md).
4. `npm run dev` y abre http://localhost:3000

> Sin llaves reales la app compila y arranca, pero no habla con Supabase: veras la
> interfaz con estados vacios hasta configurar `.env.local`.

## Comandos

| Comando | Que hace |
|---|---|
| `npm run dev` | Desarrollo local |
| `npm run build` | Compila y verifica tipos |
| `npm run start` | Sirve el build de produccion |
| `npx supabase db push` | Aplica migraciones |

## Estructura

- `app/(app)/` vistas autenticadas · `app/(auth)/login` acceso · `app/api/ai` asistente
- `components/` UI por modulo (`proyectos`, `tareas`, `calendario`, `assistant`, `shared`, `ui`)
- `lib/db/` acceso a datos centralizado · `lib/ai/` asistente · `lib/utils/` fechas y urgencia
- `supabase/` esquema, RLS, indices, triggers y seed · `types/db.ts` contrato de tipos
- `.claude/agents/` subagentes · `BLUEPRINT.md` fuente de verdad · `PROGRESS.md` bitacora

## Seguridad

RLS en `projects` y `tasks` (`user_id = auth.uid()`). Las llaves de servicio y de
Anthropic viven solo en el servidor. El endpoint `/api/ai` exige sesion, valida
entrada y aplica rate-limit si Upstash esta configurado. Registro cerrado por defecto.

## Despliegue

Vercel + Supabase. Guia completa en [DEPLOY.md](./DEPLOY.md).
