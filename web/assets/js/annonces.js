/* Canal de diffusion : annonces adressées à toutes les structures ou à certaines (arrivée d'un contingent, information, consigne, réunion).
   Visibles sur le portail et sur les tablettes des agents ; accusé de lecture par profil. */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const N = { filtre: 'toutes' };
  const CATS = { 'Arrivée annoncée': ['plane-landing', 'o'], 'Information': ['info', 'b'], 'Consigne opérationnelle': ['clipboard-check', 'v'], 'Réunion de coordination': ['users', 'g'], 'Alerte': ['triangle-alert', 'r'] };
  const IMP = { Normale: 'grey', Importante: 'warn', Urgente: 'danger' };
  N.peutPublier = (p) => p.espace === 'portail';
  N.peutUrgent = (p) => p.role === 'admin' || p.role === 'superviseur';
  N.visibles = (p, annonces) => (annonces || []).filter((a) => !a.archive && (!a.expire_le || new Date(a.expire_le) > new Date()) && (p.role === 'admin' || !(a.cibles || []).length || a.cibles.includes('*') || a.cibles.includes(p.structure) || a.structure === p.structure))
    .sort((a, b) => (b.epingle ? 1 : 0) - (a.epingle ? 1 : 0) || (b.created_at || '').localeCompare(a.created_at || ''));
  N.nonLues = (p, annonces) => N.visibles(p, annonces).filter((a) => !(a.lu_par || []).includes(p.id));
  const cibles = (a) => (!(a.cibles || []).length || a.cibles.includes('*') ? 'Toutes les structures' : a.cibles.join(', '));

  N.marquerLu = async function (a, p) { if ((a.lu_par || []).includes(p.id)) return; a.lu_par = [...(a.lu_par || []), p.id]; await Store.db.upsert('annonces', a); };

  /* Carte d'une annonce : en-tête (pastille, titre, étiquettes, date), corps, puis un pied
     unique qui porte TOUTES les actions — leur position ne dépend plus de la hauteur du texte. */
  N.carte = function (a, p, arrivees) {
    const [ic, t] = CATS[a.categorie] || ['megaphone', 'o'];
    const lu = (a.lu_par || []).includes(p.id);
    const ton = a.importance === 'Urgente' ? 'r' : a.importance === 'Importante' ? 'o' : t;
    /* Le cadre ne dit que le niveau — rouge urgente, orange importante, bleu simplement non lue.
       La catégorie reste portée par la pastille d'icône, pour éviter un cadre arc-en-ciel. */
    const cadre = a.importance === 'Urgente' ? 'r' : a.importance === 'Importante' ? 'o' : 'b';
    const arr = a.arrivee_id && (arrivees || []).find((x) => x.id === a.arrivee_id);
    const gerable = (a.structure === p.structure && (p.role === 'admin' || p.role === 'superviseur' || a.auteur === p.nom)) || p.role === 'admin';
    const maj = async () => { await Store.db.upsert('annonces', a); App.render(); };
    return h('article', { class: 'annonce-card card ton-' + cadre + (lu ? '' : ' nonlue') },
      h('div', { class: 'annonce-head' },
        h('span', { class: 'ticon lg ' + ton }, icon(ic)),
        h('div', { class: 'grow', style: { minWidth: 0 } },
          h('h3', { class: 'annonce-t' }, a.titre),
          h('div', { class: 'annonce-badges' },
            a.importance !== 'Normale' ? h('span', { class: 'badge ' + (a.importance === 'Urgente' ? 'danger' : 'warn') }, a.importance) : null,
            h('span', { class: 'badge grey' }, a.categorie),
            a.epingle ? h('span', { class: 'badge accent' }, icon('pin'), 'Épinglée') : null),
          h('p', { class: 'annonce-m' }, a.message),
          arr ? h('a', { class: 'ref-chip', href: p.espace === 'portail' ? '#/portail/arrivee/' + arr.id : null },
            icon(arr.type === 'Voie terrestre' ? 'bus' : 'plane-landing'),
            arr.code + ' — ' + arr.type + ' ' + (arr.numero || '') + ', ' + (arr.statut === 'Prévue' ? 'prévue le ' : '') + UI.fmtDate(arr.date_reelle || arr.date_prevue, true) + ' · ' + (arr.nb_attendus || (arr.manifeste || []).length) + ' personne(s)') : null),
        h('time', { class: 'annonce-date tiny muted' }, UI.ago(a.created_at))),
      h('div', { class: 'annonce-pied' },
        h('div', { class: 'annonce-meta tiny muted' }, Admin.logo(a.structure, 18),
          h('span', null, (a.auteur || '') + ' (' + a.structure + ')'),
          h('span', { class: 'sep' }, '·'), h('span', null, cibles(a)),
          h('span', { class: 'sep' }, '·'), h('span', null, (a.lu_par || []).length + ' lecture(s)')),
        h('div', { class: 'annonce-actions' },
          lu ? null : h('button', { class: 'btn sm a-lu', onclick: async () => { await N.marquerLu(a, p); App.render(); } }, icon('check'), 'Marquer comme lu'),
          gerable ? h('button', { class: 'btn sm a-pin', onclick: () => { a.epingle = !a.epingle; maj(); } }, icon(a.epingle ? 'pin-off' : 'pin'), a.epingle ? 'Désépingler' : 'Épingler') : null,
          gerable ? h('button', { class: 'btn sm a-arch', onclick: async () => { a.archive = true; await Store.audit('Annonce archivée', a.titre, ''); maj(); } }, icon('archive'), 'Archiver') : null)));
  };

  /* Page « Canal de diffusion » (portail et tablette) */
  N.page = function (c, p, annonces, arrivees) {
    const toutes = N.visibles(p, annonces); const list = h('div', { class: 'stack' });
    const FILTRES = [['toutes', 'Toutes'], ['nonlues', 'Non lues'], ...Object.keys(CATS).map((k) => [k, k])];
    const paint = () => {
      const rows = toutes.filter((a) => N.filtre === 'toutes' || (N.filtre === 'nonlues' ? !(a.lu_par || []).includes(p.id) : a.categorie === N.filtre));
      list.innerHTML = '';
      if (!rows.length) list.append(h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('megaphone'), h('div', null, 'Aucune annonce.'))));
      rows.forEach((a) => list.append(N.carte(a, p, arrivees)));
      UI.refreshIcons();
    };
    const nl = N.nonLues(p, annonces).length;
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Canal de diffusion'), h('p', { class: 'sub' }, 'Annonces partagées entre toutes les structures de la plateforme : arrivées de contingents, consignes, réunions, informations.')),
      h('div', { class: 'row' }, nl ? h('button', { class: 'btn', onclick: async () => { for (const a of N.nonLues(p, annonces)) await N.marquerLu(a, p); App.render(); } }, icon('check-check'), 'Tout marquer comme lu') : null,
        N.peutPublier(p) ? h('button', { class: 'btn primary', onclick: () => N.form(null, arrivees) }, icon('megaphone'), 'Publier une annonce') : null)),
    h('div', { class: 'periods', style: { marginBottom: '16px', flexWrap: 'wrap' } }, FILTRES.map(([k, l]) => h('button', { class: k === N.filtre ? 'on' : '', onclick: (e) => { N.filtre = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); paint(); } }, l + (k === 'nonlues' ? ' (' + nl + ')' : '')))), list);
    paint();
  };

  /* Formulaire de publication ; init peut pré-remplir (ex. depuis une arrivée) */
  N.form = function (init, arrivees) {
    const p = App.profil; const a = { categorie: 'Information', importance: 'Normale', cibles: ['*'], ...(init || {}) };
    const titre = h('input', { class: 'input', value: a.titre || '', placeholder: 'Ex. : Arrivée d\'un vol affrété jeudi à 15 h' });
    const msg = h('textarea', { class: 'textarea', style: { height: '130px', padding: '10px 12px' }, placeholder: 'Message à diffuser' }); msg.value = a.message || '';
    const exp = h('input', { class: 'input', type: 'date', value: a.expire_le ? a.expire_le.slice(0, 10) : '' });
    const opts = (arrivees || []).filter((x) => x.statut !== 'Clôturée');
    UI.modal({ title: 'Publier une annonce', icon: 'megaphone', body: h('div', { class: 'form-grid' },
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Titre'), titre),
      h('div', null, h('label', { class: 'q' }, 'Catégorie'), UI.dropdown({ items: Object.keys(CATS).map((k) => ({ value: k, label: k })), value: a.categorie, onChange: (v) => { a.categorie = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Importance'), UI.dropdown({ items: Object.keys(IMP).filter((k) => k !== 'Urgente' || N.peutUrgent(p)).map((k) => ({ value: k, label: k })), value: a.importance, onChange: (v) => { a.importance = v; } }).el),
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Message'), msg),
      h('div', { class: 'full' }, h('label', { class: 'q' }, 'Destinataires'), UI.dropdown({ items: [{ value: '*', label: 'Toutes les structures' }].concat(M.structures.map((x) => ({ value: x.code, label: x.code + ' — ' + x.nom }))), multiple: true, value: a.cibles, onChange: (v) => { a.cibles = v.includes('*') && v.length > 1 && v[v.length - 1] !== '*' ? v.filter((x) => x !== '*') : v.includes('*') ? ['*'] : v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Arrivée concernée (facultatif)'), UI.dropdown({ items: [{ value: '', label: 'Aucune' }].concat(opts.map((x) => ({ value: x.id, label: x.code + ' — ' + x.type + ' ' + (x.numero || ''), right: x.statut }))), value: a.arrivee_id || '', onChange: (v) => { a.arrivee_id = v || null; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Visible jusqu\'au (facultatif)'), exp)),
    actions: [{ label: 'Annuler' }, { label: 'Publier', cls: 'primary', icon: 'send', onclick: async () => {
      if (!titre.value.trim() || !msg.value.trim()) { UI.toast('Titre et message obligatoires.', 'alert-triangle'); return false; }
      const row = { ...a, id: a.id || UI.uuid(), titre: titre.value.trim(), message: msg.value.trim(), cibles: (a.cibles || []).length ? a.cibles : ['*'], expire_le: exp.value ? new Date(exp.value + 'T23:59:00').toISOString() : null,
        auteur: p.nom, structure: p.structure, created_at: new Date().toISOString(), lu_par: [p.id], epingle: a.importance === 'Urgente' };
      await Store.db.upsert('annonces', row); await Store.audit('Annonce publiée', row.titre, cibles(row));
      UI.toast('Annonce diffusée à : ' + cibles(row) + '.', 'megaphone'); App.render();
    } }] }).el.style.maxWidth = '760px';
  };

  /* Bandeau du tableau de bord : un rappel d'une ligne, la lecture se fait sur la page.
     L'importance est portée par la pastille d'icône, jamais par le fond de la carte. */
  N.bandeau = function (p, annonces) {
    const a = N.nonLues(p, annonces).filter((x) => x.importance !== 'Normale');
    if (!a.length) return null;
    const urgent = a.some((x) => x.importance === 'Urgente');
    const lien = p.espace === 'portail' ? '#/portail/annonces' : '#/agent/annonces';
    const n = a.length;
    return h('div', { class: 'annonce-bandeau ton-' + (urgent ? 'r' : 'o') },
      h('span', { class: 'ticon ' + (urgent ? 'r' : 'o') }, icon('megaphone')),
      h('span', { class: 'annonce-bandeau-txt' },
        h('b', null, n + (urgent ? ' annonce(s) urgente(s)' : ' annonce(s) importante(s)') + ' non lue(s)'),
        h('span', { class: 'sep' }, ' — '),
        a.slice(0, 3).map((x, i) => [i ? h('span', { class: 'sep' }, ' · ') : null, h('span', { class: 'ti' }, x.titre)])),
      h('button', { class: 'btn sm', onclick: async () => { for (const x of a) await N.marquerLu(x, p); App.render(); } }, icon('check-check'), 'Tout marquer comme lu'),
      h('a', { class: 'btn sm accent-t', href: lien }, 'Tout voir'));
  };
  window.Annonces = N;
})();
