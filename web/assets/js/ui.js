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

  UI.modal = function ({ title, icon, body, actions, kind, onClose }) {
    const bg = h('div', { class: 'modal-bg' });
    const close = () => { bg.remove(); onClose && onClose(); };
    const m = h('div', { class: 'modal ' + (kind || '') },
      h('div', { class: 'mh' }, icon ? UI.icon(icon) : null, h('h2', null, title)),
      h('div', { class: 'mb' }, body),
      h('div', { class: 'mf' }, (actions || [{ label: 'Fermer' }]).map((a) =>
        h('button', { class: 'btn ' + (a.cls || ''), onclick: async () => { if (a.onclick) { const r = await a.onclick(); if (r === false) return; } close(); } }, a.icon ? UI.icon(a.icon) : null, a.label))));
    bg.append(m); document.body.append(bg); UI.refreshIcons();
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
  UI.infobulle = function (el, contenu) {
    const montrer = (e) => {
      if (!bulle) { bulle = h('div', { class: 'tip' }); document.body.append(bulle); }
      bulle.innerHTML = ''; bulle.append(typeof contenu === 'function' ? contenu() : contenu); bulle.style.display = 'block'; placer(e);
    };
    const placer = (e) => { if (!bulle) return; const x = e.clientX + 14, y = e.clientY + 14; const w = bulle.offsetWidth; bulle.style.left = Math.min(x, window.innerWidth - w - 8) + 'px'; bulle.style.top = y + 'px'; };
    el.addEventListener('mouseenter', montrer); el.addEventListener('mousemove', placer);
    el.addEventListener('mouseleave', () => { if (bulle) bulle.style.display = 'none'; });
    return el;
  };
  window.UI = UI;
})();
