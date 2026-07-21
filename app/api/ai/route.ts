// app/api/ai/route.ts
// Endpoint del asistente conversacional (canal WEB). Server-side con
// @anthropic-ai/sdk. La ANTHROPIC_API_KEY vive solo aqui. MODO DUENO UNICO: sin
// login, opera como el dueno fijo (lib/db usa OWNER_USER_ID). Valida toda
// entrada. Rate-limit opcional si Upstash esta configurado. El bucle tool-use
// vive en lib/ai/agent.ts, compartido con el bot.
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getProjectOptions } from "@/lib/db/projects";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { runAssistant } from "@/lib/ai/agent";
import { toDateColumn } from "@/lib/utils/dates";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { OWNER_USER_ID } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: NextRequest) {
  // 1. Llave configurada? (Modo dueno unico: sin login que verificar.)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return NextResponse.json(
      {
        error:
          "El asistente no esta configurado. Agrega ANTHROPIC_API_KEY en el servidor.",
      },
      { status: 503 },
    );
  }

  // 2. Rate-limit del dueno (solo si Upstash esta configurado).
  const limit = await checkRateLimit(`web:${OWNER_USER_ID}`);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      { status: 429 },
    );
  }

  // 4. Validar entrada.
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Solicitud invalida." },
      { status: 400 },
    );
  }

  // 5. Contexto: proyectos del usuario + fecha de hoy.
  const projects = await getProjectOptions();
  const system = buildSystemPrompt({
    today: toDateColumn(new Date()),
    projects,
  });

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = parsed.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // 6. Bucle de tool-use compartido (lib/ai/agent.ts).
    const { reply, actions } = await runAssistant({ client, system, messages });
    return NextResponse.json({ reply, actions });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `El asistente fallo (${err.status ?? "error"}). Intenta de nuevo.`
        : "El asistente tuvo un problema. Intenta de nuevo.";
    console.error("[/api/ai]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
