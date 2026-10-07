import { Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import type { Tipo } from './reglas';

export const ETIQUETA_TIPO: Record<Tipo, string> = {
  GASTO: 'Gasto',
  INGRESO: 'Ingreso',
  TRASLADO: 'Retiro / traslado',
};

// Clases completas y no armadas con `bg-${color}`: Tailwind solo genera las que ve escritas.
export const FONDO_TIPO: Record<Tipo, string> = {
  GASTO: 'bg-gasto',
  INGRESO: 'bg-ingreso',
  TRASLADO: 'bg-traslado',
};

export const TEXTO_TIPO: Record<Tipo, string> = {
  GASTO: 'text-gasto',
  INGRESO: 'text-ingreso',
  TRASLADO: 'text-traslado',
};

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

export function Chip({
  texto,
  activo,
  onPress,
  fondoActivo = 'bg-slate-900 dark:bg-slate-100',
  textoActivo = 'text-white dark:text-slate-900',
}: {
  texto: string;
  activo: boolean;
  onPress(): void;
  fondoActivo?: string;
  textoActivo?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
        activo
          ? `border-transparent ${fondoActivo}`
          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <Text className={activo ? `font-semibold ${textoActivo}` : 'text-slate-700 dark:text-slate-200'}>
        {texto}
      </Text>
    </Pressable>
  );
}

export function Boton({
  texto,
  onPress,
  deshabilitado = false,
  secundario = false,
}: {
  texto: string;
  onPress(): void;
  deshabilitado?: boolean;
  secundario?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={deshabilitado}
      onPress={onPress}
      className={`items-center rounded-xl px-4 py-3 ${
        secundario
          ? 'border border-slate-300 dark:border-slate-700'
          : 'bg-slate-900 dark:bg-slate-100'
      } ${deshabilitado ? 'opacity-40' : ''}`}
    >
      <Text
        className={`font-semibold ${
          secundario ? 'text-slate-800 dark:text-slate-100' : 'text-white dark:text-slate-900'
        }`}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

export function Aviso({ texto, tono = 'error' }: { texto: string; tono?: 'error' | 'info' }) {
  return (
    <View
      className={`mb-4 rounded-xl px-4 py-3 ${
        tono === 'error' ? 'bg-red-50 dark:bg-red-950' : 'bg-slate-100 dark:bg-slate-800'
      }`}
    >
      <Text className={tono === 'error' ? 'text-red-800 dark:text-red-200' : 'text-slate-700 dark:text-slate-200'}>
        {texto}
      </Text>
    </View>
  );
}

export function pesos(monto: string): string {
  return Number(monto).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
