// scripts/restore-data.mjs
// RESTAURACION DE DATOS. Carga en una base NUEVA los JSON generados por
// scripts/backup-data.mjs, conservando los ids originales para que las
// relaciones (tarea -> proyecto, tarea -> fase, pieza -> idea) sigan intactas.
//
// Uso:  node scripts/restore-data.mjs "C:\ruta\del\respaldo" --confirmar
//
// El destino se lee de .env.destino (en la raiz del repo), NO de .env.local, para
// que sea imposible escribir por accidente sobre la base actual. Ese archivo lo
// rellena el dueno con la url y la anon key del proyecto Supabase nuevo:
//   NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
//
// Sin --confirmar solo muestra que haria (simulacro).
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ORDEN OBLIGATORIO: las tablas hijas van despues de aquellas a las que apuntan.
// tasks referencia projects y phases; los items del planeador referencian ideas.
const ORDEN = [
  "projects",
  "phases",
  "tasks",
  "marketing_avatars",
  "marketing_content_ideas",
  "marketing_avatar_observations",
  "marketing_planner_items",
];

const LOTE = 200;

function readEnvFile(file, etiqueta) {
  if (!existsSync(file)) throw new Error(`Falta ${etiqueta}: ${file}`);
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error(`${etiqueta} no tiene NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY`);
  return { url: url.replace(/\/+$/, ""), key };
}

const backupDir = process.argv[2];
const confirmar = process.argv.includes("--confirmar");
if (!backupDir) {
  console.error('Uso: node scripts/restore-data.mjs "C:\\ruta\\del\\respaldo" --confirmar');
  process.exit(1);
}

const destino = readEnvFile(join(ROOT, ".env.destino"), ".env.destino");
const refDestino = destino.url.replace(/^https:\/\//, "").split(".")[0];

// Guarda de seguridad: nunca volcar un respaldo sobre la MISMA base de la que
// salio. El origen real lo dice el propio respaldo (resumen.json), no .env.local
// — ese archivo cambia cuando la app se conmuta a otra base.
const resumenPath = join(backupDir, "resumen.json");
if (existsSync(resumenPath)) {
  const refOrigen = JSON.parse(readFileSync(resumenPath, "utf8")).proyecto_supabase;
  if (refOrigen === refDestino) {
    console.error(`ABORTADO: este respaldo SALIO de ${refOrigen}, que es la misma base de destino.`);
    console.error("Restaurar sobre el origen no tiene sentido y podria pisar datos mas nuevos.");
    process.exit(1);
  }
  console.log(`Base ORIGEN (segun el respaldo): ${refOrigen}`);
}

console.log(`Origen del respaldo: ${backupDir}`);
console.log(`Base DESTINO:        ${refDestino}`);
console.log(confirmar ? "Modo: ESCRITURA REAL\n" : "Modo: SIMULACRO (agrega --confirmar para escribir)\n");

/** Inserta un lote conservando ids; si la fila ya existe, la actualiza. */
async function upsert(table, rows) {
  const res = await fetch(`${destino.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: destino.key,
      Authorization: `Bearer ${destino.key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
}

let total = 0;
const fallos = [];
for (const table of ORDEN) {
  const file = join(backupDir, `${table}.json`);
  if (!existsSync(file)) {
    console.log(`      -  ${table}  (no estaba en el respaldo)`);
    continue;
  }
  const rows = JSON.parse(readFileSync(file, "utf8"));
  if (rows.length === 0) {
    console.log(`      0  ${table}`);
    continue;
  }
  if (!confirmar) {
    console.log(`  ${String(rows.length).padStart(5)} filas  ${table}  (simulacro)`);
    total += rows.length;
    continue;
  }
  try {
    for (let i = 0; i < rows.length; i += LOTE) {
      await upsert(table, rows.slice(i, i + LOTE));
    }
    console.log(`  ${String(rows.length).padStart(5)} filas  ${table}`);
    total += rows.length;
  } catch (err) {
    console.log(`  FALLO   ${table}: ${String(err.message).slice(0, 200)}`);
    fallos.push(table);
  }
}

console.log(`\nTotal: ${total} filas${confirmar ? " cargadas" : " que se cargarian"}`);
if (fallos.length) {
  console.log(`Tablas con fallo: ${fallos.join(", ")}`);
  console.log("Revisa que las migraciones 0001..0013 esten aplicadas en la base destino.");
  process.exit(1);
}
