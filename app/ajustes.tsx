import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useSatelite } from '../src/estado';
import { Aviso, Boton, Seccion } from '../src/ui';

export default function Ajustes() {
  const { token, catalogo, aviso, guardarToken, recargarCatalogo } = useSatelite();
  const [borrador, setBorrador] = useState('');

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-xl p-5"
    >
      {aviso && <Aviso texto={aviso} />}

      <Seccion titulo="Token">
        {token ? (
          <>
            <Text className="mb-3 text-slate-700 dark:text-slate-200">
              Guardado en este teléfono (termina en …{token.slice(-4)}).
            </Text>
            <Boton texto="Quitar token" secundario onPress={() => guardarToken(null)} />
          </>
        ) : (
          <>
            <TextInput
              className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={borrador}
              onChangeText={setBorrador}
              placeholder="El valor de SATELITE_TOKEN en Netlify"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Boton
              texto="Guardar"
              deshabilitado={borrador.trim().length === 0}
              onPress={() => {
                guardarToken(borrador);
                setBorrador('');
              }}
            />
          </>
        )}
      </Seccion>

      <Seccion titulo="Catálogo">
        <Text className="mb-3 text-slate-700 dark:text-slate-200">
          {catalogo
            ? `${catalogo.cuentas.length} cuentas y ${catalogo.categorias.length} categorías` +
              (catalogo.publicadoEn
                ? `, publicadas por la app de casa el ${new Date(catalogo.publicadoEn).toLocaleString('es-MX')}.`
                : '.')
            : 'Sin catálogo todavía.'}
        </Text>
        <View>
          <Boton
            texto="Recargar catálogo"
            secundario
            deshabilitado={!token}
            onPress={() => void recargarCatalogo()}
          />
        </View>
      </Seccion>
    </ScrollView>
  );
}
