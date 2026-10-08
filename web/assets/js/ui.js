/* Utilitaires d'interface : création d'éléments, icônes, fenêtres, notifications, liste déroulante avec recherche */
(function () {
  const UI = {};
  /* Seuils paramétrables (Paramètres > Plateforme) */
  UI.PARAMS = { secret: 5, doublon: 60 };
  UI.estMasque = (n) => typeof n === 'number' && n > 0 && n < UI.PARAMS.secret;
  UI.libMasque = () => '< ' + UI.PARAMS.secret;
  UI.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(Infinity)) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    return el;
  };
  const h = UI.h;
  UI.icon = (name, cls) => h('i', { 'data-lucide': name, class: cls || '' });

  /* Filigrane : l'icône de l'indicateur reprise en grand et très pâle, en bas à droite de la carte.
     Purement décorative — elle ne porte jamais d'information et reste sous le texte. */
  UI.filigrane = (nom) => h('span', { class: 'filigrane', 'aria-hidden': 'true' }, UI.icon(nom));

  /* Courbe d'évolution pour les indicateurs pleins. Valeurs = volumes réels par période ;
     décorative pour le lecteur d'écran, le chiffre de la carte reste la donnée. */
  UI.sparkline = function (valeurs, legende) {
    const v = (valeurs || []).map((x) => (Number.isFinite(+x) ? +x : 0));
    if (v.length < 2) return null;
    const W = 100, H = 100, min = Math.min(...v), amp = Math.max(...v) - min || 1;
    const px = (i) => Math.round(((i * W) / (v.length - 1)) * 100) / 100;
    const py = (n) => Math.round((H - 4 - ((n - min) / amp) * (H - 8)) * 100) / 100;
    let d = 'M' + px(0) + ' ' + py(v[0]);
    for (let i = 1; i < v.length; i++) { const cx = Math.round(((px(i - 1) + px(i)) / 2) * 100) / 100; d += ' C' + cx + ' ' + py(v[i - 1]) + ',' + cx + ' ' + py(v[i]) + ',' + px(i) + ' ' + py(v[i]); }
    const aire = d + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    return h('span', { class: 'kspark', title: legende || '', html:
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
      + '<path d="' + aire + '" fill="currentColor" fill-opacity=".18"></path>'
      + '<path d="' + d + '" fill="none" stroke="currentColor" stroke-opacity=".75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>'
      + '<circle cx="' + px(v.length - 1) + '" cy="' + py(v[v.length - 1]) + '" r="2.5" fill="currentColor" vector-effect="non-scaling-stroke"></circle>'
      + '</svg>' });
  };
  UI.refreshIcons = () => { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } }); };
  UI.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  UI.uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  UI.fmtDate = (iso, withTime) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const o = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('fr-FR', o);
  };
  UI.ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`;
    const hh = Math.round(m / 60); if (hh < 48) return `il y a ${hh} h`;
    return `il y a ${Math.round(hh / 24)} j`;
  };
  UI.initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

  UI.toast = function (msg, icon) {
    let w = document.querySelector('.toast-wrap');
    if (!w) { w = h('div', { class: 'toast-wrap' }); document.body.append(w); }
    const t = h('div', { class: 'toast' }, UI.icon(icon || 'check-circle-2'), h('span', null, msg));
    w.append(t); UI.refreshIcons();
    setTimeout(() => t.remove(), 3800);
  };

  /* Fenêtre modale STRICTE : on n'en sort que par un bouton du pied.
     Ni clic sur le fond, ni touche Échap. Une modale porte ici une décision — consentement,
     doublon, clôture d'entretien, suppression — et un clic de travers à côté de la tablette
     ne doit jamais l'annuler en silence. Le clic sur le fond fait tressaillir la fenêtre :
     l'utilisateur comprend qu'elle attend une réponse, au lieu de croire à un écran figé. */
  UI.modal = function ({ title, icon, body, actions, kind, onClose }) {
    const bg = h('div', { class: 'modal-bg' });
    const close = () => { bg.remove(); document.body.classList.remove('modal-ouverte'); onClose && onClose(); };
    const titreId = 'modal-t-' + UI.uuid().slice(0, 8);
    const pied = h('div', { class: 'mf' }, (actions || [{ label: 'Fermer' }]).map((a) =>
      h('button', { class: 'btn ' + (a.cls || ''), type: 'button',
        onclick: async () => { if (a.onclick) { const r = await a.onclick(); if (r === false) return; } close(); } },
        a.icon ? UI.icon(a.icon) : null, a.label)));
    const m = h('div', { class: 'modal ' + (kind || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titreId },
      h('div', { class: 'mh' }, icon ? UI.icon(icon) : null, h('h2', { id: titreId }, title)),
      h('div', { class: 'mb' }, body), pied);

    /* Le clic sur le fond ne ferme pas — il signale. On ne coupe pas la propagation :
       une liste déroulante ouverte dans la modale doit pouvoir se refermer normalement. */
    bg.addEventListener('mousedown', (e) => {
      if (e.target !== bg) return;
      m.classList.remove('secousse'); void m.offsetWidth; m.classList.add('secousse');
    });

    bg.append(m); document.body.append(bg); document.body.classList.add('modal-ouverte'); UI.refreshIcons();
    /* Le focus entre dans la fenêtre : sans cela, verrouiller la sortie rendrait la modale
       impossible à quitter au clavier. */
    setTimeout(() => { const cible = m.querySelector('input, textarea, select, button'); if (cible) cible.focus(); }, 60);
    return { close, el: m };
  };
  UI.prompt = function (title, label, placeholder) {
    return new Promise((res) => {
      const inp = h('textarea', { class: 'textarea', placeholder: placeholder || '' });
      UI.modal({ title, icon: 'message-square', body: h('div', null, h('label', { class: 'q' }, label), inp),
        actions: [{ label: 'Annuler', onclick: () => res(null) }, { label: 'Valider', cls: 'primary', onclick: () => { if (!inp.value.trim()) { inp.focus(); return false; } res(inp.value.trim()); } }] });
      setTimeout(() => inp.focus(), 50);
    });
  };

  /* Liste déroulante : toute liste comporte un champ de recherche intégré */
  let openDD = null;
  document.addEventListener('click', (e) => { if (openDD && !openDD.contains(e.target)) { openDD.close(); } });
  UI.dropdown = function ({ items, value, multiple, placeholder, onChange, groupBy, render, searchPlaceholder, disabled }) {
    // items : [{ value, label, group?, flag?, right? }]
    let sel = multiple ? new Set(value || []) : value;
    const wrap = h('div', { class: 'dd' });
    const btn = h('button', { type: 'button', class: 'dd-btn', disabled: disabled || null });
    const panel = h('div', { class: 'dd-panel hidden' });
    const search = h('input', { type: 'search', placeholder: searchPlaceholder || 'Rechercher…', autocomplete: 'off' });
    const list = h('div', { class: 'dd-list' });
    panel.append(h('div', { class: 'dd-search' }, UI.icon('search'), search), list);
    wrap.append(btn, panel);
    const labelOf = (v) => { const it = items.find((i) => i.value === v); return it ? it.label : v; };
    function paintBtn() {
      btn.innerHTML = '';
      if (multiple) {
        const arr = [...sel];
        btn.append(arr.length ? h('span', { class: 'val' }, h('span', { class: 'tags' }, arr.map((v) => h('span', { class: 'tag' }, labelOf(v))))) : h('span', { class: 'val ph' }, placeholder || 'Choisir…'));
      } else {
        const it = items.find((i) => i.value === sel);
        btn.append(it ? h('span', { class: 'val' }, it.flag ? it.flag + '  ' : '', it.label) : h('span', { class: 'val ph' }, placeholder || 'Choisir…'));
      }
      btn.append(UI.icon('chevrons-up-down')); UI.refreshIcons();
    }
    function paintList() {
      const q = UI.norm(search.value);
      list.innerHTML = '';
      const f = items.filter((i) => !q || UI.norm(i.label + ' ' + (i.right || '') + ' ' + (i.keywords || '')).includes(q)).slice(0, 400);
      if (!f.length) { list.append(h('div', { class: 'dd-empty' }, 'Aucun résultat')); return; }
      let g = null;
      for (const it of f) {
        if (groupBy && it.group !== g) { g = it.group; list.append(h('div', { class: 'dd-group' }, g)); }
        const on = multiple ? sel.has(it.value) : sel === it.value;
        const opt = h('div', { class: 'dd-opt' + (on ? ' sel' : ''), onclick: (e) => { e.stopPropagation(); pick(it.value); } },
          multiple ? UI.icon(on ? 'square-check' : 'square') : null,
          it.flag ? h('span', { class: 'flag' }, it.flag) : null, h('span', null, render ? render(it) : it.label), it.right ? h('span', { class: 'right' }, it.right) : null);
        list.append(opt);
      }
      UI.refreshIcons();
    }
    function pick(v) {
      if (multiple) {
        sel.has(v) ? sel.delete(v) : sel.add(v);
        paintBtn(); paintList(); onChange && onChange([...sel]);
      } else { sel = v; paintBtn(); api.close(); onChange && onChange(v); }
    }
    const api = {
      el: wrap,
      close() { panel.classList.add('hidden'); if (openDD === api) openDD = null; },
      contains: (t) => wrap.contains(t),
      set(v) { sel = multiple ? new Set(v || []) : v; paintBtn(); },
      setItems(n) { items = n; paintBtn(); },
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!panel.classList.contains('hidden')) { api.close(); return; }
      if (openDD) openDD.close();
      panel.classList.remove('hidden'); openDD = api; search.value = ''; paintList(); setTimeout(() => search.focus(), 10);
    });
    search.addEventListener('input', paintList);
    search.addEventListener('click', (e) => e.stopPropagation());
    paintBtn();
    return api;
  };

  /* Compression d'image (photo, pages numérisées) pour limiter le volume stocké */
  UI.compressImage = function (file, maxW, quality) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, (maxW || 900) / img.width);
          const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', quality || 0.6));
        };
        img.onerror = rej; img.src = r.result;
      };
      r.onerror = rej; r.readAsDataURL(file);
    });
  };
  /* Infobulle flottante (survol) */
  let bulle = null;
  /* Infobulle : survol souris, focus clavier, et appui sur tablette (où « mouseenter » n'existe pas). */
  UI.infobulle = function (el, contenu, opts) {
    const o = opts || {};
    /* `actif` permet de n'armer l'infobulle que dans certains états (menu réduit, par exemple) ;
       `clic: false` l'empêche d'intercepter le clic — indispensable sur un lien de navigation. */
    const permis = () => (typeof o.actif === 'function' ? o.actif() : true);
    const creer = () => {
      if (!bulle) { bulle = h('div', { class: 'tip' }); document.body.append(bulle); }
      bulle.className = 'tip' + (o.classe ? ' ' + o.classe : '');
      bulle.replaceChildren(typeof contenu === 'function' ? contenu() : contenu);
      bulle.style.display = 'block';
    };
    const cacher = () => { if (bulle) bulle.style.display = 'none'; };
    /* `cote` ancre l'infobulle sur l'élément ('droite' pour un rail vertical, toute autre valeur
       la pose dessous) ; sans `cote`, elle suit le curseur. */
    const montrer = (e) => { if (!permis()) return; if (o.cote) { ancrer(); return; } creer(); placer(e); };
    const placer = (e) => { if (!bulle) return; if (o.cote) return; const x = e.clientX + 14, y = e.clientY + 14; const w = bulle.offsetWidth; bulle.style.left = Math.min(x, window.innerWidth - w - 8) + 'px'; bulle.style.top = y + 'px'; };
    /* Sans curseur (focus clavier, appui tactile), on se cale sous l'élément lui-même. */
    const ancrer = () => {
      if (!permis()) return;
      creer(); if (!bulle) return;
      const r = el.getBoundingClientRect(); const w = bulle.offsetWidth; const hb = bulle.offsetHeight;
      if (o.cote === 'droite') {
        /* Rail d'icônes : l'étiquette se pose à droite, centrée sur l'élément — la convention
           pour un menu réduit, et elle ne suit pas le curseur, donc elle ne tremble pas. */
        bulle.style.left = Math.min(r.right + 10, window.innerWidth - w - 8) + 'px';
        bulle.style.top = Math.max(8, Math.min(r.top + (r.height - hb) / 2, window.innerHeight - hb - 8)) + 'px';
        return;
      }
      bulle.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
      bulle.style.top = (r.bottom + 8 + hb > window.innerHeight ? Math.max(8, r.top - hb - 8) : r.bottom + 8) + 'px';
    };
    el.addEventListener('mouseenter', montrer); el.addEventListener('mousemove', placer); el.addEventListener('mouseleave', cacher);
    el.addEventListener('focus', ancrer); el.addEventListener('blur', cacher);
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') cacher(); });
    if (o.clic !== false) el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (bulle && bulle.style.display === 'block') cacher(); else ancrer(); });
    else el.addEventListener('click', cacher);
    return el;
  };

  /* Pastille « ? » posée à côté d'un titre de graphique : explique quelles données il contient.
     Le texte est lu par les lecteurs d'écran (span hors écran) en plus d'être affiché au survol. */
  UI.aide = function (texte) {
    const b = h('button', { type: 'button', class: 'aide' }, UI.icon('info'), h('span', { class: 'sr' }, texte));
    UI.infobulle(b, () => h('div', { class: 'tip-aide' }, texte));
    return b;
  };
  window.UI = UI;
})();
