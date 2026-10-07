// Lo justo para que la app abra sin señal. Las capturas NO pasan por aquí: viven en
// localStorage y la app las manda cuando hay red. /api nunca se guarda en caché.
const CACHE = 'satelite-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  if (e.request.mode === 'navigate') {
    // Red primero, para no quedarse con una versión vieja; sin red, la última que hubo.
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return r;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }
  // Los paquetes de Expo llevan hash en el nombre: si está en caché, es el bueno.
  e.respondWith(
    caches.match(e.request).then(
      (guardado) =>
        guardado ??
        fetch(e.request).then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copia));
          }
          return r;
        }),
    ),
  );
});
