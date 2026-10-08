/* Moteur de formulaire : chaque question est décrite par le dictionnaire de données (type, modalités, conditions, sensibilité) */
(function () {
  const { h, icon, dropdown } = UI;
  const REF = window.REF;
  const F = {};

  const paysItems = (field) => REF.pays.map((p) => ({ value: p.n, label: p.n, flag: p.f, group: p.ct, right: field === 'dial' ? p.d : '', keywords: p.c + ' ' + p.nat }));
  const phoneItems = () => REF.pays.filter((p) => p.d).map((p) => ({ value: p.d + '|' + p.c, label: p.n, flag: p.f, group: p.ct, right: p.d }));
  const locItems = () => REF.localitesCI.map((l) => ({ value: l.n, label: l.n, right: l.r })).concat([{ value: '__autre', label: 'Autre localité (préciser)' }]);

  function seg(options, value, onChange) {
    const wrap = h('div', { class: 'seg' });
    const paint = () => { wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === value)); };
    options.forEach((o) => wrap.append(h('button', { type: 'button', 'data-v': o, onclick: () => { value = value === o ? undefined : o; paint(); onChange(value); } }, o)));
    paint(); return wrap;
  }

  /* Rendu d'un widget selon le type de question */
  F.widget = function (q, d, set, ctx) {
    const r = d.reponses; const v = r[q.code];
    const opts = q.options || [];
    switch (q.widget) {
      case 'auto': {
        const val = r[q.code];
        return h('input', { class: 'input', readonly: true, value: q.code === 'ENT-001' ? UI.fmtDate(val, true) : (val === undefined || val === null || val === '' ? 'Calculé automatiquement' : val) });
      }
      case 'yesno': return seg(opts.length ? opts : ['Oui', 'Non'], v, set);
      case 'single':
        if (opts.length <= 4 && opts.every((o) => o.length <= 26)) return seg(opts, v, set);
        return dropdown({ items: opts.map((o) => ({ value: o, label: o })), value: v, onChange: set }).el;
      case 'multi': return dropdown({ items: opts.map((o) => ({ value: o, label: o })), value: v || [], multiple: true, onChange: set, placeholder: 'Choisir une ou plusieurs réponses…' }).el;
      case 'text': return h('input', { class: 'input', value: v || '', oninput: (e) => set(e.target.value, true) });
      case 'textarea': return h('textarea', { class: 'textarea', oninput: (e) => set(e.target.value, true) }, v || '');
      case 'number': return h('input', { class: 'input', type: 'number', min: '0', value: v === undefined ? '' : v, oninput: (e) => set(e.target.value === '' ? '' : +e.target.value) });
      case 'date': return h('input', { class: 'input', type: 'date', value: v || '', max: new Date().toISOString().slice(0, 10), onchange: (e) => set(e.target.value) });
      case 'month': return h('input', { class: 'input', type: 'month', value: v || '', onchange: (e) => set(e.target.value) });
      case 'country': case 'nationality':
        return dropdown({ items: paysItems(), value: v || (q.code === 'IDT-009' || q.code === 'IDT-010' ? undefined : undefined), groupBy: true, onChange: set, placeholder: q.widget === 'nationality' ? 'Choisir le pays de nationalité…' : 'Choisir un pays…' }).el;
      case 'region': return dropdown({ items: REF.regionsCI.map((x) => ({ value: x, label: x })), value: v, onChange: set }).el;
      case 'locality': return F.locality(v, set);
      case 'phone': return F.phone(v, set);
      case 'money': return F.money(v, set);
      case 'provenance': return F.provenance(v, set);
      case 'children': return F.repeat(v, set, [['nom', 'Nom'], ['prenoms', 'Prénoms'], ['dn', 'Date de naissance', 'date']], 'Ajouter un enfant');
      case 'persons': return F.repeat(v, set, [['nom', q.code === 'PAR-027' ? 'Nom ou surnom' : 'Nom'], ['contact', 'Contact (téléphone ou texte)']], q.code === 'PAR-027' ? 'Ajouter un passeur' : 'Ajouter un intermédiaire');
      case 'bio': return seg(['Relevé', 'Amputation', 'Lésion', 'Refus'], v, set);
      case 'itinerary': return F.itinerary(d, ctx);
      case 'capture': return F.capture(d, ctx);
      case 'signature': return F.signature(d, ctx);
      case 'structures': return F.orientation(d, ctx);
      default: return h('input', { class: 'input', value: v || '', oninput: (e) => set(e.target.value, true) });
    }
  };

  F.locality = function (v, set) {
    const known = REF.localitesCI.some((l) => l.n === v);
    const wrap = h('div', { class: 'stack' });
    const other = h('input', { class: 'input' + (v && !known ? '' : ' hidden'), placeholder: 'Nom de la localité', value: v && !known ? v : '', oninput: (e) => set(e.target.value, true) });
    const dd = dropdown({ items: locItems(), value: v && !known ? '__autre' : v, onChange: (x) => { if (x === '__autre') { other.classList.remove('hidden'); other.focus(); set(''); } else { other.classList.add('hidden'); set(x); } }, placeholder: 'Choisir une localité (la région est déduite)…' });
    wrap.append(dd.el, other); return wrap;
  };
  F.phone = function (v, set) {
    v = v || { ind: '+225', num: '' };
    const items = phoneItems();
    const cur = items.find((i) => i.value.startsWith(v.ind + '|')) || items.find((i) => i.value === '+225|CI');
    const dd = dropdown({ items, value: cur && cur.value, groupBy: true, searchPlaceholder: 'Pays ou indicatif…', onChange: (x) => { v.ind = x.split('|')[0]; set({ ...v }); } });
    const num = h('input', { class: 'input grow', inputmode: 'tel', placeholder: 'Numéro', value: v.num || '', oninput: (e) => { v.num = e.target.value.replace(/[^\d ]/g, ''); set({ ...v }, true); } });
    const unk = h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { v.num = 'Inconnu'; num.value = 'Inconnu'; set({ ...v }); } }, 'Inconnu');
    return h('div', { class: 'inline' }, h('div', { style: { width: '220px' } }, dd.el), num, unk);
  };
  F.money = function (v, set) {
    v = v || { montant: '', devise: 'XOF' };
    const dd = dropdown({ items: REF.devises.map(([c, n]) => ({ value: c, label: c + ' — ' + n })), value: v.devise, onChange: (x) => { v.devise = x; set({ ...v }); } });
    return h('div', { class: 'inline' }, h('input', { class: 'input grow', type: 'number', min: '0', placeholder: 'Montant', value: v.montant, oninput: (e) => { v.montant = e.target.value; set({ ...v }, true); } }), h('div', { style: { width: '260px' } }, dd.el));
  };
  F.provenance = function (v, set) {
    v = v || { pays: '', ville: '' };
    const cityWrap = h('div');
    const paintCities = () => {
      cityWrap.innerHTML = '';
      const p = REF.pays.find((x) => x.n === v.pays); if (!p) return;
      const vs = (REF.villes[p.c] || []).map((c) => ({ value: c[0], label: c[0], right: c[3] ? c[3].toLocaleString('fr-FR') + ' hab.' : '' }));
      cityWrap.append(dropdown({ items: vs, value: v.ville, onChange: (x) => { v.ville = x; set({ ...v }); }, placeholder: 'Ville (liste chargée selon le pays)…' }).el);
    };
    const dd = dropdown({ items: paysItems(), value: v.pays, groupBy: true, onChange: (x) => { v.pays = x; v.ville = ''; set({ ...v }); paintCities(); }, placeholder: 'Pays de provenance…' });
    paintCities();
    return h('div', { class: 'grid g2' }, dd.el, cityWrap);
  };
  F.repeat = function (v, set, fields, addLabel) {
    let rows = Array.isArray(v) ? v.map((x) => ({ ...x })) : [];
    const wrap = h('div', { class: 'stack' });
    const paint = () => {
      wrap.innerHTML = '';
      rows.forEach((row, i) => wrap.append(h('div', { class: 'inline' },
        fields.map(([k, label, type]) => h('input', { class: 'input grow', type: type || 'text', placeholder: label, value: row[k] || '', oninput: (e) => { row[k] = e.target.value; set(rows.map((x) => ({ ...x })), true); } })),
        h('button', { type: 'button', class: 'btn ghost', title: 'Supprimer', onclick: () => { rows.splice(i, 1); set(rows.map((x) => ({ ...x }))); paint(); } }, icon('trash-2')))));
      wrap.append(h('button', { type: 'button', class: 'btn sm', onclick: () => { rows.push({}); set(rows.map((x) => ({ ...x }))); paint(); } }, icon('plus'), addLabel));
      UI.refreshIcons();
    };
    paint(); return wrap;
  };

  /* ---------- Module d'itinéraire : départ de Côte d'Ivoire, pays et villes ajoutés dans l'ordre du parcours ---------- */
  const dist = (a, b) => { const R = 6371, t = Math.PI / 180; const dLa = (b[0] - a[0]) * t, dLo = (b[1] - a[1]) * t; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  F.etapes = (it) => [...(it.ci || []).map((x) => ({ n: x.n, ll: x.ll, pays: "Côte d'Ivoire", code: 'CI' })), ...(it.pays || []).flatMap((p) => (p.villes || []).map((v) => ({ n: v.n, ll: v.ll, pays: p.nom, code: p.c })))].filter((x) => x.ll);
  F.itinerary = function (d, ctx) {
    d.itineraire = d.itineraire || { ci: [], pays: [] };
    const it = d.itineraire;
    const left = h('div'); const mapEl = h('div', { class: 'map' }); const kpis = h('div', { class: 'kpis' });
    let map = null, layer = null;
    const save = () => { ctx.changed('PAR-003', it.ci.map((x) => x.n)); paint(); };
    function paintMap() {
      const et = F.etapes(it);
      const nbV = et.length; const km = et.reduce((s, x, i) => (i ? s + dist(et[i - 1].ll, x.ll) : 0), 0);
      kpis.innerHTML = '';
      [['Pays traversés', it.pays.length], ['Villes et localités', nbV], ['Distance estimée', Math.round(km).toLocaleString('fr-FR') + ' km']].forEach(([k, v]) => kpis.append(h('div', { class: 'kpi' }, h('b', null, v), k)));
      if (!window.L) { mapEl.textContent = 'Carte indisponible'; return; }
      if (!map) {
        map = L.map(mapEl, { zoomControl: true, attributionControl: true }).setView([12, 0], 3);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '© OpenStreetMap — villes : GeoNames' }).addTo(map);
      }
      if (layer) layer.remove();
      layer = L.layerGroup().addTo(map);
      et.forEach((x, i) => L.marker(x.ll, { icon: L.divIcon({ className: '', html: `<div class="map-num">${i + 1}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }) }).bindTooltip(`${i + 1}. ${x.n} (${x.pays})`).addTo(layer));
      if (et.length > 1) L.polyline(et.map((x) => x.ll), { color: '#FE7701', weight: 3, dashArray: '6 6' }).addTo(layer);
      if (et.length) map.fitBounds(L.latLngBounds(et.map((x) => x.ll)).pad(0.3), { maxZoom: 7 });
      setTimeout(() => map.invalidateSize(), 50);
    }
    function stopRow(x, i, list, label) {
      return h('div', { class: 'itin-stop' }, h('span', { class: 'num' }, label), h('span', { class: 'grow' }, x.n, x.defaut ? h('span', { class: 'badge grey', style: { marginLeft: '6px' } }, 'capitale par défaut') : null),
        h('button', { type: 'button', class: 'btn sm ghost', title: 'Monter', disabled: i === 0 || null, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; save(); } }, icon('arrow-up')),
        h('button', { type: 'button', class: 'btn sm ghost', title: 'Retirer', onclick: () => { list.splice(i, 1); save(); } }, icon('x')));
    }
    function paint() {
      left.innerHTML = ''; let n = 0;
      const ci = h('div', { class: 'itin-block' }, h('div', { class: 'bh' }, h('span', { class: 'flag' }, '🇨🇮'), "Côte d'Ivoire — départ et villes traversées"));
      it.ci.forEach((x, i) => ci.append(stopRow(x, i, it.ci, ++n)));
      ci.append(h('div', { style: { marginTop: '8px' } }, dropdown({ items: REF.localitesCI.filter((l) => l.ll).map((l) => ({ value: l.n, label: l.n, right: l.r })), placeholder: 'Ajouter une localité ivoirienne…',
        onChange: (x) => { const l = REF.localitesCI.find((y) => y.n === x); if (it.ci.length && it.ci[it.ci.length - 1].n === x) return; it.ci.push({ n: l.n, ll: l.ll, r: l.r }); save(); } }).el));
      left.append(ci);
      it.pays.forEach((p, pi) => {
        const pr = REF.pays.find((x) => x.c === p.c);
        const blk = h('div', { class: 'itin-block' }, h('div', { class: 'bh' }, h('span', { class: 'flag' }, pr ? pr.f : ''), p.nom, h('span', { style: { flex: 1 } }),
          h('button', { type: 'button', class: 'btn sm ghost', title: 'Retirer le pays', onclick: () => { it.pays.splice(pi, 1); save(); } }, icon('trash-2'))));
        p.villes.forEach((x, i) => blk.append(stopRow(x, i, p.villes, ++n)));
        const vs = (REF.villes[p.c] || []).map((c) => ({ value: c[0], label: c[0], right: c[3] ? c[3].toLocaleString('fr-FR') + ' hab.' : '', ll: [c[1], c[2]] }));
        blk.append(h('div', { style: { marginTop: '8px' } }, dropdown({ items: vs, placeholder: 'Ajouter une ville…', onChange: (x) => { const c = vs.find((y) => y.value === x); if (p.villes.length && p.villes[p.villes.length - 1].n === x) return; p.villes = p.villes.filter((y) => !y.defaut); p.villes.push({ n: c.value, ll: c.ll }); save(); } }).el));
        left.append(blk);
      });
      left.append(h('div', { class: 'itin-block' }, h('div', { class: 'bh' }, icon('plus-circle'), 'Ajouter un pays au parcours'),
        dropdown({ items: REF.pays.filter((p) => p.c !== 'CI').map((p) => ({ value: p.c, label: p.n, flag: p.f, group: p.ct })), groupBy: true, placeholder: 'Pays (Afrique en premier)…',
          onChange: (c) => { const p = REF.pays.find((x) => x.c === c); it.pays.push({ c, nom: p.n, villes: p.cap ? [{ n: p.cap.n, ll: p.cap.ll, defaut: true }] : [] }); save(); } }).el));
      UI.refreshIcons(); paintMap();
    }
    const el = h('div', { class: 'itin' }, left, h('div', null, mapEl, kpis, h('div', { class: 'help' }, "L'ordre de saisie définit l'ordre du parcours. La capitale est proposée par défaut à l'ajout d'un pays ; elle est remplacée dès qu'une ville est choisie. La dernière localité ivoirienne alimente PAR-004.")));
    setTimeout(paint, 0);
    return el;
  };

  /* ---------- Photo et numérisation des documents ---------- */
  F.capture = function (d, ctx) {
    d.medias = d.medias || { documents: [] };
    const r = d.reponses;
    const wrap = h('div', { class: 'stack' });
    const paint = () => {
      wrap.innerHTML = '';
      const photoOk = r['ENT-011'] === 'Oui';
      wrap.append(h('div', null, h('div', { class: 'small', style: { fontWeight: 600, marginBottom: '6px' } }, 'Photo du visage'),
        photoOk ? h('div', { class: 'row' }, d.medias.photo ? h('img', { class: 'thumb', src: d.medias.photo }) : null,
          h('label', { class: 'btn' }, icon('camera'), d.medias.photo ? 'Reprendre la photo' : 'Prendre la photo',
            h('input', { type: 'file', accept: 'image/*', capture: 'user', class: 'hidden', onchange: async (e) => { if (!e.target.files[0]) return; d.medias.photo = await UI.compressImage(e.target.files[0], 480, 0.6); ctx.save(); paint(); } })))
          : h('div', { class: 'notice warn' }, icon('camera-off'), 'Prise de photo impossible : consentement à la prise de photo (ENT-011) non donné.')));
      wrap.append(h('div', null, h('div', { class: 'small', style: { fontWeight: 600, margin: '10px 0 6px' } }, `Documents numérisés (laissez-passer, pièce d'identité) — ${d.medias.documents.length} page(s)`),
        h('div', { class: 'thumbs' }, d.medias.documents.map((src, i) => h('div', { style: { position: 'relative' } }, h('img', { class: 'thumb', src }),
          h('button', { type: 'button', class: 'btn sm', style: { position: 'absolute', top: '2px', right: '2px', height: '24px', padding: '0 6px' }, onclick: () => { d.medias.documents.splice(i, 1); ctx.save(); paint(); } }, icon('x'))))),
        h('label', { class: 'btn', style: { marginTop: '8px' } }, icon('scan-line'), 'Numériser une page',
          h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden', onchange: async (e) => { if (!e.target.files[0]) return; d.medias.documents.push(await UI.compressImage(e.target.files[0], 900, 0.55)); ctx.save(); paint(); } })),
        h('div', { class: 'help' }, 'Les pages sont assemblées en un seul document. Traitement réalisé sur l\'appareil, sans service extérieur.')));
      UI.refreshIcons();
    };
    paint(); ctx.onChangeHooks.push((code) => { if (code === 'ENT-011') paint(); });
    return wrap;
  };

  /* ---------- Signature manuscrite sur l'écran ---------- */
  F.signature = function (d, ctx) {
    d.medias = d.medias || { documents: [] };
    const c = h('canvas', { class: 'sigpad' }); let drawing = false, has = false, last = null;
    const ctx2 = () => c.getContext('2d');
    const fit = () => { const r = c.getBoundingClientRect(); if (!r.width) return; c.width = r.width; c.height = r.height; const g = ctx2(); g.lineWidth = 2.2; g.lineCap = 'round'; g.strokeStyle = '#1E2A36';
      if (d.medias.signature) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, c.width, c.height); im.src = d.medias.signature; has = true; } };
    const pos = (e) => { const r = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; };
    const start = (e) => { e.preventDefault(); drawing = true; last = pos(e); };
    const move = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); const g = ctx2(); g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p; has = true; };
    const end = () => { if (!drawing) return; drawing = false; if (has) { d.medias.signature = c.toDataURL('image/png'); d.medias.signature_date = new Date().toISOString(); ctx.save(); } };
    ['mousedown', 'touchstart'].forEach((ev) => c.addEventListener(ev, start)); ['mousemove', 'touchmove'].forEach((ev) => c.addEventListener(ev, move)); ['mouseup', 'mouseleave', 'touchend'].forEach((ev) => c.addEventListener(ev, end));
    setTimeout(fit, 30);
    return h('div', null, c, h('div', { class: 'row between', style: { marginTop: '6px' } }, h('span', { class: 'help' }, 'Signature unique du migrant, en fin d\'entretien. Elle est liée au contenu du dossier à la date de signature.'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { ctx2().clearRect(0, 0, c.width, c.height); has = false; delete d.medias.signature; ctx.save(); } }, icon('eraser'), 'Effacer')));
  };

  /* ---------- Orientation : un référencement par structure destinataire ---------- */
  F.orientation = function (d, ctx) {
    d.referencementsProposes = d.referencementsProposes || [];
    const wrap = h('div', { class: 'stack' });
    const structItems = window.METIER.structures.filter((s) => s.code !== 'DGIE').map((s) => ({ value: s.code, label: s.code + ' — ' + s.nom }));
    const typeItems = window.METIER.TYPES_SERVICE.map((t) => ({ value: t.code, label: t.label }));
    const paint = () => {
      wrap.innerHTML = '';
      d.referencementsProposes.forEach((x, i) => wrap.append(h('div', { class: 'card flat', style: { padding: '12px' } },
        h('div', { class: 'grid g2' }, dropdown({ items: structItems, value: x.destinataire, placeholder: 'Structure destinataire…', onChange: (v) => { x.destinataire = v; ctx.save(); } }).el,
          dropdown({ items: typeItems, value: x.type_service, placeholder: 'Type de service…', onChange: (v) => { x.type_service = v; ctx.save(); } }).el),
        h('div', { class: 'inline', style: { marginTop: '8px' } }, h('input', { class: 'input grow', placeholder: 'Motif du référencement', value: x.motif || '', oninput: (e) => { x.motif = e.target.value; ctx.save(true); } }),
          h('button', { type: 'button', class: 'btn ghost', onclick: () => { d.referencementsProposes.splice(i, 1); ctx.save(); paint(); } }, icon('trash-2'))))));
      wrap.append(h('button', { type: 'button', class: 'btn', onclick: () => { d.referencementsProposes.push({ id: UI.uuid() }); ctx.save(); paint(); } }, icon('send'), 'Ajouter un référencement'),
        h('div', { class: 'help' }, 'Un référencement distinct est créé pour chaque structure destinataire (P16). Il est transmis à la synchronisation, y compris si la structure était absente lors de l\'enrôlement.'));
      UI.refreshIcons();
    };
    paint(); return wrap;
  };

  /* ---------- Rendu d'une section complète ---------- */
  F.section = function (d, codes, ctx) {
    const box = h('div');
    const items = []; let curSous = null;
    for (const code of codes) {
      const q = Domaine.Q[code];
      if (q.widget === 'hidden') continue;
      if (q.sous !== curSous) { curSous = q.sous; box.append(h('div', { class: 'sub-head' }, q.sous)); }
      const set = (val, quiet) => {
        /* La valeur précédente est relevée AVANT l'écriture : elle sert à tracer les
           corrections apportées à une section renseignée par une autre structure. */
        const avant = d.reponses[code];
        if (Domaine.estVide(val)) delete d.reponses[code]; else d.reponses[code] = val;
        ctx.changed(code, val, quiet, avant);
      };
      const wrap = h('div', { class: 'qwrap', 'data-code': code },
        h('div', { class: 'qhead' }, h('label', { class: 'q' }, q.label, Domaine.obligatoire(q, d.reponses) ? h('span', { class: 'req' }, '*') : null),
          h('span', { class: 'row', style: { gap: '6px' } }, h('span', { class: 'sens ' + q.sens }, q.sens), h('span', { class: 'qcode' }, q.code))),
        F.widget(q, d, set, ctx),
        q.widget === 'auto' ? h('div', { class: 'help' }, 'Valeur renseignée automatiquement par la plateforme.') : null);
      items.push({ q, wrap }); box.append(wrap);
    }
    const refresh = () => {
      for (const { q, wrap } of items) {
        wrap.classList.toggle('hidden', !Domaine.visible(q, d.reponses, d));
        if (q.widget === 'auto') { const inp = wrap.querySelector('input'); const val = d.reponses[q.code]; inp.value = q.code === 'ENT-001' ? UI.fmtDate(val, true) : (val === undefined || val === null || val === '' ? 'Calculé automatiquement' : val); }
      }
      box.querySelectorAll('.sub-head').forEach((sh) => { let n = sh.nextElementSibling, any = false; while (n && !n.classList.contains('sub-head')) { if (!n.classList.contains('hidden')) any = true; n = n.nextElementSibling; } sh.classList.toggle('hidden', !any); });
    };
    refresh(); ctx.refreshers.push(refresh);
    UI.refreshIcons();
    return box;
  };
  window.Form = F;
})();
