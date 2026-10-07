import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { almacenDisponible } from '../src/almacen';
import { traerRecientes } from '../src/api';
import { useSatelite } from '../src/estado';
import type { CapturaEnHoja } from '../src/hoja';
import type { Captura, Catalogo } from '../src/reglas';
import { Aviso, Boton, ETIQUETA_TIPO, pesos, Seccion, TEXTO_TIPO } from '../src/ui';

function nombreCuenta(catalogo: Catalogo | null, id: string | null): string {
  return catalogo?.cuentas.find((c) => c.id === id)?.nombre ?? id ?? '';
}

function Renglon({
  captura,
  catalogo,
  estado,
}: {
  captura: Captura;
  catalogo: Catalogo | null;
  estado: string;
}) {
  const cuentas = [captura.origen, captura.destino]
    .filter((id) => id != null)
    .map((id) => nombreCuenta(catalogo, id))
    .join(' → ');
  const categoria = catalogo?.categorias.find((c) => c.id === captura.categoria)?.nombre;
  return (
    <View className="border-b border-slate-200 py-3 dark:border-slate-800">
      <View className="flex-row justify-between">
        <Text className={`font-semibold ${TEXTO_TIPO[captura.tipo]}`}>
          {ETIQUETA_TIPO[captura.tipo]} · {pesos(captura.monto)}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">{estado}</Text>
      </View>
      <Text className="text-sm text-slate-600 dark:text-slate-300">
        {[captura.fecha, cuentas, categoria, captura.nota].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}

export default function Historial() {
  const { token, catalogo, pendientes, enviando, aviso, enviar, descartar } = useSatelite();
  const [recientes, setRecientes] = useState<CapturaEnHoja[] | null>(null);
  const [errorRecientes, setErrorRecientes] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      setRecientes(await traerRecientes(token));
      setErrorRecientes(null);
    } catch (e) {
      setErrorRecientes(e instanceof Error ? e.message : String(e));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function enviarYRecargar() {
    await enviar();
    await cargar();
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-xl p-5"
    >
      {!almacenDisponible() && (
        <Aviso texto="Este navegador no deja guardar datos: lo que captures sin señal se pierde al cerrar." />
      )}
      {aviso && <Aviso texto={aviso} />}

      <Seccion titulo={`En el teléfono (${pendientes.length})`}>
        {pendientes.length === 0 ? (
          <Text className="text-slate-500 dark:text-slate-400">Todo enviado.</Text>
        ) : (
          <>
            {pendientes.map(({ captura, rechazo }) => (
              <View key={captura.id}>
                <Renglon
                  captura={captura}
                  catalogo={catalogo}
                  estado={rechazo ? 'Rechazada' : 'Sin enviar'}
                />
                {rechazo && (
                  <View className="py-2">
                    <Aviso texto={rechazo} />
                    <Boton texto="Descartar" secundario onPress={() => descartar(captura.id)} />
                  </View>
                )}
              </View>
            ))}
            <View className="mt-3">
              <Boton
                texto={enviando ? 'Enviando…' : 'Enviar ahora'}
                deshabilitado={enviando}
                onPress={enviarYRecargar}
              />
            </View>
          </>
        )}
      </Seccion>

      <Seccion titulo="En la hoja">
        {errorRecientes && <Aviso texto={errorRecientes} />}
        {recientes?.length === 0 && (
          <Text className="text-slate-500 dark:text-slate-400">Nada todavía.</Text>
        )}
        {recientes?.map((c) => (
          <Renglon
            key={c.id}
            captura={c}
            catalogo={catalogo}
            estado={c.importadaEn ? 'En casa ✓' : 'En el buzón'}
          />
        ))}
      </Seccion>
    </ScrollView>
  );
}
