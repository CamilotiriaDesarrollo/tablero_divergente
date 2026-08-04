// scripts/verify-owners.mjs
// Con VARIOS TABLEROS SOBRE LA MISMA BASE, lo unico que separa los datos de un
// dueno de los de otro es la columna user_id. Este script cuenta las filas de
// cada tabla agrupadas por dueno, para comprobar de un vistazo que cada tablero
// escribe con su propio identificador y que nadie esta escribiendo con el ajeno.
//
// Uso:  node scripts/verify-owners.mjs            (usa .env.local)
//       node scripts/verify-owners.mjs --env .env.destino
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

const i = process.argv.indexOf("--env");
const envFile = resolve(ROOT, i !== -1 ? process.argv[i + 1] : ".env.local");
if (!existsSync(envFile)) throw new Error("No encuentro " + envFile);

const env = {};
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`Base: ${url.replace(/^https:\/\//, "").split(".")[0]}\n`);

const porDueno = new Map();
for (const tabla of TABLAS) {
  const r = await fetch(`${url}/rest/v1/${tabla}?select=user_id`, {
    headers: { apikey: key },
  });
  if (!r.ok) continue;
  for (const fila of await r.json()) {
    const dueno = fila.user_id ?? "(sin dueno)";
    if (!porDueno.has(dueno)) porDueno.set(dueno, {});
    const cuenta = porDueno.get(dueno);
    cuenta[tabla] = (cuenta[tabla] || 0) + 1;
  }
}

if (porDueno.size === 0) {
  console.log("No hay filas todavia.");
} else {
  for (const [dueno, cuenta] of [...porDueno].sort()) {
    const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
    const etiqueta = dueno.endsWith("0001")
      ? " (tablero 001)"
      : dueno.endsWith("0002")
        ? " (tablero 002)"
        : "";
    console.log(`${dueno}${etiqueta}  -  ${total} filas`);
    for (const [t, n] of Object.entries(cuenta)) console.log(`    ${String(n).padStart(5)}  ${t}`);
    console.log("");
  }
}

console.log(`Duenos distintos encontrados: ${porDueno.size}`);
if (porDueno.has("(sin dueno)")) {
  console.log("AVISO: hay filas SIN dueno. Esas las ve cualquier tablero: revisar.");
}
