# PROGRESS.md — Bitacora de construccion

Tablero Divergente. Coordinacion del build por fases (BLUEPRINT seccion 7).
Orquestador: sesion principal. Subagentes: Workflow tool + `.claude/agents/`.

## Leyenda de estado
- [ ] pendiente · [~] en curso · [x] cerrada

---

## Fase 0 — Andamiaje  [x]

Repo Next.js 15 + TypeScript + Tailwind v4, dependencias, base compartida.

Hecho:
- `create-next-app@15` (App Router, TS, Tailwind v4, ESLint, sin src/, alias `@/*`).
- Next 15.5.20, React 19.1.0, Node 24.16.
- Dependencias: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`,
  `@dnd-kit/*`, `date-fns`, `motion`, `@anthropic-ai/sdk`, `zod`,
  `@upstash/ratelimit`, `@upstash/redis`, y utilidades shadcn (`clsx`,
  `tailwind-merge`, `class-variance-authority`, `lucide-react`).
- shadcn/ui inicializado (estilo `base-nova`) + 27 componentes base en `components/ui/`.
- `lib/supabase/{client,server,middleware}.ts` + `middleware.ts` raiz (refresh de sesion + guard de rutas).
- `types/db.ts` escrito a mano como CONTRATO compartido (BLUEPRINT seccion 4).
- `lib/config.ts` (APP_NAME, isSupabaseConfigured).
- `components/providers.tsx` (TanStack Query + next-themes + Tooltip), cableado en `app/layout.tsx`.
- Fuentes del blueprint: Inter (cuerpo), Space Grotesk (display), JetBrains Mono (datos).
- Rutas base: `app/(app)/layout.tsx` (shell placeholder + guard), `app/(app)/page.tsx` (Inicio placeholder), `app/(auth)/login/page.tsx` (auth email+contrasena funcional).
- `app/manifest.ts` (PWA base; faltan iconos, se generan en Fase 3).
- `.env.local` (placeholders para compilar) + `.env.example` versionado.
- 9 subagentes en `.claude/agents/` (BLUEPRINT seccion 8).
- `PROGRESS.md`, `BLUEPRINT.md`, `CLAUDE.md` en la raiz del repo.

Desviaciones respecto al blueprint (justificadas):
1. **shadcn usa Base UI (`@base-ui/react`), no Radix.** Es el default moderno de
   shadcn y el sucesor de Radix; mismas garantias de accesibilidad. Sin impacto
   funcional. Se conserva.
2. **Tailwind v4 (config CSS-first en `globals.css`), no `tailwind.config.js`.**
   Es lo que genera create-next-app hoy. El agente `design-system` afina tokens
   dentro de `globals.css` con `@theme`.
3. **`types/db.ts`, `lib/db/*` y `lib/utils/{dates,urgency}.ts` los escribe el
   orquestador** como contrato/utilidades compartidas (data access centralizado,
   CLAUDE.md), no los agentes de feature. Los agentes de feature construyen UI
   sobre ese contrato. Reduce conflictos y garantiza tipos correctos antes del
   paralelo (BLUEPRINT seccion 7: "contratos compartidos se crean antes").
4. **`cn()` vive en `lib/utils.ts`** (estandar shadcn), no en `lib/utils/cn.ts`.
   Se importa `@/lib/utils`.

Build: verificado (ver Fase 0 checkpoint).

---

## Fase 1 — Cimientos (paralelo: db-architect + design-system)  [x]
- [x] db-architect: `supabase/migrations/0001_schema.sql` + `0002_rls.sql` (esquema, RLS 4x2, indices, triggers, Realtime idempotente) + `supabase/seed.sql` (datos reales, resuelve owner, no destructivo) + `config.toml`.
- [x] design-system: paleta pizarra + prioridades (unico color saturado) en `globals.css`, tema claro/oscuro AA, fuentes mapeadas, focus-visible + prefers-reduced-motion, `components/shared/theme-toggle.tsx`.
- [x] Compuerta: `npm run build` verde. Migraciones y RLS revisadas: exactas al contrato.

## Fase 1.5 — Contratos de datos (orquestador)  [x]
- [x] `lib/db/projects.ts`, `lib/db/tasks.ts` (queries + mutations tipadas, server-side).
- [x] `lib/db/actions.ts` (Server Actions con validacion zod + revalidatePath, unica puerta de mutacion del cliente).
- [x] `lib/utils/dates.ts` (dias_restantes, buckets), `lib/utils/urgency.ts` (medidor firma).

## Fase 2 — Features (paralelo: projects + tasks + calendar)  [ ]
- [ ] projects-feature, tasks-feature, calendar-feature. Build verde.

## Fase 3 — Integracion (orquestador)  [ ]
- [ ] assistant-feature (endpoint Anthropic + tool-use), cableado global (nav, layout, Cmd+K, Realtime, Inicio/Foco, ideas, PWA iconos, modo oscuro).

## Fase 4 — Revision en loop (paralelo: code + security + ux)  [ ]
- [ ] Recoger veredictos, arreglar bloqueadores, re-verificar.

## Fase 5 — Despliegue  [ ]
- [ ] `DEPLOY.md` (Vercel + Supabase), migraciones en prod, prueba de humo, checklist seccion 11.
