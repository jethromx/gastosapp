import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useSatelite } from '../src/estado';
import type { Captura, Cuenta, Tipo } from '../src/reglas';
import {
  diasAntes,
  hoyEnMexico,
  NOTA_MAXIMA,
  necesitaDestino,
  necesitaOrigen,
  normalizarMonto,
  TIPOS,
  validar,
} from '../src/reglas';
import { Aviso, Boton, Chip, ETIQUETA_TIPO, FONDO_TIPO, pesos, Seccion } from '../src/ui';

const CAMPO =
  'rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

/** El retiro del cajero es lo más común fuera de casa: débito → efectivo, si hay uno de cada. */
function retiroSugerido(cuentas: Cuenta[]): { origen: string | null; destino: string | null } {
  const debito = cuentas.filter((c) => c.tipo === 'DEBITO');
  const efectivo = cuentas.filter((c) => c.tipo === 'EFECTIVO');
  return {
    origen: debito.length === 1 ? debito[0].id : null,
    destino: efectivo.length === 1 ? efectivo[0].id : null,
  };
}

export default function Capturar() {
  const { token, catalogo, encolar, pendientes } = useSatelite();
  const hoy = hoyEnMexico();

  const [tipo, setTipo] = useState<Tipo>('GASTO');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [origen, setOrigen] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [problema, setProblema] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  const categorias = useMemo(
    () => (catalogo?.categorias ?? []).filter((c) => c.clase === tipo),
    [catalogo, tipo],
  );

  if (!token) {
    return (
      <View className="flex-1 bg-slate-50 p-5 dark:bg-slate-950">
        <Aviso tono="info" texto="Primero pon el token del satélite." />
        <Link href="/ajustes" className="font-semibold text-traslado">
          Ir a Ajustes
        </Link>
      </View>
    );
  }
  if (!catalogo || catalogo.cuentas.length === 0) {
    return (
      <View className="flex-1 bg-slate-50 p-5 dark:bg-slate-950">
        <Aviso
          tono="info"
          texto="Todavía no hay cuentas. La app de casa las publica en la pestaña «Catálogo» de la hoja; luego recárgalas en Ajustes."
        />
      </View>
    );
  }

  function cambiarTipo(nuevo: Tipo) {
    setTipo(nuevo);
    setCategoria(null);
    setProblema(null);
    if (nuevo === 'TRASLADO') {
      const sugerido = retiroSugerido(catalogo!.cuentas);
      setOrigen((o) => o ?? sugerido.origen);
      setDestino(sugerido.destino);
    }
  }

  function guardar() {
    const normalizado = normalizarMonto(monto);
    if (!normalizado) {
      setProblema('El monto tiene que ser mayor que cero, con hasta dos decimales.');
      return;
    }
    const captura: Captura = {
      id: crypto.randomUUID(),
      capturadaEn: new Date().toISOString(),
      fecha,
      tipo,
      monto: normalizado,
      origen: necesitaOrigen(tipo) ? origen : null,
      destino: necesitaDestino(tipo) ? destino : null,
      categoria: tipo === 'TRASLADO' ? null : categoria,
      nota: nota.trim() || null,
    };
    const error = validar(captura, catalogo!, hoy);
    if (error) {
      setProblema(error);
      return;
    }
    encolar(captura);
    setListo(`${ETIQUETA_TIPO[tipo]} de ${pesos(normalizado)} guardado.`);
    setProblema(null);
    setMonto('');
    setNota('');
    setCategoria(null);
  }

  const selectorCuenta = (elegida: string | null, elegir: (id: string) => void) => (
    <View className="flex-row flex-wrap">
      {catalogo.cuentas.map((c) => (
        <Chip key={c.id} texto={c.nombre} activo={elegida === c.id} onPress={() => elegir(c.id)} />
      ))}
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-xl p-5"
      keyboardShouldPersistTaps="handled"
    >
      {listo && <Aviso tono="info" texto={listo} />}
      {pendientes.some((p) => !p.rechazo) && (
        <Aviso
          tono="info"
          texto={`${pendientes.filter((p) => !p.rechazo).length} sin enviar todavía. Salen solas cuando haya señal.`}
        />
      )}

      <Seccion titulo="Qué fue">
        <View className="flex-row flex-wrap">
          {TIPOS.map((t) => (
            <Chip
              key={t}
              texto={ETIQUETA_TIPO[t]}
              activo={tipo === t}
              onPress={() => cambiarTipo(t)}
              fondoActivo={FONDO_TIPO[t]}
              textoActivo="text-white"
            />
          ))}
        </View>
      </Seccion>

      <Seccion titulo="Monto">
        <TextInput
          className={`${CAMPO} text-2xl`}
          value={monto}
          onChangeText={(t) => {
            setMonto(t);
            setListo(null);
          }}
          placeholder="$0.00"
          inputMode="decimal"
          autoFocus
        />
      </Seccion>

      <Seccion titulo="Fecha">
        <View className="flex-row flex-wrap">
          <Chip texto="Hoy" activo={fecha === hoy} onPress={() => setFecha(hoy)} />
          <Chip
            texto="Ayer"
            activo={fecha === diasAntes(hoy, 1)}
            onPress={() => setFecha(diasAntes(hoy, 1))}
          />
        </View>
        <TextInput
          className={CAMPO}
          value={fecha}
          onChangeText={setFecha}
          placeholder="AAAA-MM-DD"
          inputMode="numeric"
        />
      </Seccion>

      {necesitaOrigen(tipo) && (
        <Seccion titulo={tipo === 'TRASLADO' ? 'Sale de' : 'Con qué pagaste'}>
          {selectorCuenta(origen, setOrigen)}
        </Seccion>
      )}
      {necesitaDestino(tipo) && (
        <Seccion titulo={tipo === 'TRASLADO' ? 'Entra a' : 'A qué cuenta entró'}>
          {selectorCuenta(destino, setDestino)}
        </Seccion>
      )}
      {tipo === 'TRASLADO' && (
        <Text className="-mt-3 mb-5 text-sm text-slate-500 dark:text-slate-400">
          Un retiro del cajero no es gasto: el dinero pasa del débito a la cartera. El gasto es lo
          que pagues después en efectivo.
        </Text>
      )}

      {tipo !== 'TRASLADO' && categorias.length > 0 && (
        <Seccion titulo="Categoría">
          <View className="flex-row flex-wrap">
            {categorias.map((c) => (
              <Chip
                key={c.id}
                texto={c.nombre}
                activo={categoria === c.id}
                onPress={() => setCategoria(categoria === c.id ? null : c.id)}
              />
            ))}
          </View>
        </Seccion>
      )}

      <Seccion titulo="Nota">
        <TextInput
          className={CAMPO}
          value={nota}
          onChangeText={setNota}
          placeholder="Opcional"
          maxLength={NOTA_MAXIMA}
        />
      </Seccion>

      {problema && <Aviso texto={problema} />}
      <Boton texto="Guardar" onPress={guardar} />
    </ScrollView>
  );
}
