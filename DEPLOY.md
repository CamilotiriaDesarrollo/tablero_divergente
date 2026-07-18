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
   | `NEXT_PUBLIC_ALLOW_SIGNUP` | `true` solo para crear tu cuenta; luego `false` |
   | `UPSTASH_REDIS_REST_URL` | opcional, para rate-limit del asistente |
   | `UPSTASH_REDIS_REST_TOKEN` | opcional |

4. **Deploy**. Vercel construye con `next build`.

---

## 4. Registrarte y sembrar tus datos

1. **Abre el registro solo para tu cuenta.** Pon `NEXT_PUBLIC_ALLOW_SIGNUP=true`
   en Vercel y redepliega. En Supabase, deja habilitado "Allow new users to sign up".
2. Abre la URL de produccion (`/login`), usa "Crea tu cuenta" con tu correo, entra.
3. **Cierra el registro.** Vuelve `NEXT_PUBLIC_ALLOW_SIGNUP=false` (redeploy) y en
   Supabase desactiva "Allow new users to sign up". Asi nadie mas puede registrarse
   ni abusar de la llave del asistente. (Recomendado ademas: configurar Upstash para
   rate-limit del endpoint de IA.)
4. Para cargar los proyectos y tareas de arranque, corre el seed **despues** de
   registrarte (necesita tu usuario en `auth.users`):

   ```bash
   # con la CLI enlazada al proyecto
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

   o pega el contenido de `supabase/seed.sql` en el Editor SQL del panel. El seed es
   idempotente y resuelve tu usuario automaticamente (el primero registrado).

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

## 8. Comandos locales

```bash
npm run dev                      # desarrollo en http://localhost:3000
npm run build                    # verificar que compila
npm run start                    # servir el build de produccion
npx tsx scripts/dev-bot.ts       # puente local del bot (token de desarrollo)
npx tsx scripts/set-webhook.ts   # registrar/verificar el webhook de produccion
```
