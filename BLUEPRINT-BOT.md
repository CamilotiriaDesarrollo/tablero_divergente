# BLUEPRINT-BOT.md — Asistente Divergente (bot de Telegram)

Fuente de verdad del bot asistente personal. Complementa a `BLUEPRINT.md` (la app web)
y hereda todas las reglas de `CLAUDE.md`. Decisiones fundamentadas por un panel de
9 agentes (4 investigadores con fuentes, 2 arquitecturas rivales, 3 jueces adversarios)
el 2026-07-12.

## 1. Que es

El canal movil del Tablero Divergente. El dueno le habla por **voz o texto** desde
Telegram y el bot captura ideas, crea tareas, consulta el dia y completa pendientes
**en la misma base de Supabase** que la web. Mismo cerebro (Claude + las 6 herramientas
existentes), misma filosofia: **los datos no deciden, las personas si.** El bot sugiere
y confirma; jamas borra ni reordena; las acciones con efecto piden confirmacion con
botones, no con suposiciones.

No es un producto nuevo: es **otra puerta** al mismo sistema. Todo lo que el bot crea
aparece en el tablero web al instante (Realtime ya existente), y viceversa.

## 2. Decisiones (con evidencia)

| Decision | Eleccion | Por que (evidencia del panel) |
|---|---|---|
| Canal | **Telegram** (WhatsApp queda para fase posterior) | Bot API gratis y sin verificacion; webhooks nativos; notas de voz descargables (OGG/Opus, `getFile`, limite 20 MB); mensajes proactivos ilimitados y gratis. WhatsApp oficial exige Meta Business verificada (2-5 dias), numero dedicado que NO puede ser el personal, y plantillas pre-aprobadas para todo mensaje proactivo. Baileys/librerias no oficiales: PROHIBIDAS (ban del numero sin apelacion). |
| Libreria | **Cliente fetch propio (cero dependencias)** | La investigacion recomendo grammY, pero la superficie que el bot usa es pequena (sendMessage, getFile, answerCallbackQuery, setWebhook, getUpdates). Un cliente minimo con `fetch` nativo (`lib/telegram/api.ts`) evita una dependencia y su cadena de actualizaciones, y encaja mejor en serverless. Si la superficie crece, migrar a grammY sigue siendo opcion. |
| Arquitectura | **Integrada: webhook en el mismo repo/Vercel** (`app/api/telegram/route.ts`) | El panel quedo 2-1 (fiabilidad y seguridad prefirieron un worker separado; costo/operacion prefirio la integrada). Decide el perfil del operador: una sola persona no-devops. El worker exige Docker + Fly.io + monorepo + staging + runbooks; si muere un viernes queda muerto hasta intervencion manual. El webhook se recupera solo. Se adoptan las mejores ideas del worker (abajo). |
| Ideas adoptadas del diseno rival | Confirmaciones **con botones inline** (no solo prompt), bot de desarrollo con **token separado**, dedup **idempotente** (estado processing/done, no descarte ciego), kill switch de gasto | Exigencias de los jueces de seguridad y fiabilidad; todas caben en la arquitectura integrada. |
| Voz a texto | **Groq whisper-large-v3-turbo** (`language=es`) | Acepta el OGG/Opus de Telegram SIN ffmpeg (critico en serverless); tier gratis de 8 h de audio/dia; ~216x tiempo real (1-2 s); pagando seria ~$0.30/mes. Fallback: Deepgram Nova-3 ($200 de credito sin expiracion). OpenAI descartado como principal: retiro OGG de su lista oficial de formatos. Anthropic no ofrece STT: el cerebro sigue siendo Claude, la oreja es Groq. |
| Acceso a datos | **service_role + OWNER_USER_ID fijo**, inyectado con AsyncLocalStorage | En un webhook no hay cookies de sesion: `requireUserId()` fallaria y las lecturas con anon key devolverian vacio. El refactor minimo toca SOLO los helpers `client()`/`requireUserId()` de `lib/db/tasks.ts:18-29` y `lib/db/projects.ts:15-26` (4 funciones, cero cambios de firma); el default del contexto = cookies actuales, la web queda identica byte a byte. La opcion refresh_token es fragil (rotacion + invocaciones concurrentes = revocacion de sesion). |
| Cerebro | **El que ya existe** | `lib/ai/tools.ts` y `lib/ai/execute.ts` se reutilizan sin cambiar una linea. El bucle tool-use de `app/api/ai/route.ts:97-135` se extrae a `lib/ai/agent.ts` y lo consumen web y bot. `prompt.ts` gana parametro `channel: 'web' | 'telegram'`. |

## 3. Arquitectura

```
Telegram (voz/texto del dueno)
   |  POST webhook + X-Telegram-Bot-Api-Secret-Token
   v
app/api/telegram/route.ts        (Vercel, runtime nodejs, maxDuration 300)
   |  guardas: secret -> allowlist owner -> dedup idempotente -> 200 + waitUntil
   v
[voz] getFile -> descarga OGG -> lib/ai/transcribe.ts (Groq, language=es)
   v
lib/ai/agent.ts  runAssistant()  (claude-sonnet-5, 6 tools, MAX_TOOL_ROUNDS=6)
   |  dentro de runWithBotContext({ client: admin, userId: OWNER_USER_ID })
   v
lib/ai/execute.ts -> lib/db/*  ->  Supabase (projects / tasks / bot_messages)
   v
bot.api.sendMessage (respuesta; acciones de efecto -> botones Confirmar/Cancelar)
   v
El Tablero web refleja el cambio al instante (Realtime existente)
```

Piezas nuevas:

| Pieza | Rol |
|---|---|
| `app/api/telegram/route.ts` | Webhook grammY: guardas, orquestacion, respuesta |
| `lib/supabase/admin.ts` | Cliente service_role server-only (jamas importado por codigo cliente) |
| `lib/db/context.ts` | AsyncLocalStorage `{ getClient, userId }`; default = cookies (web intacta); `runWithBotContext()` para el bot; TODO explicito si la app deja de ser mono-dueno |
| `lib/ai/agent.ts` | `runAssistant({messages, system})` extraido de la ruta web; ambos canales lo consumen |
| `lib/ai/transcribe.ts` | STT detras de `STT_PROVIDER` (groq default, deepgram fallback probado) |
| Tabla `public.bot_messages` | Memoria por chat + dedup idempotente |
| Tabla `public.bot_pending_actions` | Acciones que esperan boton Confirmar (expiran a los 10 min) |
| `scripts/set-webhook.ts` | Registra el webhook de produccion con secret_token |
| `scripts/dev-bot.ts` | Desarrollo local por long polling con BOT DE DEV (token separado; el token de produccion jamas toca el portatil) |

## 4. Modelo de datos

```sql
create table public.bot_messages (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  chat_id             bigint not null,
  telegram_update_id  bigint unique,          -- dedup de reintentos
  status              text not null default 'done'
                      check (status in ('processing', 'done')),  -- idempotencia real
  role                text not null check (role in ('user', 'assistant')),
  content             text not null,
  created_at          timestamptz default now()
);
-- RLS activa (user_id = auth.uid()); indice (chat_id, created_at desc).

create table public.bot_pending_actions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  chat_id     bigint not null,
  tool_name   text not null,       -- completar_tarea | actualizar_tarea
  tool_input  jsonb not null,      -- ya validado con zod
  expires_at  timestamptz not null,  -- now() + 10 min
  created_at  timestamptz default now()
);
```

Regla de idempotencia (exigida por el juez de fiabilidad): al llegar un update se
inserta el turno `user` con `status='processing'`; al terminar se marca `done`.
Si Telegram reentrega el mismo `update_id`: si esta `done`, responder "ese mensaje ya
lo procese, revisa el tablero" (no silencio); si quedo `processing` (crash a mitad),
REPROCESAR en vez de descartar. Dedup de duplicados sin perdida de mensajes.

## 5. Flujos

### Mensaje de voz (punta a punta)
1. El dueno graba una nota de voz (OGG/Opus, 5 s - 3 min).
2. Telegram hace POST al webhook con el header de secret token.
3. Guardas en orden: secret valido (o 401) -> `from.id === TELEGRAM_OWNER_ID` (o 200
   vacio en silencio) -> dedup idempotente por `update_id`.
4. Se responde 200 de inmediato y el procesamiento sigue con `waitUntil` de
   `@vercel/functions` (elimina la carrera con los reintentos de Telegram).
5. `sendChatAction('typing')` como feedback.
6. Validacion: < 1 s se descarta (Whisper alucina en silencio); > 180 s se rechaza
   con mensaje claro.
7. `getFile` -> descarga del OGG (URL valida ~60 min) -> Groq transcribe en 1-2 s.
8. Se cargan los ultimos ~30 turnos de `bot_messages` como historial.
9. `runAssistant()` con el prompt de canal telegram: captura simple (crear tarea o
   proyecto) se ejecuta directo y se reporta; completar/actualizar o ambiguedad ->
   propuesta con botones [Confirmar] [Cancelar] via `bot_pending_actions`.
10. Se persiste el par user/assistant y se responde con `sendMessage`, citando lo
    transcrito ("Te entendi: ...") para que el dueno detecte errores de oido.
11. La tarea aparece en el Tablero web al instante. Latencia tipica: 4-10 s.

### Mensaje de texto
Identico saltando los pasos 6-7 (el texto entra directo al historial).

### Confirmacion
El `callback_query` del boton TAMBIEN se filtra por `TELEGRAM_OWNER_ID`; ejecuta la
accion pendiente solo si no expiro. Control en codigo, no en prompt.

## 6. Seguridad (obligatoria, checklist de los jueces)

- [ ] Doble puerta: secret_token verificado en CADA request + allowlist de un solo
      `TELEGRAM_OWNER_ID`. Fallo en silencio (200 vacio, sin revelar existencia).
- [ ] La allowlist cubre TODOS los tipos de update: `message`, `edited_message`,
      `callback_query`; se descartan `channel_post`, `inline_query`, `chat_member`, etc.
- [ ] BotFather: `/setjoingroups` deshabilitado, inline mode deshabilitado, privacy on.
- [ ] Fail-fast al cargar el modulo: si falta `TELEGRAM_OWNER_ID`,
      `TELEGRAM_WEBHOOK_SECRET`, `OWNER_USER_ID` o `SUPABASE_SERVICE_ROLE_KEY`,
      el bot no arranca (evita el bug silencioso `Number(undefined) = NaN`).
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `GROQ_API_KEY`,
      `ANTHROPIC_API_KEY`: solo env vars server-side. Jamas `NEXT_PUBLIC_*`.
- [ ] `lib/supabase/admin.ts` jamas se importa fuera de la ruta del bot (guarda de
      lint / `server-only`).
- [ ] Defensa en profundidad ante el bypass de RLS: `.eq('user_id', ctx.userId)`
      explicito en las lecturas de `lib/db`.
- [ ] Rate limit de Upstash OBLIGATORIO en el webhook + limite de gasto mensual en la
      consola de Anthropic + tope diario de llamadas con comando `/pausa` (kill switch).
- [ ] Sin herramientas de borrado ni reordenamiento (se hereda de `tools.ts`); zod
      valida todo input de tools (acota prompt injection via voz).
- [ ] Token de produccion jamas en el portatil: bot de desarrollo con token propio.
- [ ] Runbook en `CLAUDE.md`: rotar tokens (BotFather `/revoke`), rotar service_role,
      re-registrar webhook, verificar con `getWebhookInfo`.
- [ ] Plan de minimo privilegio (fase de cierre): evaluar rol Postgres dedicado
      (`bot_role` con GRANT solo sobre tasks/projects/bot_*) en vez de service_role.
- [ ] Privacidad: el audio transita por Groq (tercero); documentado; no dictar
      informacion sensible.

## 7. Variables de entorno nuevas

```
TELEGRAM_BOT_TOKEN         # bot de produccion (BotFather); solo Vercel
TELEGRAM_BOT_TOKEN_DEV     # bot de desarrollo; solo .env.local
TELEGRAM_WEBHOOK_SECRET    # aleatorio 1-256 chars; registrado en setWebhook
TELEGRAM_OWNER_ID          # id numerico de Telegram del dueno (@userinfobot)
OWNER_USER_ID              # uuid del dueno en auth.users
SUPABASE_SERVICE_ROLE_KEY  # ya prevista en .env; el bot es su primer consumidor
GROQ_API_KEY               # transcripcion (tier gratis)
STT_PROVIDER               # opcional: groq (default) | deepgram
DEEPGRAM_API_KEY           # opcional, fallback probado
BOT_MAX_HISTORY            # opcional, turnos de historial (default 30)
```
Reutilizadas: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `UPSTASH_*`.

## 8. Plan de trabajo por fases

Cada fase cierra con build verde + entregable verificable + commit.

- **FASE 0 — Prerrequisitos y preparacion** (~1 sesion, con el dueno)
  Arreglar el registro de la web (pendiente actual) para que exista el usuario en
  `auth.users`; correr el seed; crear bot de produccion y bot de dev en BotFather;
  obtener `TELEGRAM_OWNER_ID` y `OWNER_USER_ID`; cuenta Groq + API key; cargar env vars.
  ENTREGABLE: login funcionando, datos sembrados, `getMe` responde en ambos bots,
  las 6 env vars nuevas listas.

- **FASE 1 — Acceso a datos sin cookies** (el refactor de mayor riesgo, primero)
  `lib/supabase/admin.ts`, `lib/db/context.ts` (default = cookies), tocar solo
  `client()`/`requireUserId()` en tasks/projects, `.eq('user_id')` en lecturas,
  fail-fast de configuracion.
  ENTREGABLE: script `npx tsx` que crea y lee una tarea como el dueno sin cookies;
  la web se comporta identica (crear/consultar/completar probado a mano).

- **FASE 2 — Agente compartido**
  Extraer el bucle a `lib/ai/agent.ts`; la ruta web lo consume; `prompt.ts` gana
  `channel`.
  ENTREGABLE: el asistente web responde igual que antes con las mismas conversaciones
  de prueba.

- **FASE 3 — Bot por TEXTO end-to-end**
  Migracion `bot_messages` + `bot_pending_actions`; webhook con guardas + waitUntil +
  rate limit; scripts set-webhook/dev-bot; hardening de BotFather.
  ENTREGABLE: "crea una tarea de probar el bot" desde Telegram aparece en el tablero
  web; una SEGUNDA cuenta de Telegram no recibe nada ni genera consultas (verificado
  en logs); reenviar el mismo update no duplica; un update a medias se reprocesa.

- **FASE 4 — VOZ**
  `lib/ai/transcribe.ts` (Groq, `language=es`), descarga + validacion de duracion,
  "Te entendi: ..." en la respuesta.
  ENTREGABLE: nota de voz en espanol crea la tarea correcta; audio de 4 min rechazado
  con mensaje claro; fallback a Deepgram probado UNA vez con una nota real.

- **FASE 5 — Confirmaciones en codigo + cierre**
  Botones [Confirmar]/[Cancelar] con `bot_pending_actions` (expiran 10 min, filtrados
  por owner); poda de historial >30 dias via pg_cron; tope diario de gasto + `/pausa`;
  runbook en `CLAUDE.md`; validacion con 10-20 notas de voz reales del dueno.
  ENTREGABLE: completar una tarea exige tocar Confirmar; prueba de caos (matar a
  mitad de nota de voz -> ni duplicado ni perdida); una semana de uso real limpia.

- **FASE POSTERIOR** (fuera de alcance ahora)
  Resumen diario proactivo 7 am (Vercel Cron + sendMessage: gratis, sin plantillas);
  comandos rapidos `/hoy`, `/semana` sin LLM; WhatsApp Cloud API como segundo canal
  SOLO si resulta imprescindible; respuesta por voz (TTS); rol Postgres de minimo
  privilegio.

## 9. Costos

| Concepto | Mensual |
|---|---|
| Telegram Bot API | $0 |
| Vercel Hobby (ya en uso) | $0 |
| Supabase free tier (ya en uso) | $0 |
| Transcripcion Groq (tier gratis: 8 h audio/dia) | $0 (pagando: ~$0.30) |
| Claude claude-sonnet-5 (uso personal 20-50 mensajes/dia) | $1-5 |
| **Total** | **~$1-6/mes, casi todo LLM** |

## 10. Quedo listo cuando

- [ ] Un audio dictado en la calle crea la tarea correcta en el proyecto correcto.
- [ ] "Que tengo hoy?" responde con las tareas reales del dia.
- [ ] "Marca como hecha la del acta" propone la tarea y espera el boton Confirmar.
- [ ] Todo lo capturado aparece en el tablero web al instante.
- [ ] Una cuenta ajena que escriba al bot no recibe respuesta ni gasta un token.
- [ ] Matar el proceso a mitad de un mensaje no duplica ni pierde nada.
- [ ] El dueno puede pausar el bot con `/pausa` y rotar los tokens siguiendo el runbook.
