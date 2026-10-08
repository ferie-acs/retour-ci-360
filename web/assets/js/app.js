/* Application : routage, accueil (choix du profil), structure générale (barre latérale et en-tête) */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const App = { profil: null, mode: 'local', recherche: '' };
  /* Thème clair ou sombre : choix mémorisé, sinon préférence du système */
  App.theme = () => document.documentElement.dataset.theme || 'light';
  App.basculerTheme = () => { const t = App.theme() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; Store.LS.set('r360.theme', t); App.render(); };
  const boutonTheme = (cls) => h('button', { class: (cls || 'hicon') + ' theme-btn', title: App.theme() === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre', onclick: App.basculerTheme }, icon(App.theme() === 'dark' ? 'sun' : 'moon'));
  const root = () => document.getElementById('app');
  App.go = (hash) => { if (location.hash === hash) App.render(); else location.hash = hash; };

  /* Logotype textuel aux couleurs du logo : « Retour CI 3 » bleu, « 6 » vert, « 0 » orange */
  const wordmark = () => h('span', { class: 'wordmark' }, 'Retour CI 3', h('span', { class: 'g' }, '6'), h('span', { class: 'o' }, '0'));

  async function deconnexion() {
    if (App.mode === 'supabase') { try { await Store.Supa.signOut(); } catch (e) { /* sans effet */ } }
    App.profil = null; Store.LS.set('r360.profil', null); App.go('#/');
  }
  async function choisir(p) {
    if (App.mode === 'supabase') {
      const c = window.R360_CONFIG;
      try { await Store.Supa.signIn(`${p.id}@${c.domaineComptes}`, c.motDePasseDemo); }
      catch (e) { UI.toast('Connexion impossible : ' + e.message, 'alert-triangle'); return; }
    }
    App.profil = p; Store.LS.set('r360.profil', p.id);
    await Store.audit('Connexion', p.structure, p.roleLabel);
    App.go(p.espace === 'agent' ? '#/agent' : '#/portail/tableau');
  }
  const reinitialiser = async () => { await Store.Local.reset(); location.hash = '#/'; location.reload(); };
  const basculerMode = () => { Store.LS.set('r360.mode', App.mode === 'supabase' ? 'local' : 'auto'); location.reload(); };

  /* ---------- Accueil : choix du profil de démonstration ---------- */
  function accueil(el) {
    let onglet = Store.LS.get('r360.onglet', 'portail');
    const liste = h('div', { class: 'plist' });
    const card = (p) => h('button', { class: 'profile-card', onclick: () => choisir(p) },
      Admin.logo(p.structure, 40),
      h('span', { style: { flex: 1, minWidth: 0 } }, h('strong', null, p.nom), h('span', { class: 'small muted' }, p.roleLabel + ' — ' + p.structure + (p.tablette ? ' · ' + p.tablette : ''))), p.espace === 'agent' ? icon('tablet') : null, icon('chevron-right'));
    const tabs = h('div', { class: 'tabs' });
    const paint = () => {
      tabs.innerHTML = '';
      [['portail', 'building-2', 'Portail des structures'], ['agent', 'tablet', 'Espace agent (tablette)']].forEach(([k, ic, l]) =>
        tabs.append(h('button', { class: k === onglet ? 'on' : '', onclick: () => { onglet = k; Store.LS.set('r360.onglet', k); paint(); } }, icon(ic), l)));
      liste.innerHTML = ''; Admin.profilsConnectables().filter((p) => p.espace === onglet).forEach((p) => liste.append(card(p)));
      UI.refreshIcons();
    };
    const feat = (ic, l) => h('div', null, h('span', { class: 'fi' }, icon(ic)), l);
    el.append(h('div', { class: 'auth' },
      h('div', { class: 'auth-l' },
        h('div', { class: 'auth-tools' }, boutonTheme()),
        h('img', { class: 'logo-full', src: 'assets/img/logo-retour-ci-360.png', alt: 'Retour CI 360 — Gestion intégrée du retour et de la réinsertion des Ivoiriens de l\'extérieur' }),
        h('h1', null, 'Choisissez un profil de démonstration'),
        h('p', { class: 'sub' }, 'Chaque profil ouvre l\'espace correspondant, avec les droits d\'accès de sa structure. Toutes les données sont fictives.'),
        tabs, liste,
        h('div', { class: 'foot' }, 'Gestion intégrée du retour et de la réinsertion des Ivoiriens de l\'extérieur', ' · ', h('a', { href: '#/donnees-ouvertes' }, 'Données ouvertes'), ' · ', h('a', { href: '#/verifier' }, 'Vérifier un document'))),
      h('div', { class: 'auth-r' },
        h('h2', null, 'Base de données nationale des migrants ivoiriens de retour'),
        h('p', null, 'Gestion intégrée du retour et de la réinsertion des Ivoiriens de l\'extérieur : de l\'entretien sur le terrain jusqu\'au suivi par les structures partenaires.'),
        h('div', { class: 'feat' }, feat('wifi-off', 'Entretien même hors connexion'), feat('fingerprint', 'Identifiant national unique'),
          feat('siren', 'Alertes de vulnérabilité'), feat('send', 'Référencements et suivi'), feat('shield-check', 'Droits par structure et section'), feat('scroll-text', 'Traçabilité complète')),
        h('div', { class: 'src' }, h('div', { class: 'small muted' }, 'Source des données'),
          h('b', null, App.mode === 'supabase' ? 'Base partagée : le portail et les tablettes voient les mêmes dossiers' : 'Mode local : données conservées dans ce navigateur'),
          h('div', { class: 'row', style: { marginTop: '10px' } },
            Store.Supa.client || window.R360_CONFIG.supabaseUrl ? h('button', { class: 'btn sm', onclick: basculerMode }, icon('repeat'), App.mode === 'supabase' ? 'Passer en mode local' : 'Utiliser la base partagée') : null,
            App.mode === 'local' ? h('button', { class: 'btn sm', onclick: reinitialiser }, icon('rotate-ccw'), 'Réinitialiser la démonstration') : null)))));
    paint();
  }

  /* ---------- Structure générale ---------- */
  const NAV = {
    portail: (p) => [
      ['Principal', [['tableau', 'layout-dashboard', 'Tableau de bord'], ['taches', 'list-checks', 'Mes tâches'], ['annonces', 'megaphone', 'Canal de diffusion'], ['statistiques', 'chart-pie', 'Statistiques']]],
      ['Accueil des migrants', [['sites', 'map-pin', 'Sites'], ['arrivees', 'plane-landing', 'Arrivées']]],
      ['Dossiers', [['pipeline', 'git-branch', 'Pipeline du parcours'], ['migrants', 'users', 'Migrants enregistrés'], ['dossiers', 'folder-open', 'Dossiers'], ['referencements', 'send', 'Référencements'], ['alertes', 'siren', 'Alertes']]],
      ['responsable', 'admin'].includes(p.role) ? ['Pilotage', [['pilotage', 'gauge-circle', 'Vue du responsable']].concat(p.role === 'responsable' ? [['qualite', 'gauge', 'Qualité des données'], ['rapports', 'calendar-clock', 'Rapports programmés']] : [])] : null,
      p.role === 'superviseur' ? ['Supervision', [['doublons', 'copy', 'Doublons'], ['qualite', 'gauge', 'Qualité des données'], ['rapports', 'calendar-clock', 'Rapports programmés'], ['admin-utilisateurs', 'user-cog', 'Comptes de ma structure'], ['journal', 'scroll-text', 'Journal d\'audit']]] : null,
      p.role === 'admin' ? ['Supervision', [['doublons', 'copy', 'Doublons'], ['qualite', 'gauge', 'Qualité des données'], ['rapports', 'calendar-clock', 'Rapports programmés']]] : null,
      p.role === 'admin' ? ['Administration', [['admin-utilisateurs', 'user-cog', 'Utilisateurs'], ['admin-structures', 'building-2', 'Structures'], ['admin-tablettes', 'tablet', 'Tablettes'], ['habilitations', 'shield-check', 'Habilitations'], ['parametres', 'sliders-horizontal', 'Validations'], ['journal', 'scroll-text', 'Journal d\'audit']]] : null,
      ['Public', [['donnees-ouvertes', 'globe', 'Données ouvertes']]],
      ['Compte', [['reglages', 'settings', 'Paramètres']]],
    ].filter(Boolean),
    agent: () => [
      ['Principal', [['entretiens', 'clipboard-list', 'Entretiens'], ['nouveau', 'file-plus-2', 'Nouvel entretien'], ['annonces', 'megaphone', 'Annonces']]],
      ['Tablette', [['synchro', 'refresh-cw', 'Synchroniser'], ['reseau', 'wifi', 'Réseau'], ['reglages', 'settings', 'Paramètres']]],
    ],
  };
  const navHref = (esp, k) => (k === 'donnees-ouvertes' ? '#/donnees-ouvertes' : esp === 'portail' ? '#/portail/' + k : k === 'entretiens' ? '#/agent' : k === 'annonces' ? '#/agent/annonces' : k === 'reglages' ? '#/agent/reglages' : null);
  /* Un compteur se pose aux trois endroits qui le portent : menu latéral, barre d'onglets
     et pastille d'en-tête. Le premier « return » d'origine coupait les deux autres dès que
     l'entrée n'existait pas dans le menu latéral. */
  App.badge = (k, n, couleur) => {
    document.querySelectorAll(`.nav[data-k="${k}"] .count, .tb-item[data-k="${k}"] .count, .sheet-item[data-k="${k}"] .count`).forEach((el) => {
      el.textContent = n; el.classList.toggle('hidden', !n); el.classList.toggle('o', couleur === 'o');
    });
    const hb = document.querySelector(`[data-hb="${k}"]`);
    if (hb) { hb.textContent = n; hb.classList.toggle('hidden', !n); }
  };

  /* ---------- Barre de navigation basse (tablette et téléphone) ----------
     Sur tablette, la barre latérale mange un cinquième de l'écran et le pouce ne l'atteint pas.
     Cinq onglets en bas, dans le pouce, actif marqué par une pastille — exactement le repère
     visuel déjà utilisé par le menu latéral, donc rien de nouveau à apprendre.
     Le cinquième onglet ouvre le menu complet : aucune entrée n'est perdue. */
  const ONGLETS = {
    portail: [['tableau', 'layout-dashboard', 'Accueil'], ['pipeline', 'git-branch', 'Pipeline'],
      ['taches', 'list-checks', 'Tâches'], ['dossiers', 'folder-open', 'Dossiers']],
    agent: [['entretiens', 'clipboard-list', 'Entretiens'], ['nouveau', 'file-plus-2', 'Nouveau'],
      ['synchro', 'refresh-cw', 'Synchro'], ['annonces', 'megaphone', 'Annonces']],
  };

  const TONS_GROUPES = ['o', 'g', 'b', 'v', 't', 'p', 'r'];

  /* Feuille de navigation : le menu complet monte du bas, à la main qui tient la tablette.
     Un tiroir latéral obligerait à traverser l'écran ; ici tout part du même bord. */
  function feuilleMenu(actif, p) {
    const esp = p.espace;
    const fond = h('div', { class: 'sheet-bg', onclick: () => fermerFeuille() });
    const corps = h('div', { class: 'sheet' },
      h('div', { class: 'sheet-poignee', 'aria-hidden': 'true' }),
      h('div', { class: 'sheet-tete' },
        h('b', null, 'Navigation'),
        h('button', { class: 'hicon', type: 'button', 'aria-label': 'Fermer', onclick: () => fermerFeuille() }, icon('x'))),
      h('div', { class: 'sheet-corps' }, NAV[esp](p).filter(Boolean).map(([g, items], gi) => {
        /* Une teinte par groupe, prise dans un ordre fixe : la couleur sert à repérer la famille,
           pas à décorer. Deux groupes voisins ne portent jamais la même. */
        const ton = TONS_GROUPES[gi % TONS_GROUPES.length];
        return h('div', { class: 'sheet-grp' },
          h('div', { class: 'sheet-titre' }, h('span', { class: 'sheet-point ' + ton }), g),
          h('div', { class: 'sheet-liste' }, items.map(([k, ic, l]) => {
            const href = navHref(esp, k);
            const act = k === 'nouveau' ? () => Agent.nouveau(p) : k === 'synchro' ? () => Agent.synchroniser(p)
              : k === 'reseau' ? () => { Store.Tablette.online(p.tablette, !Store.Tablette.online(p.tablette)); App.render(); } : null;
            const lbl = k === 'reseau' ? (Store.Tablette.online(p.tablette) ? 'Simuler une coupure' : 'Rétablir le réseau') : l;
            const ic2 = k === 'reseau' ? (Store.Tablette.online(p.tablette) ? 'wifi-off' : 'wifi') : ic;
            return h(href ? 'a' : 'button', { class: 'sheet-item' + (k === actif ? ' on' : ''), 'data-k': k,
              href: href || null, type: href ? null : 'button',
              onclick: (e) => { if (act) { e.preventDefault(); } fermerFeuille(); if (act) act(); } },
              h('span', { class: 'ticon ' + ton }, icon(ic2)),
              h('span', { class: 'grow' }, lbl),
              h('span', { class: 'count hidden' }),
              h('span', { class: 'sheet-fleche' }, icon('chevron-right')));
          })));
      })));
    return h('div', { class: 'sheet-wrap hidden' }, fond, corps);
  }
  function fermerFeuille() { const w = document.querySelector('.sheet-wrap'); if (w) w.classList.add('hidden'); document.body.classList.remove('sheet-open'); }
  function ouvrirFeuille() { const w = document.querySelector('.sheet-wrap'); if (!w) return; w.classList.remove('hidden'); document.body.classList.add('sheet-open'); UI.refreshIcons(); }

  function barreOnglets(actif, p) {
    const esp = p.espace;
    const items = (ONGLETS[esp] || []).map(([k, ic, l]) => {
      const href = navHref(esp, k);
      const act = k === 'nouveau' ? () => Agent.nouveau(p) : k === 'synchro' ? () => Agent.synchroniser(p) : null;
      /* Le libellé n'apparaît que sur l'onglet actif : c'est ce qui donne la pastille allongée.
         Les autres gardent `title` et `aria-label`, donc restent identifiables. */
      return h(href ? 'a' : 'button', { class: 'tb-item' + (k === actif ? ' on' : ''), 'data-k': k,
        href: href || null, type: href ? null : 'button', title: l, 'aria-label': l,
        'aria-current': k === actif ? 'page' : null,
        onclick: act ? (e) => { e.preventDefault(); act(); } : null },
        h('span', { class: 'tb-ic' }, icon(ic), h('span', { class: 'tb-compte count hidden' })),
        h('span', { class: 'tb-lbl' }, l));
    });
    const ouvert = () => document.body.classList.contains('sheet-open');
    items.push(h('button', { class: 'tb-item tb-plus', type: 'button', title: 'Menu complet', 'aria-label': 'Ouvrir le menu complet',
      onclick: () => (ouvert() ? fermerFeuille() : ouvrirFeuille()) },
      h('span', { class: 'tb-ic' }, icon('menu')), h('span', { class: 'tb-lbl' }, 'Menu')));
    return h('nav', { class: 'tabbar', 'aria-label': 'Navigation principale' }, items);
  }

  function layout(actif) {
    /* Chaque rendu repart d'une vue normale : seule la vue d'entretien remet ce drapeau. */
    document.body.classList.remove('entretien');
    const p = App.profil; const esp = p.espace;
    const side = h('aside', { class: 'sidebar' },
      h('a', { class: 's-logo', href: esp === 'agent' ? '#/agent' : '#/portail/tableau' }, h('img', { src: 'assets/img/embleme.png', alt: '' }), wordmark()),
      h('button', { class: 'toggle-side', title: 'Réduire ou déplier le menu', 'aria-label': 'Réduire ou déplier le menu', onclick: () => { document.body.classList.toggle('mini'); Store.LS.set('r360.mini', document.body.classList.contains('mini')); } }, icon('chevrons-left')),
      h('div', { class: 's-body' }, NAV[esp](p).map(([g, items], i) => [i ? h('div', { class: 's-sep' }) : null, h('div', { class: 's-grp' }, g),
        items.map(([k, ic, l]) => {
          const href = navHref(esp, k);
          const act = k === 'nouveau' ? () => Agent.nouveau(p) : k === 'synchro' ? () => Agent.synchroniser(p) : k === 'reseau' ? () => { Store.Tablette.online(p.tablette, !Store.Tablette.online(p.tablette)); App.render(); } : null;
          const lbl = k === 'reseau' ? (Store.Tablette.online(p.tablette) ? 'Simuler une coupure' : 'Rétablir le réseau') : l;
          const ic2 = k === 'reseau' ? (Store.Tablette.online(p.tablette) ? 'wifi-off' : 'wifi') : ic;
          const el = h(href ? 'a' : 'div', { class: 'nav' + (k === actif ? ' on' : ''), 'data-k': k, href: href || null, onclick: act ? () => { document.body.classList.remove('side-open'); act(); } : () => document.body.classList.remove('side-open') }, icon(ic2), h('span', { class: 'lbl' }, lbl), h('span', { class: 'count hidden' }));
          /* Menu réduit : le libellé disparaît, l'infobulle maison le remplace. Pas de `title`
             natif, dont le délai d'une seconde et le style système jurent avec le reste.
             `clic: false` : sans cela l'infobulle avalerait le clic de navigation. */
          UI.infobulle(el, () => h('span', null, lbl), { clic: false, cote: 'droite', classe: 'tip-nav', actif: () => document.body.classList.contains('mini') });
          return el;
        })])),
      h('div', { class: 'side-foot' }, h('div', { class: 'src' }, h('span', { class: 'ic' }, icon(App.mode === 'supabase' ? 'cloud' : 'hard-drive')),
        h('span', { class: 'txt' }, h('b', null, App.mode === 'supabase' ? 'Base partagée' : 'Mode local'), h('div', { class: 'tiny muted' }, App.mode === 'supabase' ? 'Synchronisée en temps réel' : 'Données dans ce navigateur')))));

    const search = h('input', { placeholder: esp === 'agent' ? 'Rechercher un entretien' : 'Rechercher un dossier', value: App.recherche,
      onkeydown: (e) => { if (e.key === 'Enter') { App.recherche = e.target.value.trim(); App.go(esp === 'agent' ? '#/agent' : '#/portail/dossiers'); } } });
    const panel = h('div', { class: 'panel hidden' },
      h('div', { class: 'who' }, h('span', { class: 'avatar' }, UI.initials(p.nom)), h('div', null, h('b', null, p.nom), h('div', { class: 'tiny muted' }, p.roleLabel + ' — ' + p.structure))),
      h('div', { class: 'item', onclick: () => App.go(esp === 'agent' ? '#/agent/reglages' : '#/portail/reglages') }, icon('settings'), 'Paramètres'),
      h('div', { class: 'item', onclick: deconnexion }, icon('users'), 'Changer de profil'),
      App.mode === 'local' ? h('div', { class: 'item', onclick: reinitialiser }, icon('rotate-ccw'), 'Réinitialiser la démonstration') : null,
      Store.Supa.client || window.R360_CONFIG.supabaseUrl ? h('div', { class: 'item', onclick: basculerMode }, icon('repeat'), App.mode === 'supabase' ? 'Passer en mode local' : 'Utiliser la base partagée') : null,
      h('div', { class: 'item', onclick: deconnexion }, icon('log-out'), 'Se déconnecter'));
    const umenu = h('div', { class: 'umenu' }, h('span', { class: 'avatar', title: p.nom, onclick: (e) => { e.stopPropagation(); panel.classList.toggle('hidden'); } }, UI.initials(p.nom)), panel);
    document.addEventListener('click', () => panel.classList.add('hidden'), { once: true });
    const header = h('header', { class: 'header' },
      /* Sur tablette la barre latérale disparaît : l'emblème prend la place du hamburger,
         sinon l'application n'aurait plus aucune marque à l'écran. */
      h('a', { class: 'h-logo', href: esp === 'agent' ? '#/agent' : '#/portail/tableau', 'aria-label': 'Accueil' }, h('img', { src: 'assets/img/embleme.png', alt: '' })),
      h('label', { class: 'hsearch' }, icon('search'), search, h('span', { class: 'kbd hide-sm' }, 'Ctrl K')),
      h('span', { class: 'spacer' }),
      h('span', { class: 'chip hide-sm', title: (M.structures.find((s) => s.code === p.structure) || {}).nom || p.structure }, Admin.logo(p.structure, 22), p.structure),
      esp === 'agent'
        ? h('button', { class: 'hbtn o', onclick: () => Agent.nouveau(p) }, icon('circle-plus'), h('span', { class: 'hide-sm' }, 'Nouvel entretien'))
        : h('a', { class: 'hbtn o', href: '#/portail/referencements' }, icon('send'), h('span', { class: 'hide-sm' }, 'Référencements')),
      esp === 'agent'
        ? h('button', { class: 'hbtn d hide-sm', onclick: () => Agent.synchroniser(p) }, icon('refresh-cw'), 'Synchroniser')
        : h('a', { class: 'hbtn d hide-sm', href: '#/portail/dossiers' }, icon('folder-open'), 'Dossiers'),
      boutonTheme(),
      h('button', { class: 'hicon hide-sm', title: 'Plein écran', onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {})) }, icon('maximize')),
      h('a', { class: 'hicon', href: esp === 'portail' ? '#/portail/annonces' : '#/agent/annonces', title: 'Canal de diffusion' }, icon('megaphone'), h('span', { class: 'dotc hidden', 'data-hb': 'annonces' })),
      esp === 'portail' ? h('a', { class: 'hicon', href: '#/portail/alertes', title: 'Alertes' }, icon('bell'), h('span', { class: 'dotc hidden', 'data-hb': 'alertes' })) : null,
      umenu);
    const main = h('main', { class: 'main' });
    root().append(h('div', { class: 'layout' }, side, header, main, barreOnglets(actif, p), feuilleMenu(actif, p)));
    document.addEventListener('click', (e) => { if (document.body.classList.contains('side-open') && !side.contains(e.target)) document.body.classList.remove('side-open'); }, { once: true });
    return main;
  }

  let renduEnCours = 0;
  App.render = async function () {
    const n = ++renduEnCours;
    const el = root(); el.innerHTML = '';
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    // pages publiques (sans connexion) : vérification de document, données ouvertes
    if (parts[0] === 'verifier') { await Documents.verifier(el, parts[1], parts[2]); return; }
    if (parts[0] === 'donnees-ouvertes') { await Qualite.ouvertes(el); return; }
    if (!App.profil && parts.length) { location.hash = '#/'; return; }
    if (!parts.length) { accueil(el); UI.refreshIcons(); return; }
    const p = App.profil;
    if (parts[0] === 'agent') {
      if (p.espace !== 'agent') return App.go('#/portail/tableau');
      const main = layout(parts[1] === 'e' ? '' : ['annonces', 'reglages'].includes(parts[1]) ? parts[1] : 'entretiens'); UI.refreshIcons();
      const { annonces, arrivees } = await Agent.annoncesTablette(p);
      if (parts[1] === 'e') Agent.entretien(main, p, parts[2], parts[3]);
      else if (parts[1] === 'annonces') Annonces.page(main.appendChild(h('div', { class: 'page' })), p, annonces, arrivees);
      else if (parts[1] === 'reglages') await Reglages.page(main.appendChild(h('div', { class: 'page' })), p, null);
      else { Agent.liste(main, p); const bd = Annonces.bandeau(p, annonces, arrivees); const pg = main.querySelector('.page'); if (bd && pg) pg.children[0].after(bd); }
      App.badge('annonces', Annonces.nonLues(p, annonces).length, 'o');
    } else if (parts[0] === 'portail') {
      if (p.espace !== 'portail') return App.go('#/agent');
      const main = layout(parts[1] === 'dossier' ? 'dossiers' : parts[1] === 'arrivee' ? 'arrivees' : parts[1] || 'tableau'); UI.refreshIcons();
      await Portail.render(main, parts[1], parts[2]);
    }
    if (n !== renduEnCours) return;
    if (p.espace === 'agent') App.badge('synchro', Store.Tablette.list(p.tablette).filter((d) => d.statut === 'Prêt à synchroniser').length, 'o');
    UI.refreshIcons();
  };

  App.start = async function () {
    if (Store.LS.get('r360.mini', false)) document.body.classList.add('mini');
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { const i = document.querySelector('.hsearch input'); if (i) { e.preventDefault(); i.focus(); } } });
    App.mode = await Store.init();
    /* Version du jeu de données fictif : une nouvelle version recharge automatiquement la démonstration locale */
    const VERSION_DONNEES = '2026-10-05g';
    if (App.mode === 'local' && Store.LS.get('r360.version', null) !== VERSION_DONNEES) { const pr = Store.LS.get('r360.profil', null); await Store.Local.reset(); Store.LS.set('r360.version', VERSION_DONNEES); if (pr) Store.LS.set('r360.profil', pr); }
    if (App.mode === 'local') await Seed.seed(Store.Local);
    try { await Admin.charger(); } catch (e) { console.warn('Administration', e); }
    try { Reglages.appliquer((await Store.db.list('parametres')).find((x) => x.id === 'plateforme')); } catch (e) { /* paramètres par défaut */ }
    const pid = Store.LS.get('r360.profil', null);
    if (pid) {
      const p = Admin.profilsConnectables().find((x) => x.id === pid);
      if (p && App.mode === 'supabase') { const { data } = await Store.Supa.client.auth.getSession(); App.profil = data.session ? p : null; } else App.profil = p || null;
    }
    if (App.mode === 'supabase') {
      let t = null;
      Store.Supa.subscribe(() => { clearTimeout(t); t = setTimeout(() => { if (location.hash.startsWith('#/portail') && !document.querySelector('.modal-bg')) App.render(); }, 600); });
    }
    /* Suivi en direct en mode local : un autre onglet (tablette, portail) modifie les données → rafraîchissement */
    let tl = null;
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith('r360.central.') || !App.profil || App.profil.espace !== 'portail') return;
      /* Le journal d'audit ne change rien à ce qui est affiché — sauf sur la page du journal.
         Se rafraîchir dessus créait une boucle : afficher une fiche écrit une consultation,
         l'écriture déclenche un rendu, le rendu réécrit une consultation. */
      if (e.key === 'r360.central.audit' && !location.hash.includes('journal')) return;
      clearTimeout(tl); tl = setTimeout(() => { if (document.querySelector('.modal-bg') || document.querySelector('.dd-panel:not(.hidden)')) return; const y = window.scrollY; App.render().then(() => window.scrollTo(0, y)); }, 400);
    });
    window.addEventListener('hashchange', () => { if (!location.hash.includes('dossiers') && !location.hash.endsWith('/agent')) App.recherche = ''; App.render(); });
    App.render();
  };
  /* ---------- Application installable et utilisable hors connexion ----------
     Le service worker pré-charge tout le nécessaire. Son nom de cache dérive du contenu des
     fichiers : dès qu'un fichier change, une nouvelle version s'installe et prévient la page.
     On ne recharge jamais dans le dos de l'agent — un entretien en cours serait perdu. */
  /* Installation de l'application. Le navigateur ne propose l'installation qu'une fois ses
     critères réunis (manifeste, service worker, HTTPS) et émet alors `beforeinstallprompt`.
     On intercepte cet événement pour déclencher l'invite depuis NOS paramètres plutôt que
     de laisser l'utilisateur chercher une icône dans la barre d'adresse.
     iOS ne connaît pas cet événement : l'écran des paramètres bascule sur une marche à suivre. */
  App.invite = null;
  App.installee = () => window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: window-controls-overlay)').matches
    || window.navigator.standalone === true;
  App.iOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.invite = e; document.dispatchEvent(new CustomEvent('r360-install')); });
  window.addEventListener('appinstalled', () => { App.invite = null; document.dispatchEvent(new CustomEvent('r360-install')); UI.toast('Application installée sur cet appareil.', 'check-circle-2'); });

  App.installerApp = async function () {
    if (!App.invite) return 'indisponible';
    const e = App.invite; App.invite = null;
    e.prompt();
    const r = await e.userChoice.catch(() => ({ outcome: 'dismissed' }));
    document.dispatchEvent(new CustomEvent('r360-install'));
    return r.outcome;              // 'accepted' ou 'dismissed'
  };

  App.installerSW = function () {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker non enregistré :', e.message));
    let connu = null;
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (!e.data || e.data.type !== 'r360-maj') return;
      if (connu === null) { connu = e.data.version; return; }   // première activation : rien à signaler
      if (e.data.version === connu) return;
      connu = e.data.version;
      if (document.querySelector('.maj-bar')) return;
      /* Barre persistante et non une notification fugace : elle porte une action, elle doit
         rester jusqu'à ce que l'agent décide. */
      const bar = h('div', { class: 'maj-bar', role: 'status' }, icon('refresh-cw'),
        h('span', { class: 'grow' }, 'Une nouvelle version de l\'application est prête.'),
        h('button', { class: 'btn sm primary', onclick: () => location.reload() }, 'Recharger'),
        h('button', { class: 'btn sm', 'aria-label': 'Plus tard', onclick: () => bar.remove() }, icon('x')));
      document.body.append(bar); UI.refreshIcons();
    });
  };

  window.App = App;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerFeuille(); });
  document.addEventListener('DOMContentLoaded', () => { App.start(); App.installerSW(); });
})();
