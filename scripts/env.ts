// scripts/env.ts
// Carga variables de .env.local para scripts que corren con `npx tsx` fuera de
// Next (Next carga .env.local solo; los scripts sueltos no). Parseo simple de
// lineas KEY=VALUE: ignora comentarios y lineas vacias, y NUNCA pisa variables
// ya definidas en process.env (lo exportado en la shell tiene prioridad).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Carga .env.local desde la raiz del repo hacia process.env. */
export function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    console.warn(`Aviso: no se encontro ${envPath}; se usan solo las variables del entorno.`);
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Quita comillas envolventes ("valor" o 'valor') si las hay.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
