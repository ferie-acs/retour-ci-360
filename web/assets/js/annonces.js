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

  /* Carte d'une annonce */
  N.carte = function (a, p, compact, arrivees) {
    const [ic, t] = CATS[a.categorie] || ['megaphone', 'o']; const lu = (a.lu_par || []).includes(p.id);
    const arr = a.arrivee_id && (arrivees || []).find((x) => x.id === a.arrivee_id);
    const el = h('div', { class: 'annonce' + (lu ? '' : ' nonlue') + (a.importance === 'Urgente' ? ' urgente' : '') },
      h('span', { class: 'ticon lg ' + t }, icon(ic)),
      h('div', { class: 'grow', style: { minWidth: 0 } },
        h('div', { class: 'row', style: { gap: '6px' } }, a.epingle ? h('span', { class: 'badge accent' }, icon('pin'), 'Épinglée') : null, h('span', { class: 'badge solid ' + IMP[a.importance] }, a.importance), h('span', { class: 'badge grey' }, a.categorie), lu ? null : h('span', { class: 'badge solid info' }, 'Nouveau')),
        h('h3', { class: 'annonce-t' }, a.titre),
        h('div', { class: 'annonce-m' + (compact ? ' clamp' : '') }, a.message),
        arr ? h('a', { class: 'ref-chip', href: p.espace === 'portail' ? '#/portail/arrivee/' + arr.id : null, style: { marginTop: '8px' } }, icon(arr.type === 'Voie terrestre' ? 'bus' : 'plane-landing'), arr.code + ' — ' + arr.type + ' ' + (arr.numero || '') + ', ' + (arr.statut === 'Prévue' ? 'prévue le ' : '') + UI.fmtDate(arr.date_reelle || arr.date_prevue, true) + ' · ' + (arr.nb_attendus || (arr.manifeste || []).length) + ' personne(s)') : null,
        h('div', { class: 'row tiny muted', style: { gap: '6px', marginTop: '8px' } }, Admin.logo(a.structure, 18), (a.auteur || '') + ' (' + a.structure + ') · ' + UI.ago(a.created_at) + ' · destinataires : ' + cibles(a) + ' · ' + (a.lu_par || []).length + ' lecture(s)')),
      !lu ? h('button', { class: 'btn sm', title: 'Marquer comme lu', onclick: async (e) => { e.stopPropagation(); await N.marquerLu(a, p); App.render(); } }, icon('check')) : null);
    return el;
  };

  /* Page « Canal de diffusion » (portail et tablette) */
  N.page = function (c, p, annonces, arrivees) {
    const toutes = N.visibles(p, annonces); const list = h('div', { class: 'stack' });
    const FILTRES = [['toutes', 'Toutes'], ['nonlues', 'Non lues'], ...Object.keys(CATS).map((k) => [k, k])];
    const paint = () => {
      const rows = toutes.filter((a) => N.filtre === 'toutes' || (N.filtre === 'nonlues' ? !(a.lu_par || []).includes(p.id) : a.categorie === N.filtre));
      list.innerHTML = '';
      if (!rows.length) list.append(h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('megaphone'), h('div', null, 'Aucune annonce.'))));
      rows.forEach((a) => list.append(h('div', { class: 'card' }, N.carte(a, p, false, arrivees), (a.structure === p.structure && (p.role === 'admin' || p.role === 'superviseur' || a.auteur === p.nom)) || p.role === 'admin' ? h('div', { class: 'row', style: { gap: '6px', marginTop: '10px', justifyContent: 'flex-end' } },
        h('button', { class: 'btn sm', onclick: async () => { a.epingle = !a.epingle; await Store.db.upsert('annonces', a); App.render(); } }, icon(a.epingle ? 'pin-off' : 'pin'), a.epingle ? 'Désépingler' : 'Épingler'),
        h('button', { class: 'btn sm', onclick: async () => { a.archive = true; await Store.db.upsert('annonces', a); await Store.audit('Annonce archivée', a.titre, ''); App.render(); } }, icon('archive'), 'Archiver')) : null)));
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

  /* Bandeau du tableau de bord : annonces importantes ou urgentes non lues */
  N.bandeau = function (p, annonces, arrivees) {
    const a = N.nonLues(p, annonces).filter((x) => x.importance !== 'Normale');
    if (!a.length) return null;
    const lien = p.espace === 'portail' ? '#/portail/annonces' : '#/agent/annonces';
    return h('div', { class: 'card annonce-bandeau', style: { marginBottom: '20px' } }, h('div', { class: 'row between', style: { marginBottom: '10px' } }, h('b', { class: 'row', style: { gap: '8px' } }, icon('megaphone'), 'Canal de diffusion — ' + a.length + ' annonce(s) importante(s) non lue(s)'), h('a', { class: 'btn sm', href: lien }, 'Tout voir')),
      a.slice(0, 2).map((x) => N.carte(x, p, true, arrivees)));
  };
  window.Annonces = N;
})();
