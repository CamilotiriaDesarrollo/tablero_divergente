"use client";
// components/marketing/avatar-profile-card.tsx
// Perfil de un avatar (buyer persona): nombre, titular y descripcion, con
// edicion en dialogo. El avatar es fijo (los 4 vienen sembrados); aqui solo se
// desarrolla su perfil. Boton "Editar perfil" produce el aviso "Perfil actualizado".
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { updateAvatarAction } from "@/lib/db/actions";
import type { MarketingAvatar } from "@/types/db";

const NOTE_LIMIT = 8000;

export function AvatarProfileCard({ avatar }: { avatar: MarketingAvatar }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [headline, setHeadline] = useState(avatar.headline ?? "");
  const [description, setDescription] = useState(avatar.description ?? "");
  const accent = projectColorValue(avatar.color);

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await updateAvatarAction(avatar.id, {
          headline: headline.trim() || null,
          description: description.trim() || null,
        });
        toast.success("Perfil actualizado");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo actualizar el perfil", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <>
      <section
        aria-label={`Perfil de ${avatar.name}`}
        className="rounded-xl border-l-4 bg-card p-4 ring-1 ring-foreground/10"
        style={{ borderLeftColor: accent }}
      >
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarFallback
              className="font-heading font-semibold"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {avatar.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold leading-snug">
              {avatar.name}
            </h2>
            {avatar.headline?.trim() ? (
              <p className="text-sm text-muted-foreground">{avatar.headline}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin titular todavia. Describe en una linea quien es.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Pencil />
            Editar perfil
          </Button>
        </div>
        {avatar.description?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {avatar.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Aqui va la descripcion del avatar: contexto, dolores, deseos y como
            le habla la marca. Editala cuando tengas la definicion.
          </p>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar perfil de {avatar.name}</DialogTitle>
            <DialogDescription>
              El perfil guia las ideas de contenido de este avatar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`avatar-headline-${avatar.id}`}>Titular</Label>
              <Input
                id={`avatar-headline-${avatar.id}`}
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Quien es, en una linea"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`avatar-description-${avatar.id}`}>
                  Descripcion
                </Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {description.length.toLocaleString("es-CO")} /{" "}
                  {NOTE_LIMIT.toLocaleString("es-CO")}
                </span>
              </div>
              <Textarea
                id={`avatar-description-${avatar.id}`}
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value.slice(0, NOTE_LIMIT))
                }
                placeholder="Contexto, dolores, deseos, objeciones y tono con el que se le habla..."
                rows={10}
                maxLength={NOTE_LIMIT}
                className="resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AvatarProfileCard;
