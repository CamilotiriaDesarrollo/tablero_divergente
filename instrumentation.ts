// instrumentation.ts
// Next 15 carga este archivo una vez al iniciar el runtime del servidor.
// Configura keep-alive del agente global de undici (el fetch de Node que usa
// supabase-js). Mantiene la conexion TLS a Supabase abierta entre consultas para
// no re-hacer el handshake TCP+TLS (~1-2 RTT) en la primera consulta tras una
// pausa. Es puramente de transporte: no cambia datos ni frescura.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setGlobalDispatcher, Agent } = await import("undici");
    setGlobalDispatcher(
      new Agent({
        // Tiempo que el socket ocioso se mantiene si el servidor no manda hint.
        keepAliveTimeout: 30_000,
        // Respeta hints del servidor hasta 10 min.
        keepAliveMaxTimeout: 600_000,
        connections: 8,
      }),
    );
  }
}
