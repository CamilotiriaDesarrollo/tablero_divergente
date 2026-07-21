// scripts/restructure-projects.mjs
// Reorganiza los proyectos al set final que pidio el dueno (2026-07-21), sin
// perder tareas reales. Idempotente: se puede correr mas de una vez.
//   - Renombra: Divergente Pagina Web -> Web Divergente; PNMC - SIMUS -> SIMUS;
//     Plataforma Eventos -> Eventos Divergente (conservan sus tareas).
//   - Mueve las tareas de "Ministerio" a "Min Cultura" y elimina "Ministerio".
//   - Crea: Stereo Lab, Estrategia Divergente, Contenido.
//   - Limpia: elimina "Podcast Divergente", "App de habitos personal" y las
//     tareas de prueba basura.
//   - Fija el orden final (position 0..6).
// Usa la anon key (requiere 0004 aplicada: RLS off).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const OWNER = env.OWNER_USER_ID || "00000000-0000-4000-8000-000000000001";
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const RENAMES = [
  ["Divergente Página Web", "Web Divergente"],
  ["PNMC - SIMUS", "SIMUS"],
  ["Plataforma Eventos", "Eventos Divergente"],
];

// Orden final + icono/color (los nuevos toman estos; los existentes conservan
// los suyos salvo que no tengan).
const TARGET = [
  { name: "Min Cultura", icon: "🏛️", color: "arena" },
  { name: "Web Divergente", icon: "🌐", color: "periwinkle" },
  { name: "SIMUS", icon: "📋", color: "oceano" },
  { name: "Stereo Lab", icon: "🎧", color: "ciruela" },
  { name: "Estrategia Divergente", icon: "🧭", color: "pizarra" },
  { name: "Eventos Divergente", icon: "🎫", color: "salvia" },
  { name: "Contenido", icon: "✍️", color: "periwinkle" },
];

const JUNK_TASK_TITLES = ["djaljddasd", "dasdas3ewew"];
const DELETE_PROJECTS = ["Podcast Divergente", "App de hábitos personal"];

async function fetchProjects() {
  const { data, error } = await db
    .from("projects")
    .select("id,name,status,icon,color,position")
    .eq("user_id", OWNER);
  if (error) throw error;
  return data ?? [];
}

async function main() {
  let projects = await fetchProjects();
  const byName = (n) => projects.find((p) => p.name === n);

  // 1) Renombrar (solo si el viejo existe y el nuevo no).
  for (const [oldName, newName] of RENAMES) {
    const old = byName(oldName);
    if (old && !byName(newName)) {
      const { error } = await db.from("projects").update({ name: newName }).eq("id", old.id);
      if (error) throw error;
      old.name = newName;
      console.log(`Renombrado: "${oldName}" -> "${newName}"`);
    }
  }

  // 2) Limpiar tareas de prueba basura.
  for (const t of JUNK_TASK_TITLES) {
    const { error, count } = await db
      .from("tasks")
      .delete({ count: "exact" })
      .eq("user_id", OWNER)
      .eq("title", t);
    if (error) throw error;
    if (count) console.log(`Tarea de prueba eliminada: "${t}"`);
  }

  // 3) Mover tareas de Ministerio -> Min Cultura, y eliminar Ministerio.
  const ministerio = byName("Ministerio");
  const minCultura = byName("Min Cultura");
  if (ministerio && minCultura) {
    const { error: mvErr, count } = await db
      .from("tasks")
      .update({ project_id: minCultura.id }, { count: "exact" })
      .eq("user_id", OWNER)
      .eq("project_id", ministerio.id);
    if (mvErr) throw mvErr;
    console.log(`Movidas ${count ?? 0} tareas de "Ministerio" a "Min Cultura".`);
    const { error: delErr } = await db.from("projects").delete().eq("id", ministerio.id);
    if (delErr) throw delErr;
    console.log(`Eliminado proyecto "Ministerio".`);
  }

  // 4) Eliminar proyectos que sobran (0 tareas).
  for (const name of DELETE_PROJECTS) {
    const p = byName(name);
    if (p) {
      const { error } = await db.from("projects").delete().eq("id", p.id);
      if (error) throw error;
      console.log(`Eliminado proyecto "${name}".`);
    }
  }

  // Releer estado tras renombrados/eliminados.
  projects = await fetchProjects();
  const byName2 = (n) => projects.find((p) => p.name === n);

  // 5) Crear los nuevos que falten + fijar orden/estado de los 7.
  for (let i = 0; i < TARGET.length; i++) {
    const t = TARGET[i];
    const existing = byName2(t.name);
    if (!existing) {
      const { error } = await db.from("projects").insert({
        user_id: OWNER,
        name: t.name,
        status: "activo",
        icon: t.icon,
        color: t.color,
        position: i,
      });
      if (error) throw error;
      console.log(`Creado proyecto "${t.name}".`);
    } else {
      const patch = { position: i, status: "activo" };
      if (!existing.icon) patch.icon = t.icon;
      if (!existing.color) patch.color = t.color;
      const { error } = await db.from("projects").update(patch).eq("id", existing.id);
      if (error) throw error;
    }
  }

  // Reporte final.
  const final = await fetchProjects();
  const { data: tasks } = await db.from("tasks").select("id,project_id").eq("user_id", OWNER);
  console.log("\nProyectos finales (orden):");
  for (const p of final.sort((a, b) => a.position - b.position)) {
    const n = (tasks ?? []).filter((x) => x.project_id === p.id).length;
    console.log(`  ${p.position}. [${p.status}] ${p.icon ?? ""} ${p.name}  (${n} tareas)`);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
