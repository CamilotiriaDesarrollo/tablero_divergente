// lib/realtime/echo-guard.ts
// Guarda contra el "eco" de Realtime. Cuando el dueno hace una mutacion propia,
// la Server Action ya revalida y refresca la ruta; ademas Postgres emite el
// cambio de vuelta a este mismo cliente y RealtimeRefresher dispararia OTRO
// refresh redundante ~300ms despues. Marcamos la mutacion local con un timestamp
// y RealtimeRefresher ignora los eventos que caen dentro de la ventana.
// En modo dueno unico esto no rompe la sync entre dispositivos salvo por un
// cambio ajeno que llegue dentro de la ventana (~2.5s), riesgo aceptado.
let lastLocalMutationAt = 0;

/** Llamar justo antes/despues de una mutacion originada por este cliente. */
export function markLocalMutation(): void {
  lastLocalMutationAt = Date.now();
}

/** True si estamos dentro de la ventana tras una mutacion local reciente. */
export function isEchoOfLocalMutation(windowMs = 2500): boolean {
  return Date.now() - lastLocalMutationAt < windowMs;
}
