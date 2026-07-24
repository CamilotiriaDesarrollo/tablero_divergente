// components/marketing/avatar-profile-card.tsx
// Resumen visual de la ficha de cada avatar y sus canales relevantes.
import Image from "next/image";
import { User } from "lucide-react";
import { ChannelMark } from "@/components/marketing/channel-mark";
import { projectColorValue } from "@/components/proyectos/project-colors";
import type { MarketingAvatar, PersonaBlock } from "@/types/db";

const CHANNELS = [
  { name: "LinkedIn", slug: "linkedin", color: "0A66C2", match: /linkedin/i },
  { name: "Instagram", slug: "instagram", color: "E4405F", match: /instagram/i },
  { name: "YouTube", slug: "youtube", color: "FF0000", match: /youtube/i },
  { name: "TikTok", slug: "tiktok", color: "000000", match: /tiktok/i },
  { name: "WhatsApp", slug: "whatsapp", color: "25D366", match: /whatsapp/i },
  { name: "X", slug: "x", color: "000000", match: /(?:twitter|canal x|red x|\bx\s*\/\s*twitter)/i },
  { name: "Podcast", slug: "spotify", color: "1DB954", match: /podcast/i },
];

const FEATURED_CHANNELS: Record<string, string[]> = {
  mateo: ["YouTube"],
  diana: ["LinkedIn", "YouTube"],
  juan: ["YouTube"],
  laura: ["Instagram", "TikTok"],
};

const PROFILE_WORDS: Record<string, string> = {
  mateo: "Coordinador",
  diana: "Corporativa",
  juan: "Independiente",
  laura: "Emprendedora",
};

function blockText(block: PersonaBlock): string {
  switch (block.type) {
    case "text":
    case "quote":
      return `${block.label ?? ""} ${block.body}`;
    case "list":
      return `${block.label ?? ""} ${block.body ?? ""} ${block.items.join(" ")}`;
    case "table":
      return `${block.label ?? ""} ${block.headers.join(" ")} ${block.rows.flat().join(" ")}`;
    case "grid":
      return `${block.label ?? ""} ${block.columns
        .map((column) => `${column.label} ${column.body ?? ""} ${(column.items ?? []).join(" ")}`)
        .join(" ")}`;
  }
}

export function AvatarProfileCard({ avatar }: { avatar: MarketingAvatar }) {
  const accent = projectColorValue(avatar.color);
  const sections = avatar.persona_sections ?? [];
  const source = sections
    .flatMap((section) => section.blocks)
    .map(blockText)
    .join(" ");
  const channels = CHANNELS.filter((channel) => channel.match.test(source));
  const featuredNames = FEATURED_CHANNELS[avatar.slug] ?? [];
  const featuredChannels = CHANNELS.filter((channel) =>
    featuredNames.includes(channel.name),
  );
  const displayChannels = featuredChannels.length ? featuredChannels : channels.slice(0, 1);
  const profileWord = PROFILE_WORDS[avatar.slug];

  return (
    <section
      aria-label={`Perfil de ${avatar.name}`}
      className="overflow-hidden rounded-xl border-t-4 bg-card ring-1 ring-foreground/10"
      style={{ borderTopColor: accent }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden border-b border-border"
        style={{ backgroundColor: `${accent}12` }}
      >
        {avatar.photo_url ? (
          <Image
            src={avatar.photo_url}
            alt={avatar.name}
            fill
            priority
            sizes="(min-width: 1024px) 32vw, 100vw"
            className="object-contain p-4"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <User className="size-14" style={{ color: accent }} />
          </div>
        )}
        {profileWord ? (
          <span className="absolute inset-0 grid place-items-center text-lg font-semibold text-white drop-shadow-md">
            {profileWord}
          </span>
        ) : null}
        {displayChannels.length ? (
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
            {displayChannels.map((channel) => (
              <span
                key={channel.name}
                className="grid size-10 place-items-center rounded-lg bg-background/95 shadow-sm ring-1 ring-foreground/10"
              >
                <ChannelMark
                  name={channel.name}
                  slug={channel.slug}
                  color={channel.color}
                />
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AvatarProfileCard;
