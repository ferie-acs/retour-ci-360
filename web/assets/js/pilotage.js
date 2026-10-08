/* Vue du premier responsable de chaque entité : activité de la structure et profilage des migrants.
   Profilage sur la base nationale en agrégats anonymes (effectifs < 5 masqués hors DGIE), liste nominative limitée aux dossiers de la structure.
   Les sections de sensibilité N3 ne sont exploitables que si la matrice d'habilitations les ouvre à la structure. */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const PI = { etat: null };
  const kcard = (t, ic, label, val, sous) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val), sous ? h('div', { class: 'tiny', style: { opacity: 0.9 } }, sous) : null), UI.filigrane(ic));
  const carteC = (ic, t, titre, droite, ...corps) => h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + t }, icon(ic)), titre), droite || null), ...corps);
  const WIDGETS = ['single', 'yesno', 'multi', 'country', 'locality', 'region', 'nationality', 'number', 'month', 'provenance'];
  const DERIVEES = {
    _sexe: { l: 'Sexe', f: (d) => d.resume.sexe },
    _age: { l: 'Tranche d\'âge', f: (d) => Stats.tranche(d.resume.age), ordre: () => Stats.TRANCHES },
    _region: { l: 'Région de retour', f: (d) => d.resume.region_retour },
    _provenance: { l: 'Pays de provenance', f: (d) => d.resume.provenance },
    _structure: { l: 'Structure d\'enrôlement', f: (d) => d.structure },
    _mois: { l: 'Mois de retour', f: (d) => Stats.mois(d), temps: true },
    _arrivee: { l: 'Moyen de retour', f: (d) => ({ Charter: 'Vol affrété', 'voie terrestre': 'Voie terrestre' }[d.reponses['IDT-017']] || d.reponses['IDT-017']) },
  };
  const PRESETS = [
    ['Niveau d\'étude par tranche d\'âge', 'EDU-001', '_age'], ['Secteur d\'activité avant le départ par région', 'PER-010', '_region'], ['Projets de réinsertion envisagés', 'ORI-004', ''],
    ['Besoins immédiats par sexe', 'BIM-001', '_sexe'], ['Motifs de départ par pays de provenance', 'PAR-006', '_provenance'], ['Niveau de vulnérabilité évalué', 'ORI-003', '_sexe'],
    ['Logement au retour', 'RES-008', '_region'], ['Intention de repartir', 'PER-004', '_age'],
  ];
  const valeurs = (code, d) => {
    if (DERIVEES[code]) { const v = DERIVEES[code].f(d); return v === null || v === undefined || v === '' ? [] : [String(v)]; }
    const v = d.reponses[code]; if (v === undefined || v === null || v === '') return [];
    const un = (x) => (typeof x === 'object' && x ? (x.pays || x.n || x.ville || Object.values(x).filter(Boolean).join(', ')) : x);
    return [].concat(v).map(un).filter((x) => x !== '' && x !== undefined && x !== null).map(String);
  };

  PI.page = function (c, data) {
    const p = App.profil; const dgie = p.structure === 'DGIE' || p.role === 'admin';
    const struct = (M.structures.find((s) => s.code === p.structure) || {}).nom || p.structure;
    const mesDs = data.acces.map((x) => x.d).filter((d) => d.statut === 'Synchronisé');
    const national = data.ds.filter((d) => d.statut === 'Synchronisé');
    // ---------- Activité de la structure ----------
    const enroles = national.filter((d) => d.structure === p.structure);
    const recus = data.refs.filter((r) => r.destinataire === p.structure); const emis = data.refs.filter((r) => r.emetteur === p.structure);
    const delais = recus.map((r) => { const e = (r.historique || []).find((x) => x.statut === 'Émis'), re = (r.historique || []).find((x) => x.statut === 'Reçu'); return e && re ? (new Date(re.date) - new Date(e.date)) / 3600000 : null; }).filter((x) => x !== null && x >= 0);
    const enRetard = recus.filter((r) => r.statut === 'Émis' && new Date(r.echeance_reception) < new Date()).length;
    const responsables = national.filter((d) => Taches.responsable(d) === p.structure);
    const suivisRetard = responsables.filter((d) => (d.etat_suivi || 'Ouvert') === 'Ouvert' && new Date(Taches.echeanceSuivi(d)) < new Date()).length;
    const alertes = data.als.filter((a) => a.statut === 'Ouverte' && ((a.notifie || []).includes(p.structure) || dgie)).length;
    const equipe = (Admin.annuaire || []).filter((u) => u.structure === p.structure);
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Vue du premier responsable'), h('p', { class: 'sub' }, struct + ' — activité de la structure et profilage des migrants de retour.')),
      h('div', { class: 'row' }, Admin.logo(p.structure, 40))),
    h('div', { class: 'grid g4', style: { marginBottom: '20px' } },
      kcard('o', 'folder-open', 'Dossiers concernant la structure', mesDs.length, enroles.length + ' enrôlé(s) par la structure'),
      kcard('d', 'send', 'Référencements reçus', recus.length, (delais.length ? 'réception en ' + Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) + ' h en moyenne' : 'aucun délai mesuré') + (enRetard ? ' · ' + enRetard + ' en retard' : '')),
      kcard('b', 'user-check', 'Dossiers sous sa responsabilité', responsables.length, suivisRetard + ' suivi(s) en retard'),
      kcard('g', 'siren', 'Alertes ouvertes', alertes, emis.length + ' référencement(s) émis')));

    const parAgent = {}; mesDs.forEach((d) => { if (d.structure === p.structure) parAgent[d.agent] = (parAgent[d.agent] || 0) + 1; });
    const tblEq = h('div', { class: 'tbl-wrap', style: { maxHeight: '340px', overflow: 'auto' } }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Membre', 'Rôle', 'Statut', 'Dernière connexion', 'Dossiers enrôlés'].map((x) => h('th', null, x)))),
      h('tbody', null, equipe.map((u) => h('tr', null, h('td', null, h('b', null, u.nom), h('div', { class: 'tiny muted' }, u.email || '')), h('td', null, (Admin.ROLES[u.role] || {}).label || u.role), h('td', null, h('span', { class: 'badge ' + (u.statut === 'Actif' ? 'ok' : 'warn') }, u.statut)),
        h('td', { class: 'small' }, u.derniere_connexion ? UI.ago(u.derniere_connexion) : 'Jamais'), h('td', null, parAgent[u.nom] || '—'))))));
    const statutsRef = {}; recus.forEach((r) => { statutsRef[r.statut] = (statutsRef[r.statut] || 0) + 1; });
    const itemsRef = Object.entries(statutsRef).map(([label, v]) => ({ label, v, pct: Math.round((100 * v) / (recus.length || 1)) }));
    c.append(h('div', { class: 'grid g2', style: { marginBottom: '20px' } },
      carteC('users', 'b', 'Équipe de la structure (' + equipe.length + ')', null, tblEq),
      carteC('send', 'v', ['Référencements reçus par statut', UI.aide('Répartition des référencements adressés à votre structure selon leur état d\'avancement : Émis, Reçu, Accepté, En cours de prise en charge, Clôturé, Refusé. Seuls les référencements dont votre structure est destinataire sont comptés — pas ceux qu\'elle a émis.')], null, h('div', { class: 'card-b' }, itemsRef.length ? Charts.hbarres({ items: itemsRef, couleur: '#4B3F8C', largeur: 520 }) : h('div', { class: 'empty' }, 'Aucun référencement reçu.')))));

    // ---------- Profilage ----------
    const st = PI.etat || (PI.etat = { perimetre: 'national', v: 'EDU-001', x: '_age', f: {}, vue: 'graphe' });
    const lisible = (q) => { const sens = M.sensibiliteSections[q.sect]; return p.role === 'admin' || dgie || sens !== 'N3' || Domaine.droits(p, q.sect).includes('L'); };
    const questions = window.DICO.filter((q) => WIDGETS.includes(q.widget));
    const items = [...Object.entries(DERIVEES).map(([k, x]) => ({ value: k, label: x.l, group: 'Variables de synthèse' })),
      ...questions.map((q) => ({ value: q.code, label: q.code + ' — ' + q.label, group: 'Section ' + q.sect + ' — ' + M.SECTIONS[q.sect], right: lisible(q) ? (M.sensibiliteSections[q.sect] === 'N3' ? 'N3' : '') : 'non autorisé', disabled: !lisible(q) }))];
    const libelle = (k) => (DERIVEES[k] ? DERIVEES[k].l : ((window.DICO.find((q) => q.code === k) || {}).label || k));
    const resultat = h('div'); const compteur = h('span', { class: 'badge solid accent' });
    const ddV = UI.dropdown({ items: items.filter((x) => !x.disabled), value: st.v, groupBy: true, searchPlaceholder: 'Rechercher une question du formulaire (ex. métier, diplôme, santé, logement)…', onChange: (v) => { st.v = v; calc(); } });
    const ddX = UI.dropdown({ items: [{ value: '', label: 'Sans croisement' }].concat(items.filter((x) => !x.disabled)), value: st.x, groupBy: true, searchPlaceholder: 'Rechercher une variable de croisement…', onChange: (v) => { st.x = v; calc(); } });
    const filtre = (k, lib) => { const vs = [...new Set(national.flatMap((d) => valeurs(k, d)))].sort((a, b) => a.localeCompare(b, 'fr'));
      return h('div', null, h('label', { class: 'q' }, lib), UI.dropdown({ items: vs.map((x) => ({ value: x, label: x })), multiple: true, value: st.f[k] || [], placeholder: 'Tous', onChange: (v) => { st.f[k] = v; calc(); } }).el); };
    const perim = h('div', { class: 'periods' }, [['national', 'Base nationale (agrégats anonymes)'], ['structure', 'Dossiers de ma structure']].map(([k, l]) => h('button', { class: k === st.perimetre ? 'on' : '', onclick: (e) => { st.perimetre = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); calc(); } }, l)));
    const masque = (n) => (!dgie && st.perimetre === 'national' && UI.estMasque(n) ? UI.libMasque() : n);

    function calc() {
      const base = (st.perimetre === 'national' ? national : mesDs).filter((d) => Object.entries(st.f).every(([k, sel]) => !sel || !sel.length || valeurs(k, d).some((x) => sel.includes(x))));
      compteur.textContent = base.length + ' migrant(s)';
      resultat.innerHTML = ''; resultat.classList.remove('fondu'); void resultat.offsetWidth; resultat.classList.add('fondu');
      const rep = base.filter((d) => valeurs(st.v, d).length); const comptes = {};
      rep.forEach((d) => valeurs(st.v, d).forEach((x) => { comptes[x] = (comptes[x] || 0) + 1; }));
      let cles = Object.keys(comptes).sort((a, b) => comptes[b] - comptes[a]); if (DERIVEES[st.v] && DERIVEES[st.v].ordre) cles = DERIVEES[st.v].ordre().filter((x) => cles.includes(x)); if (DERIVEES[st.v] && DERIVEES[st.v].temps) cles.sort();
      const titre = libelle(st.v) + (st.x ? ' × ' + libelle(st.x) : '');
      const nonRep = base.length - rep.length;
      let graphe, lignes;
      if (st.x) {
        const gs = {}; rep.forEach((d) => valeurs(st.x, d).forEach((g) => { gs[g] = gs[g] || {}; valeurs(st.v, d).forEach((x) => { gs[g][x] = (gs[g][x] || 0) + 1; }); }));
        let gk = Object.keys(gs).sort((a, b) => Object.values(gs[b]).reduce((s, v) => s + v, 0) - Object.values(gs[a]).reduce((s, v) => s + v, 0)); if (DERIVEES[st.x] && DERIVEES[st.x].ordre) gk = DERIVEES[st.x].ordre().filter((x) => gk.includes(x)); if (DERIVEES[st.x] && DERIVEES[st.x].temps) gk.sort();
        gk = gk.slice(0, 10); const ck = cles.slice(0, 10);
        lignes = [[libelle(st.v), ...gk, 'Total'], ...ck.map((k) => [k, ...gk.map((g) => (gs[g][k] || 0)), comptes[k]])];
        graphe = st.vue === 'tableau' ? tableau(lignes.map((l, i) => (i ? [l[0], ...l.slice(1).map(masque)] : l))) : h('div', null, h('div', { class: 'map-legend', style: { margin: '0 0 10px' } }, gk.map((g, i) => h('span', null, h('i', { class: 'sq', style: { background: Charts.PALETTE[i % 12] } }), g))),
          Charts.groupes({ etiquettes: ck.map((k) => (k.length > 18 ? k.slice(0, 17) + '…' : k)), series: gk.map((g, i) => ({ nom: g, couleur: Charts.PALETTE[i % 12], valeurs: ck.map((k) => (masque(gs[g][k] || 0) === UI.libMasque() ? 0 : gs[g][k] || 0)) })), empile: true }));
      } else {
        const it = cles.slice(0, 20).map((k) => ({ label: k, v: masque(comptes[k]) === UI.libMasque() ? 0 : comptes[k], pct: Math.round((100 * comptes[k]) / (rep.length || 1)), sous: masque(comptes[k]) === UI.libMasque() ? 'effectif inférieur au seuil masqué' : '' }));
        lignes = [[libelle(st.v), 'Effectif', 'Part (%)'], ...cles.map((k) => [k, comptes[k], Math.round((100 * comptes[k]) / (rep.length || 1))])];
        graphe = st.vue === 'tableau' ? tableau(lignes.map((l, i) => (i ? [l[0], masque(l[1]), l[2] + ' %'] : l))) : it.length ? Charts.hbarres({ items: it, couleur: '#014A96', largeur: 760 }) : h('div', { class: 'empty' }, 'Aucune réponse pour cette question dans la sélection.');
      }
      const exportLignes = () => lignes.map((l, i) => (i ? l.map((v, j) => (j && typeof v === 'number' ? masque(v) : v)) : l));
      const zone = h('div');
      const nominatif = st.perimetre === 'structure';
      const aideProfilage = 'Effectifs de migrants pour chaque réponse à « ' + libelle(st.v) + ' »'
        + (st.x ? ', ventilés par « ' + libelle(st.x) + ' » (une couleur par groupe, 10 groupes au maximum)' : '')
        + '. Périmètre : ' + (st.perimetre === 'national' ? 'base nationale, agrégats anonymes uniquement' : 'dossiers de ' + p.structure)
        + '. Calculé sur ' + rep.length + ' migrant(s) ayant répondu, parmi ' + base.length + ' retenus par les filtres'
        + (!dgie && st.perimetre === 'national' ? '. Les effectifs inférieurs à ' + UI.PARAMS.secret + ' sont masqués et comptés comme zéro dans le graphique' : '') + '.';
      zone.append(carteC('chart-column', 'o', [titre, UI.aide(aideProfilage)], h('div', { class: 'row' }, h('div', { class: 'periods' }, [['graphe', 'Graphique'], ['tableau', 'Tableau']].map(([k, l]) => h('button', { class: k === st.vue ? 'on' : '', onclick: () => { st.vue = k; calc(); } }, l))),
        Export.menu({ compact: true, titre: 'Profilage — ' + titre, sousTitre: (st.perimetre === 'national' ? 'Base nationale, agrégats anonymes' : 'Dossiers de ' + p.structure) + ' — ' + base.length + ' migrant(s)', lignes: exportLignes, noeud: () => zone, fichier: 'profilage_' + st.v })),
        h('div', { class: 'card-b' }, h('div', { class: 'small muted', style: { marginBottom: '10px' } }, rep.length + ' réponse(s) sur ' + base.length + ' migrant(s)' + (nonRep ? ' · ' + nonRep + ' sans réponse' : '') + (!dgie && st.perimetre === 'national' ? ' · effectifs inférieurs à ' + UI.PARAMS.secret + ' masqués' : '')), graphe)));
      if (nominatif) {
        const liste = rep.slice(0, 200);
        zone.append(h('div', { style: { height: '20px' } }), carteC('users', 'g', 'Migrants correspondants (' + rep.length + ')', null, h('div', { class: 'tbl-wrap', style: { maxHeight: '420px', overflow: 'auto' } }, h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, ['Identifiant', 'Migrant', libelle(st.v), st.x ? libelle(st.x) : 'Région de retour', ''].map((x) => h('th', null, x)))),
          h('tbody', null, liste.map((d) => h('tr', null, h('td', null, h('a', { class: 'idlink', href: '#/portail/dossier/' + d.id }, d.identifiant)), h('td', null, Domaine.droits(p, 'II').includes('L') ? (d.resume.nom + ' ' + d.resume.prenoms) : h('span', { class: 'masked' }, '••••••')),
            h('td', { class: 'small' }, valeurs(st.v, d).join(', ')), h('td', { class: 'small' }, st.x ? valeurs(st.x, d).join(', ') : d.resume.region_retour || '—'), h('td', null, h('a', { class: 'btn sm', href: '#/portail/dossier/' + d.id }, icon('folder-open'))))))))));
      } else zone.append(h('div', { class: 'notice', style: { marginTop: '16px' } }, icon('shield-check'), 'Base nationale : agrégats anonymes uniquement. La liste nominative est disponible sur le périmètre « Dossiers de ma structure ».'));
      resultat.append(zone); UI.refreshIcons();
    }
    const tableau = (rows) => h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, rows[0].map((x) => h('th', null, x)))), h('tbody', null, rows.slice(1).map((r) => h('tr', null, r.map((x) => h('td', null, x)))))));

    c.append(h('div', { class: 'page-head', style: { margin: '8px 0 14px' } }, h('div', null, h('h2', { style: { margin: 0 } }, 'Profilage des migrants'), h('p', { class: 'sub' }, 'Choisissez n\'importe quelle question du formulaire, croisez-la avec une autre et filtrez la population.'))),
      h('div', { class: 'card p0', style: { marginBottom: '20px' } }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon b' }, icon('sliders-horizontal')), 'Paramètres'), compteur),
        h('div', { class: 'card-b stack' },
          h('div', null, h('label', { class: 'q' }, 'Périmètre'), perim),
          h('div', { class: 'row', style: { alignItems: 'flex-end' } }, h('div', { style: { flex: '2 1 380px' } }, h('label', { class: 'q' }, 'Information à analyser'), ddV.el), h('div', { style: { flex: '2 1 320px' } }, h('label', { class: 'q' }, 'Croiser avec'), ddX.el)),
          h('div', { class: 'filtres' }, filtre('_sexe', 'Sexe'), filtre('_age', 'Tranche d\'âge'), filtre('_region', 'Région de retour'), filtre('_provenance', 'Pays de provenance'), filtre('_structure', 'Structure d\'enrôlement'), filtre('_arrivee', 'Moyen de retour')),
          h('div', null, h('label', { class: 'q' }, 'Questions fréquentes'), h('div', { class: 'row', style: { gap: '6px' } }, PRESETS.filter(([, v, x]) => [v, x].every((k) => !k || DERIVEES[k] || lisible(window.DICO.find((q) => q.code === k) || {}))).map(([l, v, x]) => h('button', { class: 'ref-chip', style: { cursor: 'pointer' }, onclick: () => { st.v = v; st.x = x; ddV.set(v); ddX.set(x); calc(); } }, icon('sparkles'), l)))))),
      resultat);
    calc();
  };
  window.Pilotage = PI;
})();
