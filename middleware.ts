// middleware.ts (raiz)
// Dos guardas independientes de las rutas web, antes de que Next renderice nada:
// 1) Barrera de acceso opcional (SITE_PASSWORD) para despliegues publicos.
// 2) Bloqueo real (404) de /marketing y su API cuando el clon no usa ese modulo.
//    Se hace aqui y no con notFound() dentro de la pagina porque notFound() en
//    un segmento anidado sin not-found.tsx propio no siempre setea el status
//    HTTP a 404 (queda en 200) — el middleware controla el status directo.
import { NextResponse, type NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Autenticacion requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Tablero Divergente"' },
  });
}

function notFound() {
  return new NextResponse("No encontrado", { status: 404 });
}

export function middleware(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  if (password) {
    const user = process.env.SITE_USER?.trim() || "divergente";
    const header = request.headers.get("authorization");
    let authorized = false;

    if (header?.startsWith("Basic ")) {
      const decoded = atob(header.slice("Basic ".length));
      const separatorIndex = decoded.indexOf(":");
      const givenUser = decoded.slice(0, separatorIndex);
      const givenPassword = decoded.slice(separatorIndex + 1);
      authorized = givenUser === user && givenPassword === password;
    }

    if (!authorized) return unauthorized();
  }

  const marketingEnabled = process.env.NEXT_PUBLIC_ENABLE_MARKETING !== "false";
  if (!marketingEnabled) {
    const { pathname } = request.nextUrl;
    if (pathname === "/marketing" || pathname.startsWith("/marketing/")) {
      return notFound();
    }
    if (pathname === "/api/marketing" || pathname.startsWith("/api/marketing/")) {
      return notFound();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Todo salvo estaticos, imagenes, favicon, el manifest, el service worker y
    // el webhook del bot (/api/telegram trae sus PROPIAS guardas: secret token +
    // allowlist; Telegram nunca podria resolver un prompt de Basic Auth).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api/telegram|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
