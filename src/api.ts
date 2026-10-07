import type { CapturaEnHoja } from './hoja';
import type { Captura, Catalogo } from './reglas';

/**
 * Por qué no se pudo enviar. Decide qué hace la cola:
 * - `token`: nada sirve hasta corregirlo en Ajustes; se detiene todo.
 * - `rechazada`: esta captura nunca va a entrar (422/400); se marca y se sigue con las demás.
 * - `red`: sin señal o Google caído; se reintenta después.
 */
export type Falla = 'token' | 'rechazada' | 'red';

export class ErrorDeEnvio extends Error {
  constructor(
    readonly falla: Falla,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function pedir<T>(token: string, ruta: string, init: RequestInit = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new ErrorDeEnvio('red', 'Sin conexión.');
  }
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (respuesta.ok) {
    return cuerpo as T;
  }
  const mensaje = cuerpo.error ?? `El servidor respondió ${respuesta.status}.`;
  if (respuesta.status === 401) {
    throw new ErrorDeEnvio('token', mensaje);
  }
  if (respuesta.status === 400 || respuesta.status === 422) {
    throw new ErrorDeEnvio('rechazada', mensaje);
  }
  throw new ErrorDeEnvio('red', mensaje);
}

export const traerCatalogo = (token: string) => pedir<Catalogo>(token, '/api/catalogo');

export const traerRecientes = (token: string) => pedir<CapturaEnHoja[]>(token, '/api/capturas');

export const enviarCaptura = (token: string, captura: Captura) =>
  pedir<{ id: string; duplicada: boolean }>(token, '/api/capturas', {
    method: 'POST',
    body: JSON.stringify(captura),
  });
