import { createHash, timingSafeEqual } from 'node:crypto';

/** Un token por debajo de esto se puede adivinar; mejor no arrancar. */
const TOKEN_MINIMO = 32;

/**
 * El sitio es público: cualquiera con la URL llega a la función. Lo único que la separa de
 * meterte gastos es este token, que el teléfono guarda al configurarlo.
 *
 * Se comparan los hashes y no los textos para que `timingSafeEqual` reciba dos buffers del
 * mismo largo y el tiempo no diga cuántos caracteres acertaste.
 */
export function autorizado(req: Request): boolean {
  const esperado = process.env.SATELITE_TOKEN;
  if (!esperado || esperado.length < TOKEN_MINIMO) {
    return false;
  }
  const dado = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const hash = (t: string) => createHash('sha256').update(t).digest();
  return timingSafeEqual(hash(dado), hash(esperado));
}

export function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const error = (mensaje: string, estado: number) => json({ error: mensaje }, estado);

/** Lo que se le dice al teléfono cuando Google falla; el detalle se queda en el log. */
export function fallaDeGoogle(e: unknown): Response {
  console.error(e);
  return error('No se pudo hablar con la hoja. Se reintentará.', 502);
}
