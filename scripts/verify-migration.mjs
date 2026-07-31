// scripts/verify-migration.mjs
// VERIFICACION DE LA MIGRACION. Compara la base de ORIGEN (.env.local) con la de
// DESTINO (.env.destino): conteo de filas tabla por tabla, y ademas comprueba que
// las relaciones sigan intactas en el destino (cada tarea apunta a un proyecto y
// a una fase que existen de verdad).
//
// Uso:  node scripts/verify-migration.mjs
// Solo lee. No escribe nada en ninguna de las dos bases.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TABLAS = [
  "projects",
  "phases",
  "tasks",
  "marketing_avatars",
  "marketing_content_ideas",
  "marketing_avatar_observations",
  "marketing_planner_items",
];

function leerEnv(file, etiqueta) {
  if (!existsSync(file)) throw new Error(`Falta ${etiqueta}`);
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, ""),
    key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ref: env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0],
  };
}

/** Conteo exacto de filas. Devuelve null si la tabla no existe en esa base. */
async function contar({ url, key }, tabla) {
  const r = await fetch(`${url}/rest/v1/${tabla}?select=id`, {
    headers: { apikey: key, Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" },
  });
  if (!r.ok) return null;
  const cr = r.headers.get("content-range") || "";
  const total = cr.split("/")[1];
  return total === "*" ? null : Number(total);
}

async function traer({ url, key }, tabla, columnas) {
  const r = await fetch(`${url}/rest/v1/${tabla}?select=${columnas}`, {
    headers: { apikey: key },
  });
  if (!r.ok) return [];
  return r.json();
}

const origen = leerEnv(join(ROOT, ".env.local"), ".env.local");
const destino = leerEnv(join(ROOT, ".env.destino"), ".env.destino");

console.log(`ORIGEN  ${origen.ref}`);
console.log(`DESTINO ${destino.ref}\n`);
console.log("tabla                            origen  destino");
console.log("---------------------------------------------------");

let diferencias = 0;
for (const t of TABLAS) {
  const [a, b] = await Promise.all([contar(origen, t), contar(destino, t)]);
  const fa = a === null ? "  n/a" : String(a).padStart(5);
  const fb = b === null ? "  n/a" : String(b).padStart(5);
  // La tabla que no existia en el origen no cuenta como diferencia.
  const igual = a === b || (a === null && b === 0);
  if (!igual) diferencias++;
  console.log(`${t.padEnd(32)} ${fa}    ${fb}   ${igual ? "" : "  <-- DIFERENCIA"}`);
}

// ---------- Integridad de relaciones en el destino ----------
console.log("\nRelaciones en la base nueva:");

const [tareas, proyectos, fases, piezas, ideas] = await Promise.all([
  traer(destino, "tasks", "id,project_id,phase_id,parent_task_id"),
  traer(destino, "projects", "id"),
  traer(destino, "phases", "id"),
  traer(destino, "marketing_planner_items", "id,source_idea_id"),
  traer(destino, "marketing_content_ideas", "id"),
]);

const idsProyecto = new Set(proyectos.map((p) => p.id));
const idsFase = new Set(fases.map((f) => f.id));
const idsTarea = new Set(tareas.map((t) => t.id));
const idsIdea = new Set(ideas.map((i) => i.id));

const revisar = (nombre, filas, campo, universo) => {
  const rotas = filas.filter((f) => f[campo] && !universo.has(f[campo]));
  console.log(
    `  ${nombre.padEnd(38)} ${rotas.length === 0 ? "ok" : `${rotas.length} ROTAS`}`,
  );
  return rotas.length;
};

let rotas = 0;
rotas += revisar("tarea -> proyecto", tareas, "project_id", idsProyecto);
rotas += revisar("tarea -> fase", tareas, "phase_id", idsFase);
rotas += revisar("subtarea -> tarea padre", tareas, "parent_task_id", idsTarea);
rotas += revisar("pieza del planeador -> idea", piezas, "source_idea_id", idsIdea);

console.log("");
if (diferencias === 0 && rotas === 0) {
  console.log("RESULTADO: la base nueva es identica a la vieja. Migracion de datos OK.");
} else {
  console.log(`RESULTADO: ${diferencias} diferencia(s) de conteo, ${rotas} relacion(es) rota(s).`);
  process.exit(1);
}
