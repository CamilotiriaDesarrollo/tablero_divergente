// app/(app)/marketing/page.tsx
// Seccion Marketing (RSC): avatares (buyer personas) e ideas de contenido para
// cada uno. Los 4 avatares base vienen sembrados por la migracion 0006; si la
// tabla aun no existe, la pagina muestra un estado vacio que invita a aplicarla.
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { MARKETING_ENABLED } from "@/lib/config";
import { getMarketingBoard, getPlannerItems } from "@/lib/db/marketing";
import { MarketingBoard } from "@/components/marketing/marketing-board";

export const metadata = {
  title: "Marketing",
};

// Fuerza render por request: si se prerenderiza como estatica, notFound() se
// hornea en el HTML de build y next start lo sirve con status 200 en vez de 404.
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  if (!MARKETING_ENABLED) notFound();

  const [avatars, plannerItems] = await Promise.all([
    getMarketingBoard(),
    getPlannerItems(),
  ]);

  return (
    <main className="mx-auto -mt-6 w-full max-w-6xl px-4 pb-8 pt-0 sm:px-6 lg:pb-10">
      {avatars.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Megaphone className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-medium">
              Los avatares no estan listos
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Aplica la migracion 0006_marketing.sql en Supabase para crear las
              tablas y sembrar los 4 avatares (Mateo, Diana, Juan y Laura).
            </p>
          </div>
        </div>
      ) : (
        <MarketingBoard avatars={avatars} plannerItems={plannerItems} />
      )}
    </main>
  );
}
