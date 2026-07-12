// lib/ai/rate-limit.ts
// Rate-limit opcional del endpoint de IA. Si Upstash Redis esta configurado,
// limita por usuario; si no, deja pasar (no bloquea el desarrollo local).
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      // 20 mensajes por minuto por usuario: suficiente para un solo dueno.
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "tablero:ai",
    });
  }
  return limiter;
}

export async function checkRateLimit(
  userId: string,
): Promise<{ success: boolean }> {
  const l = getLimiter();
  if (!l) return { success: true };
  const { success } = await l.limit(userId);
  return { success };
}
