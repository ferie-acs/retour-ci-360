/* Carte réelle des routes migratoires (Leaflet) : fond cartographique en ligne, contours des pays en secours hors connexion */
(function () {
  const C = {};
  /* Fond libre : OpenStreetMap, rendu français d'OSM France (noms de lieux en français), licence ODbL.
     Secours : rendu standard d'OpenStreetMap si le serveur français ne répond pas. Aucune clé requise. */
  const FONDS = [
    { url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', sub: 'abc', max: 19 },
    { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', sub: 'abc', max: 19 },
  ];
  const ATTRIB = '© les contributeurs d\'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL), fond OSM France — contours : Natural Earth — villes : GeoNames';
  const AFRIQUE = [[-35, -19], [38, 52]];
  const sombre = () => document.documentElement.dataset.theme === 'dark';
  const BLEU = () => (sombre() ? '#5FA0E6' : '#014A96');

  /* Arc légèrement incurvé entre deux villes, pour faire sentir le trajet */
  function arc(a, b, k = 0.18, n = 18) {
    const [la1, lo1] = a, [la2, lo2] = b; const dla = la2 - la1, dlo = lo2 - lo1; const len = Math.hypot(dla, dlo) || 1;
    const cla = (la1 + la2) / 2 + (dlo / len) * len * k * 0.5, clo = (lo1 + lo2) / 2 - (dla / len) * len * k * 0.5;
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([(1 - t) * (1 - t) * la1 + 2 * (1 - t) * t * cla + t * t * la2, (1 - t) * (1 - t) * lo1 + 2 * (1 - t) * t * clo + t * t * lo2]); }
    return pts;
  }
  const chemin = (etapes) => etapes.slice(1).reduce((acc, e, i) => acc.concat(arc(etapes[i].ll, e.ll).slice(i ? 1 : 0)), etapes.length ? [etapes[0].ll] : []);

  function base(el, intensite) {
    if (el._carte) { el._carte.remove(); el._carte = null; }
    if (el._ro) { el._ro.disconnect(); el._ro = null; }
    if (!window.L) { el.textContent = 'Carte indisponible'; return null; }
    const map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true, worldCopyJump: false });
    el._carte = map; map.fitBounds(AFRIQUE);
    let horsLigne = false; let charge = 0; let erreurs = 0;
    const max = Math.max(1, ...Object.values(intensite || {}));
    const style = (f) => {
      const c = f.properties.c; const v = (intensite || {})[c] || 0;
      if (horsLigne) return sombre() ? { color: '#0E151D', weight: 0.8, fillColor: c === 'CI' ? '#7A4A26' : v ? '#2F5E2A' : '#1F2B38', fillOpacity: 1 } : { color: '#FFFFFF', weight: 0.8, fillColor: c === 'CI' ? '#FFD2AE' : v ? '#9CD18C' : '#E4E8EC', fillOpacity: 1 };
      return { color: sombre() ? '#9FB0C2' : '#5B6B7B', weight: 0.6, opacity: 0.35, fillColor: c === 'CI' ? '#FE7701' : '#4EA738', fillOpacity: c === 'CI' ? 0.22 : v ? 0.06 + (0.3 * v) / max : 0 };
    };
    const geo = L.geoJSON(window.AFRIQUE_GEO, { style, interactive: false }).addTo(map);
    let essai = 0; let tuiles = null;
    const poser = () => {
      const f = FONDS[essai]; charge = 0; erreurs = 0;
      tuiles = L.tileLayer(f.url, { subdomains: f.sub, maxZoom: f.max, attribution: ATTRIB })
        .on('tileload', () => { charge++; })
        .on('tileerror', () => {
          erreurs++;
          if (charge || erreurs < 3) return;
          if (essai < FONDS.length - 1) { map.removeLayer(tuiles); essai++; poser(); }
          else if (!horsLigne) { horsLigne = true; el.classList.add('hors-ligne'); geo.setStyle(style); }
        })
        .addTo(map);
      tuiles.bringToBack();
    };
    poser();
    return map;
  }
  /* Recadre après la mise en page, puis à chaque changement de taille du conteneur (sans animation) */
  function suivreTaille(el, map) {
    if (!window.ResizeObserver || el._ro) return;
    let t; el._ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (el._carte !== map || !el._cadre) return; map.invalidateSize(); map.fitBounds(el._cadre, { padding: [16, 16], animate: false }); }, 150); });
    el._ro.observe(el);
  }
  const numero = (i, ll, txt, delai) => L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="map-num pop" style="animation-delay:${delai}ms">${i}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }), zIndexOffset: 1000 }).bindTooltip(txt, { direction: 'top', offset: [0, -10] });

  /* Trace animée : le tracé se dessine progressivement, puis les étapes apparaissent l'une après l'autre */
  function trace(groupe, etapes, duree = 900) {
    const pts = chemin(etapes);
    const halo = L.polyline(pts, { color: '#FE7701', weight: 9, opacity: 0.22, lineCap: 'round' }).addTo(groupe);
    const ligne = L.polyline(pts, { color: '#FE7701', weight: 4, opacity: 1, lineCap: 'round', className: 'trace-plein' }).addTo(groupe);
    const flux = L.polyline(pts, { color: '#FFFFFF', weight: 2, opacity: 0, dashArray: '6 10', className: 'flow', lineCap: 'round' }).addTo(groupe);
    requestAnimationFrame(() => {
      [halo, ligne].forEach((l) => { const p = l.getElement && l.getElement(); if (!p || !p.getTotalLength) return; const len = p.getTotalLength();
        p.style.transition = 'none'; p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${duree}ms ease-in-out`; p.style.strokeDashoffset = 0; });
      setTimeout(() => flux.setStyle({ opacity: 0.85 }), duree);
    });
    etapes.forEach((e, i) => numero(i + 1, e.ll, `${i + 1}. ${e.n} (${e.pays})`, Math.round((duree * i) / Math.max(1, etapes.length - 1))).addTo(groupe));
    return pts;
  }

  /* Vue d'ensemble : la carte est créée une seule fois ; changer de route ou de personne ne fait que
     remplacer la trace mise en évidence et déplacer la vue en douceur */
  C.routes = function (el, { A, etapes, cadrage }) {
    let map = el._carte;
    if (!map || el._A !== A) {
      map = base(el, A.passages); if (!map) return;
      el._A = A; el._ro = null;
      const maxS = Math.max(1, ...A.segments.map((x) => x.n));
      el._flux = L.layerGroup(A.segments.map((x) => L.polyline(arc(x.a.ll, x.b.ll), { color: BLEU(), weight: 1.2 + (6 * x.n) / maxS, opacity: 0.4, lineCap: 'round', className: 'seg' })
        .bindTooltip(`${x.a.n} → ${x.b.n} : ${x.n} migrant(s)`, { sticky: true }))).addTo(map);
      const maxV = Math.max(1, ...A.villes.map((v) => v.nb));
      L.layerGroup(A.villes.map((v) => L.circleMarker(v.ll, { radius: 3 + (6 * v.nb) / maxV, color: sombre() ? '#0E151D' : '#FFFFFF', weight: 1.5, fillColor: BLEU(), fillOpacity: 0.9 })
        .bindTooltip(`<b>${v.n}</b> — ${v.pays}<br>${v.nb} passage(s)`, { direction: 'top' }))).addTo(map);
      el._hl = L.layerGroup().addTo(map);
      el._premier = true;
      suivreTaille(el, map);
    }
    el._flux.eachLayer((l) => l.setStyle({ opacity: etapes ? 0.22 : 0.4 }));
    // Ancienne trace : fondu de sortie, puis remplacement
    const ancien = el._hl; el._hl = L.layerGroup().addTo(map);
    const conteneur = el.querySelector('.leaflet-overlay-pane');
    ancien.eachLayer((l) => { const p = l.getElement && l.getElement(); if (p) { p.style.transition = 'opacity .3s'; p.style.opacity = 0; } const ic = l._icon; if (ic) { ic.style.transition = 'opacity .3s'; ic.style.opacity = 0; } });
    setTimeout(() => map.removeLayer(ancien), 320);
    const tout = A.villes.map((v) => v.ll);
    const pts = etapes && etapes.length ? chemin(etapes) : [];
    const cadre = cadrage === 'afrique' ? L.latLngBounds(AFRIQUE) : L.latLngBounds(pts.length && cadrage === 'trajet' ? pts : tout.concat(pts)).pad(0.12);
    el._cadre = cadre;
    const dessiner = () => { if (etapes && etapes.length) trace(el._hl, etapes); };
    if (el._premier) {
      el._premier = false;
      setTimeout(() => { map.invalidateSize(); map.fitBounds(cadre, { padding: [16, 16], animate: false }); dessiner(); }, 60);
    } else {
      map.once('moveend', dessiner);
      map.flyToBounds(cadre, { padding: [16, 16], duration: 0.9, easeLinearity: 0.3 });
      // si la vue ne bouge pas, « moveend » peut ne pas se produire : garde-fou
      setTimeout(() => { if (!el._hl.getLayers().length) { map.off('moveend', dessiner); dessiner(); } }, 1100);
    }
    void conteneur;
    return map;
  };

  /* Trajet d'une personne (fiche dossier) */
  C.trajet = function (el, etapes) {
    const pays = {}; etapes.forEach((e) => { if (e.code) pays[e.code] = 1; });
    const map = base(el, pays); if (!map) return;
    el._ro = null; const g = L.layerGroup().addTo(map);
    const pts = chemin(etapes);
    el._cadre = pts.length ? L.latLngBounds(pts).pad(0.2) : L.latLngBounds(AFRIQUE);
    setTimeout(() => { map.invalidateSize(); map.fitBounds(el._cadre, { animate: false }); trace(g, etapes); }, 60);
    suivreTaille(el, map);
    return map;
  };
  /* Carte de la Côte d'Ivoire (sites d'accueil) : renvoie la carte Leaflet pour y poser des marqueurs */
  C.CI = [[4.25, -8.7], [10.8, -2.4]];
  C.ci = function (el) {
    const map = base(el, { CI: 1 }); if (!map) return null;
    el._cadre = L.latLngBounds(C.CI);
    map.setMaxBounds(L.latLngBounds([[1.5, -12], [13.5, 1]]));
    setTimeout(() => { map.invalidateSize(); map.fitBounds(el._cadre, { animate: false }); }, 60);
    suivreTaille(el, map);
    return map;
  };
  C.chemin = chemin; C.arc = arc;
  window.Carte = C;
})();
