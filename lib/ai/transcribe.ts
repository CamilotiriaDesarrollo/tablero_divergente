// lib/ai/transcribe.ts
// Transcripcion de voz (STT) intercambiable. La API de Anthropic NO acepta
// audio como entrada, asi que las notas de voz pasan primero por un tercero
// que las convierte a texto; ese texto es lo que despues consume el asistente.
// Proveedor activo via process.env.STT_PROVIDER:
//   - "groq" (default): Whisper large v3 turbo por el endpoint OpenAI-compatible.
//   - "deepgram": modelo nova-3 con smart_format.
// Conmutar proveedor = poner STT_PROVIDER=deepgram (o quitarlo para groq) y
// tener configurada la llave correspondiente (GROQ_API_KEY / DEEPGRAM_API_KEY).
// Solo fetch/FormData/Blob nativos de Node 18+: cero dependencias nuevas.

type SttProvider = "groq" | "deepgram";

export interface TranscribeInput {
  data: Uint8Array;
  filename?: string;
  mimeType?: string;
}

const RETRY_DELAY_MS = 1500;

/** Proveedor activo segun STT_PROVIDER ("groq" si no se define). */
function activeProvider(): SttProvider {
  return process.env.STT_PROVIDER?.trim().toLowerCase() === "deepgram"
    ? "deepgram"
    : "groq";
}

/** Llave de API del proveedor indicado (undefined si falta). */
function apiKey(provider: SttProvider): string | undefined {
  return provider === "deepgram"
    ? process.env.DEEPGRAM_API_KEY
    : process.env.GROQ_API_KEY;
}

/** True cuando la llave del proveedor ACTIVO existe y no es un placeholder. */
export function isSttConfigured(): boolean {
  const key = apiKey(activeProvider());
  return Boolean(key && !key.includes("placeholder"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch con UN reintento: ante 429, >= 500 o error de red espera
 * RETRY_DELAY_MS y lo intenta una vez mas. Si vuelve a fallar, lanza Error
 * claro en espanol con proveedor y status. Otros 4xx (llave mala, audio
 * invalido) fallan de inmediato: reintentar no los arregla.
 */
async function fetchWithRetry(
  provider: SttProvider,
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastStatus = "error de red";
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(url, init);
    } catch {
      // Error de red: cuenta como fallo reintentable.
    }
    if (res) {
      if (res.ok) return res;
      lastStatus = `HTTP ${res.status}`;
      if (res.status !== 429 && res.status < 500) {
        throw new Error(
          `La transcripcion fallo (${provider}, HTTP ${res.status}). Revisa la llave y el formato del audio.`,
        );
      }
    }
    if (attempt === 0) await sleep(RETRY_DELAY_MS);
  }
  throw new Error(
    `La transcripcion fallo (${provider}, ${lastStatus}). Intenta de nuevo en un momento.`,
  );
}

/** Groq: multipart al endpoint OpenAI-compatible de transcripcion. */
async function transcribeWithGroq(
  input: TranscribeInput,
  key: string,
): Promise<string> {
  const form = new FormData();
  // Copia a un Uint8Array fresco: garantiza un Blob respaldado por su propio
  // ArrayBuffer (evita sorpresas con Buffers pooled y satisface TS estricto).
  form.append(
    "file",
    new Blob([new Uint8Array(input.data)], {
      type: input.mimeType || "audio/ogg",
    }),
    input.filename || "voice.ogg",
  );
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "es");
  form.append("response_format", "json");

  const res = await fetchWithRetry(
    "groq",
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    },
  );
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}

/** Deepgram: audio binario directo con el mime type como Content-Type. */
async function transcribeWithDeepgram(
  input: TranscribeInput,
  key: string,
): Promise<string> {
  const res = await fetchWithRetry(
    "deepgram",
    "https://api.deepgram.com/v1/listen?model=nova-3&language=es&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": input.mimeType || "audio/ogg",
      },
      body: new Uint8Array(input.data),
    },
  );
  const json = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  return json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
}

/**
 * Transcribe una nota de voz con el proveedor activo. Fail-fast si falta la
 * llave (nunca degradar en silencio) y error claro si no se entendio nada.
 */
export async function transcribeAudio(input: TranscribeInput): Promise<string> {
  const provider = activeProvider();
  const key = apiKey(provider);
  if (!key || key.includes("placeholder")) {
    const varName = provider === "deepgram" ? "DEEPGRAM_API_KEY" : "GROQ_API_KEY";
    throw new Error(
      `${varName} no esta configurada. Sin ella no se pueden transcribir notas de voz.`,
    );
  }

  const text =
    provider === "deepgram"
      ? await transcribeWithDeepgram(input, key)
      : await transcribeWithGroq(input, key);

  const clean = text.trim();
  if (!clean) {
    throw new Error("La nota de voz llego vacia o no se entendio nada.");
  }
  return clean;
}
