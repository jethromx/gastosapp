import { leerCatalogo, RANGO_CATALOGO } from '../../src/hoja.ts';
import { autorizado, error, fallaDeGoogle, json } from '../lib/http.ts';
import { hojaDesdeEntorno } from '../lib/sheets.ts';

/** Las cuentas y categorías que publicó la app de casa. */
export default async (req: Request) => {
  if (!autorizado(req)) {
    return error('Token inválido.', 401);
  }
  if (req.method !== 'GET') {
    return error('Solo GET.', 405);
  }
  try {
    const [filas] = await hojaDesdeEntorno().leer([RANGO_CATALOGO]);
    return json(leerCatalogo(filas));
  } catch (e) {
    return fallaDeGoogle(e);
  }
};

export const config = { path: '/api/catalogo' };
