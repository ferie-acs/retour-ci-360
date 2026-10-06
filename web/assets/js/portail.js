/* Portail des structures : tableau de bord, dossiers, référencements, alertes, doublons, journal, habilitations */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const P = { reveles: new Set() };
  const SECT = Object.keys(M.SECTIONS);
  const codesOf = (s) => window.DICO.filter((q) => q.sect === s).map((q) => q.code);
  const STRUCT = (c) => (M.structures.find((s) => s.code === c) || { nom: c }).nom;
  const REF_BADGE = { 'Émis': 'info', 'Reçu': 'info', 'Accepté': 'ok', 'Refusé': 'danger', 'En cours de prise en charge': 'accent', 'Clôturé': 'grey' };
  const GRAV = { Critique: 'danger', 'Élevée': 'warn', 'Modérée': 'info' };
  const ENTETE = (titre, sousTitre, droite) => h('div', { class: 'page-head' }, h('div', null, h('h1', null, titre), h('p', { class: 'sub' }, sousTitre)), droite || null);

  P.fmt = function (v) {
    if (v === undefined || v === null || v === '') return '—';
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? Object.values(x).filter(Boolean).join(', ') : x)).join(' ; ');
    if (typeof v === 'object') {
      if ('ind' in v) return v.num === 'Inconnu' ? 'Inconnu' : `${v.ind} ${v.num}`;
      if ('montant' in v) return `${Number(v.montant || 0).toLocaleString('fr-FR')} ${v.devise}`;
      if ('pays' in v) return [v.ville, v.pays].filter(Boolean).join(', ');
      return JSON.stringify(v);
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return UI.fmtDate(v, true);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return UI.fmtDate(v);
    return String(v);
  };

  async function charger() {
    const db = Store.db;
    const opt = (t) => db.list(t).catch(() => []);
    const [ds, refs, als, dbl, sites, arrivees, transferts, approbations, parametres, rapports, annonces] = await Promise.all([db.listDossiers(), db.list('referencements'), db.list('alertes'), opt('doublons'), opt('sites'), opt('arrivees'), opt('transferts'), opt('approbations'), opt('parametres'), opt('rapports'), opt('annonces')]);
    const p = App.profil;
    const acces = ds.map((d) => ({ d, motif: Domaine.concerne(p, d, refs, als) })).filter((x) => x.motif);
    return { ds, refs, als, dbl, acces, sites, arrivees, transferts, approbations, parametres, rapports, annonces };
  }
  const nomVisible = (p, d) => (Domaine.droits(p, 'II').includes('L') ? `${d.resume.nom || ''} ${d.resume.prenoms || ''}`.trim() : null);
  const mesRefs = (p, refs) => (p.role === 'admin' ? refs : refs.filter((r) => r.destinataire === p.structure || r.emetteur === p.structure || (p.role === 'superviseur' && r.emetteur === p.structure)));
  const mesAlertes = (p, als) => (p.role === 'admin' || p.structure === 'DGIE' ? als : als.filter((a) => (a.notifie || []).includes(p.structure)));

  /* En-tête de carte : pastille d'icône colorée + titre, actions à droite */
  P.carte = (ic, teinte, titre, droite, ...corps) => h('div', { class: 'card p0' },
    h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + teinte }, icon(ic)), titre), droite || null), ...corps);
  const AV = ['b', 'o', 'g', 'v', 'p', 't'];
  const avatar = (txt, i) => h('span', { class: 'av ticon ' + AV[i % AV.length] }, UI.initials(txt || '?'));
  const drapeau = (nomPays) => { const x = REF.pays.find((y) => y.n === nomPays); return x ? x.f : ''; };

  P.render = async function (root, view, id) {
    const p = App.profil;
    const page = h('div', { class: 'page' }, h('div', { class: 'empty' }, 'Chargement…')); root.append(page);
    let data; try { data = await charger(); } catch (e) { page.innerHTML = ''; page.append(h('div', { class: 'notice danger' }, icon('alert-triangle'), 'Erreur de chargement : ' + (e.message || e))); UI.refreshIcons(); return; }
    page.innerHTML = '';
    App.badge('referencements', mesRefs(p, data.refs).filter((r) => r.destinataire === p.structure && ['Émis', 'Reçu'].includes(r.statut)).length, 'o');
    App.badge('alertes', mesAlertes(p, data.als).filter((a) => a.statut === 'Ouverte').length);
    App.badge('doublons', data.dbl.filter((x) => x.statut === 'À examiner').length);
    const v = view || 'tableau';
    try { App.badge('taches', Taches.calculer(p, data).filter((x) => x.priorite !== 'Basse').length, 'o'); App.badge('arrivees', data.arrivees.filter((a) => a.statut === 'En cours').length); App.badge('annonces', Annonces.nonLues(p, data.annonces).length, 'o'); } catch (e) { console.warn(e); }
    const ADMIN = { 'admin-utilisateurs': ['utilisateurs', ['admin', 'superviseur']], 'admin-structures': ['structures_', ['admin']], 'admin-tablettes': ['tablettes_', ['admin']], habilitations: [null, ['admin']], journal: [null, ['admin', 'superviseur']], doublons: [null, ['admin', 'superviseur']],
      qualite: [null, ['admin', 'superviseur', 'responsable']], rapports: [null, ['admin', 'superviseur', 'responsable']], parametres: [null, ['admin']], pilotage: [null, ['admin', 'responsable']] };
    if (ADMIN[v] && !ADMIN[v][1].includes(p.role)) { page.append(h('div', { class: 'notice danger' }, icon('lock'), 'Cette page est réservée à l\'administration de la plateforme.')); UI.refreshIcons(); return; }
    const MODULES = { sites: () => Sites.sites(page, data), arrivees: () => Sites.arrivees(page, data), arrivee: () => Sites.arrivee(page, data, id), taches: () => Taches.page(page, data), reglages: () => Reglages.page(page, p, data), pilotage: () => Pilotage.page(page, data), annonces: () => Annonces.page(page, p, data.annonces, data.arrivees),
      qualite: () => Qualite.page(page, data), rapports: () => Qualite.rapports(page, data), parametres: () => Taches.parametres(page, data) };
    if (v === 'dossier') await P.fiche(page, data, id);
    else if (MODULES[v]) await MODULES[v]();
    else if (v === 'statistiques') Stats.page(page, data);
    else if (ADMIN[v] && ADMIN[v][0]) await Admin[ADMIN[v][0]](page, data);
    else await (P[v] || P.tableau)(page, data);
    if (v === 'tableau') { const bd = Annonces.bandeau(p, data.annonces, data.arrivees); if (bd && page.firstChild) page.firstChild.after(bd); }
    UI.refreshIcons();
  };

  /* ---------- Tableau de bord ---------- */
  P.tableau = function (c, { acces, refs, als, dbl }) {
    const p = App.profil; const ds = acces.map((x) => x.d);
    const mr = mesRefs(p, refs); const ma = mesAlertes(p, als);
    const recus = mr.filter((r) => r.destinataire === p.structure);
    const aTraiter = (p.role === 'admin' ? mr : recus).filter((r) => ['Émis', 'Reçu'].includes(r.statut));
    const enCours = (p.role === 'admin' ? mr : recus).filter((r) => ['Accepté', 'En cours de prise en charge'].includes(r.statut));
    const clotures = mr.filter((r) => r.statut === 'Clôturé');
    const retard = mr.filter((r) => r.statut === 'Émis' && new Date(r.echeance_reception) < new Date());
    const ouvertes = ma.filter((a) => a.statut === 'Ouverte'); const critiques = ouvertes.filter((a) => a.gravite === 'Critique');
    const now = new Date(); const debutMois = new Date(now.getFullYear(), now.getMonth(), 1); const debutPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ceMois = ds.filter((d) => new Date(d.created_at) >= debutMois).length; const moisPrec = ds.filter((d) => new Date(d.created_at) >= debutPrec && new Date(d.created_at) < debutMois).length;
    const evol = moisPrec ? Math.round((100 * (ceMois - moisPrec)) / moisPrec) : 0;
    const vuln = ds.filter((d) => d.drapeaux && (d.drapeaux.traite || d.drapeaux.mna || d.drapeaux.sante_mentale));
    const mineurs = ds.filter((d) => d.drapeaux && d.drapeaux.mineur);
    const petit = (n) => (UI.estMasque(n) && p.role !== 'admin' && p.structure !== 'DGIE' ? UI.libMasque() : n);
    const debut = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // En-tête
    c.append(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'Bienvenue, ' + p.nom), h('p', { class: 'sub' }, 'Vous avez ', h('b', { style: { color: 'var(--orange-text)' } }, aTraiter.length), ' référencement(s) à traiter — ', STRUCT(p.structure))),
      h('span', { class: 'datechip' }, icon('calendar'), UI.fmtDate(debut.toISOString()) + ' – ' + UI.fmtDate(now.toISOString()))));
    if (critiques.length) {
      const ban = h('div', { class: 'banner' }, icon('info'), h('span', null, h('b', null, critiques.length + ' alerte(s) critique(s)'), ' en attente de prise en charge. ', h('a', { href: '#/portail/alertes', style: { color: 'var(--orange-text)', fontWeight: 700 } }, 'Voir les alertes')),
        h('button', { class: 'x', title: 'Masquer', onclick: () => ban.remove() }, icon('x')));
      c.append(ban);
    }
    // Indicateurs pleins
    const kcard = (t, ic, label, val, chip, chipIc) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)),
      h('div', null, h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val, chip !== null ? h('span', { class: 'kchip' }, icon(chipIc || 'arrow-up'), chip) : null)));
    c.append(h('div', { class: 'grid g4' },
      kcard('o', 'folder-open', 'Dossiers accessibles', ds.length, '+' + ceMois + ' ce mois'),
      kcard('d', 'send', 'Référencements à traiter', aTraiter.length, retard.length ? retard.length + ' en retard' : null, 'arrow-down'),
      kcard('g', 'heart-handshake', 'Prises en charge en cours', enCours.length, clotures.length + ' clôturés', 'check'),
      kcard('b', 'siren', 'Alertes ouvertes', ouvertes.length, critiques.length ? critiques.length + ' critiques' : null, 'triangle-alert')));
    // Indicateurs blancs
    const scard = (val, label, ic, t, foot, href) => h('div', { class: 'card scard' },
      h('div', { class: 'top' }, h('div', null, h('div', { class: 'v' }, val), h('div', { class: 'l' }, label)), h('span', { class: 'ticon lg ' + t }, icon(ic))),
      h('div', { class: 'bot' }, h('span', null, foot), h('a', { class: 'link', href }, 'Voir tout')));
    c.append(h('div', { class: 'grid g4', style: { marginTop: '20px' } },
      scard(petit(mineurs.length), 'Mineurs', 'baby', 'b', h('span', null, h('span', { class: 'up' }, ds.length ? Math.round((100 * mineurs.length) / ds.length) + ' %' : '0 %'), ' des dossiers'), '#/portail/dossiers'),
      scard(petit(vuln.length), 'Situations de vulnérabilité', 'shield-alert', 'r', h('span', null, h('span', { class: 'down' }, ds.filter((d) => d.drapeaux && d.drapeaux.traite).length), ' traite présumée'), '#/portail/dossiers'),
      scard(petit(ceMois), 'Enrôlements du mois', 'user-plus', 'g', h('span', null, h('span', { class: evol >= 0 ? 'up' : 'down' }, (evol >= 0 ? '+' : '') + evol + ' %'), ' par rapport au mois précédent'), '#/portail/dossiers'),
      scard(retard.length, 'Délais de réception dépassés', 'timer', 'o', h('span', null, h('span', { class: 'down' }, mr.filter((r) => r.statut === 'Émis').length), ' référencements non reçus'), '#/portail/referencements')));

    P.parcours(c, ds);

    // Enrôlements par mois + vue d'ensemble
    const graphe = h('div'); let periode = 6;
    const paintGraphe = () => {
      graphe.innerHTML = '';
      const mois = Array.from({ length: periode }, (_, i) => new Date(now.getFullYear(), now.getMonth() - periode + 1 + i, 1));
      const cle = (d) => d.getFullYear() + '-' + d.getMonth();
      const parStruct = (st) => mois.map((m) => ds.filter((d) => d.structure === st && cle(new Date(d.created_at)) === cle(m)).length);
      const dgie = parStruct('DGIE'); const oim = parStruct('OIM');
      const autres = mois.map((m) => ds.filter((d) => !['DGIE', 'OIM'].includes(d.structure) && cle(new Date(d.created_at)) === cle(m)).length);
      const somme = (a) => a.reduce((x, y) => x + y, 0);
      graphe.append(h('div', { class: 'legend' },
        [['DGIE', '#FE7701', dgie], ['OIM', '#FFCFA6', oim], ['Autres', '#014A96', autres]].filter(([, , a], i) => i < 2 || somme(a)).map(([n, col, a]) => h('div', { class: 'lg-i' }, h('div', { class: 'lt' }, h('i', { style: { background: col } }), 'Enrôlés par ' + n), h('b', null, somme(a))))),
        Charts.barres({ etiquettes: mois.map((m) => m.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')), series: [{ nom: 'DGIE', couleur: '#FE7701', valeurs: dgie }, { nom: 'OIM', couleur: '#FFCFA6', valeurs: oim }, { nom: 'Autres', couleur: '#014A96', valeurs: autres }] }));
    };
    const periodes = h('div', { class: 'periods' }, [[3, '3M'], [6, '6M'], [12, '1A']].map(([n, l]) => h('button', { class: n === periode ? 'on' : '', onclick: (e) => { periode = n; e.target.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === e.target)); paintGraphe(); } }, l)));
    paintGraphe();
    const totRefs = mr.length || 1;
    /* Infobulle : répartition des référencements en pourcentage, valeur entre parenthèses */
    const tipRefs = (focus) => {
      const ligne = (lib, n, col, gras) => h('div', { class: 'tip-row' + (gras ? ' b' : '') }, h('i', { style: { background: col } }), h('span', null, lib), h('b', null, `${Math.round((100 * n) / totRefs)} % (${n})`));
      const st = (x) => mr.filter((r) => r.statut === x).length;
      return h('div', null, h('div', { class: 'tip-t' }, `Référencements : ${mr.length}`),
        ligne('Clôturés', clotures.length, '#3E922D', focus === 'Clôturés'),
        ligne('En cours', enCours.length + aTraiter.length, '#FE7701', focus === 'En cours'),
        h('div', { class: 'tip-sep' }),
        ['Émis', 'Reçu', 'Accepté', 'En cours de prise en charge', 'Refusé'].map((x) => ligne(x, st(x), x === 'Refusé' ? '#D92D20' : '#FFCFA6')));
    };
    const vue = P.carte('info', 'b', 'Vue d\'ensemble', null,
      h('div', { class: 'card-b' },
        h('div', { class: 'tiles' },
          h('div', { class: 'tile' }, h('span', { style: { color: 'var(--blue)' } }, icon('building-2')), h('div', { class: 'tl' }, 'Structures'), h('div', { class: 'tv' }, M.structures.length)),
          h('div', { class: 'tile' }, h('span', { style: { color: 'var(--orange-text)' } }, icon('users')), h('div', { class: 'tl' }, 'Agents'), h('div', { class: 'tv' }, new Set(ds.map((d) => d.agent)).size)),
          h('div', { class: 'tile' }, h('span', { style: { color: 'var(--green-text)' } }, icon('tablet')), h('div', { class: 'tl' }, 'Tablettes'), h('div', { class: 'tv' }, new Set(ds.map((d) => d.tablette).filter(Boolean)).size)))),
      h('div', { class: 'card-h', style: { borderTop: '1px solid var(--line)' } }, h('h3', { class: 'title' }, 'Référencements'), h('span', { class: 'datechip', style: { height: '30px' } }, icon('calendar'), '6 mois')),
      h('div', { class: 'card-b' }, h('div', { class: 'donut-wrap' },
        Charts.anneau({ parts: [{ v: clotures.length / totRefs, couleur: '#3E922D', info: () => tipRefs('Clôturés') }, { v: (enCours.length + aTraiter.length) / totRefs, couleur: '#FE7701', info: () => tipRefs('En cours') }] }),
        UI.infobulle(h('div', { class: 'donut-stat' }, h('b', null, clotures.length), h('span', { style: { color: 'var(--green-text)', fontWeight: 700 } }, 'Clôturés'), h('div', null, h('span', { class: 'badge solid ok' }, Math.round((100 * clotures.length) / totRefs) + ' %'))), () => tipRefs('Clôturés')),
        UI.infobulle(h('div', { class: 'donut-stat' }, h('b', null, enCours.length + aTraiter.length), h('span', { style: { color: 'var(--orange-text)', fontWeight: 700 } }, 'En cours'), h('div', null, h('span', { class: 'badge solid accent' }, Math.round((100 * (enCours.length + aTraiter.length)) / totRefs) + ' %'))), () => tipRefs('En cours')))));
    c.append(h('div', { class: 'grid g-2-1', style: { marginTop: '20px' } }, P.carte('chart-column', 'o', 'Enrôlements par mois', periodes, h('div', { class: 'card-b' }, graphe)), vue));

    // Trois listes
    const groupe = (f) => { const m = {}; ds.forEach((d) => { const k = f(d) || 'Non renseigné'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const pays = groupe((d) => d.resume.provenance).slice(0, 5);
    const liPays = pays.map(([n, k], i) => h('div', { class: 'li' }, h('span', { class: 'thumbx', style: { background: 'var(--bg)' } }, drapeau(n)), h('div', { class: 'grow' }, h('div', { class: 't1' }, n), h('div', { class: 't2' }, petit(k) + ' migrant(s) de retour')),
      h('span', { class: 'trend', style: { color: i < 2 ? 'var(--green-text)' : 'var(--muted)' } }, Math.round((100 * k) / Math.max(1, ds.length)) + ' %')));
    const recents = acces.slice().sort((a, b) => (b.d.synced_at || '').localeCompare(a.d.synced_at || '')).slice(0, 5);
    const liDos = recents.map(({ d }, i) => h('a', { class: 'li', href: '#/portail/dossier/' + d.id, style: { textDecoration: 'none', color: 'inherit' } }, h('span', { class: 'thumbx ticon ' + AV[i % AV.length], style: { fontSize: '14px' } }, UI.initials(nomVisible(p, d) || '? ?')),
      h('div', { class: 'grow' }, h('div', { class: 't1' }, nomVisible(p, d) || 'Identité restreinte'), h('div', { class: 't2' }, h('span', { style: { color: 'var(--orange-text)', fontWeight: 700 } }, d.identifiant))),
      h('div', { class: 'end' }, h('div', { class: 'muted' }, UI.fmtDate(d.synced_at)), d.drapeaux && d.drapeaux.mna ? h('span', { class: 'badge solid danger' }, 'MNA') : d.drapeaux && d.drapeaux.traite ? h('span', { class: 'badge solid warn' }, 'Traite') : d.drapeaux && d.drapeaux.mineur ? h('span', { class: 'badge solid violet' }, 'Mineur') : h('span', { class: 'badge solid ok' }, 'Adulte'))));
    const GRAV_S = { Critique: 'danger', 'Élevée': 'warn', 'Modérée': 'info' };
    const liAl = ma.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((a) => h('a', { class: 'li', href: '#/portail/dossier/' + a.dossier_id, style: { textDecoration: 'none', color: 'inherit' } },
      h('span', { class: 'thumbx ticon ' + (a.gravite === 'Critique' ? 'r' : a.gravite === 'Élevée' ? 'o' : 'b') }, icon('siren')),
      h('div', { class: 'grow' }, h('div', { class: 't1' }, a.titre), h('div', { class: 't2' }, a.identifiant + ' · ' + ((a.notifie || []).join(', ') || 'À désigner'))),
      h('div', { class: 'end' }, h('div', { class: 'muted' }, UI.ago(a.created_at)), h('span', { class: 'badge solid ' + (a.statut === 'Ouverte' ? GRAV_S[a.gravite] : 'ok') }, a.statut === 'Ouverte' ? a.gravite : 'Prise en charge'))));
    const vide = (t) => h('div', { class: 'empty' }, t);
    c.append(h('div', { class: 'grid g3', style: { marginTop: '20px' } },
      P.carte('globe', 'p', 'Pays de provenance', h('span', { class: 'datechip', style: { height: '30px' } }, icon('calendar'), '6 mois'), h('div', { class: 'card-b', style: { paddingTop: '6px', paddingBottom: '6px' } }, liPays.length ? liPays : vide('Aucune donnée'))),
      P.carte('folder-clock', 'o', 'Derniers dossiers', h('a', { class: 'link', href: '#/portail/dossiers' }, 'Voir tout'), h('div', { class: 'card-b', style: { paddingTop: '6px', paddingBottom: '6px' } }, liDos.length ? liDos : vide('Aucun dossier'))),
      P.carte('bell-ring', 'r', 'Alertes récentes', h('a', { class: 'link', href: '#/portail/alertes' }, 'Voir tout'), h('div', { class: 'card-b', style: { paddingTop: '6px', paddingBottom: '6px' } }, liAl.length ? liAl : vide('Aucune alerte')))));

    // Régions + référencements récents
    const regions = groupe((d) => d.resume.region_retour).slice(0, 8); const maxR = Math.max(1, ...regions.map((r) => r[1]));
    const tabRef = h('div'); let ong = 'recus';
    const paintRef = () => {
      tabRef.innerHTML = '';
      const rows = mr.filter((r) => ong === 'tous' || (ong === 'recus' ? r.destinataire === p.structure : r.emetteur === p.structure)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
      tabRef.append(rows.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Date', 'Dossier', 'Vers', 'Statut'].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((r, i) => h('tr', { class: 'click', onclick: () => App.go('#/portail/dossier/' + r.dossier_id) }, h('td', { class: 'small' }, UI.fmtDate(r.created_at)),
          h('td', null, h('div', { class: 'who' }, avatar(Domaine.droits(p, 'II').includes('L') ? r.beneficiaire : r.destinataire, i), h('div', null, h('div', { style: { fontWeight: 700 } }, Domaine.droits(p, 'II').includes('L') ? r.beneficiaire : 'Identité restreinte'), h('span', { class: 'idlink tiny' }, r.identifiant)))),
          h('td', null, r.emetteur + ' → ' + r.destinataire), h('td', null, h('span', { class: 'badge solid ' + REF_BADGE[r.statut] }, r.statut))))))) : h('div', { class: 'empty' }, 'Aucun référencement.'));
    };
    const tabs = h('div', { class: 'tabs', style: { margin: 0, padding: '0 20px' } }, (p.role === 'admin' ? [['tous', 'Tous']] : [['recus', 'Reçus'], ['emis', 'Émis']]).map(([k, l]) => h('button', { class: k === ong ? 'on' : '', onclick: (e) => { ong = k; e.target.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === e.target)); paintRef(); } }, l)));
    if (p.role === 'admin') ong = 'tous';
    paintRef();
    c.append(h('div', { class: 'grid g-2-1', style: { marginTop: '20px' } },
      P.carte('send', 'v', 'Référencements récents', h('a', { class: 'link', href: '#/portail/referencements' }, 'Voir tout'), tabs, tabRef),
      P.carte('map-pin', 'g', 'Régions de retour', null, h('div', { class: 'card-b' }, h('div', { class: 'bars green' }, regions.map(([k, n]) => h('div', { class: 'bar', style: { gridTemplateColumns: '130px 1fr 36px' } }, h('span', null, k), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: (100 * n) / maxR + '%' } })), h('b', null, petit(n)))))))));
  };


  /* ---------- Analyse des parcours migratoires : indicateurs clés, carte réelle des routes, trajet par personne ---------- */
  P.analyse = function (ds) {
    const nomPays = (c) => (REF.pays.find((x) => x.c === c) || { n: c }).n;
    const routes = {}; const passages = {}; const segs = {}; const villes = {};
    const avecIt = ds.filter((d) => d.itineraire && (d.itineraire.pays || []).length);
    for (const d of avecIt) {
      const it = d.itineraire; const et = Form.etapes(it);
      const seq = ['CI', ...it.pays.map((x) => x.c)].filter((c, i, a) => i === 0 || c !== a[i - 1]);
      const cle = seq.join('>'); routes[cle] = routes[cle] || { seq, dossiers: [] }; routes[cle].dossiers.push(d);
      new Set(seq).forEach((c) => { passages[c] = (passages[c] || 0) + 1; });
      et.forEach((e) => { const k = e.code + ':' + e.n; villes[k] = villes[k] || { n: e.n, ll: e.ll, c: e.code, pays: e.pays, nb: 0 }; villes[k].nb++; });
      for (let i = 0; i < et.length - 1; i++) { const k = et[i].code + ':' + et[i].n + '>' + et[i + 1].code + ':' + et[i + 1].n; if (et[i].n === et[i + 1].n) continue; segs[k] = segs[k] || { a: et[i], b: et[i + 1], n: 0 }; segs[k].n++; }
    }
    const classees = Object.values(routes).sort((a, b) => b.dossiers.length - a.dossiers.length);
    /* Trajet type d'une route : la suite de villes la plus fréquente parmi ses dossiers */
    classees.forEach((r) => { const m = {}; r.dossiers.forEach((d) => { const et = Form.etapes(d.itineraire); const k = et.map((e) => e.n).join('>'); m[k] = m[k] || { et, n: 0 }; m[k].n++; }); r.etapes = Object.values(m).sort((a, b) => b.n - a.n)[0].et; });
    const transit = Object.entries(passages).filter(([c]) => c !== 'CI').map(([c, n]) => ({ c, n, nom: nomPays(c), etape: classees.filter((r) => r.seq.indexOf(c) > 0 && r.seq.indexOf(c) < r.seq.length - 1).reduce((a, r) => a + r.dossiers.length, 0) })).sort((a, b) => b.n - a.n);
    return { routes: classees, transit, avecIt, passages, segments: Object.values(segs), villes: Object.values(villes).sort((a, b) => b.nb - a.nb) };
  };
  const enXOF = (m) => { if (!m || !m.montant) return null; const t = { XOF: 1, EUR: 655.957, USD: 600, MAD: 60, TND: 195, DZD: 4.5, LYD: 125, GBP: 770 }[m.devise]; return t ? +m.montant * t : null; };
  const fcfa = (v) => (v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M FCFA' : Math.round(v).toLocaleString('fr-FR') + ' FCFA');
  const moyenne = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const pct = (n, t) => (t ? Math.round((100 * n) / t) + ' %' : '—');
  const distance = (a, b) => { const R = 6371, r = Math.PI / 180; const x = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const kmEtapes = (e) => e.reduce((s2, x, i) => (i ? s2 + distance(e[i - 1].ll, x.ll) : 0), 0);
  const kmDossier = (d) => kmEtapes(Form.etapes(d.itineraire || {}));
  const moisAbsence = (r) => { if (!r['PAR-001'] || !r['IDT-019']) return null; const a = new Date(r['PAR-001'] + '-01'), b = new Date(r['IDT-019']); return (b - a) / (30.44 * 86400000); };
  const drapeauCode = (c) => (REF.pays.find((x) => x.c === c) || {}).f || '';

  /* Étapes numérotées, ville par ville, regroupées par pays */
  P.etapesListe = (et) => h('div', { class: 'route-steps' }, et.map((e, i) => h('div', { class: 'rs' }, h('span', { class: 'n' }, i + 1), h('span', { class: 'flag' }, drapeauCode(e.code)),
    h('div', null, h('b', null, e.n), h('div', { class: 'tiny muted' }, e.pays + (i === 0 ? ' · départ' : i === et.length - 1 ? ' · dernière étape avant le retour' : ''))))));

  P.parcours = function (c, ds) {
    const p = App.profil;
    if (!Domaine.droits(p, 'VIII').includes('L')) {
      c.append(h('div', { class: 'card', style: { marginTop: '20px' } }, h('div', { class: 'locked' }, icon('lock'), 'La carte des routes migratoires et les indicateurs de parcours reposent sur la section VIII (parcours migratoire), non accessible à votre structure.')));
      return;
    }
    const A = P.analyse(ds);
    if (!A.routes.length) return;
    const tot = A.avecIt.length;

    // 1. Indicateurs clés du parcours migratoire (avant la carte)
    const r = A.avecIt.map((d) => d.reponses); const n = r.length; const tous = ds.map((d) => d.reponses);
    const ages = ds.map((d) => d.resume.age).filter((x) => x !== null && x !== undefined && x !== '');
    const couts = r.map((x) => enXOF(x['PAR-011'])).filter((x) => x !== null);
    const abs = r.map(moisAbsence).filter((x) => x !== null);
    const motifs = {}; tous.forEach((x) => (x['PAR-006'] || []).forEach((m) => { motifs[m] = (motifs[m] || 0) + 1; }));
    const motif = Object.entries(motifs).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
    const etape = A.transit.filter((x) => x.etape).sort((a, b) => b.etape - a.etape)[0];
    const tile = (ic, t, v, l, d) => h('div', { class: 'card itile' }, h('span', { class: 'ticon lg ' + t }, icon(ic)), h('div', null, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l), h('div', { class: 'd' }, d)));
    c.append(h('div', { class: 'page-head', style: { margin: '28px 0 14px' } }, h('div', null, h('h2', { style: { margin: 0 } }, 'Indicateurs clés du parcours migratoire'), h('p', { class: 'sub' }, `Calculés sur ${ds.length} dossiers accessibles, dont ${n} avec un itinéraire renseigné.`))),
      h('div', { class: 'grid g4' },
        tile('hourglass', 'o', abs.length ? Math.round(moyenne(abs)) + ' mois' : '—', 'Durée moyenne d\'absence', 'Du départ de Côte d\'Ivoire au retour'),
        tile('wallet', 'b', couts.length ? fcfa(moyenne(couts)) : '—', 'Coût moyen du voyage', 'Montants convertis en francs CFA'),
        tile('route', 'g', Math.round(moyenne(A.avecIt.map(kmDossier)) || 0).toLocaleString('fr-FR') + ' km', 'Distance moyenne parcourue', 'Selon les villes déclarées'),
        tile('user-x', 'r', pct(r.filter((x) => x['PAR-024'] === 'Oui').length, n), 'Recours à un passeur', 'Indicateur de trafic illicite'),
        tile('hand-coins', 'v', pct(tous.filter((x) => x['PAR-013'] === 'Oui').length, tous.length), 'Migrants endettés', 'Dette contractée pour le voyage'),
        tile('id-card', 'p', pct(tous.filter((x) => x['VUL-010'] === 'Oui').length, tous.length), 'Documents confisqués', 'À l\'arrivée, pendant le séjour ou au retour'),
        tile('plane-landing', 't', pct(tous.filter((x) => x['IDT-016'] === 'Retour volontaire assisté').length, tous.length), 'Retours volontaires assistés', pct(tous.filter((x) => x['IDT-016'] === 'Retour forcé').length, tous.length) + ' de retours forcés'),
        tile('users', 'o', pct(tous.filter((x) => x['IDT-005'] === 'Femme').length, tous.length) + ' de femmes', 'Profil des migrants', ages.length ? 'Âge moyen : ' + Math.round(moyenne(ages)) + ' ans' : ''),
        tile('target', 'b', motif[0], 'Premier motif de départ', pct(motif[1], tous.length) + ' des migrants'),
        tile('map-pin', 'g', etape ? etape.nom : '—', 'Principal pays de transit', etape ? etape.etape + ' migrant(s) y sont passés en transit' : ''),
        tile('flag', 'r', (REF.pays.find((x) => x.c === A.routes[0].seq.slice(-1)[0]) || {}).n || '—', 'Premier pays de provenance', 'Fin de la route la plus fréquentée'),
        tile('shield-alert', 'v', pct(ds.filter((d) => d.drapeaux && d.drapeaux.traite).length, ds.length), 'Traite des personnes présumée', pct(ds.filter((d) => d.drapeaux && d.drapeaux.mna).length, ds.length) + ' de mineurs non accompagnés')));

    // 2. Carte réelle des routes, sélection d'une route ou du trajet d'une personne
    let choix = 0; let cadrage = 'routes'; let personne = null;
    const mapEl = h('div', { class: 'map-real' }); const detail = h('div'); const titreDetail = h('span'); const badgeDetail = h('span');
    const nomDe = (d) => nomVisible(p, d) || 'Identité restreinte';
    const paint = () => {
      detail.innerHTML = ''; detail.classList.remove('fondu'); void detail.offsetWidth; detail.classList.add('fondu');
      if (personne) {
        const d = personne; const et = Form.etapes(d.itineraire); const rr = d.reponses; const cout = enXOF(rr['PAR-011']); const ab = moisAbsence(rr);
        titreDetail.textContent = 'Trajet de ' + nomDe(d); badgeDetail.className = 'badge solid info'; badgeDetail.textContent = d.identifiant;
        Carte.routes(mapEl, { A, etapes: et, cadrage: cadrage === 'afrique' ? 'afrique' : 'trajet' });
        detail.append(P.etapesListe(et), h('div', { class: 'mini-kpis' },
          h('div', null, h('b', null, Math.round(kmEtapes(et)).toLocaleString('fr-FR') + ' km'), h('span', null, 'distance parcourue')),
          h('div', null, h('b', null, ab !== null ? Math.round(ab) + ' mois' : '—'), h('span', null, 'durée d\'absence')),
          h('div', null, h('b', null, cout !== null ? fcfa(cout) : '—'), h('span', null, 'coût déclaré du voyage')),
          h('div', null, h('b', null, rr['PAR-024'] || '—'), h('span', null, 'recours à un passeur'))),
          h('div', { style: { marginTop: '12px' } }, h('a', { class: 'btn sm', href: '#/portail/dossier/' + d.id }, icon('folder-open'), 'Ouvrir le dossier')));
      } else {
        const R = A.routes[choix]; const dr = R.dossiers; const rr = dr.map((d) => d.reponses);
        const cts = rr.map((x) => enXOF(x['PAR-011'])).filter((x) => x !== null); const ab = rr.map(moisAbsence).filter((x) => x !== null);
        titreDetail.textContent = choix === 0 ? 'Route la plus fréquentée' : 'Route n° ' + (choix + 1); badgeDetail.className = 'badge solid accent'; badgeDetail.textContent = dr.length + ' migrants';
        Carte.routes(mapEl, { A, etapes: R.etapes, cadrage });
        detail.append(P.etapesListe(R.etapes), h('div', { class: 'mini-kpis' },
          h('div', null, h('b', null, dr.length), h('span', null, 'migrant(s), soit ' + pct(dr.length, tot) + ' des parcours')),
          h('div', null, h('b', null, Math.round(moyenne(dr.map(kmDossier)) || 0).toLocaleString('fr-FR') + ' km'), h('span', null, 'distance moyenne parcourue')),
          h('div', null, h('b', null, ab.length ? Math.round(moyenne(ab)) + ' mois' : '—'), h('span', null, 'durée moyenne d\'absence')),
          h('div', null, h('b', null, cts.length ? fcfa(moyenne(cts)) : '—'), h('span', null, 'coût moyen du voyage')),
          h('div', null, h('b', null, pct(rr.filter((x) => x['PAR-024'] === 'Oui').length, rr.length)), h('span', null, 'ont eu recours à un passeur')),
          h('div', null, h('b', null, pct(rr.filter((x) => ['Oui', 'Suspectée'].includes(x['VUL-025'])).length, rr.length)), h('span', null, 'victimes présumées de traite'))));
      }
      tabs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', !personne && i === choix));
      UI.refreshIcons();
    };
    const tabs = h('div', { class: 'route-tabs' }, A.routes.slice(0, 4).map((x, i) => h('button', { onclick: () => { choix = i; personne = null; dd.set(''); paint(); } }, 'Route ' + (i + 1) + ' · ' + x.dossiers.length)));
    const dd = UI.dropdown({ items: [{ value: '', label: 'Toutes les routes' }].concat(A.avecIt.map((d) => ({ value: d.id, label: nomDe(d), right: d.identifiant, keywords: d.identifiant + ' ' + (d.resume.provenance || '') }))),
      value: '', placeholder: 'Trajet d\'un migrant…', searchPlaceholder: 'Nom ou identifiant…', onChange: (v) => { personne = A.avecIt.find((d) => d.id === v) || null; paint(); } });
    const maxT = Math.max(1, ...A.transit.map((x) => x.n));
    const maxV = Math.max(1, ...A.villes.map((x) => x.nb));
    c.append(h('div', { class: 'map-row', style: { marginTop: '20px' } },
      h('div', { class: 'card p0 map-card' },
        h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon o' }, icon('map')), 'Routes migratoires vers et depuis l\'Afrique'),
          h('div', { class: 'periods' }, [['routes', 'Zoom sur les routes'], ['afrique', 'Afrique entière']].map(([k, l]) => h('button', { class: k === cadrage ? 'on' : '', onclick: (e) => { cadrage = k; e.target.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === e.target)); paint(); } }, l)))),
        h('div', { class: 'card-b map-body' },
          h('div', { class: 'row between', style: { marginBottom: '12px' } }, tabs, h('div', { style: { width: '280px', maxWidth: '100%' } }, dd.el)),
          mapEl,
          h('div', { class: 'map-legend' }, h('span', null, h('i', { style: { background: '#FE7701' } }), 'Route ou trajet sélectionné'), h('span', null, h('i', { style: { background: '#014A96', opacity: 0.5 } }), 'Flux ville à ville (épaisseur = nombre de migrants)'),
            h('span', null, h('i', { class: 'sq', style: { background: '#4EA738', opacity: 0.5 } }), 'Pays traversés (intensité)'), h('span', null, h('i', { class: 'sq', style: { background: '#FE7701', opacity: 0.4 } }), 'Côte d\'Ivoire')))),
      h('div', { class: 'map-side' },
        h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon b' }, icon('route')), titreDetail), badgeDetail), h('div', { class: 'card-b' }, detail)),
        P.carte('waypoints', 'g', 'Principaux pays traversés', null, h('div', { class: 'card-b' },
          h('div', { class: 'bars green' }, A.transit.slice(0, 6).map((x) => h('div', { class: 'bar', style: { gridTemplateColumns: '130px 1fr 36px' } }, h('span', null, drapeauCode(x.c), ' ', x.nom), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: (100 * x.n) / maxT + '%' } })), h('b', null, x.n)))),
          h('div', { class: 'sub-head', style: { marginTop: '18px' } }, 'Villes de passage les plus citées'),
          h('div', { class: 'bars' }, A.villes.filter((v) => v.c !== 'CI').slice(0, 5).map((v) => h('div', { class: 'bar', style: { gridTemplateColumns: '130px 1fr 36px' } }, h('span', null, drapeauCode(v.c), ' ', v.n), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: (100 * v.nb) / maxV + '%' } })), h('b', null, v.nb)))))))));
    setTimeout(paint, 0);
  };

  /* ---------- Migrants enregistrés : liste complète des enregistrements terminés ---------- */
  P.migrants = function (c, { acces, arrivees }) {
    const ARR = Object.fromEntries((arrivees || []).map((a) => [a.id, a]));
    const p = App.profil; const lireII = Domaine.droits(p, 'II').includes('L'); const lireVIII = Domaine.droits(p, 'VIII').includes('L');
    const tous = acces.map((x) => x.d).filter((d) => d.statut === 'Synchronisé');
    const f = { q: App.recherche || '', sexe: '', cat: '', prov: '', region: '', struct: '', arr: '' };
    let tri = { k: 'enrol', sens: -1 }; let page = 1; const parPage = 15;
    const val = {
      nom: (d) => (lireII ? `${d.resume.nom} ${d.resume.prenoms}` : ''), sexe: (d) => d.resume.sexe || '', age: (d) => (d.resume.age === null || d.resume.age === undefined ? -1 : +d.resume.age),
      prov: (d) => d.resume.provenance || '', retour: (d) => d.reponses['IDT-019'] || '', region: (d) => d.resume.region_retour || '', enrol: (d) => d.synced_at || d.created_at || '', comp: (d) => Agent.progression(d),
    };
    const uniques = (fn) => [...new Set(tous.map(fn).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    const filtre = (cle, lib, items) => h('div', { style: { width: '190px' } }, UI.dropdown({ items: [{ value: '', label: lib + ' : tous' }].concat(items.map((x) => ({ value: x, label: x, flag: cle === 'prov' ? ((REF.pays.find((y) => y.n === x) || {}).f || '') : '' }))), value: '', placeholder: lib, onChange: (v) => { f[cle] = v; page = 1; paint(); } }).el);
    const resultats = () => tous.filter((d) => {
      const t = UI.norm([d.identifiant, val.nom(d), d.resume.localite_retour, d.resume.provenance, d.structure, d.resume.region_retour, (ARR[d.arrivee_id] || {}).code].join(' '));
      return (!f.q || t.includes(UI.norm(f.q))) && (!f.sexe || d.resume.sexe === f.sexe) && (!f.cat || d.resume.categorie === f.cat) && (!f.prov || d.resume.provenance === f.prov) && (!f.region || d.resume.region_retour === f.region) && (!f.struct || d.structure === f.struct) && (!f.arr || (ARR[d.arrivee_id] || {}).code === f.arr);
    }).sort((a, b) => { const x = val[tri.k](a), y = val[tri.k](b); return (x < y ? -1 : x > y ? 1 : 0) * tri.sens; });
    const corps = h('div'); const compteur = h('span', { class: 'badge accent' }); const resume = h('div', { class: 'grid g4', style: { marginBottom: '20px' } });
    const COLS = [['', null], ['Identifiant', null], ['Migrant', 'nom'], ['Âge', 'age'], ['Provenance', 'prov'], ['Retour', 'retour'], ['Région de retour', 'region'], ['Enrôlement', 'enrol'], ['Complétude', 'comp'], ['', null]];
    const paint = () => {
      const rows = resultats(); const nbPages = Math.max(1, Math.ceil(rows.length / parPage)); page = Math.min(page, nbPages);
      compteur.textContent = rows.length + ' migrant(s)';
      resume.innerHTML = '';
      const k = (t, ic, l, v) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, l), h('div', { class: 'kv' }, v)));
      resume.append(k('o', 'users', 'Migrants enregistrés', rows.length), k('d', 'venus-and-mars', 'Hommes / femmes', rows.filter((d) => d.resume.sexe === 'Homme').length + ' / ' + rows.filter((d) => d.resume.sexe === 'Femme').length),
        k('g', 'baby', 'Mineurs', rows.filter((d) => d.drapeaux && d.drapeaux.mineur).length), k('b', 'route', 'Avec itinéraire', rows.filter((d) => d.itineraire && (d.itineraire.pays || []).length).length));
      const vue = rows.slice((page - 1) * parPage, page * parPage);
      corps.innerHTML = '';
      if (!rows.length) { corps.append(h('div', { class: 'empty' }, icon('users'), h('div', null, 'Aucun migrant ne correspond aux filtres.'))); UI.refreshIcons(); return; }
      corps.append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, COLS.map(([l, cle]) => h('th', { style: cle ? { cursor: 'pointer' } : null, onclick: cle ? () => { tri = { k: cle, sens: tri.k === cle ? -tri.sens : 1 }; paint(); } : null }, l, cle && tri.k === cle ? h('span', { style: { color: 'var(--orange-text)' } }, tri.sens > 0 ? ' ▲' : ' ▼') : null)))),
        h('tbody', null, vue.map((d, i) => {
          const nom = val.nom(d); const comp = val.comp(d); const et = d.itineraire ? Form.etapes(d.itineraire) : [];
          return h('tr', null,
            h('td', { class: 'muted small' }, (page - 1) * parPage + i + 1),
            h('td', { style: { whiteSpace: 'nowrap' } }, h('a', { class: 'idlink', href: '#/portail/dossier/' + d.id }, d.identifiant), d.cas ? h('div', { class: 'tiny muted' }, 'Cas type ' + d.cas) : null),
            h('td', { style: { whiteSpace: 'nowrap' } }, h('div', { class: 'who' }, h('span', { class: 'av ticon ' + ['b', 'o', 'g', 'v', 'p', 't'][i % 6] }, nom ? UI.initials(nom) : icon('user-round')),
              h('div', null, nom ? h('b', null, nom) : h('span', { class: 'masked' }, '••••••'), h('div', { class: 'tiny muted' }, [d.resume.sexe, (d.resume.categorie || '').split(' (')[0]].filter(Boolean).join(' · '))))),
            h('td', { style: { whiteSpace: 'nowrap' } }, val.age(d) >= 0 ? val.age(d) + ' ans' : '—'),
            h('td', { style: { whiteSpace: 'nowrap' } }, ((REF.pays.find((y) => y.n === d.resume.provenance) || {}).f || '') + ' ', d.resume.provenance || '—'),
            h('td', { style: { whiteSpace: 'nowrap' } }, d.reponses['IDT-019'] ? UI.fmtDate(d.reponses['IDT-019']) : '—', ARR[d.arrivee_id] ? h('div', null, h('a', { class: 'tiny', href: '#/portail/arrivee/' + d.arrivee_id }, ARR[d.arrivee_id].code)) : h('div', { class: 'tiny muted' }, d.reponses['IDT-017'] || '')),
            h('td', null, d.resume.localite_retour || '—', h('div', { class: 'tiny muted' }, d.resume.region_retour || '')),
            h('td', null, h('div', { class: 'who' }, Admin.logo(d.structure, 28), h('div', null, h('b', null, d.structure), h('div', { class: 'tiny muted' }, UI.fmtDate(val.enrol(d)))))),
            h('td', null, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, h('div', { class: 'progress', style: { width: '70px' } }, h('div', { style: { width: comp + '%', background: comp >= 90 ? 'var(--green)' : 'var(--orange)' } })), h('span', { class: 'tiny muted', style: { whiteSpace: 'nowrap' } }, comp + ' %'))),
            h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } },
              lireVIII && et.length ? h('button', { class: 'btn sm', title: 'Voir le trajet', onclick: () => P.voirTrajet(d, nom) }, icon('route'), 'Trajet') : null,
              lireII ? h('button', { class: 'btn sm', title: 'Imprimer la fiche migrant', onclick: () => Documents.ficheMigrant(d) }, icon('printer')) : null,
              h('a', { class: 'btn sm', href: '#/portail/dossier/' + d.id, title: 'Ouvrir le dossier' }, icon('folder-open')))));
        })))),
        h('div', { class: 'row between', style: { padding: '14px 20px', borderTop: '1px solid var(--line)' } },
          h('span', { class: 'small muted' }, `Affichage de ${(page - 1) * parPage + 1} à ${Math.min(page * parPage, rows.length)} sur ${rows.length}`),
          h('div', { class: 'periods' }, h('button', { disabled: page === 1 || null, onclick: () => { page--; paint(); } }, '‹'),
            Array.from({ length: nbPages }, (_, i) => h('button', { class: i + 1 === page ? 'on' : '', onclick: () => { page = i + 1; paint(); } }, i + 1)),
            h('button', { disabled: page === nbPages || null, onclick: () => { page++; paint(); } }, '›'))));
      UI.refreshIcons();
    };
    const lignesExport = () => [['Identifiant', 'Nom et prénoms', 'Sexe', 'Âge', 'Catégorie', 'Pays de provenance', 'Date de retour', 'Localité de retour', 'Région de retour', 'Structure d\'enrôlement', 'Date d\'enrôlement', 'Arrivée', 'Complétude (%)'],
      ...resultats().map((d) => [d.identifiant, val.nom(d) || 'Accès restreint', d.resume.sexe, val.age(d) >= 0 ? val.age(d) : '', d.resume.categorie, d.resume.provenance, d.reponses['IDT-019'] ? UI.fmtDate(d.reponses['IDT-019']) : '', d.resume.localite_retour, d.resume.region_retour, d.structure, UI.fmtDate(val.enrol(d)), (ARR[d.arrivee_id] || {}).code || '', val.comp(d)])];
    const critèresTexte = () => [f.q ? 'recherche : ' + f.q : null, f.sexe && 'sexe : ' + f.sexe, f.cat && 'catégorie : ' + f.cat, f.prov && 'provenance : ' + f.prov, f.region && 'région : ' + f.region, f.struct && 'structure : ' + f.struct].filter(Boolean).join(' | ') || 'Tous les migrants enregistrés accessibles';
    const carteListe = h('div', { class: 'card p0' });
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Migrants enregistrés'), h('p', { class: 'sub' }, 'Liste complète des migrants dont l\'enregistrement est terminé : entretien clôturé, synchronisé et doté d\'un identifiant national.')),
      Export.menu({ titre: 'Migrants enregistrés', sousTitre: critèresTexte, lignes: lignesExport, noeud: () => carteListe, pdfImage: false, fichier: 'migrants_enregistres' })),
      resume,
      carteListe);
    carteListe.append(
        h('div', { class: 'toolbar' }, h('div', { class: 'row' }, h('label', { class: 'search' }, icon('search'), h('input', { placeholder: 'Identifiant, nom, localité…', value: f.q, oninput: (e) => { f.q = e.target.value; page = 1; paint(); } })), compteur),
          h('div', { class: 'row' }, filtre('sexe', 'Sexe', uniques((d) => d.resume.sexe)), filtre('cat', 'Catégorie', uniques((d) => d.resume.categorie)), filtre('prov', 'Provenance', uniques((d) => d.resume.provenance)),
            filtre('region', 'Région', uniques((d) => d.resume.region_retour)), filtre('struct', 'Structure', uniques((d) => d.structure)), filtre('arr', 'Arrivée', uniques((d) => (ARR[d.arrivee_id] || {}).code)))),
        corps);
    paint();
  };
  P.voirTrajet = function (d, nom) {
    const et = Form.etapes(d.itineraire); const carte = h('div', { class: 'map-fiche' });
    const m = UI.modal({ title: 'Trajet de ' + (nom || d.identifiant), icon: 'route', body: h('div', { class: 'map-split' }, carte, P.etapesListe(et)),
      actions: [{ label: 'Ouvrir le dossier', onclick: () => App.go('#/portail/dossier/' + d.id) }, { label: 'Fermer' }] });
    m.el.style.maxWidth = '980px';
    setTimeout(() => Carte.trajet(carte, et), 30);
  };

  P.tableDossiers = function (rows) {
    const p = App.profil;
    if (!rows.length) return h('div', { class: 'empty' }, icon('folder-x'), h('div', null, 'Aucun dossier ne correspond.'));
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Identifiant', 'Migrant', 'Catégorie', 'Retour', 'Enrôlement', 'Accès', ''].map((x) => h('th', null, x)))),
      h('tbody', null, rows.map(({ d, motif }, i) => {
        const nom = nomVisible(p, d); const f = d.drapeaux || {};
        return h('tr', { class: 'click', onclick: () => App.go('#/portail/dossier/' + d.id) },
          h('td', null, h('span', { class: 'idlink' }, d.identifiant), d.cas ? h('div', { class: 'tiny muted' }, 'Cas type ' + d.cas) : null),
          h('td', null, h('div', { class: 'who' }, avatar(nom || '? ?', i), nom ? h('b', null, nom) : h('span', { class: 'masked' }, '••••••'))),
          h('td', null, h('div', { class: 'row', style: { gap: '4px' } }, h('span', { class: 'badge solid ' + (f.mineur ? 'violet' : 'ok') }, f.mineur ? 'Mineur' : 'Adulte'), f.mna ? h('span', { class: 'badge solid danger' }, 'MNA') : null, f.traite ? h('span', { class: 'badge solid warn' }, 'Traite') : null)),
          h('td', null, drapeau(d.resume.provenance) + ' ', d.resume.localite_retour || '—', h('div', { class: 'tiny muted' }, d.resume.region_retour || '')),
          h('td', null, h('div', { class: 'who' }, Admin.logo(d.structure, 28), h('div', null, h('b', null, d.structure), h('div', { class: 'tiny muted' }, UI.fmtDate(d.synced_at))))),
          h('td', null, h('span', { class: 'badge grey' }, motif)), h('td', null, icon('chevron-right')));
      }))));
  };

  /* ---------- Liste des dossiers, avec la carte du trajet du migrant sélectionné ---------- */
  P.dossiers = function (c, { acces }) {
    const p = App.profil; const lireVIII = Domaine.droits(p, 'VIII').includes('L');
    const list = h('div'); let q = App.recherche || ''; let f = 'tous'; let sel = null;
    const compteur = h('span', { class: 'badge accent' });
    const carteEl = h('div', { class: 'map-real', style: { minHeight: '460px' } }); const detail = h('div', { class: 'card-b', style: { paddingTop: '6px' } }); const titreCarte = h('span');
    const A = lireVIII ? P.analyse(acces.map((x) => x.d)) : null;
    const filtrer = () => acces.filter(({ d }) => {
      const t = UI.norm([d.identifiant, nomVisible(p, d), d.resume.localite_retour, d.resume.provenance, d.structure].join(' '));
      if (q && !t.includes(UI.norm(q))) return false;
      if (f === 'mineurs') return d.drapeaux && d.drapeaux.mineur; if (f === 'vulnerables') return d.drapeaux && (d.drapeaux.traite || d.drapeaux.mna || d.drapeaux.sante_mentale);
      return true;
    }).sort((a, b) => (b.d.synced_at || '').localeCompare(a.d.synced_at || ''));
    function montrer(d) {
      sel = d; list.querySelectorAll('tr[data-id]').forEach((tr) => tr.classList.toggle('sel', tr.dataset.id === d.id));
      const et = d.itineraire ? Form.etapes(d.itineraire) : []; const nom = nomVisible(p, d);
      titreCarte.textContent = 'Trajet de ' + (nom || d.identifiant);
      detail.innerHTML = ''; detail.classList.remove('fondu'); void detail.offsetWidth; detail.classList.add('fondu');
      if (!lireVIII) { detail.append(h('div', { class: 'locked' }, icon('lock'), 'Itinéraire (section VIII) non accessible à votre structure.')); UI.refreshIcons(); return; }
      if (et.length < 2) { detail.append(h('div', { class: 'notice' }, icon('info'), 'Itinéraire non renseigné pour ce dossier.')); Carte.routes(carteEl, { A, etapes: null, cadrage: 'afrique' }); UI.refreshIcons(); return; }
      detail.append(h('div', { class: 'row between', style: { marginBottom: '8px' } }, h('div', null, h('b', null, nom || d.identifiant), h('div', { class: 'tiny muted' }, Math.round(kmEtapes(et)).toLocaleString('fr-FR') + ' km · ' + et.length + ' étapes · ' + (d.resume.provenance || ''))),
        h('a', { class: 'btn sm', href: '#/portail/dossier/' + d.id }, icon('folder-open'), 'Ouvrir le dossier')), P.etapesListe(et));
      Carte.routes(carteEl, { A, etapes: et, cadrage: 'trajet' });
      UI.refreshIcons();
    }
    const paint = () => {
      const rows = filtrer();
      compteur.textContent = rows.length + ' dossier(s)';
      list.innerHTML = '';
      if (!rows.length) { list.append(h('div', { class: 'empty' }, icon('folder-x'), h('div', null, 'Aucun dossier ne correspond.'))); UI.refreshIcons(); return; }
      list.append(h('div', { class: 'tbl-wrap', style: { maxHeight: '760px', overflow: 'auto' } }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Identifiant', 'Migrant', 'Provenance', 'Enrôlement', 'Accès', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map(({ d, motif }, i) => {
          const nom = nomVisible(p, d); const fl = d.drapeaux || {}; const et = d.itineraire ? Form.etapes(d.itineraire) : [];
          return h('tr', { class: 'click', 'data-id': d.id, title: 'Afficher le trajet sur la carte', onclick: () => montrer(d) },
            h('td', null, h('a', { class: 'idlink', href: '#/portail/dossier/' + d.id, onclick: (e) => e.stopPropagation() }, d.identifiant), d.cas ? h('div', { class: 'tiny muted' }, 'Cas type ' + d.cas) : null, h('div', { class: 'row', style: { gap: '4px', marginTop: '3px' } }, h('span', { class: 'badge solid ' + (fl.mineur ? 'violet' : 'ok') }, fl.mineur ? 'Mineur' : 'Adulte'), fl.mna ? h('span', { class: 'badge solid danger' }, 'MNA') : null, fl.traite ? h('span', { class: 'badge solid warn' }, 'Traite') : null)),
            h('td', null, h('div', { class: 'who' }, avatar(nom || '? ?', i), nom ? h('b', null, nom) : h('span', { class: 'masked' }, '••••••'))),
            h('td', null, drapeau(d.resume.provenance) + ' ', d.resume.provenance || '—', lireVIII && et.length > 1 ? h('div', { class: 'tiny muted' }, et.length + ' étapes') : null),
            h('td', null, h('div', { class: 'who' }, Admin.logo(d.structure, 26), h('div', null, h('b', null, d.structure), h('div', { class: 'tiny muted' }, UI.fmtDate(d.synced_at))))),
            h('td', null, h('span', { class: 'badge grey' }, motif)), h('td', null, lireVIII && et.length > 1 ? icon('route') : null));
        })))));
      UI.refreshIcons();
      const garde = sel && rows.find((x) => x.d.id === sel.id);
      montrer(garde ? sel : (rows.find((x) => x.d.itineraire && Form.etapes(x.d.itineraire).length > 1) || rows[0]).d);
    };
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Dossiers'), h('p', { class: 'sub' }, 'Dossiers enrôlés par votre structure, qui vous ont été référencés ou qui relèvent de votre mission. Cliquez sur une ligne pour voir le trajet du migrant sur la carte.'))),
      h('div', { class: 'map-row dossiers-map' },
        h('div', { class: 'card p0', style: { minWidth: 0 } }, h('div', { class: 'toolbar' },
          h('div', { class: 'row' }, h('label', { class: 'search' }, icon('search'), h('input', { placeholder: 'Identifiant, nom, localité…', value: q, oninput: (e) => { q = e.target.value; paint(); } })), compteur),
          h('div', { class: 'periods' }, [['tous', 'Tous'], ['mineurs', 'Mineurs'], ['vulnerables', 'Vulnérables']].map(([k, l]) => h('button', { class: k === f ? 'on' : '', onclick: (e) => { f = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); paint(); } }, l)))), list),
        h('div', { class: 'map-side sticky-map' }, h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon o' }, icon('route')), titreCarte)),
          h('div', { class: 'card-b', style: { paddingBottom: '8px' } }, lireVIII ? carteEl : h('div', { class: 'locked' }, icon('lock'), 'Carte des trajets non accessible (section VIII).')), detail))));
    paint();
  };

  /* ---------- Fiche dossier ---------- */
  P.fiche = async function (c, data, id) {
    const p = App.profil;
    const x = data.acces.find((y) => y.d.id === id);
    if (!x) { c.append(h('div', { class: 'notice danger' }, icon('lock'), 'Ce dossier n\'est pas accessible à votre structure.')); await Store.audit('Accès refusé', id, ''); return; }
    const d = x.d; const f = d.drapeaux || {};
    await Store.audit('Consultation du dossier', d.identifiant, 'Motif d\'accès : ' + x.motif);
    const refs = data.refs.filter((r) => r.dossier_id === d.id); const als = data.als.filter((a) => a.dossier_id === d.id);
    const nom = nomVisible(p, d);
    const photo = Domaine.droits(p, 'I').includes('L') && d.medias && d.medias.photo;
    const resp = Taches.responsable(d); const estResp = p.role === 'admin' || resp === p.structure; const voitNom = !!nom;
    const arr = (data.arrivees || []).find((a) => a.id === d.arrivee_id); const site = (data.sites || []).find((x) => x.id === d.site_id);
    const trEnCours = (data.transferts || []).find((t) => t.dossier_id === d.id && ['Demandé', 'En attente de validation'].includes(t.statut));
    const valid = (data.approbations || []).find((a) => a.dossier_id === d.id && a.type === 'Validation du dossier' && a.statut === 'En attente');
    const docs = h('div', { class: 'export-menu' }); const panel = h('div', { class: 'export-panel hidden' }, h('div', { class: 'tiny muted', style: { padding: '6px 10px 4px', fontWeight: 700 } }, 'Documents de la plateforme'),
      [['id-card', 'o', 'Fiche unique du migrant', 'Recto : photo, identifiant, QR — verso : parcours', () => Documents.ficheMigrant(d)], ['award', 'g', 'Attestation de retour', 'Avec code QR de vérification', () => Documents.attestation(d)]].map(([ic, t, l, de, fn]) =>
        h('button', { type: 'button', class: 'export-item', disabled: voitNom ? null : true, onclick: (e) => { e.stopPropagation(); panel.classList.add('hidden'); fn(); } }, h('span', { class: 'ticon ' + t }, icon(ic)), h('span', { style: { flex: 1, textAlign: 'left' } }, h('b', null, l), h('div', { class: 'tiny muted' }, voitNom ? de : 'Identité non accessible à votre structure')))));
    docs.append(h('button', { class: 'btn primary', onclick: (e) => { e.stopPropagation(); panel.classList.toggle('hidden'); UI.refreshIcons(); } }, icon('printer'), 'Imprimer', icon('chevron-down')), panel);
    document.addEventListener('click', (e) => { if (!docs.contains(e.target)) panel.classList.add('hidden'); });
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Dossier ' + d.identifiant), h('p', { class: 'sub' }, 'Tableau de bord / Dossiers / ' + d.identifiant)),
      h('div', { class: 'row' }, docs,
        estResp && (d.etat_suivi || 'Ouvert') === 'Ouvert' && !trEnCours ? h('button', { class: 'btn', onclick: () => Taches.transferer(d, data) }, icon('arrow-right-left'), 'Transférer') : null,
        estResp && (d.etat_suivi || 'Ouvert') === 'Ouvert' ? h('button', { class: 'btn', onclick: () => Taches.suivi(d) }, icon('calendar-check'), 'Suivi') : null,
        estResp && (d.etat_suivi || 'Ouvert') === 'Ouvert' ? h('button', { class: 'btn', onclick: () => Taches.demanderCloture(d, data) }, icon('flag'), 'Clôturer le suivi') : null,
        valid && (p.role === 'admin' || (p.role === 'superviseur' && valid.structure === p.structure)) ? h('button', { class: 'btn accent', onclick: () => Taches.decider(valid, true, data) }, icon('stamp'), 'Valider le dossier') : null,
        h('button', { class: 'btn', onclick: () => history.back() }, icon('arrow-left'), 'Retour'))));
    c.append(h('div', { class: 'card', style: { marginBottom: '20px' } }, h('div', { class: 'row between' },
      h('div', { class: 'dossier-head' }, photo ? h('img', { class: 'ph', src: d.medias.photo }) : h('span', { class: 'ini' }, nom ? UI.initials(nom) : icon('user-round')),
        h('div', null, h('h2', { style: { margin: 0, fontSize: '20px' } }, nom || 'Identité non accessible à votre structure'),
          h('div', { class: 'row', style: { gap: '8px', marginTop: '4px' } }, h('span', { class: 'idlink' }, d.identifiant),
            Domaine.verifIdentifiant(d.identifiant) ? h('span', { class: 'badge ok' }, icon('check'), 'Clé de contrôle valide') : h('span', { class: 'badge danger' }, 'Clé invalide'),
            h('span', { class: 'muted small row', style: { gap: '6px' } }, Admin.logo(d.structure, 22), 'Enrôlé par ' + d.structure + ' (' + d.agent + ', ' + d.site + ') le ' + UI.fmtDate(d.created_at))))),
      h('div', { class: 'row', style: { gap: '6px' } }, f.mineur ? h('span', { class: 'badge solid violet' }, 'Mineur') : h('span', { class: 'badge solid ok' }, 'Adulte'), f.mna ? h('span', { class: 'badge solid danger' }, 'Mineur non accompagné') : null,
        f.traite ? h('span', { class: 'badge solid warn' }, 'Traite présumée') : null, f.sante_mentale ? h('span', { class: 'badge solid danger' }, 'Santé mentale') : null, h('span', { class: 'badge grey' }, 'Accès : ' + x.motif))),
      h('div', { class: 'fiche-meta' },
        h('div', null, h('span', { class: 'tiny muted' }, 'Arrivée'), arr ? h('a', { class: 'row', style: { gap: '6px' }, href: '#/portail/arrivee/' + arr.id }, icon(arr.type === 'Voie terrestre' ? 'bus' : 'plane-landing'), h('b', null, arr.code), h('span', { class: 'small muted' }, arr.type + ' ' + (arr.numero || '') + ', ' + UI.fmtDate(arr.date_reelle || arr.date_prevue))) : h('span', { class: 'badge warn' }, 'Non rattaché')),
        h('div', null, h('span', { class: 'tiny muted' }, 'Site d\'enregistrement'), h('b', null, site ? site.nom : d.site || '—')),
        h('div', null, h('span', { class: 'tiny muted' }, 'Structure responsable'), h('span', { class: 'row', style: { gap: '6px' } }, Admin.logo(resp, 22), h('b', null, resp), resp !== d.structure ? h('span', { class: 'badge info' }, 'transféré') : null, trEnCours ? h('span', { class: 'badge warn' }, 'transfert vers ' + trEnCours.vers + ' : ' + trEnCours.statut.toLowerCase()) : null)),
        h('div', null, h('span', { class: 'tiny muted' }, 'Suivi'), h('span', { class: 'row', style: { gap: '6px' } }, h('span', { class: 'badge solid ' + ({ Ouvert: 'ok', 'Clôture demandée': 'warn', 'Clôturé': 'grey' }[d.etat_suivi || 'Ouvert']) }, d.etat_suivi || 'Ouvert'), h('span', { class: 'small muted' }, 'prochain : ' + UI.fmtDate(Taches.echeanceSuivi(d))))),
        (d.contributions || []).length ? h('div', null, h('span', { class: 'tiny muted' }, 'Entretien à plusieurs mains'), h('span', { class: 'row', style: { gap: '6px' } }, d.contributions.map((k) => h('span', { class: 'badge info', title: k.agent }, Admin.logo(k.structure, 16), ' ' + k.structure + ' : ' + (k.sections.length > 3 ? k.sections[0] + ' à ' + k.sections[k.sections.length - 1] : k.sections.join(', ')))))) : null,
        h('div', null, h('span', { class: 'tiny muted' }, 'Validation superviseur'), d.valide ? h('span', { class: 'badge ok' }, icon('check'), 'Validé par ' + d.valide.par) : valid ? h('span', { class: 'badge warn' }, 'En attente') : h('span', { class: 'badge grey' }, 'Non requise')))));

    const peutReferencer = p.role === 'admin' || Domaine.droits(p, 'XIV').includes('S');
    const grid = h('div', { class: 'fiche-grid' });
    const left = h('div'); const right = h('div', { class: 'stack' });
    SECT.forEach((s) => left.append(P.section(d, s)));
    const lst = (arr, f2, vide) => h('div', { class: 'card-b', style: { paddingTop: '4px', paddingBottom: '4px' } }, arr.length ? arr.map(f2) : h('div', { class: 'small muted', style: { padding: '12px 0' } }, vide));
    right.append(
      P.carte('send', 'v', 'Référencements', peutReferencer ? h('button', { class: 'btn sm primary', onclick: () => P.emettre(d) }, icon('plus'), 'Émettre') : null,
        lst(refs, (r) => h('div', { class: 'li' }, Admin.logo(r.destinataire, 34), h('div', { class: 'grow' }, h('div', { class: 't1' }, r.emetteur + ' → ' + r.destinataire), h('div', { class: 't2' }, r.motif), h('div', { class: 'row', style: { gap: '6px', marginTop: '6px' } }, h('span', { class: 'badge solid ' + REF_BADGE[r.statut] }, r.statut),
          h('button', { class: 'btn sm', title: 'Fiche de référencement (PDF)', onclick: () => Documents.ficheReferencement(r, d) }, icon('file-text'), 'Fiche PDF')))), 'Aucun référencement.')),
      P.carte('calendar-check', 'g', 'Suivis', estResp && (d.etat_suivi || 'Ouvert') === 'Ouvert' ? h('button', { class: 'btn sm primary', onclick: () => Taches.suivi(d) }, icon('plus'), 'Ajouter') : null,
        lst((d.suivis || []).slice().reverse(), (sv) => h('div', { class: 'li' }, h('span', { class: 'ticon g' }, icon(sv.type === 'Visite à domicile' ? 'house' : sv.type === 'Appel téléphonique' ? 'phone' : 'messages-square')), h('div', { class: 'grow' }, h('div', { class: 't1' }, sv.type + ' — ' + UI.fmtDate(sv.date)), h('div', { class: 't2' }, sv.note + ' (' + sv.par + ', ' + sv.structure + ')'))), 'Aucun suivi enregistré.')),
      P.carte('siren', 'r', 'Alertes', null,
        lst(als, (a) => h('div', { class: 'li' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, a.titre), h('div', { class: 't2' }, a.statut + (a.pris_par ? ' par ' + a.pris_par : ''))), h('span', { class: 'badge solid ' + GRAV[a.gravite] }, a.gravite)), 'Aucune alerte.')),
      P.carte('history', 'o', 'Historique', null, h('div', { class: 'card-b' }, h('div', { class: 'timeline' }, (d.historique || []).slice().reverse().map((e) => h('div', { class: 'ev' }, h('div', { style: { fontWeight: 600 } }, e.action), h('div', { class: 'tiny muted' }, UI.fmtDate(e.date, true) + ' — ' + e.par + (e.structure ? ' (' + e.structure + ')' : ''))))))));
    grid.append(left, right); c.append(grid);
  };

  P.section = function (d, s) {
    const p = App.profil; const dr = Domaine.droits(p, s); const sens = M.sensibiliteSections[s];
    const restr = Domaine.restriction(p, s);
    const blk = h('div', { class: 'secblock' }); const sb = h('div', { class: 'sb' });
    const ouvert = dr.includes('L') && ['I', 'II', 'XIV'].includes(s);
    if (!ouvert) sb.classList.add('hidden');
    const cle = d.id + ':' + s;
    blk.append(h('div', { class: 'sh', onclick: () => { sb.classList.toggle('hidden'); if (!sb.classList.contains('hidden') && sb._ouvrir) sb._ouvrir(); } },
      h('span', { class: 'sens ' + sens }, sens), h('span', { class: 't' }, s + ' — ' + M.SECTIONS[s]),
      restr ? h('span', { class: 'badge grey' }, 'partiel') : null,
      dr.length ? h('span', { class: 'tiny muted' }, 'Droits : ' + dr.join(' ')) : h('span', { class: 'badge grey' }, icon('lock'), 'aucun accès')), sb);
    if (!dr.includes('L')) { sb.append(h('div', { class: 'locked' }, icon('lock'), 'Cette section n\'est pas accessible à votre structure (matrice d\'habilitations).')); return blk; }
    const masque = sens === 'N3' && !P.reveles.has(cle);
    if (masque) {
      sb.append(h('div', { class: 'locked' }, icon('eye-off'), 'Données de sensibilité N3 masquées par défaut.',
        h('button', { class: 'btn sm', onclick: async (e) => { e.stopPropagation(); const motif = await UI.prompt('Afficher des données sensibles', 'Motif de la consultation (tracé dans le journal d\'audit) :', 'Ex. : préparation de la prise en charge'); if (!motif) return; P.reveles.add(cle); await Store.audit('Affichage de données N3', d.identifiant, 'Section ' + s + ' — motif : ' + motif); App.render(); } }, icon('eye'), 'Afficher')));
      return blk;
    }
    let n = 0;
    for (const code of codesOf(s)) {
      const q = Domaine.Q[code]; if (!Domaine.codeAutorise(p, code)) continue;
      if (q.widget === 'hidden' || !Domaine.visible(q, d.reponses, d)) continue;
      const v = d.reponses[code]; if (v === undefined) continue; n++;
      sb.append(h('div', { class: 'kv' }, h('span', { class: 'k' }, h('span', { class: 'qcode' }, code), ' ', q.label), h('span', null, P.fmt(v))));
    }
    if (s === 'VIII' && d.itineraire && Form.etapes(d.itineraire).length) {
      const et = Form.etapes(d.itineraire); const carte = h('div', { class: 'map-fiche' });
      sb.append(h('div', { class: 'sub-head' }, 'Trajet parcouru — ' + Math.round(kmEtapes(et)).toLocaleString('fr-FR') + ' km, ' + et.length + ' étapes'),
        h('div', { class: 'map-split' }, carte, P.etapesListe(et)));
      sb._ouvrir = () => Carte.trajet(carte, et);
    }
    if (s === 'I' && d.medias && d.medias.documents && d.medias.documents.length) sb.append(h('div', { class: 'thumbs', style: { marginTop: '8px' } }, d.medias.documents.map((x) => h('img', { class: 'thumb', src: x }))));
    if (!n) sb.append(h('div', { class: 'small muted', style: { padding: '8px 0' } }, 'Aucune donnée renseignée.'));
    if (dr.includes('S') || dr.includes('M')) sb.append(h('div', { style: { marginTop: '10px' } }, h('button', { class: 'btn sm', onclick: () => P.completer(d, s) }, icon('pencil'), 'Compléter cette section')));
    return blk;
  };

  P.completer = function (d, s) {
    const p = App.profil;
    const copie = JSON.parse(JSON.stringify(d));
    const ctx = { refreshers: [], onChangeHooks: [], save() {}, changed() { Domaine.calculs(copie); ctx.refreshers.forEach((f) => f()); } };
    const codes = codesOf(s).filter((c) => Domaine.codeAutorise(p, c) && !['itinerary', 'capture', 'signature', 'structures'].includes(Domaine.Q[c].widget));
    UI.modal({ title: 'Compléter : ' + M.SECTIONS[s], icon: 'pencil', body: Form.section(copie, codes, ctx),
      actions: [{ label: 'Annuler' }, { label: 'Enregistrer', cls: 'primary', icon: 'save', onclick: async () => {
        const changes = codes.filter((c) => JSON.stringify(copie.reponses[c]) !== JSON.stringify(d.reponses[c]));
        if (!changes.length) return;
        changes.forEach((c) => { if (copie.reponses[c] === undefined) delete d.reponses[c]; else d.reponses[c] = copie.reponses[c]; });
        d.updated_at = new Date().toISOString();
        d.historique = d.historique || []; d.historique.push({ date: d.updated_at, par: p.nom, structure: p.structure, action: `Section ${s} complétée (${changes.join(', ')})` });
        await Store.db.upsertDossier(d, { sections: [s] }); await Store.audit('Modification', d.identifiant, 'Section ' + s + ' : ' + changes.join(', '));
        UI.toast('Dossier mis à jour.'); App.render();
      } }] });
    const m = document.querySelector('.modal'); if (m) m.style.maxWidth = '820px';
  };

  P.emettre = function (d) {
    const p = App.profil; const r = { };
    const body = h('div', { class: 'stack' },
      h('label', { class: 'q' }, 'Structure destinataire'), UI.dropdown({ items: M.structures.filter((s) => s.code !== p.structure).map((s) => ({ value: s.code, label: s.code + ' — ' + s.nom })), onChange: (v) => { r.destinataire = v; } }).el,
      h('label', { class: 'q' }, 'Type de service'), UI.dropdown({ items: M.TYPES_SERVICE.map((t) => ({ value: t.code, label: t.label, right: 'réception ' + t.reception + ' h' })), onChange: (v) => { r.type_service = v; } }).el,
      h('label', { class: 'q' }, 'Motif'), h('textarea', { class: 'textarea', oninput: (e) => { r.motif = e.target.value; } }));
    UI.modal({ title: 'Émettre un référencement', icon: 'send', body, actions: [{ label: 'Annuler' }, { label: 'Émettre', cls: 'primary', onclick: async () => {
      if (!r.destinataire || !r.type_service) { UI.toast('Choisir la structure et le type de service.', 'alert-triangle'); return false; }
      const t = M.TYPES_SERVICE.find((y) => y.code === r.type_service); const now = new Date().toISOString();
      await Store.db.upsert('referencements', { id: UI.uuid(), dossier_id: d.id, identifiant: d.identifiant, beneficiaire: d.resume.nom + ' ' + d.resume.prenoms, emetteur: p.structure, destinataire: r.destinataire, type_service: r.type_service,
        motif: r.motif || '', statut: 'Émis', created_at: now, echeance_reception: new Date(Date.now() + t.reception * 3600000).toISOString(), historique: [{ date: now, statut: 'Émis', par: p.structure }] });
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Référencement émis vers ' + r.destinataire }); await Store.db.upsertDossier(d, { sections: [] });
      await Store.audit('Référencement émis', d.identifiant, '→ ' + r.destinataire); UI.toast('Référencement émis vers ' + r.destinataire + '.', 'send'); App.render();
    } }] });
  };

  /* ---------- Référencements ---------- */
  const SUIVANT = { 'Émis': ['Reçu'], 'Reçu': ['Accepté', 'Refusé'], 'Accepté': ['En cours de prise en charge'], 'En cours de prise en charge': ['Clôturé'] };
  P.referencements = function (c, { refs }) {
    const p = App.profil; let onglet = p.role === 'admin' ? 'tous' : 'recus';
    const list = h('div');
    const paint = () => {
      const rows = mesRefs(p, refs).filter((r) => onglet === 'tous' || (onglet === 'recus' ? r.destinataire === p.structure : r.emetteur === p.structure)).sort((a, b) => b.created_at.localeCompare(a.created_at));
      list.innerHTML = '';
      if (!rows.length) { list.append(h('div', { class: 'empty' }, icon('inbox'), h('div', null, 'Aucun référencement.'))); UI.refreshIcons(); return; }
      list.append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Dossier', 'De → À', 'Service et motif', 'Statut', 'Échéance', 'Actions'].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((r) => {
          const t = M.TYPES_SERVICE.find((y) => y.code === r.type_service) || {};
          const retard = ['Émis'].includes(r.statut) && new Date(r.echeance_reception) < new Date();
          const actions = r.destinataire === p.structure ? (SUIVANT[r.statut] || []) : [];
          return h('tr', null,
            h('td', null, h('a', { class: 'idlink', href: '#/portail/dossier/' + r.dossier_id }, r.identifiant), h('div', { class: 'tiny muted' }, Domaine.droits(p, 'II').includes('L') ? r.beneficiaire : '')),
            h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, Admin.logo(r.emetteur, 26), r.emetteur, ' → ', Admin.logo(r.destinataire, 26), h('b', null, r.destinataire))),
            h('td', null, h('div', { class: 'small' }, t.label), h('div', { class: 'tiny muted' }, r.motif)),
            h('td', null, h('span', { class: 'badge solid ' + REF_BADGE[r.statut] }, r.statut)),
            h('td', { class: 'small' }, r.statut === 'Émis' ? h('span', { class: retard ? 'badge danger' : '' }, (retard ? 'Dépassée : ' : 'Réception avant ') + UI.fmtDate(r.echeance_reception, true)) : '—'),
            h('td', null, h('div', { class: 'row' }, actions.map((a) => h('button', { class: 'btn sm' + (a === 'Refusé' ? ' danger' : a === 'Accepté' ? ' primary' : ''), onclick: () => P.changerStatut(r, a) }, a)),
              h('button', { class: 'btn sm', title: 'Fiche de référencement (PDF)', onclick: async () => Documents.ficheReferencement(r, (await Store.db.listDossiers()).find((x) => x.id === r.dossier_id)) }, icon('file-text')))));
        })))));
      UI.refreshIcons();
    };
    const lignesRef = () => [['Dossier', 'Bénéficiaire', 'Émetteur', 'Destinataire', 'Type de service', 'Motif', 'Statut', 'Émis le'], ...mesRefs(p, refs).filter((r) => onglet === 'tous' || (onglet === 'recus' ? r.destinataire === p.structure : r.emetteur === p.structure)).map((r) => [r.identifiant, Domaine.droits(p, 'II').includes('L') ? r.beneficiaire : 'Accès restreint', r.emetteur, r.destinataire, (M.TYPES_SERVICE.find((y) => y.code === r.type_service) || {}).label || r.type_service, r.motif, r.statut, UI.fmtDate(r.created_at)])];
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Référencements'), h('p', { class: 'sub' }, 'Chaque référencement suit le cycle : Émis, Reçu, Accepté ou Refusé, En cours de prise en charge, Clôturé.')),
      h('div', { class: 'row' }, Export.menu({ titre: 'Référencements', sousTitre: () => (onglet === 'tous' ? 'Tous' : onglet === 'recus' ? 'Reçus par ' + p.structure : 'Émis par ' + p.structure), lignes: lignesRef, noeud: () => list, pdfImage: false, fichier: 'referencements' }),
      h('div', { class: 'periods' }, (p.role === 'admin' ? [['tous', 'Tous']] : [['recus', 'Reçus'], ['emis', 'Émis']]).map(([k, l]) => h('button', { class: k === onglet ? 'on' : '', onclick: (e) => { onglet = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); paint(); } }, l))))),
      h('div', { class: 'card p0' }, list));
    paint();
  };
  P.changerStatut = async function (r, statut) {
    const p = App.profil; let motif = '';
    if (statut === 'Refusé' || statut === 'Clôturé') { motif = await UI.prompt(statut === 'Refusé' ? 'Refuser le référencement' : 'Clôturer la prise en charge', statut === 'Refusé' ? 'Motif du refus (obligatoire) :' : 'Résultat de la prise en charge :'); if (!motif) return; }
    r.statut = statut; r.historique = r.historique || []; r.historique.push({ date: new Date().toISOString(), statut, par: p.structure, motif });
    await Store.db.upsert('referencements', r); await Store.audit('Référencement : ' + statut, r.identifiant, motif);
    UI.toast('Statut mis à jour : ' + statut); App.render();
  };

  /* ---------- Alertes ---------- */
  P.alertes = function (c, { als }) {
    const p = App.profil; const rows = mesAlertes(p, als).sort((a, b) => (a.statut === 'Ouverte' ? -1 : 1) - (b.statut === 'Ouverte' ? -1 : 1) || b.created_at.localeCompare(a.created_at));
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Alertes'), h('p', { class: 'sub' }, 'Alertes déclenchées par les réponses de l\'entretien et notifiées à votre structure.'))),
      h('div', { class: 'card p0' }, rows.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Gravité', 'Alerte', 'Dossier', 'Notifiée à', 'Délai', 'Statut', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((a) => h('tr', null, h('td', null, h('span', { class: 'badge solid ' + GRAV[a.gravite] }, a.gravite)), h('td', null, h('b', null, a.titre), h('div', { class: 'tiny muted' }, a.conduite)),
          h('td', null, h('a', { class: 'idlink', href: '#/portail/dossier/' + a.dossier_id }, a.identifiant), h('div', { class: 'tiny muted' }, UI.ago(a.created_at))), h('td', null, (a.notifie || []).join(', ') || 'À désigner'), h('td', null, a.delai),
          h('td', null, h('span', { class: 'badge solid ' + (a.statut === 'Ouverte' ? 'danger' : 'ok') }, a.statut + (a.pris_par ? ' (' + a.pris_par + ')' : ''))),
          h('td', null, a.statut === 'Ouverte' ? h('button', { class: 'btn sm primary', onclick: async () => { a.statut = 'Prise en charge'; a.pris_par = p.structure; a.pris_le = new Date().toISOString(); await Store.db.upsert('alertes', a); await Store.audit('Alerte prise en charge', a.identifiant, a.titre); UI.toast('Alerte prise en charge.'); App.render(); } }, 'Prendre en charge') : null))))))
        : h('div', { class: 'empty' }, icon('bell-off'), h('div', null, 'Aucune alerte.'))));
  };

  /* ---------- Doublons ---------- */
  /* ---------- Doublons : comparaison côte à côte et décision du superviseur ---------- */
  P.doublonsFiltre = 'À examiner';
  P.doublons = function (c, { dbl, ds, arrivees }) {
    const byId = Object.fromEntries(ds.map((d) => [d.id, d])); const ARR = Object.fromEntries((arrivees || []).map((a) => [a.id, a]));
    const n = (st) => dbl.filter((x) => x.statut === st).length;
    const scoreMax = (x) => Math.max(0, ...(x.candidats || []).map((k) => k.score));
    const kcard = (t, ic, l, v) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, l), h('div', { class: 'kv' }, v)));
    const CHAMPS = [['Nom', (d) => d.reponses['IDT-001']], ['Prénoms', (d) => d.reponses['IDT-002']], ['Sexe', (d) => d.reponses['IDT-005']], ['Date de naissance', (d) => d.reponses['IDT-006'] ? UI.fmtDate(d.reponses['IDT-006']) : ''],
      ['Lieu de naissance', (d) => P.fmt(d.reponses['IDT-008'])], ['Téléphone', (d) => (d.reponses['IDT-011'] ? P.fmt(d.reponses['IDT-011']) : '')], ['Pièce d\'identité', (d) => d.reponses['RES-016']], ['Référence OIM', (d) => d.reponses['IDT-013']],
      ['Père', (d) => [d.reponses['FAM-009'], d.reponses['FAM-010']].filter(Boolean).join(' ')], ['Mère', (d) => [d.reponses['FAM-015'], d.reponses['FAM-016']].filter(Boolean).join(' ')],
      ['Enrôlé par', (d) => d.structure + ' — ' + (d.agent || '')], ['Date d\'enrôlement', (d) => UI.fmtDate(d.created_at, true)], ['Arrivée', (d) => (ARR[d.arrivee_id] || {}).code || '']];
    const norm = (v) => UI.norm(v || '').replace(/\s+/g, ' ').trim();
    const list = h('div', { class: 'stack' }); const tabs = h('div', { class: 'tabs', style: { marginTop: 0 } });
    const decider = async (x, statut, principal) => {
      const motif = await UI.prompt(statut === 'Écarté' ? 'Personnes différentes' : 'Même personne : rattacher', statut === 'Écarté' ? 'Élément qui distingue les deux personnes (obligatoire) :' : 'Élément qui confirme qu\'il s\'agit de la même personne (obligatoire) :'); if (!motif) return;
      const p = App.profil; const now = new Date().toISOString();
      Object.assign(x, { statut, decide_par: p.nom + ' (' + p.structure + ')', decision_le: now, decision_motif: motif }); await Store.db.upsert('doublons', x);
      const d = byId[x.dossier_id];
      if (d && statut !== 'Écarté') { d.etat_suivi = 'Clôturé'; d.rattache_a = principal.identifiant; d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Doublon confirmé : dossier rattaché à ' + principal.identifiant + ' (dossier principal) — ' + motif }); await Store.db.upsertDossier(d, { sections: [] });
        principal.historique = principal.historique || []; principal.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Dossier principal : ' + d.identifiant + ' y est rattaché (doublon confirmé)' }); await Store.db.upsertDossier(principal, { sections: [] }); }
      else if (d) { d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Doublon écarté : ' + motif }); await Store.db.upsertDossier(d, { sections: [] }); }
      await Store.audit('Doublon : ' + statut, x.identifiant, motif); UI.toast(statut === 'Écarté' ? 'Doublon écarté.' : 'Dossier rattaché à ' + principal.identifiant + '.', 'copy-check'); App.render();
    };
    const carte = (x) => {
      const d = byId[x.dossier_id]; if (!d) return null;
      const meilleur = (x.candidats || [])[0]; const o = meilleur && byId[meilleur.id];
      const sc = scoreMax(x); const coul = sc >= 90 ? 'danger' : sc >= 75 ? 'warn' : 'info';
      const ent = (dd, lib) => h('th', null, h('div', { class: 'tiny muted' }, lib), h('a', { class: 'idlink', href: '#/portail/dossier/' + dd.id }, dd.identifiant), h('div', { class: 'row', style: { gap: '6px', marginTop: '4px' } }, Admin.logo(dd.structure, 20), h('span', { class: 'small' }, dd.structure)));
      const tbl = o ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl dbl-cmp' }, h('thead', null, h('tr', null, h('th', null, 'Champ'), ent(d, 'Nouveau dossier'), ent(o, 'Dossier existant'), h('th', null, ''))),
        h('tbody', null, CHAMPS.map(([l, f]) => { const v1 = f(d) || '', v2 = f(o) || ''; if (!v1 && !v2) return null; const meta = ['Enrôlé par', 'Date d\'enrôlement', 'Arrivée'].includes(l); const egal = !meta && v1 && v2 && norm(v1) === norm(v2); const proche = !meta && !egal && v1 && v2 && (norm(v1).includes(norm(v2)) || norm(v2).includes(norm(v1)) || norm(v1).slice(0, 4) === norm(v2).slice(0, 4));
          return h('tr', { class: meta ? 'meta' : egal ? 'eq' : proche ? 'near' : v1 && v2 ? 'diff' : '' }, h('td', { class: 'small muted' }, l), h('td', null, v1 || '—'), h('td', null, v2 || '—'),
            h('td', null, egal ? h('span', { class: 'badge ok' }, icon('equal'), 'Identique') : proche ? h('span', { class: 'badge warn' }, 'Proche') : v1 && v2 && !meta ? h('span', { class: 'badge grey' }, 'Différent') : null)); })))) : h('div', { class: 'small muted' }, 'Dossier candidat non accessible.');
      return h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon p' }, icon('copy')), x.scenario || ('Doublon possible — ' + x.identifiant)),
        h('div', { class: 'row', style: { gap: '8px' } }, h('div', { class: 'score-dbl ' + coul, title: 'Score de similarité' }, h('b', null, sc), h('span', null, '/100')), h('span', { class: 'badge solid ' + (x.statut === 'À examiner' ? 'warn' : x.statut === 'Écarté' ? 'grey' : 'ok') }, x.statut))),
        h('div', { class: 'card-b' },
          h('div', { class: 'row', style: { gap: '6px', marginBottom: '12px' } }, (meilleur ? meilleur.regles : []).map((r) => h('span', { class: 'ref-chip' }, icon('git-compare'), r)), h('span', { class: 'tiny muted' }, 'signalé ' + UI.ago(x.created_at))),
          tbl,
          (x.candidats || []).length > 1 ? h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Autres candidats : ', x.candidats.slice(1).map((k) => h('a', { class: 'idlink', style: { marginRight: '8px' }, href: '#/portail/dossier/' + k.id }, k.identifiant + ' (' + k.score + ')'))) : null,
          x.statut === 'À examiner' && o ? h('div', { class: 'row', style: { marginTop: '14px', gap: '8px' } },
            h('button', { class: 'btn primary', onclick: () => decider(x, 'Confirmé, à rattacher', o) }, icon('merge'), 'Même personne : rattacher à ' + o.identifiant),
            h('button', { class: 'btn', onclick: () => decider(x, 'Écarté', o) }, icon('split'), 'Personnes différentes'),
            h('span', { class: 'tiny muted' }, 'Aucune fusion automatique : le nouveau dossier est clôturé et rattaché au dossier existant, tous deux restent consultables.'))
            : x.decide_par ? h('div', { class: 'notice', style: { marginTop: '14px' } }, icon('gavel'), 'Décision de ' + x.decide_par + ' le ' + UI.fmtDate(x.decision_le, true) + (x.decision_motif ? ' : ' + x.decision_motif : '')) : null));
    };
    const ONG = [['À examiner', 'À examiner'], ['Confirmé, à rattacher', 'Confirmés'], ['Écarté', 'Écartés'], ['tous', 'Tous']];
    const paint = () => {
      tabs.innerHTML = ''; ONG.forEach(([k, l]) => tabs.append(h('button', { class: k === P.doublonsFiltre ? 'on' : '', onclick: () => { P.doublonsFiltre = k; paint(); } }, l, h('span', { class: 'badge ' + (k === P.doublonsFiltre ? 'accent' : 'grey') }, k === 'tous' ? dbl.length : n(k)))));
      const rows = dbl.filter((x) => P.doublonsFiltre === 'tous' || x.statut === P.doublonsFiltre).sort((a, b) => scoreMax(b) - scoreMax(a));
      list.innerHTML = ''; rows.forEach((x) => { const el = carte(x); if (el) list.append(el); });
      if (!rows.length) list.append(h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('copy-check'), h('div', null, 'Aucun doublon dans cette catégorie.'))));
      UI.refreshIcons();
    };
    const lignes = () => [['Dossier', 'Candidat', 'Score', 'Règles', 'Statut', 'Décision'], ...dbl.map((x) => { const k = (x.candidats || [])[0] || {}; return [x.identifiant, k.identifiant || '', scoreMax(x), (k.regles || []).join(' ; '), x.statut, x.decision_motif || '']; })];
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Doublons à examiner'), h('p', { class: 'sub' }, 'Règles R1 (pièce), R2 (référence OIM), R3 (nom et naissance), R4 (téléphone), R5 (filiation). Aucune fusion automatique : le superviseur compare et décide.')),
      Export.menu({ titre: 'Doublons', lignes, noeud: () => list, pdfImage: false, fichier: 'doublons' })),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kcard('o', 'copy', 'À examiner', n('À examiner')), kcard('d', 'flame', 'Score ≥ 90 (quasi certains)', dbl.filter((x) => x.statut === 'À examiner' && scoreMax(x) >= 90).length),
        kcard('g', 'merge', 'Confirmés et rattachés', n('Confirmé, à rattacher')), kcard('b', 'split', 'Écartés', n('Écarté'))),
      h('div', { class: 'card p0', style: { marginBottom: '16px' } }, tabs), list);
    paint();
  };

  /* ---------- Journal d'audit ---------- */
  P.journal = async function (c) {
    const rows = (await Store.db.list('audit')).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 300);
    const carteJ = h('div', { class: 'card p0' });
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Journal d\'audit'), h('p', { class: 'sub' }, 'Toute consultation, modification ou affichage de données sensibles est tracé.')),
      Export.menu({ titre: 'Journal d\'audit', sousTitre: rows.length + ' dernières entrées', noeud: () => carteJ, pdfImage: false, fichier: 'journal_audit', lignes: () => [['Date', 'Utilisateur', 'Rôle', 'Structure', 'Action', 'Objet', 'Détail'], ...rows.map((a) => [UI.fmtDate(a.created_at, true), a.profil, a.role, a.structure, a.action, a.objet, a.detail])] })),
      carteJ);
    carteJ.append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Date', 'Utilisateur', 'Structure', 'Action', 'Objet', 'Détail'].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((a) => h('tr', null, h('td', { class: 'small' }, UI.fmtDate(a.created_at, true)), h('td', null, a.profil, h('div', { class: 'tiny muted' }, a.role)), h('td', null, a.structure), h('td', null, a.action), h('td', null, a.objet), h('td', { class: 'small muted' }, a.detail)))))));
    UI.refreshIcons();
  };

  /* ---------- Matrice d'habilitations ---------- */
  P.habilitations = function (c) {
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Matrice d\'habilitations'), h('p', { class: 'sub' }, 'Proposition du Groupe 3 (Fiche 4), à valider en atelier. L lecture · S saisie · M modification · V validation. Cliquez sur une case pour modifier les droits.'))),
      h('div', { class: 'card p0' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, h('th', null, 'Structure'), SECT.map((s) => h('th', { title: M.SECTIONS[s] }, s, h('div', null, h('span', { class: 'sens ' + M.sensibiliteSections[s] }, M.sensibiliteSections[s])))))),
        h('tbody', null, M.structures.map((st) => { const m = M.matrice[st.code] || {}; return h('tr', null, h('td', null, h('div', { class: 'who' }, Admin.logo(st.code, 30), h('div', null, h('b', null, st.code), h('div', { class: 'tiny muted' }, st.nom)))),
          SECT.map((s) => h('td', { class: 'small' + (App.profil.role === 'admin' ? ' cell-edit' : ''), title: App.profil.role === 'admin' ? 'Modifier les droits de ' + st.code + ' sur la section ' + s : null, onclick: App.profil.role === 'admin' ? () => Admin.modifierDroits(st.code, s) : null, style: { background: (m[s] || []).length ? (m[s].includes('S') ? 'var(--green-soft)' : 'var(--blue-soft)') : '' } }, (m[s] || []).join('') || '—', m._notes && m._notes[s] ? h('sup', null, m._notes[s] === 'orientation' ? '1' : '2') : null))); })))),
        h('div', { class: 'small muted', style: { padding: '12px' } }, '(1) Orientation de la section XIV seulement (ORI-004 à ORI-007). (2) Documents d\'identité seulement (RES-014 à RES-018). Les droits s\'appliquent aux seuls dossiers concernant la structure.')));
  };
  window.Portail = P;
})();
