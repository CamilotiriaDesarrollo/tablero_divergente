"use client";
// Logo de canal con respaldo legible cuando un recurso externo no esta disponible.
import { useState } from "react";
import Image from "next/image";

const ABBREVIATIONS: Record<string, string> = {
  LinkedIn: "LN",
  YouTube: "YT",
  Instagram: "IG",
  TikTok: "TK",
  WhatsApp: "WA",
  X: "X",
  Podcast: "PD",
};

export function ChannelMark({
  name,
  slug,
  color,
}: {
  name: string;
  slug: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-mono text-[11px] font-bold" style={{ color: `#${color}` }}>
        {ABBREVIATIONS[name] ?? name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={`https://cdn.simpleicons.org/${slug}/${color}`}
      alt={name}
      width={22}
      height={22}
      className="size-[22px]"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

export default ChannelMark;
