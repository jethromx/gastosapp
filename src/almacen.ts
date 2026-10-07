/**
 * El almacenamiento del teléfono. El satélite es una app web, así que es `localStorage`.
 *
 * Puede no estar (navegación privada, datos borrados) o lanzar; en ese caso la app sigue
 * funcionando con lo que tenga en memoria y la pantalla de pendientes lo avisa.
 */
export const CLAVES = {
  token: 'satelite.token',
  catalogo: 'satelite.catalogo',
  pendientes: 'satelite.pendientes',
} as const;

export function almacenDisponible(): boolean {
  try {
    const prueba = '__satelite__';
    globalThis.localStorage.setItem(prueba, prueba);
    globalThis.localStorage.removeItem(prueba);
    return true;
  } catch {
    return false;
  }
}

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const texto = globalThis.localStorage?.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

export function guardar(clave: string, valor: unknown): void {
  try {
    if (valor == null) {
      globalThis.localStorage?.removeItem(clave);
    } else {
      globalThis.localStorage?.setItem(clave, JSON.stringify(valor));
    }
  } catch {
    // Sin almacén: se queda en memoria.
  }
}
