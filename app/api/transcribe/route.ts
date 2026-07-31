import { NextResponse, type NextRequest } from "next/server";
import { IA_ENABLED } from "@/lib/config";
import { transcribeAudio } from "@/lib/ai/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  // Defensa en profundidad: el middleware ya devuelve 404 con la IA apagada.
  if (!IA_ENABLED) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let audio: File;

  try {
    const formData = await request.formData();
    const value = formData.get("audio");
    if (!value || typeof value === "string") {
      return NextResponse.json({ error: "Adjunta un archivo de audio." }, { status: 400 });
    }
    audio = value;
  } catch {
    return NextResponse.json({ error: "No se pudo leer el audio." }, { status: 400 });
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: "El archivo de audio esta vacio." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "El audio supera el limite de 25 MB." },
      { status: 413 },
    );
  }

  try {
    const transcript = await transcribeAudio({
      data: new Uint8Array(await audio.arrayBuffer()),
      filename: audio.name || "nota-de-voz.webm",
      mimeType: audio.type || "audio/webm",
    });
    return NextResponse.json({ transcript });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo transcribir el audio.";
    console.error("[/api/transcribe]", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
