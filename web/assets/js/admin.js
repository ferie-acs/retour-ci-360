/* Administration de la plateforme : structures partenaires, utilisateurs (dont les enquêteurs), parc de tablettes, habilitations */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const Ad = {};
  const ROLES = {
    agent: { label: 'Agent enquêteur', espace: 'agent', desc: 'Conduit les entretiens sur tablette' },
    superviseur: { label: 'Superviseur', espace: 'portail', desc: 'Supervise les enquêteurs de sa structure, examine les doublons' },
    gestionnaire: { label: 'Gestionnaire de cas', espace: 'portail', desc: 'Traite les référencements et les alertes de sa structure' },
    responsable: { label: 'Premier responsable', espace: 'portail', desc: 'Dirige la structure : vue de pilotage et profilage des migrants (lecture seule)' },
    admin: { label: 'Administrateur général', espace: 'portail', desc: 'Administre la plateforme' },
  };
  const TYPES = ['Administration publique', 'Organisation internationale', 'Société civile', 'Partenaire technique et financier'];
  const STATUT_U = { Actif: 'ok', Suspendu: 'danger', 'En attente d\'activation': 'warn' };
  const STATUT_T = { 'En service': 'ok', 'En stock': 'info', 'Révoquée': 'danger' };
  const STATUT_S = { Active: 'ok', Suspendue: 'danger' };
  Ad.ROLES = ROLES;
  /* Rôles autorisés selon la structure : l'administration générale est réservée à la DGIE ; les autres structures
     commencent au rôle de gestionnaire de cas ; le rôle d'agent enquêteur suppose une structure habilitée à enrôler */
  Ad.rolesAutorises = function (code) {
    const s = (Ad.structures || []).find((x) => x.code === code) || {};
    if (code === 'DGIE') return ['agent', 'superviseur', 'gestionnaire', 'responsable', 'admin'];
    return [s.enrolement ? 'agent' : null, 'gestionnaire', 'superviseur', 'responsable'].filter(Boolean);
  };
  /* Logo d'une entité (image chargée par l'administrateur) ou, à défaut, monogramme */
  Ad.logo = function (code, taille, cls) {
    const s = (Ad.structures || []).find((x) => x.code === code) || {}; const t = (taille || 34) + 'px';
    if (s.logo) return h('span', { class: 'logo-ent ' + (cls || ''), style: { width: t, height: t }, title: s.nom || code }, h('img', { src: s.logo, alt: code }));
    const teintes = ['b', 'o', 'g', 'v', 'p', 't']; const i = [...String(code)].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
    const txt = String(code).slice(0, 5);
    return h('span', { class: 'logo-ent mono ticon ' + teintes[i] + ' ' + (cls || ''), style: { width: t, height: t, fontSize: Math.max(7.5, (taille || 34) / (txt.length > 3 ? 4.4 : 3.2)) + 'px' }, title: s.nom || code }, txt);
  };
  /* Réduit une image (PNG, JPEG, WebP) à 256 pixels en conservant la transparence ; le SVG est conservé tel quel */
  Ad.preparerLogo = (file) => new Promise((res, rej) => {
    if (file.size > 2 * 1024 * 1024) return rej(new Error('Fichier trop volumineux (2 Mo au maximum).'));
    const r = new FileReader();
    r.onload = () => {
      if (file.type === 'image/svg+xml') return res(r.result);
      const im = new Image(); im.onload = () => { const k = Math.min(1, 256 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); };
      im.onerror = () => rej(new Error('Image illisible.')); im.src = r.result;
    };
    r.onerror = () => rej(new Error('Lecture impossible.')); r.readAsDataURL(file);
  });

  /* ---------- Données initiales (démonstration) ---------- */
  Ad.donneesInitiales = function () {
    const now = new Date(); const j = (n) => new Date(now - n * 86400000).toISOString();
    const typeDe = (c) => (c === 'OIM' ? 'Organisation internationale' : c === 'OSCN' ? 'Société civile' : 'Administration publique');
    const structures = M.structures.map((s, i) => ({ id: s.code, code: s.code, nom: s.nom, type: typeDe(s.code), point_focal: '[à désigner]', email: '[à confirmer]', telephone: '[à confirmer]',
      statut: 'Active', enrolement: ['DGIE', 'OIM'].includes(s.code), logo: '', created_at: j(200 - i), matrice: JSON.parse(JSON.stringify(M.matrice[s.code] || {})) }));
    const email = (nom) => UI.norm(nom).replace(/[^a-z ]/g, '').trim().split(/\s+/).reverse().join('.') + '@demo.retour360.ci';
    const base = M.PROFILS.map((p, i) => ({ id: p.id, nom: p.nom, email: email(p.nom), telephone: '+225 07 00 00 ' + String(10 + i).padStart(2, '0'), role: p.role, structure: p.structure,
      site: p.site || '', tablette: p.tablette || '', fonction: p.roleLabel, statut: 'Actif', created_at: j(180), derniere_connexion: j(i % 5) }));
    const extra = [
      ['agent-dgie-2', 'Ange Konan', 'agent', 'DGIE', 'Aéroport FHB, Abidjan', 'TAB-DGIE-02', 'Actif'],
      ['agent-dgie-3', 'Bakary Ouattara', 'agent', 'DGIE', 'Site d\'accueil de Bouaké', 'TAB-DGIE-03', 'Actif'],
      ['agent-dgie-4', 'Nadège Gnahoré', 'agent', 'DGIE', 'Antenne de Daloa', 'TAB-DGIE-04', 'Actif'],
      ['agent-dgie-5', 'Hervé Kouadio', 'agent', 'DGIE', 'Site d\'accueil de Bouaké', '', 'En attente d\'activation'],
      ['agent-oim-2', 'Prisca Assi', 'agent', 'OIM', 'Bureau OIM, Abidjan', 'TAB-OIM-04', 'Actif'],
      ['agent-oim-3', 'Lacina Silué', 'agent', 'OIM', 'Bureau OIM, Abidjan', '', 'Suspendu'],
      ['sup-oim', 'Estelle Tanoh', 'superviseur', 'OIM', 'Bureau OIM, Abidjan', '', 'Actif'],
      ['gc-daip', 'Seydou Doumbia', 'gestionnaire', 'DAIP', '', '', 'Actif'],
      ['gc-ej-2', 'Grâce Aka', 'gestionnaire', 'EJ', '', '', 'Actif'],
      ['resp-dgie', 'Yves Kacou', 'responsable', 'DGIE', 'Abidjan', '', 'Actif'],
      ['resp-oim', 'Fatou Bamba', 'responsable', 'OIM', 'Abidjan', '', 'Actif'],
      ['resp-agefop', 'Didier Gbané', 'responsable', 'AGEFOP', 'Abidjan', '', 'Actif'],
      ['resp-ej', 'Ange Yapo', 'responsable', 'EJ', 'Abidjan', '', 'Actif'],
      ['resp-pnsm', 'Dr Kadi Soro', 'responsable', 'PNSM', 'Abidjan', '', 'Actif'],
      ['resp-cnltp', 'Mamadou Koné', 'responsable', 'CNLTP', 'Abidjan', '', 'Actif'],
    ].map(([id, nom, role, structure, site, tablette, statut], i) => ({ id, nom, email: email(nom), telephone: '+225 05 00 00 ' + String(30 + i).padStart(2, '0'), role, structure, site, tablette,
      fonction: ROLES[role].label, statut, created_at: j(120 - i * 9), derniere_connexion: statut === 'Actif' ? j(i + 1) : null }));
    const annuaire = [...base, ...extra];
    const tab = (id, structure, site, statut) => ({ id, structure, site, modele: 'Tablette durcie 10 pouces', statut, affectee: (annuaire.find((u) => u.tablette === id) || {}).id || '', created_at: j(150) });
    const tablettes = [tab('TAB-DGIE-01', 'DGIE', 'Aéroport FHB, Abidjan', 'En service'), tab('TAB-DGIE-02', 'DGIE', 'Aéroport FHB, Abidjan', 'En service'), tab('TAB-DGIE-03', 'DGIE', 'Site d\'accueil de Bouaké', 'En service'),
      tab('TAB-DGIE-04', 'DGIE', 'Antenne de Daloa', 'En service'), tab('TAB-DGIE-05', 'DGIE', 'Abidjan (réserve)', 'En stock'), tab('TAB-OIM-03', 'OIM', 'Bureau OIM, Abidjan', 'En service'),
      tab('TAB-OIM-04', 'OIM', 'Bureau OIM, Abidjan', 'En service'), tab('TAB-OIM-02', 'OIM', 'Bureau OIM, Abidjan', 'Révoquée')];
    return { structures, annuaire, tablettes };
  };

  /* Chargement : applique les structures et la matrice administrées à la configuration en mémoire */
  Ad.charger = async function () {
    const db = Store.db;
    let [structures, annuaire, tablettes] = await Promise.all([db.list('structures_cfg').catch(() => []), db.list('annuaire').catch(() => []), db.list('tablettes').catch(() => [])]);
    if (db.mode === 'local' && !structures.length) {
      const d = Ad.donneesInitiales();
      for (const s of d.structures) await db.upsert('structures_cfg', s);
      for (const u of d.annuaire) await db.upsert('annuaire', u);
      for (const t of d.tablettes) await db.upsert('tablettes', t);
      ({ structures, annuaire, tablettes } = d);
    }
    structures.forEach((x) => { if (x.enrolement === undefined) x.enrolement = ['DGIE', 'OIM'].includes(x.code); });
    if (structures.length) {
      M.structures = structures.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')).map((s) => ({ code: s.code, nom: s.nom, statut: s.statut, logo: s.logo, enrolement: s.enrolement }));
      structures.forEach((s) => { M.matrice[s.code] = s.matrice || {}; });
    }
    Ad.structures = structures; Ad.annuaire = annuaire; Ad.tablettes = tablettes;
    return { structures, annuaire, tablettes };
  };
  /* Profils autorisés à se connecter : compte actif dans une structure active */
  Ad.profil = (u) => ({ id: u.id, nom: u.nom, role: u.role, roleLabel: ROLES[u.role] ? ROLES[u.role].label : u.role, structure: u.structure, site: u.site, espace: ROLES[u.role] ? ROLES[u.role].espace : 'portail', tablette: u.tablette });
  Ad.profilsConnectables = function () {
    if (!Ad.annuaire || !Ad.annuaire.length) return M.PROFILS;
    const actives = new Set((Ad.structures || []).filter((s) => s.statut !== 'Suspendue').map((s) => s.code));
    return Ad.annuaire.filter((u) => u.statut === 'Actif' && (!Ad.structures.length || actives.has(u.structure)) && (u.role !== 'agent' || u.tablette)).map(Ad.profil);
  };

  const carte = (ic, t, titre, droite, ...corps) => h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + t }, icon(ic)), titre), droite || null), ...corps);
  const kc = (t, ic, l, v) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, l), h('div', { class: 'kv' }, v)));
  const champ = (lib, el, aide) => h('div', null, h('label', { class: 'q' }, lib), el, aide ? h('div', { class: 'help' }, aide) : null);
  const saisie = (obj, k, ph) => h('input', { class: 'input', value: obj[k] || '', placeholder: ph || '', oninput: (e) => { obj[k] = e.target.value; } });
  const choix = (obj, k, items, ph, onChange) => UI.dropdown({ items, value: obj[k], placeholder: ph, onChange: (v) => { obj[k] = v; onChange && onChange(v); } }).el;
  const filtreDD = (lib, items, onChange) => h('div', { style: { width: '200px' } }, UI.dropdown({ items: [{ value: '', label: lib + ' : tous' }].concat(items), value: '', onChange }).el);
  const estAdmin = () => App.profil.role === 'admin';
  const enregistrer = async (table, row, action, objet) => { await Store.db.upsert(table, row); await Store.audit(action, objet, ''); await Ad.charger(); };

  /* ---------- Utilisateurs ---------- */
  Ad.utilisateurs = function (c, data) {
    const p = App.profil; const portee = estAdmin() ? null : p.structure; // un superviseur gère les comptes de sa propre structure
    const f = { q: '', structure: '', role: '', statut: '' };
    const corps = h('div'); const kpis = h('div', { class: 'grid g4', style: { marginBottom: '20px' } });
    const dossiersPar = {}; data.ds.forEach((d) => { dossiersPar[d.agent] = (dossiersPar[d.agent] || 0) + 1; });
    const paint = () => {
      const tous = Ad.annuaire.filter((u) => !portee || u.structure === portee);
      const rows = tous.filter((u) => (!f.q || UI.norm([u.nom, u.email, u.site, u.tablette, u.structure].join(' ')).includes(UI.norm(f.q))) && (!f.structure || u.structure === f.structure) && (!f.role || u.role === f.role) && (!f.statut || u.statut === f.statut))
        .sort((a, b) => a.structure.localeCompare(b.structure) || a.nom.localeCompare(b.nom));
      kpis.innerHTML = '';
      kpis.append(kc('o', 'users', 'Comptes', tous.length), kc('d', 'tablet', 'Agents enquêteurs', tous.filter((u) => u.role === 'agent').length),
        kc('g', 'user-check', 'Comptes actifs', tous.filter((u) => u.statut === 'Actif').length), kc('b', 'user-minus', 'Suspendus ou en attente', tous.filter((u) => u.statut !== 'Actif').length));
      corps.innerHTML = '';
      corps.append(rows.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Utilisateur', 'Structure', 'Rôle', 'Affectation', 'Tablette', 'Dernière connexion', 'Statut', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((u, i) => h('tr', null,
          h('td', null, h('div', { class: 'who' }, h('span', { class: 'av ticon ' + ['b', 'o', 'g', 'v', 'p', 't'][i % 6] }, UI.initials(u.nom)), h('div', null, h('b', null, u.nom), h('div', { class: 'tiny muted' }, u.email)))),
          h('td', null, h('div', { class: 'who' }, Ad.logo(u.structure, 30), h('b', null, u.structure))),
          h('td', null, (ROLES[u.role] || {}).label || u.role, u.role === 'agent' && dossiersPar[u.nom] ? h('div', { class: 'tiny muted' }, dossiersPar[u.nom] + ' dossier(s) enrôlé(s)') : null),
          h('td', { class: 'small' }, u.site || '—'),
          h('td', { class: 'small', style: { whiteSpace: 'nowrap' } }, u.tablette || (u.role === 'agent' ? h('span', { class: 'badge warn' }, 'à affecter') : '—')),
          h('td', { class: 'small muted', style: { whiteSpace: 'nowrap' } }, u.derniere_connexion ? UI.ago(u.derniere_connexion) : 'Jamais'),
          h('td', null, h('span', { class: 'badge solid ' + (STATUT_U[u.statut] || 'grey') }, u.statut)),
          h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } },
            h('button', { class: 'btn sm', title: 'Modifier', onclick: () => Ad.formUtilisateur(u, portee) }, icon('pencil')),
            u.statut === 'Actif' ? h('button', { class: 'btn sm danger', title: 'Suspendre le compte', onclick: () => Ad.statutUtilisateur(u, 'Suspendu') }, icon('ban'))
              : h('button', { class: 'btn sm', title: 'Activer le compte', onclick: () => Ad.statutUtilisateur(u, 'Actif') }, icon('circle-check')),
            h('button', { class: 'btn sm', title: 'Réinitialiser le mot de passe', onclick: () => Ad.reinitialiser(u) }, icon('key-round')))))))))
        : h('div', { class: 'empty' }, icon('users'), h('div', null, 'Aucun compte ne correspond.')));
      UI.refreshIcons();
    };
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Utilisateurs'), h('p', { class: 'sub' }, portee ? `Comptes de votre structure (${portee}) : enquêteurs, superviseurs et gestionnaires de cas.` : 'Tous les comptes de la plateforme, toutes structures confondues : enquêteurs, superviseurs, gestionnaires de cas et administrateurs.')),
      h('div', { class: 'row' }, Export.menu({ titre: portee ? 'Comptes de la structure ' + portee : 'Utilisateurs de la plateforme', sousTitre: () => [f.structure && 'structure : ' + f.structure, f.role && 'rôle : ' + ROLES[f.role].label, f.statut && 'statut : ' + f.statut, f.q && 'recherche : ' + f.q].filter(Boolean).join(' | ') || 'Tous les comptes',
        fichier: 'utilisateurs', noeud: () => corps, pdfImage: false, lignes: () => [['Nom', 'Courriel', 'Téléphone', 'Structure', 'Rôle', 'Fonction', 'Affectation', 'Tablette', 'Statut', 'Dernière connexion'],
          ...Ad.annuaire.filter((u) => (!portee || u.structure === portee) && (!f.q || UI.norm([u.nom, u.email, u.site, u.tablette, u.structure].join(' ')).includes(UI.norm(f.q))) && (!f.structure || u.structure === f.structure) && (!f.role || u.role === f.role) && (!f.statut || u.statut === f.statut))
            .map((u) => [u.nom, u.email, u.telephone, u.structure, (ROLES[u.role] || {}).label || u.role, u.fonction, u.site, u.tablette, u.statut, u.derniere_connexion ? UI.fmtDate(u.derniere_connexion, true) : 'Jamais'])] }),
        h('button', { class: 'btn primary', onclick: () => Ad.formUtilisateur(null, portee) }, icon('user-plus'), 'Nouvel utilisateur'))),
      kpis,
      h('div', { class: 'card p0' }, h('div', { class: 'toolbar' },
        h('label', { class: 'search' }, icon('search'), h('input', { placeholder: 'Nom, courriel, site, tablette…', oninput: (e) => { f.q = e.target.value; paint(); } })),
        h('div', { class: 'row' }, portee ? null : filtreDD('Structure', M.structures.map((s) => ({ value: s.code, label: s.code, right: s.nom })), (v) => { f.structure = v; paint(); }),
          filtreDD('Rôle', Object.entries(ROLES).map(([k, r]) => ({ value: k, label: r.label })), (v) => { f.role = v; paint(); }),
          filtreDD('Statut', Object.keys(STATUT_U).map((x) => ({ value: x, label: x })), (v) => { f.statut = v; paint(); }))), corps));
    paint();
  };

  Ad.formUtilisateur = function (u, portee) {
    const nouveau = !u; const o = u ? { ...u } : { id: 'u-' + UI.uuid().slice(0, 8), role: 'agent', structure: portee || 'DGIE', statut: 'En attente d\'activation', created_at: new Date().toISOString() };
    const rolesPour = (code) => Ad.rolesAutorises(code).filter((k) => estAdmin() || ['agent', 'gestionnaire'].includes(k)).map((k) => ({ value: k, label: ROLES[k].label, right: ROLES[k].desc }));
    const zoneRole = h('div'); const zoneTab = h('div');
    const paintRole = () => {
      const items = rolesPour(o.structure); if (!items.some((x) => x.value === o.role)) o.role = items[0] ? items[0].value : '';
      zoneRole.innerHTML = '';
      zoneRole.append(champ('Rôle', choix(o, 'role', items, 'Rôle', () => paintTab()), o.structure === 'DGIE' ? 'L\'administration générale est réservée à la DGIE.' : 'Hors DGIE, les comptes commencent au rôle de gestionnaire de cas' + (items.some((x) => x.value === 'agent') ? ' ; cette structure est habilitée à enrôler (agents enquêteurs).' : '.')));
      paintTab();
    };
    const paintTab = () => {
      zoneTab.innerHTML = '';
      if (o.role !== 'agent') { o.tablette = ''; return; }
      const libres = Ad.tablettes.filter((t) => t.structure === o.structure && t.statut !== 'Révoquée' && (!t.affectee || t.affectee === o.id));
      zoneTab.append(champ('Tablette affectée', choix(o, 'tablette', [{ value: '', label: 'Aucune (à affecter plus tard)' }].concat(libres.map((t) => ({ value: t.id, label: t.id, right: t.site + ' · ' + t.statut }))), 'Tablette'),
        'Seules les tablettes de la structure, non révoquées et libres, sont proposées. Sans tablette, l\'enquêteur ne peut pas se connecter.'));
      UI.refreshIcons();
    };
    const body = h('div', { class: 'stack' },
      h('div', { class: 'grid g2' }, champ('Nom et prénoms', saisie(o, 'nom', 'Ex. : KONAN Ange')), champ('Fonction', saisie(o, 'fonction', 'Ex. : Enquêteur'))),
      h('div', { class: 'grid g2' }, champ('Courriel professionnel', saisie(o, 'email', 'prenom.nom@…')), champ('Téléphone', saisie(o, 'telephone', '+225 …'))),
      h('div', { class: 'grid g2' },
        champ('Structure', portee ? h('input', { class: 'input', readonly: true, value: portee }) : choix(o, 'structure', M.structures.filter((x) => x.statut !== 'Suspendue').map((x) => ({ value: x.code, label: x.code, right: x.nom })), 'Structure', () => { o.tablette = ''; paintRole(); })),
        zoneRole),
      champ('Site ou lieu d\'affectation', saisie(o, 'site', 'Ex. : Aéroport FHB, Abidjan')),
      zoneTab,
      nouveau ? h('div', { class: 'notice' }, icon('mail'), 'Un courriel d\'activation est envoyé à l\'utilisateur ; le compte reste « en attente d\'activation » jusqu\'à sa première connexion (simulé dans la démonstration).') : null);
    paintRole();
    const m = UI.modal({ title: nouveau ? 'Nouvel utilisateur' : 'Modifier : ' + u.nom, icon: nouveau ? 'user-plus' : 'user-cog', body, actions: [{ label: 'Annuler' }, { label: nouveau ? 'Créer le compte' : 'Enregistrer', icon: 'save', onclick: async () => {
      if (!o.nom || !o.email || !o.structure || !o.role) { UI.toast('Nom, courriel, structure et rôle sont obligatoires.', 'alert-triangle'); return false; }
      if (!Ad.rolesAutorises(o.structure).includes(o.role)) { UI.toast('Ce rôle n\'est pas autorisé pour la structure ' + o.structure + '.', 'alert-triangle'); return false; }
      if (Ad.annuaire.some((x) => x.id !== o.id && x.email.toLowerCase() === o.email.toLowerCase())) { UI.toast('Ce courriel est déjà utilisé par un autre compte.', 'alert-triangle'); return false; }
      o.fonction = o.fonction || ROLES[o.role].label;
      // libère l'ancienne tablette, affecte la nouvelle
      for (const t of Ad.tablettes) { if (t.affectee === o.id && t.id !== o.tablette) { t.affectee = ''; await Store.db.upsert('tablettes', t); } if (t.id === o.tablette && t.affectee !== o.id) { t.affectee = o.id; t.statut = 'En service'; await Store.db.upsert('tablettes', t); } }
      await enregistrer('annuaire', o, nouveau ? 'Création de compte' : 'Modification de compte', o.nom + ' (' + o.structure + ')');
      UI.toast(nouveau ? 'Compte créé. Lien d\'activation envoyé à ' + o.email + '.' : 'Compte mis à jour.', nouveau ? 'mail' : 'check-circle-2'); App.render();
    } }] });
    m.el.style.maxWidth = '760px';
  };
  Ad.statutUtilisateur = async function (u, statut) {
    if (u.id === App.profil.id) { UI.toast('Vous ne pouvez pas suspendre votre propre compte.', 'alert-triangle'); return; }
    let motif = '';
    if (statut === 'Suspendu') { motif = await UI.prompt('Suspendre le compte de ' + u.nom, 'Motif de la suspension (tracé dans le journal d\'audit) :', 'Ex. : départ de la structure, tablette perdue…'); if (!motif) return; }
    await Store.db.upsert('annuaire', { ...u, statut }); await Store.audit(statut === 'Suspendu' ? 'Suspension de compte' : 'Activation de compte', u.nom + ' (' + u.structure + ')', motif);
    await Ad.charger(); UI.toast(statut === 'Suspendu' ? 'Compte suspendu : la connexion est bloquée.' : 'Compte activé.'); App.render();
  };
  Ad.reinitialiser = async function (u) {
    await Store.audit('Réinitialisation du mot de passe', u.nom + ' (' + u.structure + ')', 'Lien envoyé à ' + u.email);
    UI.toast('Lien de réinitialisation envoyé à ' + u.email + ' (simulé).', 'key-round');
  };

  /* ---------- Structures partenaires ---------- */
  Ad.structures_ = function (c, data) {
    const comptes = {}; Ad.annuaire.forEach((u) => { comptes[u.structure] = (comptes[u.structure] || 0) + 1; });
    const dossiers = {}; data.ds.forEach((d) => { dossiers[d.structure] = (dossiers[d.structure] || 0) + 1; });
    const refs = {}; data.refs.forEach((r) => { refs[r.destinataire] = (refs[r.destinataire] || 0) + 1; });
    const lst = Ad.structures;
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Structures partenaires'), h('p', { class: 'sub' }, 'Entités raccordées à la plateforme. Une structure suspendue ne peut plus se connecter ; ses données sont conservées.')),
      h('button', { class: 'btn primary', onclick: () => Ad.formStructure(null) }, icon('plus'), 'Nouvelle structure')),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kc('o', 'building-2', 'Structures', lst.length), kc('d', 'circle-check', 'Actives', lst.filter((s) => s.statut === 'Active').length),
        kc('g', 'users', 'Comptes utilisateurs', Ad.annuaire.length), kc('b', 'globe', 'Organisations internationales', lst.filter((s) => s.type === 'Organisation internationale').length)),
      h('div', { class: 'card p0' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Structure', 'Type', 'Point focal', 'Comptes', 'Dossiers enrôlés', 'Référencements reçus', 'Droits', 'Statut', ''].map((x) => h('th', null, x)))),
        h('tbody', null, lst.map((s, i) => {
          const nbSec = Object.entries(s.matrice || {}).filter(([k, v]) => k !== '_notes' && v.length).length;
          return h('tr', null,
            h('td', null, h('div', { class: 'who' }, Ad.logo(s.code, 40), h('div', null, h('b', null, s.code), h('div', { class: 'tiny muted' }, s.nom), s.enrolement ? h('span', { class: 'badge info', style: { marginTop: '3px' } }, 'Habilitée à enrôler') : null))),
            h('td', { class: 'small' }, s.type), h('td', { class: 'small' }, s.point_focal || '—', h('div', { class: 'tiny muted' }, s.email || '')),
            h('td', null, comptes[s.code] || 0), h('td', null, dossiers[s.code] || 0), h('td', null, refs[s.code] || 0),
            h('td', null, h('a', { class: 'link', href: '#/portail/habilitations' }, nbSec + ' section(s) sur 15')),
            h('td', null, h('span', { class: 'badge solid ' + (STATUT_S[s.statut] || 'grey') }, s.statut)),
            h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, h('button', { class: 'btn sm', title: 'Modifier', onclick: () => Ad.formStructure(s) }, icon('pencil')),
              s.code === 'DGIE' ? null : h('button', { class: 'btn sm' + (s.statut === 'Active' ? ' danger' : ''), title: s.statut === 'Active' ? 'Suspendre' : 'Réactiver', onclick: () => Ad.statutStructure(s) }, icon(s.statut === 'Active' ? 'ban' : 'circle-check')))));
        }))))));
  };
  Ad.formStructure = function (s) {
    const nouveau = !s; const o = s ? { ...s } : { statut: 'Active', type: 'Administration publique', enrolement: false, logo: '', created_at: new Date().toISOString(), matrice: {} };
    o.enrolement = !!o.enrolement;
    const zoneLogo = h('div');
    const paintLogo = () => {
      zoneLogo.innerHTML = '';
      const apercu = o.logo ? h('img', { src: o.logo, alt: 'Logo' }) : h('span', { class: 'muted small' }, 'Aucun logo');
      zoneLogo.append(h('label', { class: 'q' }, 'Logo de l\'entité'), h('div', { class: 'logo-upload' }, h('div', { class: 'logo-preview' }, apercu),
        h('div', { class: 'stack', style: { flex: 1 } },
          h('div', { class: 'row' }, h('label', { class: 'btn' }, icon('image-up'), o.logo ? 'Remplacer le logo' : 'Choisir un logo',
            h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', class: 'hidden', onchange: async (e) => { const fi = e.target.files[0]; if (!fi) return; try { o.logo = await Ad.preparerLogo(fi); paintLogo(); } catch (err) { UI.toast(err.message, 'alert-triangle'); } } })),
            o.logo ? h('button', { type: 'button', class: 'btn danger', onclick: () => { o.logo = ''; paintLogo(); } }, icon('trash-2'), 'Retirer') : null),
          h('div', { class: 'help' }, 'PNG, JPEG, WebP ou SVG, 2 Mo au maximum ; de préférence carré et sur fond transparent. Le logo apparaît dans les listes, les fiches, les référencements et les exports PDF.'))));
      UI.refreshIcons();
    };
    paintLogo();
    const body = h('div', { class: 'stack' },
      h('div', { class: 'grid g2' }, champ('Sigle', nouveau ? saisie(o, 'code', 'Ex. : ANADER') : h('input', { class: 'input', readonly: true, value: o.code }), nouveau ? 'Le sigle sert d\'identifiant ; il ne peut plus être modifié.' : null),
        champ('Type', choix(o, 'type', TYPES.map((t) => ({ value: t, label: t })), 'Type'))),
      champ('Dénomination complète', saisie(o, 'nom', 'Ex. : Agence nationale d\'appui au développement rural')),
      h('div', { class: 'grid g2' }, champ('Point focal', saisie(o, 'point_focal', 'Nom et fonction')), champ('Courriel du point focal', saisie(o, 'email', 'prenom.nom@…'))),
      h('div', { class: 'grid g2' }, champ('Téléphone', saisie(o, 'telephone', '+225 …')),
        champ('Enrôlement des migrants', choix(o, 'enrolement', [{ value: false, label: 'Non : la structure reçoit des référencements' }, { value: true, label: 'Oui : la structure dispose d\'agents enquêteurs' }], 'Habilitation', () => {}), 'Autorise le rôle d\'agent enquêteur pour cette structure.')),
      zoneLogo,
      nouveau ? h('div', { class: 'notice warn' }, icon('shield-alert'), 'Une nouvelle structure n\'a aucun droit sur les sections du dossier. Configurez ses droits dans la matrice d\'habilitations après sa création.') : null);
    const m = UI.modal({ title: nouveau ? 'Nouvelle structure' : 'Modifier : ' + o.code, icon: 'building-2', body, actions: [{ label: 'Annuler' }, { label: nouveau ? 'Créer la structure' : 'Enregistrer', icon: 'save', onclick: async () => {
      o.code = (o.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''); o.id = o.code;
      if (!o.code || !o.nom) { UI.toast('Sigle et dénomination sont obligatoires.', 'alert-triangle'); return false; }
      if (nouveau && Ad.structures.some((x) => x.code === o.code)) { UI.toast('Ce sigle existe déjà.', 'alert-triangle'); return false; }
      if (s && s.enrolement && !o.enrolement && Ad.annuaire.some((u) => u.structure === o.code && u.role === 'agent' && u.statut === 'Actif')) { UI.toast('Des agents enquêteurs actifs sont rattachés à cette structure : suspendez-les ou changez leur rôle avant de retirer l\'habilitation.', 'alert-triangle'); return false; }
      await enregistrer('structures_cfg', o, nouveau ? 'Création de structure' : 'Modification de structure', o.code + (s && s.logo !== o.logo ? ' (logo mis à jour)' : ''));
      UI.toast(nouveau ? 'Structure créée. Configurez maintenant ses habilitations.' : 'Structure mise à jour.'); App.go(nouveau ? '#/portail/habilitations' : '#/portail/admin-structures');
    } }] });
    m.el.style.maxWidth = '720px';
  };
  Ad.statutStructure = async function (s) {
    const statut = s.statut === 'Active' ? 'Suspendue' : 'Active'; let motif = '';
    if (statut === 'Suspendue') { motif = await UI.prompt('Suspendre ' + s.code, 'Motif (tracé dans le journal d\'audit). Les comptes de la structure ne pourront plus se connecter :'); if (!motif) return; }
    await enregistrer('structures_cfg', { ...s, statut }, statut === 'Suspendue' ? 'Suspension de structure' : 'Réactivation de structure', s.code + (motif ? ' — ' + motif : ''));
    UI.toast(statut === 'Suspendue' ? s.code + ' suspendue.' : s.code + ' réactivée.'); App.render();
  };

  /* ---------- Parc de tablettes ---------- */
  Ad.tablettes_ = function (c, data) {
    const derniere = {}; data.ds.forEach((d) => { if (d.tablette && (!derniere[d.tablette] || d.synced_at > derniere[d.tablette])) derniere[d.tablette] = d.synced_at; });
    const nbDos = {}; data.ds.forEach((d) => { if (d.tablette) nbDos[d.tablette] = (nbDos[d.tablette] || 0) + 1; });
    const lst = Ad.tablettes.slice().sort((a, b) => a.id.localeCompare(b.id));
    const userDe = (id) => Ad.annuaire.find((u) => u.id === id);
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Parc de tablettes'), h('p', { class: 'sub' }, 'Tablettes d\'enrôlement, affectation aux enquêteurs et suivi des synchronisations. Une tablette révoquée ne peut plus synchroniser.')),
      h('button', { class: 'btn primary', onclick: () => Ad.formTablette(null) }, icon('plus'), 'Enregistrer une tablette')),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kc('o', 'tablet', 'Tablettes', lst.length), kc('g', 'circle-check', 'En service', lst.filter((t) => t.statut === 'En service').length),
        kc('b', 'package', 'En stock', lst.filter((t) => t.statut === 'En stock').length), kc('d', 'ban', 'Révoquées', lst.filter((t) => t.statut === 'Révoquée').length)),
      h('div', { class: 'card p0' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Tablette', 'Structure', 'Site', 'Enquêteur affecté', 'Dossiers synchronisés', 'Dernière synchronisation', 'Statut', ''].map((x) => h('th', null, x)))),
        h('tbody', null, lst.map((t) => { const u = userDe(t.affectee);
          return h('tr', null, h('td', null, h('div', { class: 'who' }, h('span', { class: 'av ticon o' }, icon('tablet')), h('div', null, h('b', null, t.id), h('div', { class: 'tiny muted' }, t.modele || '')))),
            h('td', null, h('div', { class: 'who' }, Ad.logo(t.structure, 28), h('b', null, t.structure))), h('td', { class: 'small' }, t.site || '—'),
            h('td', null, u ? [h('div', null, u.nom), h('div', { class: 'tiny muted' }, u.statut)] : h('span', { class: 'muted' }, 'Non affectée')),
            h('td', null, nbDos[t.id] || 0), h('td', { class: 'small muted' }, derniere[t.id] ? UI.ago(derniere[t.id]) : 'Jamais'),
            h('td', null, h('span', { class: 'badge solid ' + (STATUT_T[t.statut] || 'grey') }, t.statut)),
            h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, h('button', { class: 'btn sm', title: 'Modifier', onclick: () => Ad.formTablette(t) }, icon('pencil')),
              t.statut !== 'Révoquée' ? h('button', { class: 'btn sm danger', title: 'Révoquer (perte, vol)', onclick: () => Ad.revoquer(t) }, icon('ban')) : null)));
        }))))));
  };
  Ad.formTablette = function (t) {
    const nouveau = !t; const o = t ? { ...t } : { statut: 'En stock', structure: 'DGIE', modele: 'Tablette durcie 10 pouces', affectee: '', created_at: new Date().toISOString() };
    const body = h('div', { class: 'stack' },
      h('div', { class: 'grid g2' }, champ('Identifiant', nouveau ? saisie(o, 'id', 'Ex. : TAB-DGIE-06') : h('input', { class: 'input', readonly: true, value: o.id })), champ('Modèle', saisie(o, 'modele'))),
      h('div', { class: 'grid g2' }, champ('Structure', choix(o, 'structure', M.structures.map((s) => ({ value: s.code, label: s.code, right: s.nom })), 'Structure')), champ('Site', saisie(o, 'site', 'Ex. : Site d\'accueil de Bouaké'))),
      champ('Statut', choix(o, 'statut', Object.keys(STATUT_T).map((x) => ({ value: x, label: x })), 'Statut')),
      h('div', { class: 'help' }, 'L\'affectation à un enquêteur se fait depuis sa fiche utilisateur.'));
    UI.modal({ title: nouveau ? 'Enregistrer une tablette' : 'Modifier : ' + o.id, icon: 'tablet', body, actions: [{ label: 'Annuler' }, { label: 'Enregistrer', icon: 'save', onclick: async () => {
      o.id = (o.id || '').toUpperCase().trim(); if (!o.id || !o.structure) { UI.toast('Identifiant et structure sont obligatoires.', 'alert-triangle'); return false; }
      if (nouveau && Ad.tablettes.some((x) => x.id === o.id)) { UI.toast('Cet identifiant existe déjà.', 'alert-triangle'); return false; }
      await enregistrer('tablettes', o, nouveau ? 'Enregistrement de tablette' : 'Modification de tablette', o.id); UI.toast('Tablette enregistrée.'); App.render();
    } }] });
  };
  Ad.revoquer = async function (t) {
    const motif = await UI.prompt('Révoquer ' + t.id, 'Motif de la révocation (perte, vol, panne). L\'enquêteur affecté perd l\'accès à cette tablette :'); if (!motif) return;
    const u = Ad.annuaire.find((x) => x.id === t.affectee); if (u) await Store.db.upsert('annuaire', { ...u, tablette: '' });
    await enregistrer('tablettes', { ...t, statut: 'Révoquée', affectee: '' }, 'Révocation de tablette', t.id + ' — ' + motif);
    UI.toast(t.id + ' révoquée.', 'ban'); App.render();
  };

  /* ---------- Habilitations : modification d'une cellule de la matrice ---------- */
  Ad.modifierDroits = function (code, section) {
    const s = Ad.structures.find((x) => x.code === code); if (!s) return;
    const actuels = new Set((s.matrice || {})[section] || []);
    const LIB = { L: 'Lecture', S: 'Saisie', M: 'Modification', V: 'Validation' };
    const body = h('div', { class: 'stack' }, h('p', { style: { margin: 0 } }, `Droits de ${code} sur la section ${section} — ${M.SECTIONS[section]} (sensibilité ${M.sensibiliteSections[section]}).`),
      h('div', { class: 'row' }, Object.entries(LIB).map(([k, l]) => h('label', { class: 'chip', style: { padding: '8px 12px' } }, h('input', { type: 'checkbox', checked: actuels.has(k) || null, onchange: (e) => { e.target.checked ? actuels.add(k) : actuels.delete(k); } }), k + ' — ' + l))),
      M.sensibiliteSections[section] === 'N3' ? h('div', { class: 'notice warn' }, icon('shield-alert'), 'Section de sensibilité N3 : n\'accorder ce droit qu\'aux structures dont la mission l\'exige.') : null);
    UI.modal({ title: 'Habilitations', icon: 'shield-check', body, actions: [{ label: 'Annuler' }, { label: 'Enregistrer', icon: 'save', onclick: async () => {
      const ordre = ['L', 'S', 'M', 'V'].filter((x) => actuels.has(x)); if (ordre.some((x) => x !== 'L') && !ordre.includes('L')) ordre.unshift('L');
      const mat = { ...(s.matrice || {}), [section]: ordre };
      await enregistrer('structures_cfg', { ...s, matrice: mat }, 'Modification des habilitations', `${code} / section ${section} : ${ordre.join('') || 'aucun droit'}`);
      UI.toast('Habilitations mises à jour.'); App.render();
    } }] });
  };

  window.Admin = Ad;
})();
