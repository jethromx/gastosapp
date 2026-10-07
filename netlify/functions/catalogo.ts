import { leerCatalogo, RANGO_CATALOGO } from '../../src/hoja.ts';
import { error, fallaDeGoogle, json, rechazo } from '../lib/http.ts';
import { hojaDesdeEntorno } from '../lib/sheets.ts';

/** Las cuentas y categorías que publicó la app de casa. */
export default async (req: Request) => {
  const sinPermiso = rechazo(req);
  if (sinPermiso) {
    return sinPermiso;
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
