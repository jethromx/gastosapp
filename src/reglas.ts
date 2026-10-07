/**
 * Lo que es una captura y lo que tiene que cumplir.
 *
 * Son las reglas de `Movement` en briq-invest, del lado del satélite. Las corre el teléfono
 * antes de encolar —para avisar en el momento— y otra vez la función de Netlify antes de
 * escribir en la hoja, porque el cliente no es de fiar. Si una regla cambia en briq-invest,
 * cambia aquí: una captura que el satélite acepta y la app de casa rechaza se queda varada.
 *
 * Este archivo no importa nada a propósito: lo cargan Metro, esbuild (Netlify) y `node --test`.
 */

/** Igual que `MovementType`. Un retiro del cajero es un TRASLADO de débito a efectivo, no un gasto. */
export type Tipo = 'GASTO' | 'INGRESO' | 'TRASLADO';
export type TipoCuenta = 'DEBITO' | 'CREDITO' | 'EFECTIVO';
export type ClaseCategoria = 'GASTO' | 'INGRESO';

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
}

export interface Categoria {
  id: string;
  nombre: string;
  clase: ClaseCategoria;
}

/** Lo que publica la app de casa. El satélite no inventa cuentas ni categorías. */
export interface Catalogo {
  cuentas: Cuenta[];
  categorias: Categoria[];
  publicadoEn: string | null;
}

export interface Captura {
  /** UUID generado en el teléfono: es lo que hace que un reintento no duplique. */
  id: string;
  /** Instante ISO en que se capturó, no la fecha del movimiento. */
  capturadaEn: string;
  /** AAAA-MM-DD. */
  fecha: string;
  tipo: Tipo;
  /** Siempre positivo y con dos decimales: "1234.50". El signo lo lleva el tipo. */
  monto: string;
  /** De dónde sale. Nulo solo en un ingreso. */
  origen: string | null;
  /** A dónde entra. Nulo en un gasto. */
  destino: string | null;
  categoria: string | null;
  nota: string | null;
}

export const TIPOS: readonly Tipo[] = ['GASTO', 'INGRESO', 'TRASLADO'];
export const NOTA_MAXIMA = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_SEPARADORES = /^\d{1,8}(\.\d{1,2})?$/;
// La coma solo como separador de miles. "1,5" no se adivina: en México sería 15 o un error.
const CON_MILES = /^\d{1,3}(,\d{3}){1,2}(\.\d{1,2})?$/;

/** El día de hoy en la Ciudad de México, sea cual sea la zona del teléfono o del servidor. */
export function hoyEnMexico(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** Resta días a una fecha AAAA-MM-DD sin pasar por la zona horaria. */
export function diasAntes(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/** "1,234.5" → "1234.50". Nulo si no es un monto positivo con hasta dos decimales. */
export function normalizarMonto(texto: string): string | null {
  const limpio = texto.trim().replace(/^\$\s*/, '');
  if (!SIN_SEPARADORES.test(limpio) && !CON_MILES.test(limpio)) {
    return null;
  }
  const [enteros, centavos = ''] = limpio.replace(/,/g, '').split('.');
  const monto = `${Number(enteros)}.${centavos.padEnd(2, '0')}`;
  return monto === '0.00' ? null : monto;
}

export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }
  const d = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export const necesitaOrigen = (tipo: Tipo) => tipo !== 'INGRESO';
export const necesitaDestino = (tipo: Tipo) => tipo !== 'GASTO';

/** El primer problema de la captura, o nulo si se puede mandar. */
export function validar(c: Captura, catalogo: Catalogo, hoy: string): string | null {
  if (!UUID.test(c.id)) {
    return 'La captura no tiene un identificador válido.';
  }
  if (!TIPOS.includes(c.tipo)) {
    return 'Hay que decir si entra, sale o cambia de sitio.';
  }
  if (!fechaValida(c.fecha)) {
    return 'La fecha no es válida.';
  }
  if (c.fecha > hoy) {
    return 'Esa fecha todavía no llega. Suele ser un año mal tecleado.';
  }
  if (normalizarMonto(c.monto) !== c.monto) {
    return 'El monto tiene que ser mayor que cero, con hasta dos decimales.';
  }

  const cuenta = (id: string | null) => catalogo.cuentas.find((x) => x.id === id);
  if (necesitaOrigen(c.tipo) && c.origen == null) {
    return 'Hay que decir de qué cuenta sale el dinero.';
  }
  if (!necesitaOrigen(c.tipo) && c.origen != null) {
    return 'Un ingreso no sale de ninguna cuenta tuya: entra de fuera.';
  }
  if (necesitaDestino(c.tipo) && c.destino == null) {
    return 'Hay que decir a qué cuenta entra el dinero.';
  }
  if (!necesitaDestino(c.tipo) && c.destino != null) {
    return 'Un gasto no entra en ninguna cuenta tuya: se va fuera.';
  }
  if (c.origen != null && !cuenta(c.origen)) {
    return 'La cuenta de origen ya no existe. Recarga el catálogo.';
  }
  if (c.destino != null && !cuenta(c.destino)) {
    return 'La cuenta de destino ya no existe. Recarga el catálogo.';
  }
  if (c.tipo === 'TRASLADO' && c.origen === c.destino) {
    return 'Un traslado a la misma cuenta no mueve nada.';
  }

  if (c.tipo === 'TRASLADO' && c.categoria != null) {
    return 'Un traslado no lleva categoría: el dinero solo cambió de sitio.';
  }
  if (c.categoria != null) {
    const categoria = catalogo.categorias.find((x) => x.id === c.categoria);
    if (!categoria) {
      return 'La categoría ya no existe. Recarga el catálogo.';
    }
    if (categoria.clase !== c.tipo) {
      return categoria.clase === 'GASTO'
        ? 'Esa categoría es de gastos y esto es un ingreso.'
        : 'Esa categoría es de ingresos y esto es un gasto.';
    }
  }

  if (c.nota != null && c.nota.length > NOTA_MAXIMA) {
    return `La nota no puede pasar de ${NOTA_MAXIMA} caracteres.`;
  }
  return null;
}
