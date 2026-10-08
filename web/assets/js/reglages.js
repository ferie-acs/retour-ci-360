/* Paramètres : apparence, stockage local (portail et tablette), connexion, appareil, et réglages de la plateforme (administration) */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const R = { onglet: 'general' };
  const carteC = (ic, t, titre, droite, ...corps) => h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + t }, icon(ic)), titre), droite || null), ...corps);
  const octets = (n) => (n < 1024 ? n + ' o' : n < 1048576 ? (n / 1024).toFixed(1).replace('.', ',') + ' Ko' : (n / 1048576).toFixed(2).replace('.', ',') + ' Mo');
  const lire = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return localStorage.getItem(k); } };
  const ligneReglage = (ic, titre, desc, ctrl) => h('div', { class: 'param-row' }, h('span', { class: 'ticon o' }, icon(ic)), h('div', { class: 'grow' }, h('b', null, titre), desc ? h('div', { class: 'small muted' }, desc) : null), ctrl);
  const telecharger = (nom, contenu) => { const a = h('a', { href: URL.createObjectURL(new Blob([contenu], { type: 'application/json' })), download: nom }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

  /* Description lisible des clés du stockage local */
  const TABLES = { dossiers: 'Dossiers (base centrale locale)', referencements: 'Référencements', alertes: 'Alertes', doublons: 'Doublons', audit: 'Journal d\'audit', sites: 'Sites d\'accueil', arrivees: 'Arrivées et manifestes', transferts: 'Transferts de dossier',
    approbations: 'Demandes de validation', parametres: 'Paramètres de la plateforme', rapports: 'Rapports programmés', annonces: 'Annonces', relais: 'Relais d\'entretien', structures_cfg: 'Structures et matrice', annuaire: 'Annuaire des utilisateurs', tablettes: 'Parc de tablettes', seq: 'Compteur de l\'identifiant national' };
  const PREFS = { 'r360.theme': 'Thème', 'r360.mini': 'Menu réduit', 'r360.profil': 'Profil connecté', 'r360.onglet': 'Onglet de l\'accueil', 'r360.version': 'Version du jeu de données', 'r360.mode': 'Source de données', 'r360.texte': 'Taille du texte', 'r360.calme': 'Animations réduites' };
  function inventaire() {
    return Object.keys(localStorage).filter((k) => k.startsWith('r360.')).sort().map((k) => {
      const brut = localStorage.getItem(k) || ''; const v = lire(k); const n = Array.isArray(v) ? v.length : null;
      let groupe = 'Préférences', lib = PREFS[k] || k;
      if (k.startsWith('r360.central.')) { groupe = 'Base centrale (mode local)'; lib = TABLES[k.slice(13)] || k.slice(13); }
      else if (k.startsWith('r360.tablette.')) { groupe = 'Tablette'; const r = k.slice(14); lib = r.startsWith('arrivees.') ? 'Arrivées en cache (' + r.slice(9) + ')' : r.startsWith('sites.') ? 'Sites en cache (' + r.slice(6) + ')' : r.startsWith('annonces.') ? 'Annonces en cache (' + r.slice(9) + ')' : 'Entretiens de la tablette ' + r; }
      else if (k.startsWith('r360.tabseq.')) { groupe = 'Tablette'; lib = 'Compteur provisoire ' + k.slice(12); }
      else if (k.startsWith('r360.online.')) { groupe = 'Tablette'; lib = 'État du réseau simulé ' + k.slice(12); }
      else if (k.startsWith('r360.impressions.')) { groupe = 'Impressions'; lib = 'Compteur d\'impression'; }
      return { k, groupe, lib, n, taille: (k.length + brut.length) * 2, v };
    });
  }

  R.page = async function (c, p, data) {
    const admin = p.role === 'admin';
    const ONG = [['general', 'sliders-horizontal', 'Général'], ['stockage', 'database', 'Stockage local'], ['connexion', 'cloud', 'Connexion'], ['appareil', 'monitor-smartphone', 'Appareil'], admin ? ['plateforme', 'settings-2', 'Plateforme'] : null].filter(Boolean);
    if (!ONG.some(([k]) => k === R.onglet)) R.onglet = 'general';
    const zone = h('div'); const tabs = h('div', { class: 'tabs', style: { marginTop: 0 } });
    const paintTabs = () => { tabs.innerHTML = ''; ONG.forEach(([k, ic, l]) => tabs.append(h('button', { class: k === R.onglet ? 'on' : '', onclick: () => { R.onglet = k; paintTabs(); paint(); } }, icon(ic), l))); UI.refreshIcons(); };
    const paint = async () => { zone.innerHTML = ''; zone.classList.remove('fondu'); void zone.offsetWidth; zone.classList.add('fondu'); await R[R.onglet](zone, p, data); UI.refreshIcons(); };
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Paramètres'), h('p', { class: 'sub' }, p.espace === 'agent' ? 'Réglages de la tablette ' + p.tablette + ' : apparence, données conservées sur l\'appareil, connexion.' : 'Réglages de l\'application, données conservées dans ce navigateur, connexion' + (admin ? ' et paramètres de la plateforme.' : '.')))),
      h('div', { class: 'card p0', style: { marginBottom: '16px' } }, tabs), zone);
    paintTabs(); await paint();
  };

  /* ---------- Général ---------- */
  R.general = function (z, p) {
    const theme = Store.LS.get('r360.theme', null) || 'system';
    const choix = (cle, valeurs, actuel, appliquer) => h('div', { class: 'periods' }, valeurs.map(([k, l]) => h('button', { class: k === actuel ? 'on' : '', onclick: () => appliquer(k) }, l)));
    const sw = (on, f) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: on ? true : null, onchange: (e) => f(e.target.checked) }), h('span', null));
    z.append(h('div', { class: 'grid g2' },
      carteC('palette', 'o', 'Apparence', null,
        ligneReglage('sun-moon', 'Thème', 'Clair, sombre ou selon le réglage de l\'appareil.', choix('theme', [['light', 'Clair'], ['dark', 'Sombre'], ['system', 'Système']], theme, (k) => {
          if (k === 'system') { localStorage.removeItem('r360.theme'); document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } else { Store.LS.set('r360.theme', k); document.documentElement.dataset.theme = k; }
          App.render(); })),
        ligneReglage('type', 'Taille du texte', 'Agrandit l\'ensemble de l\'interface (utile sur tablette).', choix('texte', [['normal', 'Normale'], ['grand', 'Grande'], ['tres', 'Très grande']], Store.LS.get('r360.texte', 'normal'), (k) => { Store.LS.set('r360.texte', k); document.documentElement.dataset.texte = k; App.render(); })),
        ligneReglage('panel-left-close', 'Menu latéral réduit', 'N\'affiche que les icônes dans la barre latérale.', sw(document.body.classList.contains('mini'), (v) => { document.body.classList.toggle('mini', v); Store.LS.set('r360.mini', v); })),
        ligneReglage('wind', 'Animations réduites', 'Supprime les transitions et animations (cartes, listes).', sw(Store.LS.get('r360.calme', false), (v) => { Store.LS.set('r360.calme', v); document.documentElement.dataset.calme = v ? '1' : ''; }))),
      carteC('user-round', 'b', 'Mon profil', null, h('div', { class: 'card-b' },
        h('div', { class: 'who', style: { marginBottom: '14px' } }, Admin.logo(p.structure, 44), h('div', null, h('b', { style: { fontSize: 'var(--t-lg)' } }, p.nom), h('div', { class: 'small muted' }, p.roleLabel + ' — ' + p.structure))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Structure'), h('span', null, (M.structures.find((s) => s.code === p.structure) || {}).nom || p.structure)),
        p.site ? h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Site'), h('span', null, p.site)) : null,
        p.tablette ? h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Tablette'), h('span', null, p.tablette)) : null,
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Identifiant du compte'), h('span', null, h('code', null, p.id))),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn', onclick: () => { App.profil = null; Store.LS.set('r360.profil', null); App.go('#/'); } }, icon('users'), 'Changer de profil'))))));
  };

  /* ---------- Stockage local ---------- */
  R.stockage = async function (z, p) {
    const inv = inventaire(); const total = inv.reduce((a, x) => a + x.taille, 0);
    let est = null; try { est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch (e) { est = null; }
    let persistant = null; try { persistant = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { persistant = null; }
    const QUOTA_LS = 5 * 1024 * 1024; const pct = Math.min(100, Math.round((100 * total) / QUOTA_LS));
    const tab = p.tablette ? Store.Tablette.list(p.tablette) : [];
    const kc = (t, ic, l, v, sous) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, l), h('div', { class: 'kv' }, v), sous ? h('div', { class: 'tiny', style: { opacity: 0.9 } }, sous) : null), UI.filigrane(ic));
    z.append(h('div', { class: 'grid g4', style: { marginBottom: '20px' } },
      kc('o', 'hard-drive', 'Stockage local utilisé', octets(total), pct + ' % de la limite indicative de 5 Mo'),
      kc('d', 'key-round', 'Clés enregistrées', inv.length, [...new Set(inv.map((x) => x.groupe))].length + ' catégories'),
      p.tablette ? kc('b', 'tablet', 'Entretiens sur la tablette', tab.length, tab.filter((d) => d.statut === 'Prêt à synchroniser').length + ' à synchroniser · ' + tab.filter((d) => d.statut === 'Brouillon').length + ' brouillon(s)')
        : kc('b', 'database', 'Dossiers en base locale', (lire('r360.central.dossiers') || []).length, App.mode === 'supabase' ? 'base partagée active' : 'mode local'),
      kc('g', 'shield-check', 'Stockage persistant', persistant === null ? 'Non pris en charge' : persistant ? 'Accordé' : 'Non accordé', est ? 'Espace navigateur : ' + octets(est.usage || 0) + ' sur ' + octets(est.quota || 0) : '')));
    if (p.tablette && tab.some((d) => d.statut === 'Prêt à synchroniser')) z.append(h('div', { class: 'notice warn', style: { marginBottom: '16px' } }, icon('triangle-alert'), 'Des entretiens ne sont pas encore synchronisés : ne videz pas les données de la tablette avant la synchronisation.', h('button', { class: 'btn sm primary', style: { marginLeft: 'auto' }, onclick: () => Agent.synchroniser(p) }, icon('refresh-cw'), 'Synchroniser')));
    const voir = (x) => {
      const pre = h('pre', { class: 'json-view' }); const q = h('input', { class: 'input', placeholder: 'Filtrer le contenu (texte)…' });
      const rendre = () => { let v = x.v; if (Array.isArray(v) && q.value.trim()) v = v.filter((e) => UI.norm(JSON.stringify(e)).includes(UI.norm(q.value))); const txt = JSON.stringify(v, (k, val) => (typeof val === 'string' && val.startsWith('data:') ? '[image ' + octets(val.length) + ']' : val), 2); pre.textContent = txt.length > 200000 ? txt.slice(0, 200000) + '\n… (contenu tronqué à l\'affichage)' : txt; };
      q.oninput = rendre; rendre();
      UI.modal({ title: x.lib, icon: 'braces', body: h('div', { class: 'stack' }, h('div', { class: 'row', style: { gap: '8px' } }, h('code', null, x.k), h('span', { class: 'badge grey' }, octets(x.taille)), x.n !== null ? h('span', { class: 'badge info' }, x.n + ' élément(s)') : null), Array.isArray(x.v) ? q : null, pre),
        actions: [{ label: 'Exporter en JSON', icon: 'download', onclick: () => { telecharger(x.k + '.json', JSON.stringify(x.v, null, 2)); return false; } }, { label: 'Fermer', cls: 'primary' }] }).el.style.maxWidth = '960px';
    };
    const vider = async (x) => {
      const sensible = x.k.startsWith('r360.central.') || (x.k.startsWith('r360.tablette.TAB') && (x.v || []).some((d) => d.statut !== 'Synchronisé'));
      const ok = await UI.prompt('Vider « ' + x.lib + ' »', (sensible ? 'Attention : ces données ne sont peut-être pas sauvegardées ailleurs. ' : '') + 'Tapez VIDER pour confirmer :', 'VIDER');
      if (!ok || ok.trim().toUpperCase() !== 'VIDER') return;
      localStorage.removeItem(x.k); await Store.audit('Stockage local vidé', x.k, ''); UI.toast('« ' + x.lib + ' » vidé.', 'trash-2'); App.render();
    };
    const groupes = [...new Set(inv.map((x) => x.groupe))];
    const tbl = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Donnée', 'Clé', 'Éléments', 'Taille', ''].map((x) => h('th', null, x)))),
      h('tbody', null, groupes.flatMap((g) => [h('tr', { class: 'grp' }, h('td', { colspan: 5 }, h('b', null, g), h('span', { class: 'tiny muted', style: { marginLeft: '8px' } }, octets(inv.filter((x) => x.groupe === g).reduce((a, x) => a + x.taille, 0))))),
        ...inv.filter((x) => x.groupe === g).map((x) => h('tr', null, h('td', null, x.lib), h('td', null, h('code', { class: 'tiny' }, x.k)), h('td', null, x.n === null ? '—' : x.n),
          h('td', null, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, h('div', { class: 'progress', style: { width: '60px' } }, h('div', { style: { width: Math.max(2, Math.round((100 * x.taille) / (total || 1))) + '%' } })), h('span', { class: 'small' }, octets(x.taille)))),
          h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, h('button', { class: 'btn sm', title: 'Voir le contenu', onclick: () => voir(x) }, icon('eye')),
            h('button', { class: 'btn sm', title: 'Exporter en JSON', onclick: () => telecharger(x.k + '.json', JSON.stringify(x.v, null, 2)) }, icon('download')),
            x.groupe === 'Préférences' && x.k === 'r360.profil' ? null : h('button', { class: 'btn sm danger', title: 'Vider', onclick: () => vider(x) }, icon('trash-2'))))))]))));
    const restaurer = () => {
      const inp = h('input', { type: 'file', accept: '.json', style: { display: 'none' } });
      inp.onchange = async () => { const f = inp.files[0]; if (!f) return; let o; try { o = JSON.parse(await f.text()); } catch (e) { UI.toast('Fichier illisible.', 'alert-triangle'); return; }
        const cles = Object.keys(o.donnees || {}).filter((k) => k.startsWith('r360.'));
        if (!cles.length) { UI.toast('Aucune donnée Retour CI 360 dans ce fichier.', 'alert-triangle'); return; }
        UI.modal({ title: 'Restaurer une sauvegarde', icon: 'upload', body: h('div', { class: 'stack' }, h('div', { class: 'notice warn' }, icon('triangle-alert'), 'Les ' + cles.length + ' clés de la sauvegarde du ' + UI.fmtDate(o.date, true) + ' remplaceront les données actuelles de ce navigateur.'), h('div', { class: 'small muted' }, 'Appareil d\'origine : ' + (o.appareil || '—'))),
          actions: [{ label: 'Annuler' }, { label: 'Restaurer', cls: 'primary', onclick: () => { cles.forEach((k) => localStorage.setItem(k, typeof o.donnees[k] === 'string' ? o.donnees[k] : JSON.stringify(o.donnees[k]))); location.reload(); } }] }); };
      document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
    };
    z.append(carteC('database', 'b', 'Contenu du stockage local de ce ' + (p.tablette ? 'appareil (tablette ' + p.tablette + ')' : 'navigateur'), h('div', { class: 'row' },
      h('button', { class: 'btn sm', onclick: () => { const donnees = {}; inv.forEach((x) => { donnees[x.k] = x.v; }); telecharger('sauvegarde_retour360_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json', JSON.stringify({ application: 'Retour CI 360', date: new Date().toISOString(), appareil: p.tablette || navigator.userAgent, donnees }, null, 1)); Store.audit('Sauvegarde du stockage local', p.tablette || 'navigateur', ''); } }, icon('download'), 'Sauvegarder tout'),
      h('button', { class: 'btn sm', onclick: restaurer }, icon('upload'), 'Restaurer'),
      navigator.storage && navigator.storage.persist && !persistant ? h('button', { class: 'btn sm', onclick: async () => { const r = await navigator.storage.persist(); UI.toast(r ? 'Stockage persistant accordé : le navigateur ne supprimera pas ces données.' : 'Le navigateur a refusé le stockage persistant.', 'shield-check'); App.render(); } }, icon('shield-check'), 'Rendre persistant') : null,
      App.mode === 'local' ? h('button', { class: 'btn sm danger', onclick: async () => { const ok = await UI.prompt('Réinitialiser la démonstration', 'Toutes les données locales seront remplacées par le jeu fictif. Tapez VIDER pour confirmer :', 'VIDER'); if (ok && ok.trim().toUpperCase() === 'VIDER') { await Store.Local.reset(); location.hash = '#/'; location.reload(); } } }, icon('rotate-ccw'), 'Réinitialiser') : null), tbl));
  };

  /* ---------- Connexion ---------- */
  R.connexion = async function (z, p) {
    const c = window.R360_CONFIG || {}; const res = h('span', { class: 'small muted' }, 'Non testée');
    const tester = async () => { res.textContent = 'Test en cours…'; const t0 = performance.now(); try { await Store.db.list('structures_cfg'); res.innerHTML = ''; res.append(h('span', { class: 'badge solid ok' }, 'Réponse en ' + Math.round(performance.now() - t0) + ' ms')); } catch (e) { res.innerHTML = ''; res.append(h('span', { class: 'badge solid danger' }, 'Échec : ' + (e.message || e))); } };
    const masque = (v) => (v ? v.slice(0, 12) + '…' + v.slice(-4) : '[non configurée]');
    z.append(h('div', { class: 'grid g2' },
      carteC('cloud', 'b', 'Source des données', null, h('div', { class: 'card-b' },
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Mode actif'), h('span', null, h('span', { class: 'badge solid ' + (App.mode === 'supabase' ? 'ok' : 'info') }, App.mode === 'supabase' ? 'Base partagée (Supabase)' : 'Mode local (navigateur)'))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Adresse du projet'), h('span', null, h('code', null, c.supabaseUrl || '[non configurée]'))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Clé publique (anon)'), h('span', null, h('code', null, masque(c.supabaseAnonKey)))),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Test de connexion'), res),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn', onclick: tester }, icon('activity'), 'Tester'),
          c.supabaseUrl ? h('button', { class: 'btn', onclick: () => { Store.LS.set('r360.mode', App.mode === 'supabase' ? 'local' : 'auto'); location.reload(); } }, icon('repeat'), App.mode === 'supabase' ? 'Passer en mode local' : 'Utiliser la base partagée') : null),
        h('div', { class: 'small muted', style: { marginTop: '10px' } }, 'La configuration se modifie dans web/assets/js/config.js. La clé de service n\'est jamais enregistrée dans l\'application.'))),
      carteC('wifi', 'g', 'Réseau', null, h('div', { class: 'card-b' },
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Connexion de l\'appareil'), h('span', null, h('span', { class: 'badge solid ' + (navigator.onLine ? 'ok' : 'danger') }, navigator.onLine ? 'En ligne' : 'Hors ligne'))),
        p.tablette ? h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Réseau de la tablette (simulation)'), h('span', null, h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: Store.Tablette.online(p.tablette) ? true : null, onchange: (e) => { Store.Tablette.online(p.tablette, e.target.checked); App.render(); } }), h('span', null)))) : null,
        p.tablette ? h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Entretiens à synchroniser'), h('span', null, String(Store.Tablette.list(p.tablette).filter((d) => d.statut === 'Prêt à synchroniser').length))) : null,
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Fond de carte'), h('span', null, 'OpenStreetMap (rendu OSM France), secours hors connexion : contours Natural Earth'))))));
  };

  /* ---------- Appareil ---------- */
  R.appareil = function (z, p) {
    const ua = navigator.userAgent; const tactile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const lignes = [['Type d\'appareil', p.tablette ? 'Tablette de terrain ' + p.tablette : tactile ? 'Écran tactile' : 'Ordinateur'], ['Navigateur', ua], ['Système', navigator.platform || '—'], ['Langue', navigator.language], ['Fuseau horaire', Intl.DateTimeFormat().resolvedOptions().timeZone],
      ['Écran', screen.width + ' × ' + screen.height + ' px (densité ' + (window.devicePixelRatio || 1) + ')'], ['Fenêtre', innerWidth + ' × ' + innerHeight + ' px'], ['Écran tactile', tactile ? 'Oui' : 'Non'],
      ['Version du jeu de données', Store.LS.get('r360.version', '—')], ['Bibliothèques embarquées', ['Leaflet', 'jsPDF', 'SheetJS', 'html-to-image', 'qrcode-generator', 'Lucide'].filter((x, i) => [window.L, window.jspdf, window.XLSX, window.htmlToImage, window.qrcode, window.lucide][i]).join(', ')]];
    z.append(carteC('monitor-smartphone', 'v', 'Informations sur l\'appareil', h('button', { class: 'btn sm', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(lignes.map((l) => l.join(' : ')).join('\n')); UI.toast('Informations copiées (utile pour le support).', 'clipboard-check'); } }, icon('clipboard'), 'Copier pour le support'),
      h('div', { class: 'card-b' }, lignes.map(([k, v]) => h('div', { class: 'kv' }, h('span', { class: 'k' }, k), h('span', { class: 'small' }, v))))));
  };

  /* ---------- Plateforme (administrateur général) ---------- */
  R.plateforme = async function (z, p, data) {
    const params = data ? data.parametres : await Store.db.list('parametres').catch(() => []);
    const pr = { id: 'plateforme', secret: UI.PARAMS.secret, doublon: UI.PARAMS.doublon, delais: {}, conservation: '[à confirmer]', ...((params || []).find((x) => x.id === 'plateforme') || {}) };
    const num = (v, min, max) => h('input', { class: 'input', type: 'number', min, max, value: v, style: { width: '110px' } });
    const secret = num(pr.secret, 2, 20), doublon = num(pr.doublon, 40, 100);
    const delais = M.TYPES_SERVICE.map((tp) => ({ tp, inp: num(pr.delais[tp.code] || tp.reception, 1, 720) }));
    const conserv = h('input', { class: 'input', value: pr.conservation, style: { width: '220px' } });
    const enregistrer = async () => {
      Object.assign(pr, { secret: Number(secret.value) || 5, doublon: Number(doublon.value) || 60, delais: Object.fromEntries(delais.map((x) => [x.tp.code, Number(x.inp.value) || x.tp.reception])), conservation: conserv.value.trim(), created_at: pr.created_at || new Date().toISOString() });
      await Store.db.upsert('parametres', pr); R.appliquer(pr); await Store.audit('Paramètres de la plateforme', 'plateforme', JSON.stringify(pr)); UI.toast('Paramètres de la plateforme enregistrés.', 'save'); App.render();
    };
    z.append(h('div', { class: 'grid g2' },
      carteC('settings-2', 'o', 'Seuils et règles', h('button', { class: 'btn sm primary', onclick: enregistrer }, icon('save'), 'Enregistrer'),
        ligneReglage('eye-off', 'Secret statistique', 'Effectifs masqués en dessous de ce seuil (statistiques, profilage, données ouvertes).', secret),
        ligneReglage('copy', 'Score minimal de doublon', 'Score à partir duquel la tablette signale un doublon possible (règles R1 à R5).', doublon),
        ligneReglage('archive', 'Durée de conservation des dossiers', 'À fixer avec l\'autorité de protection des données.', conserv),
        ligneReglage('stamp', 'Validations par le superviseur', 'Dossiers, transferts, clôtures, fusions.', h('a', { class: 'btn sm', href: '#/portail/parametres' }, 'Ouvrir'))),
      carteC('timer', 'b', 'Délais de réception des référencements (heures)', null, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Type de service'), h('th', null, 'Délai'))),
        h('tbody', null, delais.map((x) => h('tr', null, h('td', null, x.tp.label), h('td', null, x.inp)))))))),
      h('div', { class: 'grid g3', style: { marginTop: '20px' } },
        [['building-2', 'Structures et logos', '#/portail/admin-structures'], ['user-cog', 'Utilisateurs et rôles', '#/portail/admin-utilisateurs'], ['tablet', 'Parc de tablettes', '#/portail/admin-tablettes'], ['shield-check', 'Matrice d\'habilitations', '#/portail/habilitations'], ['map-pin', 'Sites d\'accueil', '#/portail/sites'], ['scroll-text', 'Journal d\'audit', '#/portail/journal']]
          .map(([ic, l, href]) => h('a', { class: 'card lien-admin', href }, h('span', { class: 'ticon b' }, icon(ic)), h('b', null, l), icon('chevron-right')))));
  };
  R.appliquer = function (pr) {
    if (!pr) return;
    if (pr.secret) UI.PARAMS.secret = Number(pr.secret); if (pr.doublon) UI.PARAMS.doublon = Number(pr.doublon);
    Object.entries(pr.delais || {}).forEach(([k, v]) => { const tp = M.TYPES_SERVICE.find((x) => x.code === k); if (tp && v) tp.reception = Number(v); });
  };
  window.Reglages = R;
})();
