/* Service worker — Retour CI 360   [FICHIER GÉNÉRÉ : voir tools/gen_sw.py]
   Objectif : l'application doit démarrer et fonctionner sans réseau, sur la tablette d'un agent
   au poste frontière. Tout est embarqué localement, donc tout est pré-chargé à l'installation.

   La VERSION est dérivée du contenu des fichiers (empreinte SHA-256). Modifier un seul fichier
   change le nom du cache, ce qui force une vraie mise à jour : c'est ce qui évite de servir
   indéfiniment un ancien script, le défaut classique des applications mises en cache. */
const VERSION = 'r360-2174267c6569';
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/app.css",
  "./assets/data/afrique_geo.js",
  "./assets/data/dictionnaire.js",
  "./assets/data/metier.js",
  "./assets/data/metier_gen.js",
  "./assets/data/referentiels.js",
  "./assets/img/embleme.png",
  "./assets/img/favicon.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
  "./assets/img/icon-maskable-512.png",
  "./assets/img/logo-retour-ci-360.png",
  "./assets/js/admin.js",
  "./assets/js/agent.js",
  "./assets/js/annonces.js",
  "./assets/js/app.js",
  "./assets/js/carte.js",
  "./assets/js/charts.js",
  "./assets/js/config.js",
  "./assets/js/documents.js",
  "./assets/js/domaine.js",
  "./assets/js/export.js",
  "./assets/js/form.js",
  "./assets/js/pilotage.js",
  "./assets/js/pipeline.js",
  "./assets/js/portail.js",
  "./assets/js/qualite.js",
  "./assets/js/reglages.js",
  "./assets/js/seed.js",
  "./assets/js/sites.js",
  "./assets/js/stats.js",
  "./assets/js/store.js",
  "./assets/js/taches.js",
  "./assets/js/ui.js",
  "./assets/vendor/fonts/nunito-latin-400-normal.woff2",
  "./assets/vendor/fonts/nunito-latin-500-normal.woff2",
  "./assets/vendor/fonts/nunito-latin-600-normal.woff2",
  "./assets/vendor/fonts/nunito-latin-700-normal.woff2",
  "./assets/vendor/fonts/nunito-latin-800-normal.woff2",
  "./assets/vendor/html-to-image.js",
  "./assets/vendor/images/layers-2x.png",
  "./assets/vendor/images/layers.png",
  "./assets/vendor/images/marker-icon-2x.png",
  "./assets/vendor/images/marker-icon.png",
  "./assets/vendor/images/marker-shadow.png",
  "./assets/vendor/jspdf.plugin.autotable.min.js",
  "./assets/vendor/jspdf.umd.min.js",
  "./assets/vendor/leaflet.css",
  "./assets/vendor/leaflet.js",
  "./assets/vendor/lucide.min.js",
  "./assets/vendor/qrcode.js",
  "./assets/vendor/supabase.js",
  "./assets/vendor/xlsx.mini.min.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    /* addAll échoue en bloc dès qu'un fichier manque : on ajoute un par un pour qu'un
       fichier absent ne prive pas l'application de tout son cache. */
    await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ type: 'r360-maj', version: VERSION });
  })());
});

self.addEventListener('message', (e) => { if (e.data && e.data.type === 'r360-appliquer') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Fond de carte OpenStreetMap : jamais mis en cache — la politique d'usage des tuiles
     l'interdit, et l'application est conçue pour s'afficher sans elles. */
  if (url.origin !== self.location.origin) return;

  /* Navigation : le réseau d'abord, pour que la page d'entrée reste à jour ;
     le cache prend le relais hors connexion. */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(VERSION); c.put('./index.html', r.clone());
        return r;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  /* Bibliothèques, polices et images : contenu figé, le cache d'abord, sans aller au réseau.
     C'est là que se trouvent les 3 Mo, et ils ne changent qu'avec une nouvelle VERSION. */
  if (/\/assets\/(vendor|img)\//.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const vu = await c.match(req, { ignoreSearch: true });
      if (vu) return vu;
      try { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; } catch (err) { return Response.error(); }
    })());
    return;
  }

  /* Code et données de l'application : le RÉSEAU d'abord, avec repli sur le cache hors connexion.
     Une stratégie « cache d'abord » servait un script périmé à chaque modification — et pire,
     la revalidation passait par le cache HTTP du navigateur, qui réinjectait l'ancienne copie
     dans le cache du service worker. `cache: 'no-store'` coupe court à ce double cache. */
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    try {
      const r = await Promise.race([
        fetch(new Request(req, { cache: 'no-store' })),
        new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), 2500)),
      ]);
      if (r && r.ok) c.put(req, r.clone());
      return r;
    } catch (err) {
      const vu = await c.match(req, { ignoreSearch: true });
      return vu || Response.error();
    }
  })());
});
