/* Tableau de bord de la qualité des données, rapports programmés et portail public de données ouvertes */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const Q = {};
  const kcard = (t, ic, label, val) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val)), UI.filigrane(ic));
  const carteC = (ic, t, titre, droite, ...corps) => h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + t }, icon(ic)), titre), droite || null), ...corps);
  const pc = (n, d) => (d ? Math.round((100 * n) / d) : 0);
  const vide = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

  /* ======================= Qualité des données ======================= */
  const CHAMPS = [
    ['Nom et prénoms', (d) => !vide(d.reponses['IDT-001']) && !vide(d.reponses['IDT-002'])],
    ['Date de naissance', (d) => !vide(d.reponses['IDT-006'])],
    ['Sexe', (d) => !vide(d.reponses['IDT-005'])],
    ['Téléphone joignable', (d) => d.reponses['IDT-011'] && d.reponses['IDT-011'].num && d.reponses['IDT-011'].num !== 'Inconnu'],
    ['Localité de retour', (d) => !vide(d.reponses['RES-005'])],
    ['Pays de provenance', (d) => !vide(d.reponses['RES-004'])],
    ['Itinéraire (section VIII)', (d) => d.itineraire && Form.etapes(d.itineraire).length > 1],
    ['Photo du migrant', (d) => !!(d.medias && d.medias.photo)],
    ['Signature (section XV)', (d) => !vide(d.reponses['SUI-004'])],
    ['Arrivée rattachée', (d) => !!d.arrivee_id],
    ['Consentement documenté', (d) => d.reponses['ENT-009'] === 'Oui'],
  ];
  Q.anomalies = function (d, ctx) {
    const r = d.reponses; const out = []; const ent = r['ENT-001'] || d.created_at;
    if (!d.arrivee_id) out.push(['Rattachement', 'Aucune arrivée rattachée au dossier', 'danger']);
    if (r['IDT-019'] && ent && r['IDT-019'] > ent.slice(0, 10)) out.push(['Cohérence', 'Date de retour (' + UI.fmtDate(r['IDT-019']) + ') postérieure à l\'entretien', 'danger']);
    if (r['PAR-001'] && r['IDT-019'] && r['PAR-001'] > r['IDT-019'].slice(0, 7)) out.push(['Cohérence', 'Départ (' + r['PAR-001'] + ') postérieur au retour', 'danger']);
    const age = d.resume && d.resume.age; if (age !== null && age !== undefined && (age < 0 || age > 95)) out.push(['Cohérence', 'Âge improbable : ' + age + ' ans', 'danger']);
    if (!(d.itineraire && Form.etapes(d.itineraire).length > 1)) out.push(['Complétude', 'Itinéraire migratoire non renseigné', 'warn']);
    if (!r['IDT-011'] || r['IDT-011'].num === 'Inconnu') out.push(['Complétude', 'Aucun téléphone joignable : suivi difficile', 'warn']);
    const sync = d.synced_at && d.created_at ? (new Date(d.synced_at) - new Date(d.created_at)) / 3600000 : 0; if (sync > 48) out.push(['Délai', 'Synchronisation après ' + Math.round(sync) + ' h (cible : 48 h)', 'warn']);
    if (ctx.attente.has(d.id)) out.push(['Validation', 'Dossier en attente de validation par le superviseur', 'info']);
    if (ctx.doublons.has(d.id)) out.push(['Doublon', 'Doublon possible non examiné', 'warn']);
    return out;
  };
  Q.page = function (c, data) {
    const p = App.profil;
    const ds = data.ds.filter((d) => d.statut === 'Synchronisé' && (p.role === 'admin' || d.structure === p.structure));
    const ctx = { attente: new Set((data.approbations || []).filter((a) => a.statut === 'En attente' && a.type === 'Validation du dossier').map((a) => a.dossier_id)), doublons: new Set(data.dbl.filter((x) => x.statut === 'À examiner').map((x) => x.dossier_id)) };
    const lignesD = ds.map((d) => ({ d, comp: Agent.progression(d), cles: CHAMPS.filter(([, f]) => f(d)).length, an: Q.anomalies(d, ctx), sync: d.synced_at ? (new Date(d.synced_at) - new Date(d.created_at)) / 3600000 : null }));
    const moy = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const score = Math.round(moy(lignesD.map((x) => (x.comp + (100 * x.cles) / CHAMPS.length) / 2)));
    const avecAn = lignesD.filter((x) => x.an.some((a) => a[2] === 'danger')).length;
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Qualité des données'), h('p', { class: 'sub' }, 'Complétude, cohérence, délais de synchronisation et rattachement aux arrivées' + (p.role === 'admin' ? ', toutes structures confondues.' : ' — dossiers enrôlés par ' + p.structure + '.')))),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kcard('o', 'gauge', 'Score de qualité', score + ' / 100'), kcard('d', 'triangle-alert', 'Dossiers avec incohérence', avecAn + ' / ' + ds.length),
        kcard('b', 'list-checks', 'Complétude moyenne du formulaire', Math.round(moy(lignesD.map((x) => x.comp))) + ' %'), kcard('g', 'timer', 'Délai moyen de synchronisation', Math.round(moy(lignesD.filter((x) => x.sync !== null).map((x) => x.sync)) * 10) / 10 + ' h')));

    // champs clés
    const itemsC = CHAMPS.map(([l, f]) => { const n = ds.filter(f).length; return { label: l, v: pc(n, ds.length), sous: n + ' dossier(s) sur ' + ds.length, couleur: pc(n, ds.length) >= 90 ? '#4EA738' : pc(n, ds.length) >= 60 ? '#FE7701' : '#D92D20' }; });
    const blocC = h('div', { class: 'card-b' }, Charts.hbarres({ items: itemsC, unite: ' %', max: 100, largeur: 560 }));
    // par structure
    const structs = [...new Set(ds.map((d) => d.structure))].sort();
    const parS = structs.map((s) => { const L = lignesD.filter((x) => x.d.structure === s); return { s, n: L.length, comp: Math.round(moy(L.map((x) => x.comp))), arr: pc(L.filter((x) => x.d.arrivee_id).length, L.length), tel: pc(L.filter((x) => CHAMPS[3][1](x.d)).length, L.length), it: pc(L.filter((x) => CHAMPS[6][1](x.d)).length, L.length), an: L.filter((x) => x.an.some((a) => a[2] === 'danger')).length, sync: Math.round(moy(L.filter((x) => x.sync !== null).map((x) => x.sync)) * 10) / 10 }; });
    const cell = (v) => h('td', null, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, h('div', { class: 'progress', style: { width: '70px' } }, h('div', { style: { width: v + '%', background: v >= 90 ? 'var(--green)' : v >= 60 ? 'var(--orange)' : 'var(--danger)' } })), h('span', { class: 'small' }, v + ' %')));
    const tblS = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Structure', 'Dossiers', 'Complétude', 'Arrivée rattachée', 'Téléphone', 'Itinéraire', 'Incohérences', 'Synchro moyenne'].map((x) => h('th', null, x)))),
      h('tbody', null, parS.map((x) => h('tr', null, h('td', null, h('div', { class: 'who' }, Admin.logo(x.s, 28), h('b', null, x.s))), h('td', null, x.n), cell(x.comp), cell(x.arr), cell(x.tel), cell(x.it), h('td', null, x.an ? h('span', { class: 'badge solid danger' }, x.an) : h('span', { class: 'badge solid ok' }, '0')), h('td', { class: 'small' }, x.sync + ' h'))))));
    const lignesS = () => [['Structure', 'Dossiers', 'Complétude (%)', 'Arrivée rattachée (%)', 'Téléphone (%)', 'Itinéraire (%)', 'Dossiers avec incohérence', 'Synchronisation moyenne (h)'], ...parS.map((x) => [x.s, x.n, x.comp, x.arr, x.tel, x.it, x.an, x.sync])];
    c.append(h('div', { class: 'grid g-2-1', style: { marginBottom: '20px' } },
      carteC('building-2', 'b', ['Qualité par structure d\'enrôlement', UI.aide('Pour chaque structure ayant mené des entretiens : nombre de dossiers, complétude moyenne du formulaire, part de dossiers rattachés à une arrivée, téléphone et itinéraire renseignés, dossiers présentant une incohérence bloquante, et délai moyen entre la fin de l\'entretien et la synchronisation.')], Export.menu({ compact: true, titre: 'Qualité des données par structure', lignes: lignesS, noeud: () => tblS, pdfImage: false, fichier: 'qualite_structures' }), tblS),
      carteC('list-checks', 'g', ['Renseignement des champs clés', UI.aide('Part des dossiers où chaque champ clé est renseigné, en pourcentage du total des dossiers accessibles. Barre verte au-dessus de 90 %, orange entre 60 et 90 %, rouge en dessous de 60 %.')], Export.menu({ compact: true, titre: 'Renseignement des champs clés', lignes: () => [['Champ', 'Taux (%)', 'Détail'], ...itemsC.map((x) => [x.label, x.v, x.sous])], noeud: () => blocC, fichier: 'qualite_champs' }), blocC)));

    // anomalies
    const an = lignesD.flatMap((x) => x.an.map((a) => ({ d: x.d, type: a[0], txt: a[1], niv: a[2] })));
    let filtre = 'toutes'; const list = h('div');
    const TYPES = ['toutes', ...new Set(an.map((x) => x.type))];
    const paint = () => {
      const rows = an.filter((x) => filtre === 'toutes' || x.type === filtre); list.innerHTML = '';
      list.append(rows.length ? h('div', { class: 'tbl-wrap', style: { maxHeight: '520px', overflow: 'auto' } }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Dossier', 'Structure', 'Type', 'Constat', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((x) => h('tr', null, h('td', null, h('a', { class: 'idlink', href: '#/portail/dossier/' + x.d.id }, x.d.identifiant)), h('td', null, h('div', { class: 'who' }, Admin.logo(x.d.structure, 22), x.d.structure)),
          h('td', null, h('span', { class: 'badge ' + x.niv }, x.type)), h('td', { class: 'small' }, x.txt), h('td', null, h('a', { class: 'btn sm', href: '#/portail/dossier/' + x.d.id }, 'Corriger'))))))) : h('div', { class: 'empty' }, icon('badge-check'), 'Aucune anomalie.'));
      UI.refreshIcons();
    };
    c.append(carteC('triangle-alert', 'r', 'Anomalies à corriger (' + an.length + ')', h('div', { class: 'row' }, h('div', { class: 'periods' }, TYPES.map((k) => h('button', { class: k === filtre ? 'on' : '', onclick: (e) => { filtre = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); paint(); } }, k === 'toutes' ? 'Toutes' : k))),
      Export.menu({ compact: true, titre: 'Anomalies de qualité des données', lignes: () => [['Dossier', 'Structure', 'Type', 'Constat'], ...an.filter((x) => filtre === 'toutes' || x.type === filtre).map((x) => [x.d.identifiant, x.d.structure, x.type, x.txt])], noeud: () => list, pdfImage: false, fichier: 'anomalies' })), list));
    paint();
  };

  /* ======================= Rapports programmés ======================= */
  const PERIODES = ['Quotidienne', 'Hebdomadaire', 'Mensuelle', 'Trimestrielle'];
  const JOURS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  Q.prochaine = function (r, depuis) {
    const n = new Date(depuis || Date.now()); const d = new Date(n); d.setHours(7, 0, 0, 0);
    if (r.periodicite === 'Quotidienne') { if (d <= n) d.setDate(d.getDate() + 1); return d; }
    if (r.periodicite === 'Hebdomadaire') { const cible = (Number(r.jour) || 1) % 7; let k = (cible - d.getDay() + 7) % 7; if (!k && d <= n) k = 7; d.setDate(d.getDate() + k); return d; }
    if (r.periodicite === 'Trimestrielle') { const m = Math.floor(d.getMonth() / 3) * 3 + 3; return new Date(d.getFullYear(), m, Number(r.jour) || 1, 7); }
    const x = new Date(d.getFullYear(), d.getMonth(), Math.min(28, Number(r.jour) || 1), 7); if (x <= n) x.setMonth(x.getMonth() + 1); return x;
  };
  const libFreq = (r) => r.periodicite + (r.periodicite === 'Hebdomadaire' ? ', le ' + JOURS[Number(r.jour) || 1] : r.periodicite === 'Quotidienne' ? '' : ', le ' + (Number(r.jour) || 1) + (Number(r.jour) === 1 ? 'er' : '') + ' du ' + (r.periodicite === 'Mensuelle' ? 'mois' : 'trimestre')) + ' à 7 h';
  Q.lignes = function (ind, r, ventil) {
    const S = Stats;
    if (r.t === 'repartition') { const gs = Object.keys(r.groupes || {}).filter((g) => g !== 'Ensemble'); if (ventil && gs.length) return [['Modalité', ...gs], ...r.cles.map((k) => [k, ...gs.map((g) => r.groupes[g][k] || 0)])]; return [['Modalité', 'Effectif', 'Part (%)'], ...r.items.map((x) => [x.label, x.v, x.pct])]; }
    if (r.t === 'taux') { const gs = Object.keys(r.groupes).filter((g) => g !== 'Ensemble'); if (ventil && gs.length) return [[S.DIM[ventil].l, 'Numérateur', 'Dénominateur', 'Taux (%)'], ...gs.map((g) => [g, r.groupes[g].num, r.groupes[g].den, pc(r.groupes[g].num, r.groupes[g].den)])]; return [['Indicateur', 'Numérateur', 'Dénominateur', 'Taux (%)'], [ind.l, r.num, r.den, Math.round(r.pct)]]; }
    if (r.t === 'moyenne') { const gs = Object.keys(r.groupes).filter((g) => g !== 'Ensemble'); return gs.length ? [['Groupe', 'Moyenne', 'Valeurs'], ...gs.map((g) => [g, Math.round(r.groupes[g].moy * 10) / 10, r.groupes[g].n])] : [['Indicateur', 'Moyenne', 'Valeurs'], [ind.l, Math.round(r.moy * 10) / 10, r.n]]; }
    if (r.t === 'evolution') { const gs = ventil ? r.groupes : ['Ensemble']; return [['Mois', ...gs], ...r.mois.map((m) => [S.libMois(m), ...gs.map((g) => (r.parM[m] || {})[g] || 0)])]; }
    if (r.t === 'pyramide') return [['Tranche d\'âge', 'Hommes', 'Femmes'], ...S.TRANCHES.map((tr, i) => [tr, r.pyr.hommes[i], r.pyr.femmes[i]])];
    return [['Aucune donnée']];
  };
  Q.executer = async function (rap, data) {
    const ind = Stats.IND.find((x) => x.id === rap.indicateur); if (!ind || ind.off) { UI.toast('Indicateur non calculable.', 'alert-triangle'); return; }
    let ds = data.acces.map((x) => x.d).filter((d) => d.statut === 'Synchronisé');
    for (const [k, sel] of Object.entries(rap.filtres || {})) if (sel && sel.length && Stats.DIM[k]) ds = ds.filter((d) => [].concat(Stats.DIM[k].f(d) || []).some((x) => sel.includes(x)));
    const r = Stats.calculer(ind, ds, data.refs, rap.ventilation || '');
    const sous = (rap.criteres || 'Ensemble des migrants accessibles') + (rap.ventilation && Stats.DIM[rap.ventilation] ? ' — par ' + Stats.DIM[rap.ventilation].l.toLowerCase() : '') + ' — rapport « ' + rap.nom + ' » (' + libFreq(rap).toLowerCase() + ')';
    try {
      await Export.generer(rap.format, { titre: rap.nom, sousTitre: sous, lignes: () => Q.lignes(ind, r, rap.ventilation), fichier: 'rapport_' + rap.indicateur });
      rap.historique = rap.historique || []; rap.historique.unshift({ date: new Date().toISOString(), statut: 'Généré manuellement', fichier: 'rapport_' + rap.indicateur + '.' + rap.format, par: App.profil.nom });
      await Store.db.upsert('rapports', rap); await Store.audit('Rapport exécuté', rap.nom, rap.format.toUpperCase());
      UI.toast('Rapport généré.', 'file-check-2'); App.render();
    } catch (e) { console.error(e); UI.toast('Génération impossible : ' + e.message, 'alert-triangle'); }
  };
  Q.formRapport = function (init, data) {
    const p = App.profil; const rap = { nom: '', indicateur: 'vol', ventilation: '', filtres: {}, format: 'pdf', periodicite: 'Mensuelle', jour: 1, destinataires: [p.structure], emails: '', actif: true, ...(init || {}) };
    const nom = h('input', { class: 'input', value: rap.nom }); const jour = h('input', { class: 'input', type: 'number', min: 1, max: 28, value: rap.jour }); const emails = h('input', { class: 'input', value: rap.emails || '', placeholder: 'adresse@exemple.ci, …' });
    const FORMATS = [['pdf', 'Document PDF'], ['xlsx', 'Classeur Excel'], ['csv', 'Fichier CSV']];
    UI.modal({ title: rap.id ? 'Modifier le rapport programmé' : 'Programmer un rapport', icon: 'calendar-clock', body: h('div', { class: 'form-grid' },
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Nom du rapport'), nom),
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Indicateur'), UI.dropdown({ items: Stats.IND.filter((x) => !x.off).map((x) => ({ value: x.id, label: x.l, group: x.g })), groupBy: true, value: rap.indicateur, searchPlaceholder: 'Rechercher un indicateur…', onChange: (v) => { rap.indicateur = v; if (!nom.value) nom.value = (Stats.IND.find((x) => x.id === v) || {}).l || ''; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Ventilation'), UI.dropdown({ items: [{ value: '', label: 'Sans ventilation' }].concat(Stats.VENTIL.map((k) => ({ value: k, label: 'Par ' + Stats.DIM[k].l.toLowerCase() }))), value: rap.ventilation, onChange: (v) => { rap.ventilation = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Format'), UI.dropdown({ items: FORMATS.map(([v, l]) => ({ value: v, label: l })), value: rap.format, onChange: (v) => { rap.format = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Périodicité'), UI.dropdown({ items: PERIODES.map((v) => ({ value: v, label: v })), value: rap.periodicite, onChange: (v) => { rap.periodicite = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Jour (1 = lundi en hebdomadaire, jour du mois sinon)'), jour),
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Structures destinataires'), UI.dropdown({ items: M.structures.map((x) => ({ value: x.code, label: x.code + ' — ' + x.nom })), multiple: true, value: rap.destinataires, onChange: (v) => { rap.destinataires = v; } }).el),
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Adresses de courriel supplémentaires (facultatif)'), emails),
      rap.criteres ? h('div', { class: 'full notice' }, icon('filter'), 'Critères repris de la recherche : ' + rap.criteres) : null),
    actions: [{ label: 'Annuler' }, { label: 'Enregistrer', cls: 'primary', icon: 'save', onclick: async () => {
      if (!nom.value.trim()) { UI.toast('Nom obligatoire.', 'alert-triangle'); return false; }
      Object.assign(rap, { nom: nom.value.trim(), jour: Number(jour.value) || 1, emails: emails.value.trim() });
      if (!rap.id) Object.assign(rap, { id: UI.uuid(), cree_par: p.nom, created_at: new Date().toISOString(), historique: [] });
      await Store.db.upsert('rapports', rap); await Store.audit('Rapport programmé', rap.nom, libFreq(rap));
      UI.toast('Rapport programmé : prochain envoi le ' + UI.fmtDate(Q.prochaine(rap).toISOString(), true) + '.', 'calendar-clock');
      if (location.hash.endsWith('/rapports')) App.render();
    } }] }).el.style.maxWidth = '760px';
  };
  Q.rapports = function (c, data) {
    const p = App.profil; const raps = (data.rapports || []).filter((r) => p.role === 'admin' || (r.destinataires || []).includes(p.structure) || r.cree_par === p.nom);
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Rapports programmés'), h('p', { class: 'sub' }, 'Indicateurs calculés et diffusés automatiquement aux structures, au format PDF, Excel ou CSV.')),
      h('button', { class: 'btn primary', onclick: () => Q.formRapport(null, data) }, icon('plus'), 'Programmer un rapport')),
      h('div', { class: 'notice', style: { marginBottom: '20px' } }, icon('server'), 'Dans la version définitive, le serveur génère et envoie les rapports à l\'heure prévue (espace de la structure et courriel). Dans la démonstration, l\'échéance est calculée et le rapport peut être généré à la demande.'));
    if (!raps.length) { c.append(h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('calendar-clock'), 'Aucun rapport programmé. Depuis la page Statistiques, utilisez « Programmer ce rapport ».'))); return; }
    c.append(h('div', { class: 'grid g2' }, raps.map((r) => { const ind = Stats.IND.find((x) => x.id === r.indicateur) || { l: r.indicateur }; const der = (r.historique || [])[0];
      return h('div', { class: 'card' + (r.actif ? '' : ' off') }, h('div', { class: 'row between', style: { alignItems: 'flex-start' } }, h('div', { class: 'who', style: { alignItems: 'flex-start' } }, h('span', { class: 'ticon ' + (r.format === 'pdf' ? 'r' : r.format === 'xlsx' ? 'g' : 'b') }, icon(r.format === 'pdf' ? 'file-text' : r.format === 'xlsx' ? 'file-spreadsheet' : 'sheet')),
        h('div', null, h('b', null, r.nom), h('div', { class: 'small muted' }, ind.l + (r.ventilation && Stats.DIM[r.ventilation] ? ' · par ' + Stats.DIM[r.ventilation].l.toLowerCase() : '')))),
        h('label', { class: 'switch', title: r.actif ? 'Actif' : 'Suspendu' }, h('input', { type: 'checkbox', checked: r.actif ? true : null, onchange: async (e) => { r.actif = e.target.checked; await Store.db.upsert('rapports', r); App.render(); } }), h('span', null))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Fréquence'), h('span', null, libFreq(r))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Prochain envoi'), h('span', null, r.actif ? h('b', null, UI.fmtDate(Q.prochaine(r).toISOString(), true)) : h('span', { class: 'badge grey' }, 'Suspendu'))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Destinataires'), h('span', { class: 'row', style: { gap: '4px' } }, (r.destinataires || []).map((x) => h('span', { title: x }, Admin.logo(x, 22))), r.emails ? h('span', { class: 'tiny muted' }, '+ ' + r.emails) : null)),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Dernier envoi'), h('span', { class: 'small' }, der ? UI.fmtDate(der.date, true) + ' — ' + der.statut : 'Jamais')),
        h('div', { class: 'row', style: { marginTop: '12px', gap: '8px' } }, h('button', { class: 'btn sm primary', onclick: () => Q.executer(r, data) }, icon('play'), 'Générer maintenant'), h('button', { class: 'btn sm', onclick: () => Q.formRapport(r, data) }, icon('pencil'), 'Modifier'), h('span', { class: 'tiny muted' }, 'Créé par ' + (r.cree_par || '—'))));
    })));
  };

  /* ======================= Portail public de données ouvertes ======================= */
  Q.ouvertes = async function (el) {
    const page = h('div', { class: 'public-page large' }); el.append(page);
    page.append(h('div', { class: 'public-head' }, h('img', { src: 'assets/img/logo-retour-ci-360.png', alt: 'Retour CI 360', class: 'logo-full', style: { height: '64px' } }), h('div', { class: 'row' }, h('button', { class: 'hicon theme-btn', title: 'Thème', onclick: App.basculerTheme }, icon(App.theme() === 'dark' ? 'sun' : 'moon')), h('a', { class: 'btn sm', href: '#/' }, icon('log-in'), 'Espace des structures'))));
    let ds;
    try { ds = (await Store.db.listDossiers()).filter((d) => d.statut === 'Synchronisé'); } catch (e) { ds = null; }
    let arrs = []; try { arrs = await Store.db.list('arrivees'); } catch (e) { arrs = []; }
    page.append(h('div', { class: 'od-hero' }, h('span', { class: 'ref-chip' }, icon('globe'), 'Données ouvertes'), h('h1', null, 'Migrants ivoiriens de retour : les chiffres clés'),
      h('p', null, 'Statistiques agrégées issues de la base nationale Retour CI 360. Aucune donnée individuelle n\'est publiée ; les effectifs inférieurs à ' + UI.PARAMS.secret + ' sont masqués.'),
      h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'badge solid ok' }, 'Licence ouverte [à confirmer]'), h('span', { class: 'badge grey' }, 'Mise à jour : ' + UI.fmtDate(new Date().toISOString())), h('span', { class: 'badge grey' }, 'Données fictives de démonstration'))));
    if (!ds || (App.mode === 'supabase' && !ds.length)) { page.append(h('div', { class: 'notice warn' }, icon('info'), 'Données indisponibles dans ce mode de démonstration : en production, le portail lit une vue agrégée publiée par le serveur national.')); UI.refreshIcons(); return; }
    const S = Stats; const n = ds.length;
    const SEUIL = UI.PARAMS.secret; const msk = (v) => (UI.estMasque(v) ? UI.libMasque() : v);
    const compte = (f) => { const o = {}; ds.forEach((d) => [].concat(f(d) || []).filter(Boolean).forEach((k) => { o[k] = (o[k] || 0) + 1; })); return o; };
    const items = (o, lim) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, lim || 99).map(([label, v]) => ({ label, v, pct: pc(v, n) }));
    const fem = ds.filter((d) => d.resume.sexe === 'Femme').length; const min = ds.filter((d) => d.drapeaux && d.drapeaux.mineur).length; const rva = ds.filter((d) => d.reponses['IDT-016'] === 'Retour volontaire assisté').length;
    const prov = compte((d) => d.resume.provenance); const reg = compte((d) => d.resume.region_retour); const typ = compte((d) => d.reponses['IDT-017'] === 'Charter' ? 'Vol affrété' : d.reponses['IDT-017'] === 'voie terrestre' ? 'Voie terrestre' : d.reponses['IDT-017']);
    const parM = compte((d) => S.mois(d)); const mois = Object.keys(parM).sort();
    const pyr = { h: S.TRANCHES.map((tr) => ds.filter((d) => S.tranche(d.resume.age) === tr && d.resume.sexe === 'Homme').length), f: S.TRANCHES.map((tr) => ds.filter((d) => S.tranche(d.resume.age) === tr && d.resume.sexe === 'Femme').length) };
    const masqueItems = (it) => it.filter((x) => x.v >= SEUIL).concat(it.some((x) => x.v < SEUIL) ? [{ label: 'Autres (effectifs < ' + SEUIL + ')', v: it.filter((x) => x.v < SEUIL).reduce((a, x) => a + x.v, 0), pct: pc(it.filter((x) => x.v < SEUIL).reduce((a, x) => a + x.v, 0), n), couleur: '#C8CFD6' }] : []);
    const kpi = (ic, t, v, l) => h('div', { class: 'card itile' }, h('span', { class: 'ticon lg ' + t }, icon(ic)), h('div', null, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l)), UI.filigrane(ic));
    page.append(h('div', { class: 'od-kpis' }, kpi('users', 'o', n.toLocaleString('fr-FR'), 'migrants de retour enregistrés'), kpi('venus', 'p', pc(fem, n) + ' %', 'de femmes'), kpi('baby', 'b', pc(min, n) + ' %', 'de mineurs'),
      kpi('hand-helping', 'g', pc(rva, n) + ' %', 'de retours volontaires assistés'), kpi('plane-landing', 'v', arrs.filter((a) => a.statut !== 'Prévue').length, 'arrivées accueillies'), kpi('globe', 't', Object.keys(prov).length, 'pays de provenance')));
    const carte = (ic, t, titre, corps) => carteC(ic, t, titre, null, h('div', { class: 'card-b' }, corps));
    page.append(h('div', { class: 'grid g2', style: { marginBottom: '20px' } },
      carte('trending-up', 'o', ['Retours par mois', UI.aide('Nombre de migrants de retour enregistrés chaque mois, d\'après la date de l\'entretien. Agrégat public : les effectifs inférieurs à ' + SEUIL + ' ne sont pas publiés.')], Charts.courbes({ etiquettes: mois.map(S.libMois), series: [{ nom: 'Retours', couleur: '#FE7701', valeurs: mois.map((m) => parM[m]) }], hauteur: 280, largeur: 560 })),
      carte('users', 'b', ['Pyramide des âges', UI.aide('Répartition des migrants de retour par tranche d\'âge et par sexe — hommes à gauche en bleu, femmes à droite en orange. Toute tranche comptant moins de ' + SEUIL + ' personnes est ramenée à zéro pour empêcher une réidentification.')], Charts.pyramide({ tranches: S.TRANCHES, hommes: pyr.h.map((v) => (v < SEUIL ? 0 : v)), femmes: pyr.f.map((v) => (v < SEUIL ? 0 : v)), largeur: 520 })),
      carte('globe', 'v', ['Pays de provenance', UI.aide('Pays d\'où les migrants sont revenus, classés par effectif. Les pays comptant moins de ' + SEUIL + ' personnes sont regroupés dans une ligne « Autres » au lieu d\'être nommés.')], Charts.hbarres({ items: masqueItems(items(prov)), couleur: '#014A96', largeur: 560 })),
      carte('map-pin', 't', ['Régions de retour', UI.aide('Régions de Côte d\'Ivoire où les migrants se sont réinstallés, classées par effectif. Les régions comptant moins de ' + SEUIL + ' personnes sont regroupées dans une ligne « Autres ».')], Charts.hbarres({ items: masqueItems(items(reg)), couleur: '#0E6B63', largeur: 560 }))));
    // jeux de données téléchargeables
    const jeux = [
      ['Retours par mois et par sexe', 'retours_mois_sexe', () => [['Mois', 'Hommes', 'Femmes', 'Total'], ...mois.map((m) => { const x = ds.filter((d) => S.mois(d) === m); const hh = x.filter((d) => d.resume.sexe === 'Homme').length, ff = x.filter((d) => d.resume.sexe === 'Femme').length; return [m, msk(hh), msk(ff), msk(x.length)]; })]],
      ['Retours par pays de provenance', 'retours_provenance', () => [['Pays de provenance', 'Migrants de retour', 'Part (%)'], ...items(prov).map((x) => [x.label, msk(x.v), x.v < SEUIL ? '' : x.pct])]],
      ['Retours par région de retour', 'retours_region', () => [['Région de retour', 'Migrants de retour', 'Part (%)'], ...items(reg).map((x) => [x.label, msk(x.v), x.v < SEUIL ? '' : x.pct])]],
      ['Retours par tranche d\'âge et par sexe', 'retours_age_sexe', () => [['Tranche d\'âge', 'Hommes', 'Femmes'], ...S.TRANCHES.map((tr, i) => [tr, msk(pyr.h[i]), msk(pyr.f[i])])]],
      ['Retours par moyen de retour', 'retours_moyen', () => [['Moyen de retour', 'Migrants de retour'], ...items(typ).map((x) => [x.label, msk(x.v)])]],
    ];
    page.append(carteC('download', 'g', 'Jeux de données à télécharger', h('span', { class: 'badge accent' }, jeux.length + ' jeux'), h('div', { class: 'card-b' }, jeux.map(([titre, f, lignes]) => h('div', { class: 'li' }, h('span', { class: 'ticon b' }, icon('table')), h('div', { class: 'grow' }, h('div', { class: 't1' }, titre), h('div', { class: 't2' }, 'Agrégats, effectifs inférieurs à ' + SEUIL + ' masqués')),
      h('button', { class: 'btn sm', onclick: () => Export.generer('csv', { titre, sousTitre: 'Retour CI 360 — données ouvertes', lignes, fichier: 'donnees_ouvertes_' + f }) }, icon('sheet'), 'CSV'),
      h('button', { class: 'btn sm', onclick: () => Export.generer('xlsx', { titre, sousTitre: 'Retour CI 360 — données ouvertes', lignes, fichier: 'donnees_ouvertes_' + f }) }, icon('file-spreadsheet'), 'Excel'))))));
    page.append(h('div', { class: 'card', style: { marginTop: '20px' } }, h('h3', { style: { marginTop: 0 } }, 'Méthodologie et protection des données'),
      h('ul', { class: 'small', style: { lineHeight: 1.7, margin: 0, paddingLeft: '18px' } },
        h('li', null, 'Champ : migrants ivoiriens de retour dont l\'enregistrement est terminé et synchronisé dans la base nationale.'),
        h('li', null, 'Date de référence : date de retour déclarée (question IDT-019).'),
        h('li', null, 'Secret statistique : tout effectif compris entre 1 et ' + (SEUIL - 1) + ' est remplacé par « < ' + SEUIL + ' » ; aucune donnée individuelle n\'est diffusée.'),
        h('li', null, 'Indicateurs alignés sur les référentiels de l\'OIM, la cible 10.7 des Objectifs de développement durable et l\'objectif 21 du Pacte mondial pour les migrations.'),
        h('li', null, 'Traitement conforme à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel. Licence et fréquence de mise à jour : [à confirmer].'))));
    UI.refreshIcons();
  };
  window.Qualite = Q;
})();
