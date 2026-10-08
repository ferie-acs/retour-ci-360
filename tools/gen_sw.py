#!/usr/bin/env python3
"""Régénère web/sw.js : liste des fichiers à pré-charger + empreinte de version.

À relancer après TOUTE modification d'un fichier de `web/assets/` ou de `web/index.html`.
Sans cela, le service worker garde son ancien nom de cache et continue de servir
l'ancienne version de l'application.

    python3 tools/gen_sw.py
"""
import hashlib
import io
import json
import os
import sys

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
EXTENSIONS = ('.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.svg')

GABARIT = '''/* Service worker — Retour CI 360   [FICHIER GÉNÉRÉ : voir tools/gen_sw.py]
   Objectif : l'application doit démarrer et fonctionner sans réseau, sur la tablette d'un agent
   au poste frontière. Tout est embarqué localement, donc tout est pré-chargé à l'installation.

   La VERSION est dérivée du contenu des fichiers (empreinte SHA-256). Modifier un seul fichier
   change le nom du cache, ce qui force une vraie mise à jour : c'est ce qui évite de servir
   indéfiniment un ancien script, le défaut classique des applications mises en cache. */
const VERSION = 'r360-%(version)s';
const SHELL = %(shell)s;

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
  if (/\\/assets\\/(vendor|img)\\//.test(url.pathname)) {
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
'''


def main():
    os.chdir(RACINE)
    fichiers = []
    for base, _, noms in os.walk('assets'):
        for n in sorted(noms):
            if n.endswith(EXTENSIONS):
                fichiers.append(os.path.join(base, n).replace(os.sep, '/'))
    fichiers.sort()

    h = hashlib.sha256()
    for f in fichiers + ['index.html', 'manifest.webmanifest']:
        with io.open(f, 'rb') as fh:
            h.update(fh.read())
    # Le code du service worker entre aussi dans l'empreinte : changer sa stratégie de cache
    # sans changer de version laisserait vivre l'ancien cache, et donc l'ancien code.
    h.update(GABARIT.encode('utf-8'))

    shell = ['./', './index.html', './manifest.webmanifest'] + ['./' + f for f in fichiers]
    sortie = GABARIT % {
        'version': h.hexdigest()[:12],
        'shell': json.dumps(shell, indent=2, ensure_ascii=False),
    }
    with io.open('sw.js', 'w', encoding='utf-8') as fh:
        fh.write(sortie)

    poids = sum(os.path.getsize(f) for f in fichiers) / 1048576.0
    print('sw.js régénéré — version %s, %d fichiers, %.1f Mo pré-chargés'
          % (h.hexdigest()[:12], len(shell), poids))


if __name__ == '__main__':
    sys.exit(main())
