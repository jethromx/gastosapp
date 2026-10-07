/**
 * Google Sheets con una cuenta de servicio, sin la librería de Google.
 *
 * Es el mismo flujo que el respaldo de briq-invest: armar el JWT, firmarlo con RS256 y
 * cambiarlo por un token. Aquí con Web Crypto en lugar de `java.security`.
 *
 * La cuenta de servicio de este satélite debe tener acceso SOLO a la hoja del buzón, nunca al
 * libro del respaldo (que comparte pestañas con Finora 2): si esta credencial se filtra, no
 * alcanza nada más.
 */
import { variable } from './http.ts';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const ALCANCE = 'https://www.googleapis.com/auth/spreadsheets';

export interface Hoja {
  /** Una matriz de filas por rango, en el mismo orden. Un rango vacío da `[]`. */
  leer(rangos: string[]): Promise<string[][][]>;
  agregar(rango: string, filas: string[][]): Promise<void>;
}

function requerida(nombre: string): string {
  const valor = variable(nombre);
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}.`);
  }
  return valor;
}

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const textoBase64url = (texto: string) => base64url(new TextEncoder().encode(texto));

function pemABytes(pem: string): Uint8Array<ArrayBuffer> {
  const cuerpo = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  return Uint8Array.from(Buffer.from(cuerpo, 'base64'));
}

// Vive lo que viva la instancia caliente de la función; si no, se pide otro.
let enCache: { token: string; vence: number } | null = null;

async function token(correo: string, llavePem: string): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  if (enCache && enCache.vence - 60 > ahora) {
    return enCache.token;
  }
  const encabezado = textoBase64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const reclamos = textoBase64url(
    JSON.stringify({ iss: correo, scope: ALCANCE, aud: TOKEN_URL, iat: ahora, exp: ahora + 3600 }),
  );
  const llave = await crypto.subtle.importKey(
    'pkcs8',
    pemABytes(llavePem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    llave,
    new TextEncoder().encode(`${encabezado}.${reclamos}`),
  );
  const respuesta = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${encabezado}.${reclamos}.${base64url(new Uint8Array(firma))}`,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Google no dio token: ${respuesta.status} ${await respuesta.text()}`);
  }
  const { access_token, expires_in } = (await respuesta.json()) as {
    access_token: string;
    expires_in: number;
  };
  enCache = { token: access_token, vence: ahora + expires_in };
  return access_token;
}

export function hojaDesdeEntorno(): Hoja {
  const correo = requerida('GOOGLE_SA_EMAIL');
  // Netlify guarda la llave en una sola línea con los saltos escritos como `\n`.
  const llave = requerida('GOOGLE_SA_KEY').replace(/\\n/g, '\n');
  const id = requerida('SHEET_ID');

  async function pedir(ruta: string, init: RequestInit = {}): Promise<unknown> {
    const respuesta = await fetch(`${API}/${id}${ruta}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${await token(correo, llave)}`,
        'Content-Type': 'application/json',
      },
    });
    if (!respuesta.ok) {
      throw new Error(`Sheets respondió ${respuesta.status}: ${await respuesta.text()}`);
    }
    return respuesta.json();
  }

  return {
    async leer(rangos) {
      const query = new URLSearchParams(rangos.map((r) => ['ranges', r]));
      const datos = (await pedir(`/values:batchGet?${query}`)) as {
        valueRanges: { values?: string[][] }[];
      };
      return datos.valueRanges.map((r) => r.values ?? []);
    },
    async agregar(rango, filas) {
      // RAW y no USER_ENTERED: una nota que empiece con «=» se guarda como texto y no como
      // fórmula. El monto queda como texto; la app de casa lo lee como texto de todos modos.
      await pedir(
        `/values/${encodeURIComponent(rango)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', body: JSON.stringify({ values: filas }) },
      );
    },
  };
}
