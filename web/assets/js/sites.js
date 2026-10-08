/* Sites d'accueil, arrivées de migrants (vols affrétés, vols commerciaux, convois terrestres), manifeste des passagers et file d'attente en direct */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const S = { onglet: 'file' };
  const TYPES_SITE = { 'Aéroport': ['plane-landing', 'b'], 'Poste frontière': ['milestone', 'o'], 'Centre d\'accueil': ['house', 'g'], 'Antenne régionale': ['landmark', 'v'] };
  const TYPES_ARR = { 'Vol affrété': 'plane', 'Vol commercial': 'plane-landing', 'Voie terrestre': 'bus', 'Voie maritime': 'ship' };
  const STATUT_ARR = { 'Prévue': 'info', 'En cours': 'accent', 'Clôturée': 'grey' };
  const STATUT_PAX = { 'Attendu': 'grey', 'En attente': 'info', 'Relais': 'warn', 'En entretien': 'accent', 'Enregistré': 'ok', 'Absent': 'danger' };
  const STRUCT = (c) => (M.structures.find((s) => s.code === c) || { nom: c }).nom;
  const IDT017 = { 'Vol affrété': 'Charter', 'Vol commercial': 'Vol commercial', 'Voie terrestre': 'voie terrestre' };
  S.TYPES_SITE = TYPES_SITE; S.STATUT_PAX = STATUT_PAX; S.IDT017 = IDT017;

  S.peutGerer = (p) => p.role === 'admin' || p.role === 'superviseur';
  S.present = (p, a) => p.role === 'admin' || (a.structures_presentes || []).includes(p.structure) || a.organisateur === p.structure;
  S.compte = (a) => { const m = a.manifeste || []; const n = (st) => m.filter((x) => x.statut === st).length; return { total: m.length, attendus: n('Attendu'), attente: n('En attente') + n('Relais'), relais: n('Relais'), entretien: n('En entretien'), enregistres: n('Enregistré'), absents: n('Absent'), arrives: m.length - n('Attendu') - n('Absent') }; };
  S.libelle = (a, sites) => { const s = (sites || []).find((x) => x.id === a.site_id); return `${a.type} ${a.numero || ''} — ${[a.ville_provenance, a.provenance].filter(Boolean).join(', ')}${s ? ' → ' + s.nom : ''}`; };
  const kcard = (t, ic, label, val) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val)), UI.filigrane(ic));
  const carteC = (ic, t, titre, droite, ...corps) => h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + t }, icon(ic)), titre), droite || null), ...corps);
  const proche = (ll) => { let best = null, dm = Infinity; REF.localitesCI.forEach((l) => { if (!l.ll) return; const d = (l.ll[0] - ll[0]) ** 2 + (l.ll[1] - ll[1]) ** 2; if (d < dm) { dm = d; best = l; } }); return best; };
  const champ = (label, el, aide) => h('div', null, h('label', { class: 'q' }, label), el, aide ? h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, aide) : null);
  const logos = (codes, n) => h('div', { class: 'row', style: { gap: '4px', flexWrap: 'nowrap' } }, (codes || []).slice(0, n || 5).map((c) => h('span', { title: c + ' — ' + STRUCT(c) }, Admin.logo(c, 24))), (codes || []).length > (n || 5) ? h('span', { class: 'tiny muted' }, '+' + ((codes || []).length - (n || 5))) : null);
  const heure = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—');
  const majArrivee = async (a, action, detail) => { await Store.db.upsert('arrivees', a); if (action) await Store.audit(action, a.code, detail || ''); };

  /* Dossiers rattachés à une arrivée (y compris les arrivées individuelles hors manifeste) */
  S.dossiersDe = (a, ds) => ds.filter((d) => d.arrivee_id === a.id);

  /* ======================= Sites ======================= */
  S.sites = function (c, data) {
    const p = App.profil; const sites = data.sites || []; const arrs = data.arrivees || [];
    const gerer = S.peutGerer(p);
    const parSite = (s) => { const as = arrs.filter((a) => a.site_id === s.id); const ds = data.ds.filter((d) => d.site_id === s.id); return { as, ds, cours: as.filter((a) => a.statut === 'En cours') }; };
    const enCours = arrs.filter((a) => a.statut === 'En cours');
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Sites d\'accueil'), h('p', { class: 'sub' }, 'Aéroports, postes frontières, centres d\'accueil et antennes où les migrants de retour sont accueillis et enregistrés.')),
      h('div', { class: 'row' }, gerer ? h('button', { class: 'btn', onclick: () => S.formArrivee(data) }, icon('plane-landing'), 'Nouvelle arrivée') : null, gerer ? h('button', { class: 'btn primary', onclick: () => S.formSite(null, data) }, icon('map-pin-plus'), 'Nouveau site') : null)),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kcard('o', 'map-pin', 'Sites actifs', sites.filter((s) => s.statut !== 'Inactif').length), kcard('d', 'plane-landing', 'Arrivées enregistrées', arrs.length),
        kcard('b', 'users', 'Personnes enregistrées sur site', data.ds.filter((d) => d.site_id).length), kcard('g', 'radio', 'Arrivées en cours', enCours.length)));
    if (enCours.length) c.append(h('div', { class: 'banner live', style: { marginBottom: '20px' } }, h('span', { class: 'pulse' }), h('div', { class: 'grow' }, h('b', null, 'Accueil en cours : '), enCours.map((a) => S.libelle(a, sites)).join(' ; ')),
      enCours.map((a) => h('a', { class: 'btn sm primary', href: '#/portail/arrivee/' + a.id }, icon('radio'), 'Suivre ' + a.code))));

    const carteEl = h('div', { class: 'map-real', style: { minHeight: '560px' } });
    const liste = h('div', { class: 'site-list' });
    let map = null; const marqueurs = {};
    sites.forEach((s) => {
      const st = parSite(s); const [ic, t] = TYPES_SITE[s.type] || ['map-pin', 'b'];
      liste.append(h('div', { class: 'li click', onclick: () => { if (map && marqueurs[s.id]) { map.flyTo(s.ll, 10, { duration: 0.8 }); setTimeout(() => marqueurs[s.id].openPopup(), 850); } } },
        h('span', { class: 'ticon ' + t }, icon(ic)), h('div', { class: 'grow' }, h('div', { class: 't1' }, s.nom), h('div', { class: 't2' }, s.type + ' · ' + s.localite)),
        h('div', { style: { textAlign: 'right' } }, h('b', null, st.ds.length), h('div', { class: 'tiny muted' }, st.as.length + ' arrivée(s)')), st.cours.length ? h('span', { class: 'pulse', title: 'Accueil en cours' }) : null));
    });
    if (!sites.length) liste.append(h('div', { class: 'empty' }, icon('map-pin'), 'Aucun site. Cliquez sur la carte pour en créer un.'));
    c.append(h('div', { class: 'map-row', style: { marginBottom: '20px' } },
      h('div', { class: 'card p0', style: { flex: '1 1 0', display: 'flex', flexDirection: 'column', minWidth: 0 } },
        h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon o' }, icon('map')), 'Carte des sites en Côte d\'Ivoire'), gerer ? h('span', { class: 'badge accent' }, icon('mouse-pointer-click'), 'Cliquez sur la carte pour créer un site') : null),
        h('div', { class: 'card-b', style: { flex: 1, display: 'flex' } }, carteEl)),
      h('div', { class: 'map-side' }, carteC('list', 'b', 'Sites (' + sites.length + ')', h('div', { class: 'map-legend' }, Object.entries(TYPES_SITE).map(([k, [, t]]) => h('span', null, h('i', { class: 'sq tc-' + t }), k))), liste))));

    // Tableau croisé : personnes enregistrées par site et par entité
    const structs = [...new Set(data.ds.filter((d) => d.site_id).map((d) => d.structure))].sort();
    const lignes = () => [['Site', 'Type', 'Arrivées', ...structs, 'Total'], ...sites.map((s) => { const st = parSite(s); return [s.nom, s.type, st.as.length, ...structs.map((x) => st.ds.filter((d) => d.structure === x).length), st.ds.length]; })];
    const tbl = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Site', 'Arrivées', ...structs.map((x) => h('span', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, Admin.logo(x, 20), x)), 'Total', ''].map((x) => h('th', null, x)))),
      h('tbody', null, sites.map((s) => { const st = parSite(s); const [ic, t] = TYPES_SITE[s.type] || ['map-pin', 'b'];
        return h('tr', null, h('td', null, h('div', { class: 'who' }, h('span', { class: 'ticon ' + t }, icon(ic)), h('div', null, h('b', null, s.nom), h('div', { class: 'tiny muted' }, s.code + ' · ' + s.region)))), h('td', null, st.as.length),
          ...structs.map((x) => h('td', null, st.ds.filter((d) => d.structure === x).length || h('span', { class: 'muted' }, '—'))), h('td', null, h('b', null, st.ds.length)),
          h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, gerer ? h('button', { class: 'btn sm', title: 'Modifier', onclick: () => S.formSite(s, data) }, icon('pencil')) : null, gerer ? h('button', { class: 'btn sm', onclick: () => S.formArrivee(data, { site_id: s.id }) }, icon('plane-landing'), 'Arrivée') : null)));
      }))));
    c.append(carteC('table', 'g', 'Personnes enregistrées par site et par entité', Export.menu({ titre: 'Personnes enregistrées par site et par entité', lignes, noeud: () => tbl, pdfImage: false, fichier: 'sites_entites' }), tbl));

    setTimeout(() => {
      map = Carte.ci(carteEl); if (!map) return;
      sites.forEach((s) => {
        const st = parSite(s); const [ic, t] = TYPES_SITE[s.type] || ['map-pin', 'b'];
        const mk = L.marker(s.ll, { icon: L.divIcon({ className: '', html: `<span class="site-pin tc-${t}${st.cours.length ? ' live' : ''}"><i data-lucide="${ic}"></i></span>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }) }).addTo(map);
        const pop = h('div', { class: 'site-pop' }, h('b', null, s.nom), h('div', { class: 'tiny muted' }, s.type + ' · ' + s.localite + ' (' + s.region + ')'),
          h('div', { class: 'small', style: { margin: '6px 0' } }, st.as.length + ' arrivée(s) · ' + st.ds.length + ' personne(s) enregistrée(s)'), logos(s.structures, 6),
          h('div', { class: 'row', style: { gap: '6px', marginTop: '8px' } }, gerer ? h('button', { class: 'btn sm primary', onclick: () => S.formArrivee(data, { site_id: s.id }) }, 'Enregistrer une arrivée') : null,
            h('a', { class: 'btn sm', href: '#/portail/arrivees' }, 'Arrivées')));
        mk.bindPopup(pop, { minWidth: 240 }); mk.on('popupopen', () => UI.refreshIcons());
        mk.bindTooltip(s.nom, { direction: 'top', offset: [0, -30] }); marqueurs[s.id] = mk;
      });
      if (gerer) map.on('click', (e) => S.formSite({ ll: [Math.round(e.latlng.lat * 10000) / 10000, Math.round(e.latlng.lng * 10000) / 10000] }, data));
      UI.refreshIcons();
    }, 30);
  };

  S.formSite = function (s0, data) {
    const p = App.profil; const neuf = !s0 || !s0.id;
    const s = { type: 'Centre d\'accueil', structures: [p.structure], statut: 'Actif', capacite: 50, ...(s0 || {}) };
    if (neuf && s.ll) { const l = proche(s.ll); if (l) { s.localite = s.localite || l.n; s.region = s.region || l.r; } }
    const nom = h('input', { class: 'input', value: s.nom || '', placeholder: 'Ex. : Centre d\'accueil de Korhogo' });
    const loc = h('input', { class: 'input', value: s.localite || '' });
    const lat = h('input', { class: 'input', type: 'number', step: '0.0001', value: s.ll ? s.ll[0] : '' }); const lng = h('input', { class: 'input', type: 'number', step: '0.0001', value: s.ll ? s.ll[1] : '' });
    const resp = h('input', { class: 'input', value: s.responsable || '' }); const cap = h('input', { class: 'input', type: 'number', min: 0, value: s.capacite || '' });
    const ddType = UI.dropdown({ items: Object.keys(TYPES_SITE).map((k) => ({ value: k, label: k })), value: s.type, onChange: (v) => { s.type = v; } });
    const ddReg = UI.dropdown({ items: REF.regionsCI.map((r) => ({ value: r, label: r })), value: s.region, onChange: (v) => { s.region = v; } });
    const ddStr = UI.dropdown({ items: M.structures.map((x) => ({ value: x.code, label: x.code + ' — ' + x.nom })), value: s.structures, multiple: true, onChange: (v) => { s.structures = v; } });
    const ddStat = UI.dropdown({ items: [{ value: 'Actif', label: 'Actif' }, { value: 'Inactif', label: 'Inactif' }], value: s.statut, onChange: (v) => { s.statut = v; } });
    UI.modal({ title: neuf ? 'Nouveau site d\'accueil' : 'Modifier le site', icon: 'map-pin-plus', body: h('div', { class: 'form-grid' },
      h('div', { class: 'full' }, champ('Nom du site', nom)), champ('Type de site', ddType.el), champ('Statut', ddStat.el), champ('Localité', loc), champ('Région', ddReg.el),
      champ('Latitude', lat), champ('Longitude', lng, neuf && s0 && s0.ll ? 'Position du clic sur la carte ; localité la plus proche proposée.' : null),
      h('div', { class: 'full' }, champ('Structures présentes sur le site', ddStr.el)), champ('Responsable du site', resp), champ('Capacité d\'accueil (personnes)', cap)),
    actions: [{ label: 'Annuler' }, { label: neuf ? 'Créer le site' : 'Enregistrer', cls: 'primary', icon: 'save', onclick: async () => {
      if (!nom.value.trim() || !lat.value || !lng.value) { UI.toast('Nom et coordonnées obligatoires.', 'alert-triangle'); return false; }
      const sites = data.sites || [];
      const row = { ...s, id: s.id || UI.uuid(), code: s.code || 'SIT-' + String(sites.length + 1).padStart(2, '0'), nom: nom.value.trim(), localite: loc.value.trim(), ll: [Number(lat.value), Number(lng.value)], responsable: resp.value.trim(), capacite: Number(cap.value) || null, created_at: s.created_at || new Date().toISOString() };
      await Store.db.upsert('sites', row); await Store.audit(neuf ? 'Création de site' : 'Modification de site', row.code, row.nom);
      UI.toast(neuf ? 'Site créé : vous pouvez maintenant y enregistrer une arrivée.' : 'Site mis à jour.', 'map-pin'); App.render();
    } }] }).el.style.maxWidth = '760px';
  };

  /* ======================= Arrivées ======================= */
  S.arrivees = function (c, data) {
    const p = App.profil; const sites = data.sites || []; let arrs = (data.arrivees || []).slice().sort((a, b) => (b.date_reelle || b.date_prevue).localeCompare(a.date_reelle || a.date_prevue));
    const gerer = S.peutGerer(p); let filtre = 'toutes'; let q = '';
    const tot = arrs.reduce((acc, a) => { const k = S.compte(a); acc.att += k.total; acc.enr += k.enregistres; return acc; }, { att: 0, enr: 0 });
    const list = h('div'); const compteur = h('span', { class: 'badge accent' });
    const filtrer = () => arrs.filter((a) => (filtre === 'toutes' || a.statut === filtre) && (!q || UI.norm([a.code, a.numero, a.provenance, a.ville_provenance, a.type, (sites.find((s) => s.id === a.site_id) || {}).nom].join(' ')).includes(UI.norm(q))));
    const paint = () => {
      const rows = filtrer(); compteur.textContent = rows.length + ' arrivée(s)'; list.innerHTML = '';
      if (!rows.length) { list.append(h('div', { class: 'empty' }, icon('plane-landing'), h('div', null, 'Aucune arrivée.'))); UI.refreshIcons(); return; }
      list.append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Arrivée', 'Provenance', 'Site', 'Date', 'Entités présentes', 'Enregistrés', 'Statut', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((a) => { const k = S.compte(a); const s = sites.find((x) => x.id === a.site_id) || {}; const pct = k.total ? Math.round((100 * k.enregistres) / k.total) : 0;
          return h('tr', { class: 'click', onclick: () => App.go('#/portail/arrivee/' + a.id) },
            h('td', null, h('div', { class: 'who' }, h('span', { class: 'ticon ' + (a.type === 'Voie terrestre' ? 'o' : 'b') }, icon(TYPES_ARR[a.type] || 'plane')), h('div', null, h('span', { class: 'idlink' }, a.code), h('div', { class: 'tiny muted' }, a.type + ' · ' + (a.numero || ''))))),
            h('td', null, [a.ville_provenance, a.provenance].filter(Boolean).join(', ') || '—'), h('td', null, h('div', { class: 'small' }, s.nom || '—'), h('div', { class: 'tiny muted' }, s.localite || '')),
            h('td', { class: 'small' }, UI.fmtDate(a.date_reelle || a.date_prevue, true)), h('td', null, logos(a.structures_presentes, 4)),
            h('td', null, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, h('div', { class: 'progress' }, h('div', { style: { width: pct + '%', background: pct === 100 ? 'var(--green)' : null } })), h('span', { class: 'small' }, k.enregistres + ' / ' + k.total))),
            h('td', null, h('span', { class: 'badge solid ' + STATUT_ARR[a.statut] }, a.statut === 'En cours' ? h('span', { class: 'pulse sm' }) : null, a.statut)), h('td', null, icon('chevron-right')));
        })))));
      UI.refreshIcons();
    };
    const lignes = () => [['Code', 'Type', 'Numéro', 'Provenance', 'Site', 'Date', 'Organisateur', 'Entités présentes', 'Attendus', 'Enregistrés', 'Absents', 'Statut'], ...filtrer().map((a) => { const k = S.compte(a); return [a.code, a.type, a.numero, [a.ville_provenance, a.provenance].filter(Boolean).join(', '), (sites.find((s) => s.id === a.site_id) || {}).nom || '', UI.fmtDate(a.date_reelle || a.date_prevue, true), a.organisateur, (a.structures_presentes || []).join(', '), k.total, k.enregistres, k.absents, a.statut]; })];
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Arrivées'), h('p', { class: 'sub' }, 'Chaque migrant enregistré est rattaché à une arrivée : vol affrété, vol commercial ou convoi terrestre, sur un site d\'accueil.')),
      h('div', { class: 'row' }, Export.menu({ titre: 'Arrivées de migrants', sousTitre: () => (filtre === 'toutes' ? 'Toutes les arrivées' : 'Statut : ' + filtre), lignes, noeud: () => list, pdfImage: false, fichier: 'arrivees' }),
        gerer ? h('button', { class: 'btn primary', onclick: () => S.formArrivee(data) }, icon('plus'), 'Nouvelle arrivée') : null)),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kcard('o', 'plane-landing', 'Arrivées', arrs.length), kcard('d', 'radio', 'En cours d\'accueil', arrs.filter((a) => a.statut === 'En cours').length),
        kcard('b', 'calendar-clock', 'Prévues', arrs.filter((a) => a.statut === 'Prévue').length), kcard('g', 'user-check', 'Enregistrés / attendus', tot.enr + ' / ' + tot.att)),
      h('div', { class: 'card p0' }, h('div', { class: 'toolbar' }, h('div', { class: 'row' }, h('label', { class: 'search' }, icon('search'), h('input', { placeholder: 'Code, vol, provenance, site…', oninput: (e) => { q = e.target.value; paint(); } })), compteur),
        h('div', { class: 'periods' }, [['toutes', 'Toutes'], ['En cours', 'En cours'], ['Prévue', 'Prévues'], ['Clôturée', 'Clôturées']].map(([k, l]) => h('button', { class: k === filtre ? 'on' : '', onclick: (e) => { filtre = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); paint(); } }, l)))), list));
    paint();
  };

  S.annonceArrivee = (a, site) => ({ categorie: 'Arrivée annoncée', importance: 'Importante', arrivee_id: a.id, cibles: ['*'],
    titre: (a.statut === 'En cours' ? 'Accueil en cours : ' : 'Arrivée prévue : ') + a.type.toLowerCase() + ' ' + (a.numero || '') + ' en provenance de ' + ([a.ville_provenance, a.provenance].filter(Boolean).join(', ') || '—'),
    message: (a.statut === 'Prévue' ? 'Arrivée prévue le ' + UI.fmtDate(a.date_prevue, true) : 'Arrivée le ' + UI.fmtDate(a.date_reelle || a.date_prevue, true)) + ' au site « ' + ((site || {}).nom || '—') + ' ». Personnes attendues : ' + (a.nb_attendus || (a.manifeste || []).length || 'à préciser') + '. Entités attendues à l\'accueil : ' + ((a.structures_presentes || []).join(', ') || 'à préciser') + '. Merci de confirmer la présence de vos équipes.' });
  S.formArrivee = function (data, init) {
    const p = App.profil; const sites = (data.sites || []).filter((s) => s.statut !== 'Inactif');
    if (!sites.length) { UI.toast('Créez d\'abord un site d\'accueil (menu Sites).', 'map-pin'); return; }
    const a = { type: 'Vol affrété', statut: 'Prévue', organisateur: p.structure, structures_presentes: [], provenance: '', ...(init || {}) };
    if (a.site_id && !a.structures_presentes.length) a.structures_presentes = (sites.find((s) => s.id === a.site_id) || {}).structures || [];
    const numero = h('input', { class: 'input', placeholder: 'Ex. : CHT-0412 ou Convoi 12' }); const ville = h('input', { class: 'input', placeholder: 'Ex. : Tripoli' });
    const date = h('input', { class: 'input', type: 'datetime-local', value: new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 14) + '00' });
    const nb = h('input', { class: 'input', type: 'number', min: 0, placeholder: 'Selon le manifeste' }); const diffuser = h('input', { type: 'checkbox', checked: true });
    const ddStr = UI.dropdown({ items: M.structures.map((x) => ({ value: x.code, label: x.code + ' — ' + x.nom })), value: a.structures_presentes, multiple: true, onChange: (v) => { a.structures_presentes = v; } });
    const ddSite = UI.dropdown({ items: sites.map((s) => ({ value: s.id, label: s.nom, right: s.type })), value: a.site_id, onChange: (v) => { a.site_id = v; const s = sites.find((x) => x.id === v); if (s && !a.structures_presentes.length) { a.structures_presentes = s.structures || []; ddStr.set(a.structures_presentes); } } });
    UI.modal({ title: 'Enregistrer une arrivée', icon: 'plane-landing', body: h('div', { class: 'form-grid' },
      champ('Type d\'arrivée', UI.dropdown({ items: Object.keys(TYPES_ARR).map((k) => ({ value: k, label: k })), value: a.type, onChange: (v) => { a.type = v; } }).el),
      champ('Numéro du vol ou du convoi', numero), champ('Pays de provenance', UI.dropdown({ items: [{ value: 'Plusieurs pays', label: 'Plusieurs pays' }].concat(REF.pays.filter((x) => x.c !== 'CI').map((x) => ({ value: x.n, label: x.n, flag: x.f }))), onChange: (v) => { a.provenance = v; } }).el),
      champ('Ville de provenance', ville), champ('Site d\'accueil', ddSite.el), champ('Date et heure prévues', date),
      champ('Organisateur du retour', UI.dropdown({ items: M.structures.map((x) => ({ value: x.code, label: x.code + ' — ' + x.nom })), value: a.organisateur, onChange: (v) => { a.organisateur = v; } }).el),
      champ('Nombre de personnes attendues', nb, 'Mis à jour automatiquement à l\'import du manifeste.'),
      h('div', { class: 'full' }, champ('Entités présentes à l\'accueil', ddStr.el)),
      h('label', { class: 'full row', style: { gap: '8px', cursor: 'pointer' } }, diffuser, h('span', null, h('b', null, 'Diffuser une annonce '), 'à toutes les structures via le canal de diffusion'))),
    actions: [{ label: 'Annuler' }, { label: 'Enregistrer l\'arrivée', cls: 'primary', icon: 'save', onclick: async () => {
      if (!a.site_id || !a.provenance || !date.value) { UI.toast('Site, provenance et date obligatoires.', 'alert-triangle'); return false; }
      const arrs = data.arrivees || []; const dt = new Date(date.value).toISOString();
      const row = { ...a, id: UI.uuid(), code: 'ARR-' + dt.slice(0, 4) + '-' + String(arrs.length + 1).padStart(4, '0'), numero: numero.value.trim(), ville_provenance: ville.value.trim(), date_prevue: dt, date_reelle: null, nb_attendus: Number(nb.value) || 0, manifeste: [], created_at: new Date().toISOString(), cree_par: p.nom + ' (' + p.structure + ')' };
      await majArrivee(row, 'Arrivée enregistrée', row.code + ' — ' + row.type + ' ' + row.numero);
      if (diffuser.checked) { const an = S.annonceArrivee(row, sites.find((x) => x.id === row.site_id)); await Store.db.upsert('annonces', { ...an, id: UI.uuid(), auteur: p.nom, structure: p.structure, created_at: new Date().toISOString(), lu_par: [p.id], epingle: false }); }
      UI.toast('Arrivée enregistrée. Importez maintenant la liste des passagers.', 'plane-landing'); S.onglet = 'manifeste'; App.go('#/portail/arrivee/' + row.id);
    } }] }).el.style.maxWidth = '760px';
  };

  /* ---------- Détail d'une arrivée : file d'attente en direct, manifeste, statistiques ---------- */
  S.arrivee = function (c, data, id) {
    const p = App.profil; const sites = data.sites || [];
    const a = (data.arrivees || []).find((x) => x.id === id);
    if (!a) { c.append(h('div', { class: 'notice danger' }, icon('alert-triangle'), 'Arrivée introuvable.')); return; }
    const site = sites.find((s) => s.id === a.site_id) || {}; const k = S.compte(a); const ds = S.dossiersDe(a, data.ds);
    const present = S.present(p, a); const gerer = S.peutGerer(p) || (present && p.structure === a.organisateur);
    const pct = k.total ? Math.round((100 * k.enregistres) / k.total) : 0;
    const actions = [];
    if (gerer && a.statut === 'Prévue') actions.push(h('button', { class: 'btn primary', onclick: async () => { a.statut = 'En cours'; a.date_reelle = new Date().toISOString(); await majArrivee(a, 'Début de l\'accueil', a.code); UI.toast('Accueil démarré : la file d\'attente est ouverte.', 'radio'); App.render(); } }, icon('play'), 'Démarrer l\'accueil'));
    if (gerer && a.statut === 'En cours') actions.push(h('button', { class: 'btn', onclick: () => cloturer(a) }, icon('flag'), 'Clôturer l\'arrivée'));
    if (gerer && a.statut === 'Clôturée') actions.push(h('button', { class: 'btn', onclick: async () => { a.statut = 'En cours'; await majArrivee(a, 'Réouverture de l\'arrivée', a.code); App.render(); } }, icon('rotate-ccw'), 'Rouvrir'));
    if (a.statut !== 'Clôturée') actions.push(h('button', { class: 'btn', onclick: () => Annonces.form(S.annonceArrivee(a, site), data.arrivees) }, icon('megaphone'), 'Annoncer'));
    actions.push(h('button', { class: 'btn', onclick: () => App.go('#/portail/arrivees') }, icon('arrow-left'), 'Arrivées'));
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Arrivée ' + a.code), h('p', { class: 'sub' }, S.libelle(a, sites))), h('div', { class: 'row' }, actions)));

    c.append(h('div', { class: 'card', style: { marginBottom: '20px' } }, h('div', { class: 'row between' },
      h('div', { class: 'who' }, h('span', { class: 'ticon lg ' + (a.type === 'Voie terrestre' ? 'o' : 'b') }, icon(TYPES_ARR[a.type] || 'plane')),
        h('div', null, h('div', { class: 'row', style: { gap: '8px' } }, h('b', { style: { fontSize: 'var(--t-lg)' } }, a.type + ' ' + (a.numero || '')), h('span', { class: 'badge solid ' + STATUT_ARR[a.statut] }, a.statut === 'En cours' ? h('span', { class: 'pulse sm' }) : null, a.statut)),
          h('div', { class: 'small muted' }, 'Provenance : ' + ([a.ville_provenance, a.provenance].filter(Boolean).join(', ') || '—') + ' · Site : ' + (site.nom || '—') + ' · ' + (a.date_reelle ? 'Arrivée le ' + UI.fmtDate(a.date_reelle, true) : 'Prévue le ' + UI.fmtDate(a.date_prevue, true))),
          h('div', { class: 'small muted' }, 'Organisateur : ' + a.organisateur + ' · enregistrée par ' + (a.cree_par || '—')))),
      h('div', null, h('div', { class: 'tiny muted', style: { marginBottom: '4px' } }, 'Entités présentes'), logos(a.structures_presentes, 8)))));

    const tile = (ic, t, v, l) => h('div', { class: 'card mtile' }, h('span', { class: 'ticon ' + t }, icon(ic)), h('div', null, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l)));
    c.append(h('div', { class: 'mtiles' }, tile('users', 'b', k.total, 'Attendus (manifeste)'), tile('log-in', 'v', k.arrives, 'Arrivés sur site'), tile('ticket', 'o', k.attente, 'En file d\'attente'),
      tile('messages-square', 'p', k.entretien, 'En entretien'), tile('user-check', 'g', k.enregistres, 'Enregistrés'), tile('user-x', 'r', k.absents, 'Absents')),
    h('div', { class: 'card', style: { margin: '0 0 20px', padding: '14px 20px' } }, h('div', { class: 'row between', style: { marginBottom: '8px' } }, h('b', null, 'Avancement de l\'enregistrement'), h('span', { class: 'small' }, pct + ' % — ' + k.enregistres + ' sur ' + k.total + (ds.length > k.enregistres ? ' (+' + (ds.length - k.enregistres) + ' hors manifeste)' : ''))),
      h('div', { class: 'progress lg' }, h('div', { style: { width: pct + '%' } }))));
    if (a.statut === 'En cours') c.append(h('div', { class: 'banner live', style: { marginBottom: '16px' } }, h('span', { class: 'pulse' }), h('div', { class: 'grow' }, h('b', null, 'Suivi en direct. '), 'La file se met à jour dès qu\'un agent appelle un passager ou synchronise un entretien depuis sa tablette.'), h('span', { class: 'tiny muted' }, 'Mis à jour à ' + heure(new Date().toISOString()))));

    const zone = h('div');
    const tabs = h('div', { class: 'tabs' });
    const ONG = [['file', 'ticket', 'File d\'attente'], ['manifeste', 'list', 'Manifeste des passagers (' + k.total + ')'], ['stats', 'chart-column', 'Statistiques de l\'arrivée']];
    const paintTabs = () => { tabs.innerHTML = ''; ONG.forEach(([o, ic, l]) => tabs.append(h('button', { class: o === S.onglet ? 'on' : '', onclick: () => { S.onglet = o; paintTabs(); paint(); } }, icon(ic), l))); UI.refreshIcons(); };
    const paint = () => { zone.innerHTML = ''; zone.classList.remove('fondu'); void zone.offsetWidth; zone.classList.add('fondu'); if (S.onglet === 'manifeste') manifeste(); else if (S.onglet === 'stats') stats(); else file(); UI.refreshIcons(); };
    c.append(tabs, zone); paintTabs(); paint();

    function file() {
      if (!present) { zone.append(h('div', { class: 'notice' }, icon('lock'), 'La file d\'attente nominative est réservée aux entités présentes à l\'accueil. Les statistiques restent consultables.')); return; }
      const m = a.manifeste || []; const prio = (x) => (x.priorite ? 0 : 1);
      const col = (titre, t, rows, carte) => h('div', { class: 'kcol' }, h('div', { class: 'kcol-h' }, h('span', { class: 'dot tc-' + t }), titre, h('span', { class: 'badge grey' }, rows.length)), h('div', { class: 'kcol-b' }, rows.length ? rows.map(carte) : h('div', { class: 'tiny muted', style: { padding: '10px' } }, 'Aucun passager')));
      const nomP = (x) => h('div', null, h('b', null, (x.nom || '') + ' ' + (x.prenoms || '')), h('div', { class: 'tiny muted' }, [x.sexe, x.date_naissance ? UI.fmtDate(x.date_naissance) : null, x.document].filter(Boolean).join(' · ')), x.priorite ? h('span', { class: 'badge solid danger', style: { marginTop: '4px' } }, icon('triangle-alert'), x.priorite) : null);
      const ouvert = a.statut !== 'Clôturée';
      zone.append(h('div', { class: 'kboard' },
        col('Attendus', 'grey', m.filter((x) => x.statut === 'Attendu'), (x) => h('div', { class: 'kitem' }, nomP(x), ouvert ? h('div', { class: 'row', style: { gap: '6px', marginTop: '8px' } },
          h('button', { class: 'btn sm primary', onclick: () => S.marquerArrive(a, x) }, icon('log-in'), 'Arrivé'), h('button', { class: 'btn sm', onclick: () => changer(a, x, 'Absent') }, 'Absent')) : null)),
        col('En attente', 'b', m.filter((x) => x.statut === 'En attente' || x.statut === 'Relais').sort((x, y) => (x.statut === 'Relais' ? 0 : 1) - (y.statut === 'Relais' ? 0 : 1) || prio(x) - prio(y) || (x.ticket || 0) - (y.ticket || 0)), (x) => h('div', { class: 'kitem' + (x.statut === 'Relais' ? ' relais' : '') }, h('div', { class: 'row', style: { gap: '10px', flexWrap: 'nowrap', alignItems: 'flex-start' } }, h('span', { class: 'ticket' }, '#' + (x.ticket || '—')), nomP(x)),
          x.relais ? h('div', { class: 'relais-tag' }, icon('arrow-right-left'), h('span', null, h('b', null, 'Relais ' + x.relais.de + ' → ' + x.relais.vers), ' · sections ' + x.relais.sections.join(', ') + ' saisies par ' + x.relais.agent)) : null,
          h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, 'Arrivé à ' + heure(x.heure_arrivee) + ' · attente ' + UI.ago(x.heure_arrivee).replace('il y a ', '')),
          ouvert && x.statut !== 'Relais' ? h('div', { class: 'row', style: { gap: '6px', marginTop: '8px' } }, h('button', { class: 'btn sm primary', onclick: () => changer(a, x, 'En entretien', { agent: p.nom, structure: p.structure, appel: new Date().toISOString() }) }, icon('megaphone'), 'Appeler')) : x.statut === 'Relais' ? h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, 'À reprendre sur la tablette d\'un agent ' + x.relais.vers + ' (« Nouvel entretien »)') : null)),
        col('En entretien', 'o', m.filter((x) => x.statut === 'En entretien'), (x) => h('div', { class: 'kitem' }, h('div', { class: 'row', style: { gap: '10px', flexWrap: 'nowrap', alignItems: 'flex-start' } }, x.ticket ? h('span', { class: 'ticket o' }, '#' + x.ticket) : null, nomP(x)),
          h('div', { class: 'row tiny muted', style: { gap: '6px', marginTop: '6px' } }, x.structure ? Admin.logo(x.structure, 18) : null, (x.agent || '—') + (x.structure ? ' (' + x.structure + ')' : '')))),
        col('Enregistrés', 'g', m.filter((x) => x.statut === 'Enregistré'), (x) => h('div', { class: 'kitem' }, nomP(x), h('div', { class: 'row', style: { gap: '6px', marginTop: '6px' } }, x.structure ? Admin.logo(x.structure, 18) : null,
          x.dossier_id ? h('a', { class: 'idlink', href: '#/portail/dossier/' + x.dossier_id }, x.identifiant || 'Dossier') : h('span', { class: 'tiny muted' }, x.identifiant || ''))))));
      const abs = m.filter((x) => x.statut === 'Absent');
      if (abs.length) zone.append(h('div', { class: 'small muted', style: { marginTop: '12px' } }, 'Absents : ' + abs.map((x) => x.nom + ' ' + x.prenoms).join(', ')));
    }

    function manifeste() {
      const m = a.manifeste || [];
      const peutModifier = present && a.statut !== 'Clôturée';
      const lignes = () => [['N°', 'Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Document', 'Priorité', 'Statut', 'Ticket', 'Heure d\'arrivée', 'Enregistré par', 'Identifiant'],
        ...m.map((x, i) => [i + 1, x.nom, x.prenoms, x.sexe, x.date_naissance, x.document, x.priorite, x.statut, x.ticket || '', x.heure_arrivee ? heure(x.heure_arrivee) : '', x.structure ? x.agent + ' (' + x.structure + ')' : '', x.identifiant || ''])];
      const tbl = m.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['N°', 'Passager', 'Sexe', 'Naissance', 'Document', 'Priorité', 'Statut', 'Ticket', 'Dossier'].map((x) => h('th', null, x)))),
        h('tbody', null, m.map((x, i) => h('tr', null, h('td', { class: 'muted' }, i + 1), h('td', null, h('b', null, x.nom + ' ' + x.prenoms)), h('td', null, x.sexe || '—'), h('td', { class: 'small' }, x.date_naissance ? UI.fmtDate(x.date_naissance) : '—'),
          h('td', { class: 'small' }, x.document || '—'), h('td', null, x.priorite ? h('span', { class: 'badge danger' }, x.priorite) : '—'), h('td', null, h('span', { class: 'badge solid ' + STATUT_PAX[x.statut] }, x.statut)), h('td', null, x.ticket ? '#' + x.ticket : '—'),
          h('td', null, x.dossier_id ? h('a', { class: 'idlink', href: '#/portail/dossier/' + x.dossier_id }, x.identifiant || 'Ouvrir') : '—')))))) : h('div', { class: 'empty' }, icon('list'), h('div', null, 'Aucun passager. Importez la liste fournie par l\'organisateur du vol.'));
      zone.append(carteC('list', 'b', 'Manifeste des passagers', h('div', { class: 'row' },
        peutModifier ? h('button', { class: 'btn sm', onclick: modeleManifeste }, icon('file-down'), 'Modèle à remplir') : null,
        peutModifier ? h('button', { class: 'btn sm', onclick: () => ajouter(a) }, icon('user-plus'), 'Ajouter') : null,
        peutModifier ? h('button', { class: 'btn sm primary', onclick: () => importer(a) }, icon('upload'), 'Importer la liste') : null,
        present ? Export.menu({ compact: true, titre: 'Manifeste — ' + a.code, sousTitre: S.libelle(a, sites), lignes, noeud: () => tbl, pdfImage: false, fichier: 'manifeste_' + a.code }) : null), present ? tbl : h('div', { class: 'notice' }, icon('lock'), 'Liste nominative réservée aux entités présentes.')));
    }

    function stats() {
      const parStruct = {}; const parSite = {}; const parSexe = {}; const parHeure = {};
      ds.forEach((d) => { parStruct[d.structure] = (parStruct[d.structure] || 0) + 1; const s = (sites.find((x) => x.id === d.site_id) || {}).nom || d.site || 'Non précisé'; parSite[s] = (parSite[s] || 0) + 1;
        const sx = (d.resume || {}).sexe || 'Non précisé'; parSexe[sx] = (parSexe[sx] || 0) + 1; const hh = new Date(d.created_at).getHours(); parHeure[hh] = (parHeure[hh] || 0) + 1; });
      const entites = [...new Set([...(a.structures_presentes || []), ...Object.keys(parStruct)])];
      const items = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([label, v]) => ({ label, v, pct: Math.round((100 * v) / (ds.length || 1)) }));
      const agents = (code) => [...new Set((a.manifeste || []).filter((x) => x.structure === code && x.agent).map((x) => x.agent).concat(ds.filter((d) => d.structure === code).map((d) => d.agent)))];
      const tblEnt = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Entité', 'Présente', 'Personnes enregistrées', 'Part', 'Agents'].map((x) => h('th', null, x)))),
        h('tbody', null, entites.map((e) => h('tr', null, h('td', null, h('div', { class: 'who' }, Admin.logo(e, 28), h('div', null, h('b', null, e), h('div', { class: 'tiny muted' }, STRUCT(e))))),
          h('td', null, (a.structures_presentes || []).includes(e) ? h('span', { class: 'badge ok' }, icon('check'), 'Oui') : h('span', { class: 'badge grey' }, 'Non')),
          h('td', null, h('b', null, parStruct[e] || 0)), h('td', null, ds.length ? Math.round((100 * (parStruct[e] || 0)) / ds.length) + ' %' : '—'), h('td', { class: 'small' }, agents(e).join(', ') || '—'))))));
      const lignes = () => [['Entité', 'Présente', 'Personnes enregistrées'], ...entites.map((e) => [e, (a.structures_presentes || []).includes(e) ? 'Oui' : 'Non', parStruct[e] || 0]), [], ['Site d\'enregistrement', 'Personnes'], ...Object.entries(parSite)];
      const sx = items(parSexe).map((x) => ({ ...x, couleur: x.label === 'Femme' ? '#FE7701' : x.label === 'Homme' ? '#014A96' : '#8A939C' }));
      const mineurs = ds.filter((d) => d.drapeaux && d.drapeaux.mineur).length; const vul = ds.filter((d) => d.drapeaux && (d.drapeaux.traite || d.drapeaux.mna || d.drapeaux.sante_mentale)).length;
      const hrs = Object.keys(parHeure).map(Number).sort((x, y) => x - y);
      const grille = h('div', { class: 'grid g2' },
        carteC('building-2', 'b', ['Enregistrements par entité', UI.aide('Nombre de personnes de cette arrivée enregistrées par chaque structure, d\'après la structure de l\'agent qui a mené l\'entretien. Un dossier mené à plusieurs mains est compté pour la structure qui l\'a clôturé.')], Export.menu({ compact: true, titre: 'Arrivée ' + a.code + ' — enregistrements par entité et par site', sousTitre: S.libelle(a, sites), lignes, noeud: () => grille, fichier: 'arrivee_' + a.code }),
          h('div', { class: 'card-b' }, ds.length ? Charts.hbarres({ items: items(parStruct), couleur: '#014A96', largeur: 520 }) : h('div', { class: 'empty' }, 'Aucun enregistrement pour l\'instant.'))),
        carteC('map-pin', 'g', ['Enregistrements par site', UI.aide('Répartition des personnes de cette arrivée selon le site d\'accueil où leur entretien a eu lieu : aéroport, poste frontière, centre d\'accueil ou antenne régionale.')], null, h('div', { class: 'card-b' }, ds.length ? Charts.hbarres({ items: items(parSite), couleur: '#2F7D22', largeur: 520 }) : h('div', { class: 'empty' }, '—'))),
        carteC('venus-and-mars', 'p', ['Profil des personnes enregistrées', UI.aide('Répartition par sexe des personnes de cette arrivée déjà enregistrées — les passagers encore en file d\'attente n\'y figurent pas. Sous l\'anneau : nombre de mineurs et de situations de vulnérabilité (traite présumée, mineur non accompagné, santé mentale).')], null, h('div', { class: 'card-b' }, ds.length ? h('div', { class: 'donut-legend' }, Charts.secteurs({ items: sx, taille: 170 }), h('div', null, Charts.legende(sx, ds.length),
          h('div', { class: 'small', style: { marginTop: '10px' } }, h('b', null, mineurs), ' mineur(s) · ', h('b', null, vul), ' situation(s) de vulnérabilité'))) : h('div', { class: 'empty' }, '—'))),
        carteC('clock', 'o', ['Rythme d\'enregistrement (par heure)', UI.aide('Nombre d\'entretiens clôturés par tranche horaire, pour cette arrivée. Sert à repérer les pics d\'affluence et à dimensionner les équipes au poste d\'accueil. Seules les heures comptant au moins un enregistrement sont affichées.')], null, h('div', { class: 'card-b' }, hrs.length ? Charts.groupes({ etiquettes: hrs.map((x) => x + ' h'), series: [{ nom: 'Enregistrements', couleur: '#FE7701', valeurs: hrs.map((x) => parHeure[x]) }], hauteur: 220 }) : h('div', { class: 'empty' }, '—'))));
      zone.append(carteC('users', 'v', 'Entités présentes et personnes enregistrées', null, tblEnt), h('div', { style: { height: '20px' } }), grille);
    }

    async function changer(arr, x, statut, extra) {
      const frais = ((await Store.db.list('arrivees')).find((y) => y.id === arr.id)) || arr; const px = frais.manifeste.find((y) => y.id === x.id); if (!px) return;
      Object.assign(px, { statut }, extra || {}); await majArrivee(frais, 'File d\'attente : ' + statut, frais.code + ' — ' + px.nom + ' ' + px.prenoms);
      UI.toast(px.nom + ' ' + px.prenoms + ' : ' + statut.toLowerCase() + (statut === 'En entretien' ? ' avec ' + p.nom : '') + '.', 'ticket'); App.render();
    }
    async function cloturer(arr) {
      const restants = (arr.manifeste || []).filter((x) => x.statut === 'Attendu').length; const enCours = (arr.manifeste || []).filter((x) => ['En attente', 'En entretien'].includes(x.statut)).length;
      UI.modal({ title: 'Clôturer l\'arrivée ' + arr.code, icon: 'flag', body: h('div', { class: 'stack' }, h('p', { style: { margin: 0 } }, 'La clôture fige la file d\'attente.'),
        restants ? h('div', { class: 'notice warn' }, icon('user-x'), restants + ' passager(s) jamais arrivé(s) seront marqués absents.') : null,
        enCours ? h('div', { class: 'notice' }, icon('info'), enCours + ' passager(s) encore en attente ou en entretien : leurs entretiens pourront être synchronisés après la clôture.') : null),
      actions: [{ label: 'Annuler' }, { label: 'Clôturer', cls: 'primary', onclick: async () => { arr.manifeste.forEach((x) => { if (x.statut === 'Attendu') x.statut = 'Absent'; }); arr.statut = 'Clôturée'; arr.date_cloture = new Date().toISOString(); await majArrivee(arr, 'Clôture de l\'arrivée', arr.code); App.render(); } }] });
    }
  };

  S.marquerArrive = async function (a, x) {
    const frais = ((await Store.db.list('arrivees')).find((y) => y.id === a.id)) || a; const px = frais.manifeste.find((y) => y.id === x.id); if (!px) return;
    px.statut = 'En attente'; px.ticket = Math.max(0, ...frais.manifeste.map((y) => y.ticket || 0)) + 1; px.heure_arrivee = new Date().toISOString();
    if (frais.statut === 'Prévue') { frais.statut = 'En cours'; frais.date_reelle = frais.date_reelle || px.heure_arrivee; }
    await majArrivee(frais, 'File d\'attente : arrivée sur site', frais.code + ' — ' + px.nom + ' ' + px.prenoms + ' (ticket ' + px.ticket + ')');
    UI.toast('Ticket n° ' + px.ticket + ' attribué à ' + px.nom + ' ' + px.prenoms + '.', 'ticket'); App.render();
  };

  /* ---------- Manifeste : modèle, import CSV ou Excel, ajout manuel ---------- */
  const COLS = ['Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Document de voyage', 'Priorité'];
  function modeleManifeste() {
    if (!window.XLSX) { UI.toast('Bibliothèque Excel indisponible.', 'alert-triangle'); return; }
    const ws = XLSX.utils.aoa_to_sheet([COLS, ['EXEMPLE', 'Awa', 'Femme', '1995-04-12', 'Laissez-passer', ''], ['EXEMPLE', 'Moussa', 'Homme', '2009-11-03', 'Laissez-passer', 'Mineur'], ['EXEMPLE', 'Rose', 'Femme', '1990-01-25', 'Passeport', 'Femme enceinte']]);
    ws['!cols'] = COLS.map(() => ({ wch: 22 }));
    const info = XLSX.utils.aoa_to_sheet([['Consignes'], ['Une ligne par passager. Dates au format AAAA-MM-JJ.'], ['Sexe : Homme ou Femme.'], ['Priorité (facultatif) : Mineur, Mineur non accompagné, Femme enceinte, Besoin médical, Personne âgée, Handicap.'], ['Supprimer les lignes EXEMPLE avant l\'import.']]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Passagers'); XLSX.utils.book_append_sheet(wb, info, 'Consignes'); XLSX.writeFile(wb, 'modele_manifeste_passagers.xlsx');
  }
  const cle = (s) => UI.norm(s).replace(/[^a-z]/g, '');
  const COL_MAP = { nom: 'nom', noms: 'nom', name: 'nom', surname: 'nom', prenoms: 'prenoms', prenom: 'prenoms', firstname: 'prenoms', sexe: 'sexe', sex: 'sexe', genre: 'sexe', datedenaissance: 'date_naissance', naissance: 'date_naissance', ddn: 'date_naissance', dob: 'date_naissance', datenaissance: 'date_naissance', documentdevoyage: 'document', document: 'document', piece: 'document', passeport: 'document', priorite: 'priorite', vulnerabilite: 'priorite', remarque: 'priorite' };
  function csv(texte) {
    const lignes = texte.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()); if (!lignes.length) return [];
    const sep = (lignes[0].match(/;/g) || []).length >= (lignes[0].match(/,/g) || []).length ? ';' : ',';
    return lignes.map((l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; });
  }
  const dateISO = (v) => { if (v === undefined || v === null || v === '') return ''; if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10); const s = String(v).trim(); const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s.slice(0, 10); };
  const sexe = (v) => { const s = UI.norm(v); return /^(f|femme|female|feminin)/.test(s) ? 'Femme' : /^(h|m|homme|male|masculin)/.test(s) ? 'Homme' : ''; };
  S.lireManifeste = async function (file) {
    let rows;
    if (/\.csv$|\.txt$/i.test(file.name)) rows = csv(await file.text());
    else { if (!window.XLSX) throw new Error('Bibliothèque Excel indisponible'); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }); }
    if (!rows.length) return { pax: [], ignores: 0, colonnes: [] };
    const ent = rows[0].map((x) => COL_MAP[cle(x)] || null);
    if (!ent.includes('nom')) throw new Error('Colonne « Nom » introuvable dans la première ligne');
    let ignores = 0; const pax = [];
    rows.slice(1).forEach((r) => {
      const o = {}; ent.forEach((k, i) => { if (k) o[k] = r[i]; });
      const nom = String(o.nom || '').trim().toUpperCase(); if (!nom || nom === 'EXEMPLE') { ignores++; return; }
      pax.push({ nom, prenoms: String(o.prenoms || '').trim(), sexe: sexe(o.sexe), date_naissance: dateISO(o.date_naissance), document: String(o.document || '').trim() || 'Laissez-passer', priorite: String(o.priorite || '').trim() });
    });
    return { pax, ignores, colonnes: rows[0].filter((x, i) => ent[i]) };
  };
  function importer(a) {
    const inp = h('input', { type: 'file', accept: '.xlsx,.xls,.csv,.txt', style: { display: 'none' } });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      let res; try { res = await S.lireManifeste(f); } catch (e) { UI.toast('Import impossible : ' + e.message, 'alert-triangle'); return; }
      const existe = new Set((a.manifeste || []).map((x) => cle(x.nom + x.prenoms + (x.date_naissance || ''))));
      const nouveaux = res.pax.filter((x) => { const k = cle(x.nom + x.prenoms + (x.date_naissance || '')); if (existe.has(k)) return false; existe.add(k); return true; });
      const doublons = res.pax.length - nouveaux.length;
      UI.modal({ title: 'Importer la liste des passagers', icon: 'upload', body: h('div', { class: 'stack' },
        h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'badge solid ok' }, nouveaux.length + ' passager(s) à ajouter'), doublons ? h('span', { class: 'badge solid warn' }, doublons + ' déjà présent(s), ignoré(s)') : null, res.ignores ? h('span', { class: 'badge grey' }, res.ignores + ' ligne(s) vide(s) ou d\'exemple') : null),
        h('div', { class: 'small muted' }, 'Fichier : ' + f.name + ' — colonnes reconnues : ' + res.colonnes.join(', ')),
        h('div', { class: 'tbl-wrap', style: { maxHeight: '320px', overflow: 'auto' } }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Nom', 'Prénoms', 'Sexe', 'Naissance', 'Document', 'Priorité'].map((x) => h('th', null, x)))),
          h('tbody', null, nouveaux.slice(0, 100).map((x) => h('tr', null, h('td', null, x.nom), h('td', null, x.prenoms), h('td', null, x.sexe || h('span', { class: 'badge warn' }, 'à préciser')), h('td', null, x.date_naissance || '—'), h('td', null, x.document), h('td', null, x.priorite || '—'))))))),
      actions: [{ label: 'Annuler' }, { label: 'Ajouter au manifeste', cls: 'primary', icon: 'check', onclick: async () => {
        if (!nouveaux.length) return;
        const frais = ((await Store.db.list('arrivees')).find((y) => y.id === a.id)) || a;
        nouveaux.forEach((x) => frais.manifeste.push({ id: UI.uuid(), ...x, statut: 'Attendu', ticket: null, heure_arrivee: null, dossier_id: null, identifiant: null, agent: null, structure: null }));
        frais.nb_attendus = frais.manifeste.length;
        await majArrivee(frais, 'Import du manifeste', frais.code + ' — ' + nouveaux.length + ' passager(s) depuis ' + f.name);
        UI.toast(nouveaux.length + ' passager(s) ajouté(s) au manifeste.', 'users'); App.render();
      } }] }).el.style.maxWidth = '860px';
    };
    document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }
  function ajouter(a) {
    const x = { sexe: '' }; const nom = h('input', { class: 'input' }); const pre = h('input', { class: 'input' }); const dn = h('input', { class: 'input', type: 'date' }); const doc = h('input', { class: 'input', value: 'Laissez-passer' }); const prio = h('input', { class: 'input', placeholder: 'Ex. : Mineur, Besoin médical' });
    UI.modal({ title: 'Ajouter un passager', icon: 'user-plus', body: h('div', { class: 'form-grid' }, champ('Nom', nom), champ('Prénoms', pre), champ('Sexe', UI.dropdown({ items: [{ value: 'Homme', label: 'Homme' }, { value: 'Femme', label: 'Femme' }], onChange: (v) => { x.sexe = v; } }).el), champ('Date de naissance', dn), champ('Document de voyage', doc), champ('Priorité', prio)),
      actions: [{ label: 'Annuler' }, { label: 'Ajouter', cls: 'primary', onclick: async () => {
        if (!nom.value.trim()) { UI.toast('Nom obligatoire.', 'alert-triangle'); return false; }
        const frais = ((await Store.db.list('arrivees')).find((y) => y.id === a.id)) || a;
        frais.manifeste.push({ id: UI.uuid(), nom: nom.value.trim().toUpperCase(), prenoms: pre.value.trim(), sexe: x.sexe, date_naissance: dn.value, document: doc.value.trim(), priorite: prio.value.trim(), statut: 'Attendu', ticket: null });
        frais.nb_attendus = frais.manifeste.length; await majArrivee(frais, 'Ajout au manifeste', frais.code + ' — ' + nom.value.trim()); App.render();
      } }] }).el.style.maxWidth = '720px';
  }

  /* ======================= Tablette : rattacher l'entretien à une arrivée ======================= */
  S.cacheTablette = (p, arrs) => Store.LS.set('r360.tablette.arrivees.' + p.tablette, arrs);
  S.choisirArrivee = async function (p) {
    const enLigne = Store.Tablette.online(p.tablette);
    let arrs = null, sites = [];
    if (enLigne) { try { arrs = await Store.db.list('arrivees'); sites = await Store.db.list('sites'); Store.LS.set('r360.tablette.sites.' + p.tablette, sites); } catch (e) { arrs = null; } }
    if (!arrs) { arrs = Store.LS.get('r360.tablette.arrivees.' + p.tablette, []); sites = Store.LS.get('r360.tablette.sites.' + p.tablette, []); } else S.cacheTablette(p, arrs);
    let relais = []; if (enLigne) { try { relais = (await Store.db.list('relais')).filter((r) => r.statut === 'En attente' && r.vers === p.structure); } catch (e) { relais = []; } }
    const ouvertes = arrs.filter((a) => a.statut !== 'Clôturée' && (!(a.structures_presentes || []).length || a.structures_presentes.includes(p.structure)))
      .sort((a, b) => (a.statut === 'En cours' ? -1 : 1) - (b.statut === 'En cours' ? -1 : 1) || (a.date_prevue || '').localeCompare(b.date_prevue || ''));
    return new Promise((res) => {
      if (!ouvertes.length) {
        UI.modal({ title: 'Aucune arrivée ouverte', icon: 'plane-landing', body: h('div', { class: 'notice warn' }, icon('info'), enLigne ? 'Aucune arrivée n\'est ouverte pour votre structure. Le superviseur doit d\'abord enregistrer l\'arrivée sur le portail (menu Sites ou Arrivées).' : 'Tablette hors connexion et aucune arrivée en mémoire : reconnectez la tablette une fois pour charger les arrivées du jour.'),
          actions: [{ label: 'Fermer', onclick: () => res(null) }] });
        return;
      }
      let a = ouvertes[0]; const zone = h('div');
      const dd = UI.dropdown({ items: ouvertes.map((x) => ({ value: x.id, label: x.code + ' — ' + x.type + ' ' + (x.numero || ''), right: x.statut })), value: a.id, onChange: (v) => { a = ouvertes.find((x) => x.id === v); paint(); } });
      let modal = null;
      const choisir = (px, rl) => { modal.close(); res({ arrivee: a, passager: px, relais: rl || null, site: sites.find((s) => s.id === a.site_id) }); };
      const paint = () => {
        zone.innerHTML = ''; const m = a.manifeste || []; const prio = (x) => (x.priorite ? 0 : 1);
        const file = m.filter((x) => x.statut === 'En attente').sort((x, y) => prio(x) - prio(y) || (x.ticket || 0) - (y.ticket || 0));
        const miens = m.filter((x) => x.statut === 'En entretien' && x.agent === p.nom);
        const attendus = m.filter((x) => x.statut === 'Attendu');
        const ligne = (x, lib) => h('div', { class: 'li' }, x.ticket ? h('span', { class: 'ticket' }, '#' + x.ticket) : h('span', { class: 'ticon grey' }, icon('user-round')),
          h('div', { class: 'grow' }, h('div', { class: 't1' }, x.nom + ' ' + x.prenoms), h('div', { class: 't2' }, [x.sexe, x.date_naissance ? UI.fmtDate(x.date_naissance) : null, x.document].filter(Boolean).join(' · '))),
          x.priorite ? h('span', { class: 'badge solid danger' }, x.priorite) : null, h('button', { class: 'btn sm primary', onclick: () => choisir(x) }, icon('megaphone'), lib));
        const aReprendre = relais.filter((r) => r.arrivee_id === a.id);
        zone.append(h('div', { class: 'small muted', style: { margin: '10px 0' } }, S.libelle(a, sites)),
          aReprendre.length ? h('div', { class: 'relais-box' }, h('div', { class: 'sub-head' }, 'Relais à reprendre (' + aReprendre.length + ')'), aReprendre.map((r) => h('div', { class: 'li' }, h('span', { class: 'ticon ' + (r.correction ? 'r' : 'o') }, icon(r.correction ? 'undo-2' : 'arrow-right-left')),
            h('div', { class: 'grow' }, h('div', { class: 't1' }, r.nom), h('div', { class: 't2' }, (r.correction && r.correction.length
              ? 'CORRECTION demandée par ' + r.de_agent + ' (' + r.de + ') · sections ' + r.correction.join(', ') + ' · « ' + (r.motif_correction || '') + ' »'
              : 'Commencé par ' + r.de_agent + ' (' + r.de + ') · sections ' + r.sections.join(', ') + ' faites' + (r.note ? ' · « ' + r.note + ' »' : '')))),
            h('button', { class: 'btn sm primary', onclick: () => choisir((a.manifeste || []).find((x) => x.id === r.passager_id) || null, r) }, icon(r.correction ? 'undo-2' : 'hand'), r.correction ? 'Corriger' : 'Prendre la main')))) : null,
          miens.length ? h('div', null, h('div', { class: 'sub-head' }, 'Mes entretiens en cours'), miens.map((x) => ligne(x, 'Reprendre'))) : null,
          h('div', { class: 'sub-head' }, 'File d\'attente (' + file.length + ')'), h('div', null, file.length ? file.slice(0, 8).map((x) => ligne(x, 'Appeler')) : h('div', { class: 'small muted' }, 'Personne en attente.')),
          attendus.length ? h('details', { style: { marginTop: '8px' } }, h('summary', { class: 'small' }, 'Passagers non encore arrivés (' + attendus.length + ')'), attendus.map((x) => ligne(x, 'Entretien'))) : null,
          h('div', { style: { marginTop: '12px' } }, h('button', { class: 'btn', onclick: () => choisir(null) }, icon('user-plus'), 'Personne hors manifeste (arrivée individuelle)')));
        UI.refreshIcons();
      };
      modal = UI.modal({ title: 'Nouvel entretien : choisir l\'arrivée', icon: 'plane-landing', body: h('div', null, h('label', { class: 'q' }, 'Arrivée'), dd.el, enLigne ? null : h('div', { class: 'notice warn', style: { marginTop: '8px' } }, icon('wifi-off'), 'Hors connexion : file d\'attente de la dernière synchronisation.'), zone),
        actions: [{ label: 'Annuler', onclick: () => res(null) }] });
      modal.el.style.maxWidth = '720px'; paint();
    });
  };
  /* Mise à jour du passager dans la base centrale (appel, enregistrement) */
  S.majPassager = async function (arriveeId, passagerId, maj, p) {
    const a = (await Store.db.list('arrivees')).find((x) => x.id === arriveeId); if (!a) return;
    let px = passagerId && a.manifeste.find((x) => x.id === passagerId);
    if (!px) { px = { id: passagerId || UI.uuid(), nom: maj.nom || '', prenoms: maj.prenoms || '', sexe: maj.sexe || '', statut: 'En entretien', ticket: null, hors_manifeste: true, priorite: '' }; a.manifeste.push(px); a.nb_attendus = a.manifeste.length; }
    Object.assign(px, maj); if (!px.heure_arrivee) px.heure_arrivee = new Date().toISOString();
    if (a.statut === 'Prévue') { a.statut = 'En cours'; a.date_reelle = a.date_reelle || new Date().toISOString(); }
    await Store.db.upsert('arrivees', a);
    if (p) S.cacheTablette(p, (await Store.db.list('arrivees')));
    return px;
  };
  window.Sites = S;
})();
