import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import * as marketingDb from "@/lib/db/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const observationKind = z.enum(["nota", "hipotesis", "evidencia"]);
const observationStatus = z.enum([
  "en_observacion",
  "por_validar",
  "confirmada",
  "refutada",
]);

const observationFields = z.object({
  kind: observationKind.optional(),
  title: z.string().trim().min(1, "Escribe la nota o hipotesis").max(300),
  content: z.string().trim().max(8000).nullish(),
  status: observationStatus.optional(),
});

const createSchema = observationFields.extend({
  avatar_id: z.string().uuid(),
});

const listSchema = z.object({
  avatar_id: z.string().uuid().optional(),
});

const updateSchema = observationFields
  .partial()
  .extend({ id: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "No hay cambios para guardar",
  });

const deleteSchema = z.object({ id: z.string().uuid() });

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Los datos no son validos";
  }

  const details = error as { code?: string; message?: string };
  if (details?.code === "PGRST205") {
    return "La tabla de contrastes aun no esta disponible en Supabase.";
  }
  if (details?.code === "PGRST116") {
    return "Supabase no confirmo el registro. Recarga la pagina e intenta de nuevo.";
  }
  return details?.message || "No se pudo guardar el contraste.";
}

function errorResponse(error: unknown) {
  console.error("[api/marketing/observations]", error);
  return NextResponse.json(
    { error: errorMessage(error) },
    { status: error instanceof z.ZodError ? 400 : 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const { avatar_id } = listSchema.parse({
      avatar_id: request.nextUrl.searchParams.get("avatar_id") || undefined,
    });
    const observations = await marketingDb.getAvatarObservations({
      avatarId: avatar_id,
    });
    return NextResponse.json({ observations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createSchema.parse(await request.json());
    const observation = await marketingDb.createAvatarObservation(input);
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...patch } = updateSchema.parse(await request.json());
    const observation = await marketingDb.updateAvatarObservation(id, patch);
    return NextResponse.json({ observation });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = deleteSchema.parse(await request.json());
    await marketingDb.deleteAvatarObservation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
