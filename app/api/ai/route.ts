// app/api/ai/route.ts
// Endpoint del asistente conversacional. Server-side con @anthropic-ai/sdk.
// La ANTHROPIC_API_KEY vive solo aqui. Requiere sesion (RLS aplica via lib/db).
// Valida toda entrada. Rate-limit opcional si Upstash esta configurado.
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProjectOptions } from "@/lib/db/projects";
import { tools } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { executeTool, type AssistantAction } from "@/lib/ai/execute";
import { toDateColumn } from "@/lib/utils/dates";
import { checkRateLimit } from "@/lib/ai/rate-limit";

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

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 6;

export async function POST(req: NextRequest) {
  // 1. Autenticacion: sin sesion no hay asistente.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Necesitas iniciar sesion para usar el asistente." },
      { status: 401 },
    );
  }

  // 2. Llave configurada?
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

  // 3. Rate-limit por usuario (solo si Upstash esta configurado).
  const limit = await checkRateLimit(user.id);
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

  const actions: AssistantAction[] = [];

  try {
    // 6. Bucle de tool-use manual hasta end_turn (o tope de rondas).
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        thinking: { type: "disabled" },
        system,
        tools,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({
          reply: reply || "Listo.",
          actions,
        });
      }

      // Ejecutar cada herramienta pedida y devolver todos los resultados juntos.
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input);
        if (result.action) actions.push(result.action);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError ?? false,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    // Se agotaron las rondas de herramientas.
    return NextResponse.json({
      reply:
        "Hice varios pasos pero no termine. Puedes precisar un poco mas lo que necesitas?",
      actions,
    });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `El asistente fallo (${err.status ?? "error"}). Intenta de nuevo.`
        : "El asistente tuvo un problema. Intenta de nuevo.";
    console.error("[/api/ai]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
