// scripts/seed-local.mjs
// Siembra los datos de arranque en modo DUENO UNICO usando la anon key (sin SQL).
// Requiere la migracion 0004 aplicada (RLS off + FK sueltas). Idempotente:
// inserta cada proyecto/tarea solo si no existe (por nombre/titulo).
// Uso: node scripts/seed-local.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...parseEnv(join(ROOT, ".env.local")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OWNER = env.OWNER_USER_ID || "00000000-0000-4000-8000-000000000001";

if (!url || !anon) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.");
  process.exit(1);
}

const db = createClient(url, anon, { auth: { persistSession: false } });

const PROJECTS = [
  { name: "Divergente Página Web", status: "activo", icon: "🌐", color: "periwinkle", position: 0 },
  { name: "Min Cultura", status: "activo", icon: "🏛️", color: "arena", position: 1 },
  { name: "PNMC - SIMUS", status: "activo", icon: "📋", color: "oceano", position: 2 },
  { name: "Plataforma Eventos", status: "activo", icon: "🎫", color: "salvia", position: 3 },
  { name: "Ministerio", status: "activo", icon: "🏢", color: "ciruela", position: 4 },
  { name: "Podcast Divergente", status: "idea", icon: "🎙️", position: 5,
    description: "Serie de conversaciones sobre datos, decisiones y creatividad." },
  { name: "App de hábitos personal", status: "idea", icon: "🌱", position: 6,
    description: "Registro simple de rutinas diarias enlazado a las tareas diarias." },
];

const TASKS = [
  { project: "PNMC - SIMUS", title: "Crear el acta de la reunión de hoy", priority: "alta", position: 0 },
  { project: "PNMC - SIMUS", title: "Enviar correo con el acta y la información", priority: "alta", position: 1 },
  { project: "PNMC - SIMUS", title: "Unificar visuales de Tablero de equipo de desarrollo", priority: "media", position: 2 },
  { project: "Plataforma Eventos", title: "FASE 0 MAQUETACIÓN: crear el buscador de eventos, dejarlo funcional y conectar todo", priority: "alta", position: 0 },
  { project: "Ministerio", title: "Crear presentación y plan Segunda Fase Piedad", priority: "media", position: 0 },
  { project: "Ministerio", title: "Crear presentación y puntos para la reunión con la ministra", priority: "alta", position: 1 },
  { project: "Ministerio", title: "Ayudar a editar la página en Front e imagen de SIA", priority: "media", position: 2 },
];

async function main() {
  // 0) Verificacion: leer projects. Si la migracion 0004 no esta aplicada, RLS
  //    devolveria vacio y el insert fallaria por FK; lo detectamos abajo.
  const { error: readErr } = await db.from("projects").select("id").limit(1);
  if (readErr) {
    console.error("No pude leer 'projects':", readErr.message);
    console.error("Revisa que la migracion 0004_single_owner.sql este aplicada.");
    process.exit(1);
  }

  const projectIds = {};
  let createdP = 0;
  for (const p of PROJECTS) {
    const { data: existing } = await db
      .from("projects").select("id").eq("user_id", OWNER).eq("name", p.name).maybeSingle();
    if (existing) { projectIds[p.name] = existing.id; continue; }
    const { data, error } = await db
      .from("projects").insert({ ...p, user_id: OWNER }).select("id").single();
    if (error) {
      console.error(`\nFALLO al crear proyecto "${p.name}": ${error.message}`);
      if (/foreign key|violates|row-level|permission/i.test(error.message)) {
        console.error("=> Parece que falta aplicar 0004_single_owner.sql (FK/RLS). Aplicala y reintenta.");
      }
      process.exit(1);
    }
    projectIds[p.name] = data.id;
    createdP++;
  }

  let createdT = 0;
  for (const t of TASKS) {
    const { data: existing } = await db
      .from("tasks").select("id").eq("user_id", OWNER).eq("title", t.title).maybeSingle();
    if (existing) continue;
    const { error } = await db.from("tasks").insert({
      user_id: OWNER,
      project_id: projectIds[t.project] ?? null,
      title: t.title,
      priority: t.priority,
      status: "todo",
      position: t.position,
    });
    if (error) { console.error(`FALLO al crear tarea "${t.title}": ${error.message}`); process.exit(1); }
    createdT++;
  }

  const { count: totalP } = await db.from("projects").select("id", { count: "exact", head: true }).eq("user_id", OWNER);
  const { count: totalT } = await db.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", OWNER);
  console.log(`\nSembrado OK. Proyectos nuevos: ${createdP}, tareas nuevas: ${createdT}.`);
  console.log(`Totales en la base: ${totalP} proyectos, ${totalT} tareas.`);
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
