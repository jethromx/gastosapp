import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { CLAVES, guardar, leer } from './almacen';
import { enviarCaptura, ErrorDeEnvio, traerCatalogo } from './api';
import type { Captura, Catalogo } from './reglas';

/** Una captura que vive en el teléfono hasta que la función confirma que entró a la hoja. */
export interface Pendiente {
  captura: Captura;
  /** Por qué la rechazó el servidor. Una rechazada no se reintenta: se corrige o se descarta. */
  rechazo: string | null;
}

interface Estado {
  token: string | null;
  catalogo: Catalogo | null;
  pendientes: Pendiente[];
  enviando: boolean;
  /** Lo último que salió mal al hablar con el servidor, para mostrarlo. */
  aviso: string | null;
  guardarToken(token: string | null): void;
  recargarCatalogo(): Promise<void>;
  encolar(captura: Captura): void;
  enviar(): Promise<void>;
  descartar(id: string): void;
}

const Contexto = createContext<Estado | null>(null);

export function useSatelite(): Estado {
  const estado = useContext(Contexto);
  if (!estado) {
    throw new Error('useSatelite fuera de <SateliteProvider>.');
  }
  return estado;
}

export function SateliteProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => leer(CLAVES.token, null));
  const [catalogo, setCatalogo] = useState<Catalogo | null>(() => leer(CLAVES.catalogo, null));
  const [pendientes, setPendientes] = useState<Pendiente[]>(() => leer(CLAVES.pendientes, []));
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // La cola se lee de aquí y no del estado: `enviar` puede correr mientras se encola otra.
  const cola = useRef(pendientes);
  const ocupado = useRef(false);

  const actualizarCola = useCallback((siguiente: (p: Pendiente[]) => Pendiente[]) => {
    cola.current = siguiente(cola.current);
    guardar(CLAVES.pendientes, cola.current);
    setPendientes(cola.current);
  }, []);

  const guardarToken = useCallback((nuevo: string | null) => {
    const limpio = nuevo?.trim() || null;
    guardar(CLAVES.token, limpio);
    setToken(limpio);
    setAviso(null);
  }, []);

  const recargarCatalogo = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const nuevo = await traerCatalogo(token);
      guardar(CLAVES.catalogo, nuevo);
      setCatalogo(nuevo);
      setAviso(null);
    } catch (e) {
      // Sin red se sigue con el catálogo guardado: es justo para eso.
      setAviso(e instanceof Error ? e.message : String(e));
    }
  }, [token]);

  const enviar = useCallback(async () => {
    if (!token || ocupado.current) {
      return;
    }
    ocupado.current = true;
    setEnviando(true);
    try {
      for (const { captura, rechazo } of cola.current) {
        if (rechazo) {
          continue;
        }
        try {
          await enviarCaptura(token, captura);
          actualizarCola((c) => c.filter((p) => p.captura.id !== captura.id));
        } catch (e) {
          if (e instanceof ErrorDeEnvio && e.falla === 'rechazada') {
            actualizarCola((c) =>
              c.map((p) => (p.captura.id === captura.id ? { ...p, rechazo: e.message } : p)),
            );
            continue;
          }
          // Token malo o sin red: las que siguen fallarían igual.
          setAviso(e instanceof Error ? e.message : String(e));
          return;
        }
      }
      setAviso(null);
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  }, [token, actualizarCola]);

  const encolar = useCallback(
    (captura: Captura) => {
      actualizarCola((c) => [...c, { captura, rechazo: null }]);
      void enviar();
    },
    [actualizarCola, enviar],
  );

  const descartar = useCallback(
    (id: string) => actualizarCola((c) => c.filter((p) => p.captura.id !== id)),
    [actualizarCola],
  );

  // Al abrir, al volver la señal y al regresar a la app: lo pendiente sale solo.
  useEffect(() => {
    if (!token) {
      return;
    }
    void recargarCatalogo();
    void enviar();
    if (typeof window === 'undefined') {
      return;
    }
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        void enviar();
      }
    };
    const alConectar = () => void enviar();
    window.addEventListener('online', alConectar);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('online', alConectar);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [token, recargarCatalogo, enviar]);

  const valor = useMemo(
    () => ({
      token,
      catalogo,
      pendientes,
      enviando,
      aviso,
      guardarToken,
      recargarCatalogo,
      encolar,
      enviar,
      descartar,
    }),
    [token, catalogo, pendientes, enviando, aviso, guardarToken, recargarCatalogo, encolar, enviar, descartar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
