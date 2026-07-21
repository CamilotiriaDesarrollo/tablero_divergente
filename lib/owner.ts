// lib/owner.ts
// MODO DUENO UNICO. La app no tiene login: toda operacion (web y bot) actua
// como este usuario fijo. Es el uuid que llevan todas las filas (projects,
// tasks, bot_*). El mismo valor va en OWNER_USER_ID para el bot.
//
// SEGURIDAD: sin login, cualquiera con acceso a la app opera como el dueno.
// En local (localhost) eso es seguro. Si algun dia se despliega en una URL
// publica, hay que anteponer una barrera (ver DEPLOY.md). Para un solo dueno en
// su maquina es el modo correcto y sin friccion.
//
// Fijo por defecto (no requiere crear un usuario en Supabase); se puede
// sobreescribir con la variable OWNER_USER_ID.
export const OWNER_USER_ID =
  process.env.OWNER_USER_ID?.trim() || "00000000-0000-4000-8000-000000000001";
