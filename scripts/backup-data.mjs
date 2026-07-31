// scripts/backup-data.mjs
// RESPALDO DE DATOS. Descarga TODAS las filas de TODAS las tablas del tablero a
// archivos JSON (uno por tabla) mas un resumen con el conteo de filas.
//
// Uso:  node scripts/backup-data.mjs "C:\ruta\de\salida"
// Sin argumento escribe en ../respaldo-tablero-<fecha> (fuera del repo, para que
// los datos nunca terminen en git).
//
// Lee las llaves de .env.local (la anon key basta: la RLS de este proyecto es
// permisiva). No necesita la contrasena de la base ni la service_role.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Todas las tablas de la app (types/db.ts) + candidatas de migraciones sueltas.
// Si alguna no existe, se reporta y se sigue: el respaldo no se aborta por eso.
const TABLES = [
  "projects",
  "tasks",
  "phases",
  "marketing_avatars",
  "marketing_content_ideas",
  "marketing_avatar_observations",
  "marketing_planner_items",
  "marketing_content_idea_tasks",
  "bot_messages",
  "bot_pending_actions",
  "bot_state",
];

const PAGE = 1000; // tope por defecto de PostgREST

/**
 * Lee credenciales de .env.local por defecto. Con `--env <archivo>` se puede
 * respaldar OTRA base (ej. la vieja, tras haber conmutado la app a la nueva).
 */
function readEnv() {
  const i = process.argv.indexOf("--env");
  const nombre = i !== -1 ? process.argv[i + 1] : ".env.local";
  const file = resolve(ROOT, nombre);
  if (!existsSync(file)) throw new Error("No encuentro " + file);
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY en .env.local");
  return { url: url.replace(/\/+$/, ""), key };
}

/**
 * Descarga una tabla completa, paginando de 1000 en 1000.
 * Ordena por id para que la paginacion sea estable; si la tabla no tiene columna
 * id (ej. bot_state), reintenta sin orden.
 */
async function dumpTable(url, key, table, ordenar = true) {
  const rows = [];
  const orden = ordenar ? "&order=id.asc" : "";
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*${orden}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      // Sin columna id: reintenta una vez sin ordenar antes de darla por perdida.
      if (ordenar && /column .*id.* does not exist|42703/i.test(body)) {
        return dumpTable(url, key, table, false);
      }
      // 404/42P01 = la tabla no existe en esta base: no es un fallo del respaldo.
      throw new Error(`${res.status} ${body.slice(0, 200)}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const outArg = process.argv[2];
const stamp = new Date().toISOString().slice(0, 10);
const outDir = outArg || join(ROOT, "..", `respaldo-tablero-${stamp}`);

const { url, key } = readEnv();
const proyecto = url.replace(/^https:\/\//, "").split(".")[0];
mkdirSync(outDir, { recursive: true });

console.log(`Respaldando proyecto Supabase: ${proyecto}`);
console.log(`Destino: ${outDir}\n`);

const resumen = [];
for (const table of TABLES) {
  try {
    const rows = await dumpTable(url, key, table);
    writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
    resumen.push({ tabla: table, filas: rows.length, estado: "ok" });
    console.log(`  ${String(rows.length).padStart(5)} filas  ${table}`);
  } catch (err) {
    resumen.push({ tabla: table, filas: 0, estado: "no descargada", detalle: String(err.message) });
    console.log(`      -  ${table}  (${String(err.message).slice(0, 80)})`);
  }
}

const meta = {
  fecha: new Date().toISOString(),
  proyecto_supabase: proyecto,
  url,
  total_filas: resumen.reduce((n, r) => n + r.filas, 0),
  tablas: resumen,
};
writeFileSync(join(outDir, "resumen.json"), JSON.stringify(meta, null, 2), "utf8");

writeFileSync(
  join(outDir, "LEEME.txt"),
  [
    `RESPALDO DEL TABLERO DIVERGENTE`,
    `Fecha: ${meta.fecha}`,
    `Proyecto Supabase de origen: ${proyecto}`,
    ``,
    `Que hay aqui:`,
    `- Un archivo .json por tabla, con TODAS sus filas tal como estaban.`,
    `- resumen.json: conteo de filas por tabla (para verificar despues de restaurar).`,
    ``,
    `Que NO hay aqui:`,
    `- La estructura de las tablas. Esa vive en el repositorio, en`,
    `  supabase/migrations/ (archivos 0001 a 0013). Estructura + estos datos = el`,
    `  tablero completo.`,
    `- Archivos subidos a Supabase Storage (fotos de avatares de Marketing), si los hay.`,
    ``,
    `Para restaurar en una base nueva: aplicar las migraciones 0001..0013 en orden y`,
    `luego cargar estos JSON con scripts/restore-data.mjs.`,
    ``,
    `NO subir esta carpeta a git: contiene datos reales.`,
  ].join("\n"),
  "utf8",
);

console.log(`\nTotal: ${meta.total_filas} filas`);
console.log(`Resumen escrito en ${join(outDir, "resumen.json")}`);
