import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { capturaAFila, capturaDesde, filaACaptura, leerCatalogo } from './hoja.ts';
import type { Captura, Catalogo } from './reglas.ts';
import { diasAntes, fechaValida, hoyEnMexico, normalizarMonto, validar } from './reglas.ts';

const catalogo: Catalogo = {
  cuentas: [
    { id: 'deb', nombre: 'Nómina', tipo: 'DEBITO' },
    { id: 'efe', nombre: 'Cartera', tipo: 'EFECTIVO' },
  ],
  categorias: [
    { id: 'comida', nombre: 'Comida', clase: 'GASTO' },
    { id: 'sueldo', nombre: 'Sueldo', clase: 'INGRESO' },
  ],
  publicadoEn: null,
};

const HOY = '2026-10-06';

function captura(cambios: Partial<Captura> = {}): Captura {
  return {
    id: '0b6f7a52-3c1e-4f6e-9d2a-5a1b2c3d4e5f',
    capturadaEn: '2026-10-06T18:00:00.000Z',
    fecha: HOY,
    tipo: 'GASTO',
    monto: '120.50',
    origen: 'efe',
    destino: null,
    categoria: 'comida',
    nota: null,
    ...cambios,
  };
}

describe('normalizarMonto', () => {
  it('acepta pesos con y sin separador de miles', () => {
    assert.equal(normalizarMonto('120'), '120.00');
    assert.equal(normalizarMonto('120.5'), '120.50');
    assert.equal(normalizarMonto('$1,234.56'), '1234.56');
    assert.equal(normalizarMonto('007'), '7.00');
  });

  it('no adivina una coma decimal ni acepta centavos de más', () => {
    assert.equal(normalizarMonto('1,5'), null);
    assert.equal(normalizarMonto('1.234'), null);
    assert.equal(normalizarMonto('0'), null);
    assert.equal(normalizarMonto('-5'), null);
    assert.equal(normalizarMonto('abc'), null);
  });
});

describe('fechas', () => {
  it('rechaza un día que no existe', () => {
    assert.equal(fechaValida('2026-02-30'), false);
    assert.equal(fechaValida('2026-10-06'), true);
  });

  it('el día de hoy es el de la Ciudad de México', () => {
    // 05:00 UTC del 7 son las 23:00 del 6 en la Ciudad de México.
    assert.equal(hoyEnMexico(new Date('2026-10-07T05:00:00Z')), '2026-10-06');
  });

  it('resta días cruzando el mes', () => {
    assert.equal(diasAntes('2026-10-01', 1), '2026-09-30');
  });
});

describe('validar', () => {
  it('acepta un gasto en efectivo', () => {
    assert.equal(validar(captura(), catalogo, HOY), null);
  });

  it('acepta un retiro del cajero como traslado sin categoría', () => {
    const retiro = captura({ tipo: 'TRASLADO', origen: 'deb', destino: 'efe', categoria: null });
    assert.equal(validar(retiro, catalogo, HOY), null);
  });

  it('un traslado no lleva categoría ni va a la misma cuenta', () => {
    const base = { tipo: 'TRASLADO' as const, origen: 'deb', destino: 'efe' };
    assert.match(validar(captura(base), catalogo, HOY)!, /categoría/);
    assert.match(
      validar(captura({ ...base, destino: 'deb', categoria: null }), catalogo, HOY)!,
      /misma cuenta/,
    );
  });

  it('un ingreso no sale de una cuenta tuya', () => {
    const ingreso = captura({ tipo: 'INGRESO', origen: 'deb', destino: 'deb', categoria: 'sueldo' });
    assert.match(validar(ingreso, catalogo, HOY)!, /entra de fuera/);
  });

  it('la categoría tiene que ser de la misma clase que el movimiento', () => {
    assert.match(validar(captura({ categoria: 'sueldo' }), catalogo, HOY)!, /de ingresos/);
  });

  it('rechaza fechas futuras, cuentas desconocidas y montos sin normalizar', () => {
    assert.match(validar(captura({ fecha: '2062-10-06' }), catalogo, HOY)!, /todavía no llega/);
    assert.match(validar(captura({ origen: 'otra' }), catalogo, HOY)!, /ya no existe/);
    assert.match(validar(captura({ monto: '120.5' }), catalogo, HOY)!, /monto/);
  });
});

describe('la hoja', () => {
  it('una captura sobrevive el viaje de ida y vuelta, sin importar', () => {
    const c = captura({ nota: '=SUMA(A1)' });
    assert.deepEqual(filaACaptura(capturaAFila(c)), { ...c, importadaEn: null });
  });

  it('el catálogo ignora lo que no encaja', () => {
    const leido = leerCatalogo([
      ['CUENTA', 'deb', 'Nómina', 'DEBITO'],
      ['CUENTA', 'x', 'Sin tipo', ''],
      ['CATEGORIA', 'comida', 'Comida', 'GASTO'],
      ['PUBLICADO', '', '2026-10-06T10:00:00Z'],
      ['basura'],
    ]);
    assert.equal(leido.cuentas.length, 1);
    assert.equal(leido.categorias.length, 1);
    assert.equal(leido.publicadoEn, '2026-10-06T10:00:00Z');
  });

  it('lo que llega por la red sin campos obligatorios no es una captura', () => {
    assert.equal(capturaDesde({ id: 'x' }), null);
    assert.equal(capturaDesde('texto'), null);
    assert.deepEqual(capturaDesde({ ...captura(), nota: '  ' })?.nota, null);
  });
});
