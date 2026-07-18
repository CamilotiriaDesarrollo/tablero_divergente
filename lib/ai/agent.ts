// lib/ai/agent.ts
// El cerebro compartido: bucle tool-use manual de Anthropic extraido de
// app/api/ai/route.ts para que lo consuman AMBOS canales (web y bot de Telegram).
// El canal puede interceptar la ejecucion de herramientas via `execute` (el bot
// lo usa para convertir completar/actualizar en propuestas con confirmacion).
import Anthropic from "@anthropic-ai/sdk";
import { tools } from "@/lib/ai/tools";
import {
  executeTool,
  type AssistantAction,
  type ToolExecResult,
} from "@/lib/ai/execute";

export const ASSISTANT_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5";

const MAX_TOOL_ROUNDS = 6;

export interface AssistantResult {
  reply: string;
  actions: AssistantAction[];
}

export type ToolExecutor = (
  name: string,
  input: unknown,
) => Promise<ToolExecResult>;

/**
 * Corre el asistente hasta end_turn (o tope de rondas de herramientas).
 * `messages` no se muta. `execute` permite al canal interceptar herramientas;
 * por defecto ejecuta contra lib/db (comportamiento historico de la web).
 */
export async function runAssistant(params: {
  client: Anthropic;
  system: string;
  messages: Anthropic.MessageParam[];
  execute?: ToolExecutor;
}): Promise<AssistantResult> {
  const { client, system } = params;
  const execute = params.execute ?? executeTool;
  const messages: Anthropic.MessageParam[] = [...params.messages];
  const actions: AssistantAction[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: ASSISTANT_MODEL,
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
      return { reply: reply || "Listo.", actions };
    }

    // Ejecutar cada herramienta pedida y devolver todos los resultados juntos.
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await execute(block.name, block.input);
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
  return {
    reply:
      "Hice varios pasos pero no termine. Puedes precisar un poco mas lo que necesitas?",
    actions,
  };
}
