/**
 * Cómo se ven las capturas y el catálogo en la hoja de cálculo.
 *
 * Es el contrato con la app de casa: ella lee `Capturas`, llena `importada_en` y escribe
 * `Catálogo`. Cambiar el orden de una columna aquí sin cambiarlo allá rompe la importación.
 */
import type { Captura, Catalogo, Categoria, Cuenta, Tipo } from './reglas.ts';
import { TIPOS } from './reglas.ts';

export const PESTANA_CAPTURAS = 'Capturas';
export const PESTANA_CATALOGO = 'Catálogo';

/** La fila 1 es el encabezado; se escribe a mano al crear la hoja (ver README). */
export const ENCABEZADO_CAPTURAS = [
  'id',
  'capturada_en',
  'fecha',
  'tipo',
  'monto',
  'origen',
  'destino',
  'categoria',
  'nota',
  'importada_en',
] as const;

export const ENCABEZADO_CATALOGO = ['clase', 'id', 'nombre', 'tipo'] as const;

export const RANGO_CAPTURAS = `${PESTANA_CAPTURAS}!A2:J`;
export const RANGO_AGREGAR = `${PESTANA_CAPTURAS}!A:J`;
export const RANGO_CATALOGO = `'${PESTANA_CATALOGO}'!A2:D`;

export interface CapturaEnHoja extends Captura {
  /** Lo llena la app de casa al importarla. Nulo mientras siga en el buzón. */
  importadaEn: string | null;
}

const vacioANulo = (v: string | undefined) => (v == null || v.trim() === '' ? null : v.trim());

export function capturaAFila(c: Captura): string[] {
  return [
    c.id,
    c.capturadaEn,
    c.fecha,
    c.tipo,
    c.monto,
    c.origen ?? '',
    c.destino ?? '',
    c.categoria ?? '',
    c.nota ?? '',
    '',
  ];
}

export function filaACaptura(f: string[]): CapturaEnHoja | null {
  const [id, capturadaEn, fecha, tipo, monto, origen, destino, categoria, nota, importadaEn] = f;
  if (!id || !TIPOS.includes(tipo as Tipo)) {
    return null;
  }
  return {
    id,
    capturadaEn: capturadaEn ?? '',
    fecha: fecha ?? '',
    tipo: tipo as Tipo,
    monto: monto ?? '',
    origen: vacioANulo(origen),
    destino: vacioANulo(destino),
    categoria: vacioANulo(categoria),
    nota: vacioANulo(nota),
    importadaEn: vacioANulo(importadaEn),
  };
}

/**
 * Filas `CUENTA | id | nombre | DEBITO|CREDITO|EFECTIVO`, `CATEGORIA | id | nombre | GASTO|INGRESO`
 * y una `PUBLICADO | | <instante>` que dice cuándo lo escribió la app de casa. Lo que no encaja
 * se ignora: es una hoja y alguien puede escribir en ella a mano.
 */
export function leerCatalogo(filas: string[][]): Catalogo {
  const cuentas: Cuenta[] = [];
  const categorias: Categoria[] = [];
  let publicadoEn: string | null = null;
  for (const [clase, id, nombre, tipo] of filas) {
    const c = clase?.trim().toUpperCase();
    if (c === 'PUBLICADO') {
      publicadoEn = vacioANulo(nombre);
    } else if (c === 'CUENTA' && id && nombre && ['DEBITO', 'CREDITO', 'EFECTIVO'].includes(tipo)) {
      cuentas.push({ id: id.trim(), nombre: nombre.trim(), tipo: tipo as Cuenta['tipo'] });
    } else if (c === 'CATEGORIA' && id && nombre && ['GASTO', 'INGRESO'].includes(tipo)) {
      categorias.push({ id: id.trim(), nombre: nombre.trim(), clase: tipo as Categoria['clase'] });
    }
  }
  return { cuentas, categorias, publicadoEn };
}

/** Lo que llega por la red, en forma de Captura o nulo. Las reglas se comprueban aparte. */
export function capturaDesde(datos: unknown): Captura | null {
  if (typeof datos !== 'object' || datos == null) {
    return null;
  }
  const d = datos as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' ? v : null);
  const opcional = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  const id = texto(d.id);
  const capturadaEn = texto(d.capturadaEn);
  const fecha = texto(d.fecha);
  const tipo = texto(d.tipo);
  const monto = texto(d.monto);
  if (!id || !capturadaEn || !fecha || !tipo || !monto) {
    return null;
  }
  return {
    id,
    capturadaEn,
    fecha,
    tipo: tipo as Tipo,
    monto,
    origen: opcional(d.origen),
    destino: opcional(d.destino),
    categoria: opcional(d.categoria),
    nota: opcional(d.nota),
  };
}
