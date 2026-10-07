import '../global.css';

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { SateliteProvider, useSatelite } from '../src/estado';

/**
 * El manifiesto y el service worker convierten la página en una app instalable que abre sin
 * señal. Sin el service worker, la cola sin conexión sirve de poco: la página no cargaría.
 */
function usarModoApp() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifiesto = document.createElement('link');
      manifiesto.rel = 'manifest';
      manifiesto.href = '/manifest.webmanifest';
      document.head.appendChild(manifiesto);
    }
    if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
}

function Pestanas() {
  const { pendientes } = useSatelite();
  const sinEnviar = pendientes.length;
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Capturar',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarBadge: sinEnviar > 0 ? sinEnviar : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

export default function Layout() {
  usarModoApp();
  return (
    <SateliteProvider>
      <StatusBar style="auto" />
      <Pestanas />
    </SateliteProvider>
  );
}
