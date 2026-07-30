# Despliegue — Tablero Divergente

Guia para poner la app en linea (Vercel + Supabase) e instalarla en el celular (PWA).
Requisitos previos: Node 20+ (probado en 24), una cuenta de Supabase, una de Vercel y una llave de la API de Anthropic.

---

## 1. Crear el proyecto de Supabase

1. Entra a supabase.com y crea un proyecto nuevo. Guarda la contrasena de la base.
2. En **Project Settings > API** copia:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` -> `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, nunca al cliente)
3. En **Authentication > Providers > Email** deja habilitado el proveedor de correo.
   Como es una app de un solo dueno, puedes desactivar "Confirm email" para entrar sin
   paso de verificacion, o dejarlo activo y confirmar tu correo la primera vez.

---

## 2. Aplicar el esquema y las politicas

Las migraciones estan en `supabase/migrations/` (esquema, RLS, indices, triggers) y
`supabase/seed.sql` (datos reales de arranque).

### Opcion A — CLI de Supabase (recomendada)

```bash
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>   # el ref esta en la URL del panel
npx supabase db push                                # aplica las migraciones en prod
```

### Opcion B — Editor SQL del panel

Copia y ejecuta, en orden, el contenido de:
1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`

Verifica en **Table editor** que existen `projects` y `tasks`, y en **Authentication >
Policies** que ambas tienen RLS activo con cuatro politicas cada una.

### Realtime

En **Database > Replication** confirma que la publicacion `supabase_realtime` incluye
`projects` y `tasks` (las migraciones lo intentan automaticamente). Si no aparecen,
agregalas desde ahi.

---

## 3. Desplegar en Vercel

1. Sube el repo a GitHub (o conecta la carpeta directo).
2. En Vercel: **New Project** e importa el repo. Framework: Next.js (autodetectado).
3. En **Environment Variables** agrega (Production y Preview):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | tu service_role key |
   | `ANTHROPIC_API_KEY` | tu llave de Anthropic |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` (opcional) |
   | `NEXT_PUBLIC_APP_NAME` | `Tablero Divergente` (o el nombre que quieras) |
   | `OWNER_USER_ID` | `00000000-0000-4000-8000-000000000001` (dueño fijo) |
   | `UPSTASH_REDIS_REST_URL` | opcional, para rate-limit del asistente |
   | `UPSTASH_REDIS_REST_TOKEN` | opcional |

4. **Deploy**. Vercel construye con `next build`.

---

## 4. Modo dueño único (sin login) y sembrar tus datos

La app **no tiene login**: siempre opera como el dueño fijo `OWNER_USER_ID`
(`lib/owner.ts`, por defecto `00000000-0000-4000-8000-000000000001`). No hay que
registrarse ni crear usuarios en Supabase.

1. Aplica la migración **`0004_single_owner.sql`** (con las demás, o en el Editor SQL).
   Suelta las FK a `auth.users`, desactiva RLS y concede permisos a la anon key.
2. Corre el **seed** (Editor SQL o `psql ... -f supabase/seed.sql`). Es idempotente y
   usa el `OWNER_USER_ID` fijo; siembra tus proyectos y tareas de arranque.
3. Abre la app: entra directo a Inicio, sin pantalla de acceso.

> ⚠️ **Seguridad al desplegar en público.** Sin login, cualquiera con la URL opera
> como tú. **En localhost no hay exposición.** Antes de publicar en una URL de
> internet, configura `SITE_USER` y `SITE_PASSWORD` en Vercel: `middleware.ts`
> (raíz) exige HTTP Basic Auth con esas credenciales antes de servir cualquier
> página. Si las dejas vacías, no hay barrera. El **bot** de Telegram NO se ve
> afectado: tiene su propia allowlist y su ruta (`/api/telegram`) está excluida
> del middleware a propósito (Telegram no puede resolver un prompt de Basic Auth).

---

## 5. Prueba de humo

- [ ] `/login` entra y redirige a Inicio.
- [ ] Inicio muestra vencido, hoy y proximo, y la captura rapida crea en la bandeja.
- [ ] Proyectos: crear, editar, cambiar estado, ver detalle con tareas.
- [ ] Ideas: crear una idea y "promover a activo".
- [ ] Tareas: tabla, Kanban (arrastrar cambia estado), buckets de tiempo, prioridad,
      subtareas, diarias, medidor de urgencia.
- [ ] Bandeja: captura y clasificacion.
- [ ] Calendario: mes con tareas por fecha; clic en un dia crea tarea.
- [ ] Asistente (Ctrl/Cmd+K o boton): "crea una tarea para manana prioridad alta" y
      "que tengo para hoy".
- [ ] Modo oscuro/claro con el toggle.
- [ ] Realtime: abre la app en dos dispositivos y confirma que un cambio se refleja.
- [ ] PWA: en el celular, "Agregar a pantalla de inicio" instala la app.

---

## 6. Notas de seguridad (ya implementadas)

- RLS activo en `projects` y `tasks`: cada fila exige `user_id = auth.uid()`.
- `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY` viven solo en el servidor.
- El endpoint `/api/ai` exige sesion, valida toda entrada con zod y aplica rate-limit
  si Upstash esta configurado. Actua con la sesion del usuario, asi que respeta RLS.
- Cero datos personales en parametros de URL.

---

## 7. Bot de Telegram (Asistente Divergente)

Plano completo en `BLUEPRINT-BOT.md`. Pasos del dueno (Fase 0), en orden:

1. **Migracion del bot.** Aplica `supabase/migrations/0003_bot.sql` (CLI `db push`
   o Editor SQL). Crea `bot_messages`, `bot_pending_actions` y `bot_state` con RLS.
2. **Crea DOS bots en BotFather** (@BotFather en Telegram, comando `/newbot`):
   uno de produccion (ej. `tablero_divergente_bot`) y uno de desarrollo
   (ej. `tablero_dev_bot`). Guarda ambos tokens. En BotFather, para ambos:
   `/setjoingroups` -> Disable, y Group Privacy -> Enabled.
3. **Tu id de Telegram.** Escribele a `@userinfobot`; te responde tu id numerico.
   Ese es `TELEGRAM_OWNER_ID`.
4. **Tu uuid de Supabase.** Ya registrado en la web, corre en el Editor SQL:
   `select id from auth.users;` -> ese uuid es `OWNER_USER_ID`.
5. **Llave de transcripcion.** Cuenta gratis en console.groq.com -> API Keys ->
   crea una -> `GROQ_API_KEY`.
6. **Secreto del webhook.** Cualquier cadena aleatoria larga (64+ caracteres)
   -> `TELEGRAM_WEBHOOK_SECRET`.
7. **Variables en Vercel** (Production): `TELEGRAM_BOT_TOKEN` (el de PRODUCCION),
   `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_OWNER_ID`, `OWNER_USER_ID`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`. Redeploy.
8. **Registra el webhook** (desde tu maquina, con las mismas vars en `.env.local`
   pero puedes usar el token de produccion SOLO para este comando):
   `npx tsx scripts/set-webhook.ts https://TU-DOMINIO.vercel.app/api/telegram`
9. **Prueba en produccion:** escribele al bot "crea una tarea de probar el bot" y
   confirma que aparece en el tablero. Manda una nota de voz. Pide "marca como
   hecha la tarea de probar el bot" y toca Confirmar.

Para desarrollo local: en `.env.local` usa el token del bot de DESARROLLO y corre
`npm run dev` + `npx tsx scripts/dev-bot.ts` (reenvia updates a localhost, sin tunel).

Seguridad del bot (ya implementada): secret token verificado en cada request,
allowlist de un solo `TELEGRAM_OWNER_ID` con fallo en silencio, dedup idempotente
por `update_id`, confirmaciones con botones para completar/actualizar, sin
herramientas de borrado, tope diario `BOT_DAILY_LIMIT` y comando `/pausa`.

---

## 8. Clonar la app para otro dueño (usuario 002, 003...)

Mismo código, otro dueño: otro proyecto Supabase (base 100% independiente) y otro
proyecto Vercel, ambos apuntando al mismo repo de GitHub. Un `git push` a `main`
redespliega todos los clones a la vez; solo cambian las variables de entorno.

1. **Supabase nuevo.** Crea un proyecto Supabase aparte para este dueño (sección
   1 de esta guía). Aplica **todas** las migraciones de `supabase/migrations/` en
   orden (sección 2, CLI o Editor SQL) — incluidas las de marketing, aunque este
   clon no las use: quedan vacías y no rompen nada, y así hay un solo checklist
   de migraciones para todos los clones. **No** corras `supabase/seed.sql` (trae
   datos del dueño original); el clon arranca vacío.
2. **uuid del nuevo dueño.** Define un `OWNER_USER_ID` propio, siguiendo el mismo
   patrón (ej. `00000000-0000-4000-8000-000000000002` para el segundo).
3. **Proyecto Vercel nuevo.** *New Project* → importa el mismo repo de GitHub de
   nuevo, como proyecto separado. Variables de entorno propias (sección 3 de esta
   guía) apuntando al Supabase del paso 1 de arriba, más:
   - `OWNER_USER_ID` del paso 2.
   - `NEXT_PUBLIC_APP_NAME` con el nombre de este dueño.
   - `NEXT_PUBLIC_ENABLE_MARKETING=false` si este clon no necesita el módulo
     Marketing (oculta el ítem del menú y bloquea `/marketing` y su API con 404).
   - `SITE_USER` / `SITE_PASSWORD` propios de este clon (ver aviso de seguridad
     arriba) — nunca reutilices la misma contraseña entre clones.
4. **Deploy y prueba de humo** (sección 5 de esta guía, sin los ítems de
   Marketing si lo apagaste). Confirma que un cambio en este clon no aparece en
   el tablero del otro dueño y viceversa.
5. **A futuro:** el código se sincroniza solo. El esquema **no** — cada
   migración nueva se aplica a mano en el proyecto Supabase de CADA clon activo
   antes de dar la fase por cerrada.

---

## 9. Comandos locales

```bash
npm run dev                      # desarrollo en http://localhost:3000
npm run build                    # verificar que compila
npm run start                    # servir el build de produccion
npx tsx scripts/dev-bot.ts       # puente local del bot (token de desarrollo)
npx tsx scripts/set-webhook.ts   # registrar/verificar el webhook de produccion
```
