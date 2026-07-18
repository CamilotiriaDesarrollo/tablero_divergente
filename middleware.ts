// middleware.ts (raiz)
// Refresca la sesion de Supabase en cada navegacion y protege las rutas de la app.
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo salvo estaticos, imagenes, favicon, el manifest, el service worker y
    // el webhook del bot (/api/telegram trae sus PROPIAS guardas: secret token +
    // allowlist; Telegram nunca tiene cookies de sesion, redirigirlo a /login
    // romperia el bot).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api/telegram|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
