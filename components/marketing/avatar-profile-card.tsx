"use client";
// components/marketing/avatar-profile-card.tsx
// Perfil de un avatar (buyer persona): foto, nombre, titular y descripcion, con
// edicion en dialogo. El avatar es fijo (los 4 vienen sembrados); aqui solo se
// desarrolla su perfil. Boton "Editar perfil" produce el aviso "Perfil actualizado".
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Pencil, User } from "lucide-react";
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
        className="rounded-xl border-t-4 bg-card p-4 ring-1 ring-foreground/10"
        style={{ borderTopColor: accent }}
      >
        <div className="flex items-start gap-3">
          <div
            className="relative size-14 shrink-0 overflow-hidden rounded-lg"
            style={{ backgroundColor: `${accent}14` }}
          >
            {avatar.photo_url ? (
              <Image
                src={avatar.photo_url}
                alt={avatar.name}
                fill
                sizes="56px"
                className="object-contain"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <User className="size-6" style={{ color: accent }} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-semibold leading-snug">
              {avatar.name}
            </h2>
            {avatar.headline?.trim() ? (
              <p className="text-xs text-muted-foreground">{avatar.headline}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sin titular todavia.
              </p>
            )}
          </div>
        </div>
        {avatar.description?.trim() ? (
          <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {avatar.description}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Aqui va la descripcion del avatar: contexto, dolores, deseos y
            como le habla la marca.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="mt-3 w-full"
        >
          <Pencil />
          Editar perfil
        </Button>
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
