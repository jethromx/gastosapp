import {
  capturaAFila,
  capturaDesde,
  filaACaptura,
  leerCatalogo,
  RANGO_AGREGAR,
  RANGO_CAPTURAS,
  RANGO_CATALOGO,
} from '../../src/hoja.ts';
import type { CapturaEnHoja } from '../../src/hoja.ts';
import { hoyEnMexico, validar } from '../../src/reglas.ts';
import { error, fallaDeGoogle, json, rechazo } from '../lib/http.ts';
import { hojaDesdeEntorno } from '../lib/sheets.ts';

const RECIENTES = 30;

/**
 * El buzón. GET da las últimas capturas y si la app de casa ya las importó; POST agrega una.
 *
 * Solo agrega: no hay PUT ni DELETE. Lo que se capturó mal se corrige en la app de casa, que es
 * la fuente de verdad. Así nunca hay que decidir quién gana ante un conflicto.
 */
export default async (req: Request) => {
  const sinPermiso = rechazo(req);
  if (sinPermiso) {
    return sinPermiso;
  }
  try {
    if (req.method === 'GET') {
      return await recientes();
    }
    if (req.method === 'POST') {
      return await agregar(req);
    }
    return error('Solo GET o POST.', 405);
  } catch (e) {
    return fallaDeGoogle(e);
  }
};

async function recientes(): Promise<Response> {
  const [filas] = await hojaDesdeEntorno().leer([RANGO_CAPTURAS]);
  const capturas = filas
    .map(filaACaptura)
    .filter((c): c is CapturaEnHoja => c != null)
    .slice(-RECIENTES)
    .reverse();
  return json(capturas);
}

async function agregar(req: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return error('El cuerpo no es JSON.', 400);
  }
  const captura = capturaDesde(cuerpo);
  if (!captura) {
    return error('Faltan campos de la captura.', 400);
  }

  const hoja = hojaDesdeEntorno();
  const [filas, filasCatalogo] = await hoja.leer([RANGO_CAPTURAS, RANGO_CATALOGO]);

  // El teléfono reintenta lo que no vio confirmado; si ya llegó, se contesta que sí y ya.
  if (filas.some((f) => f[0] === captura.id)) {
    return json({ id: captura.id, duplicada: true });
  }
  const problema = validar(captura, leerCatalogo(filasCatalogo), hoyEnMexico());
  if (problema) {
    return error(problema, 422);
  }
  await hoja.agregar(RANGO_AGREGAR, [capturaAFila(captura)]);
  return json({ id: captura.id, duplicada: false }, 201);
}

export const config = { path: '/api/capturas' };
