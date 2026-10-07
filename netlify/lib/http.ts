import { createHash, timingSafeEqual } from 'node:crypto';

/** Un token por debajo de esto se puede adivinar; mejor no arrancar. */
const TOKEN_MINIMO = 32;

/**
 * Una variable de entorno, sin los espacios ni las comillas que deja pegar un `.env` en
 * Netlify: `SATELITE_TOKEN="abc"` puede llegar como `"abc"`, comillas incluidas, y entonces
 * ningún token coincide.
 */
export function variable(nombre: string): string | undefined {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    return undefined;
  }
  const entre = valor.match(/^(["'])([\s\S]*)\1$/);
  return entre ? entre[2] : valor;
}

/**
 * Nulo si la petición trae el token; si no, la respuesta que hay que dar.
 *
 * El sitio es público: cualquiera con la URL llega a la función. Lo único que la separa de
 * meterte gastos es este token, que el teléfono guarda al configurarlo.
 *
 * Un servidor SIN token configurado no contesta «Token inválido»: eso mandaba a revisar el
 * teléfono cuando lo que faltaba estaba en Netlify. Dice que falta la variable, sin enseñarla.
 *
 * Se comparan los hashes y no los textos para que `timingSafeEqual` reciba dos buffers del
 * mismo largo y el tiempo no diga cuántos caracteres acertaste.
 */
export function rechazo(req: Request): Response | null {
  const esperado = variable('SATELITE_TOKEN');
  if (!esperado || esperado.length < TOKEN_MINIMO) {
    return error(
      `El servidor no tiene SATELITE_TOKEN (o tiene menos de ${TOKEN_MINIMO} caracteres). Ponlo en las variables de Netlify, con alcance Functions, y vuelve a desplegar.`,
      500,
    );
  }
  const dado = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const hash = (t: string) => createHash('sha256').update(t).digest();
  if (!timingSafeEqual(hash(dado), hash(esperado))) {
    return error('Token inválido: no es el SATELITE_TOKEN de Netlify.', 401);
  }
  return null;
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
