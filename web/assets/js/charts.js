/* Graphiques SVG légers (sans bibliothèque externe, fonctionnent hors connexion) */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, ...kids) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v); kids.forEach((k) => k && el.append(k)); return el; };
  const t = (x, y, txt, anchor) => { const el = s('text', { x, y, 'text-anchor': anchor || 'middle' }); el.textContent = txt; return el; };
  const pas = (max) => { const p = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]; const brut = max / 5; return p.find((x) => x >= brut) || Math.ceil(brut); };

  /* Barres empilées : series = [{ nom, couleur, valeurs }] — la première série est au pied de la barre */
  function barres({ etiquettes, series, hauteur = 330, largeurBarre = 0.56 }) {
    const W = 760, H = hauteur, ml = 40, mb = 30, mt = 10, mr = 8;
    const tot = etiquettes.map((_, i) => series.reduce((a, se) => a + (se.valeurs[i] || 0), 0));
    const st = pas(Math.max(1, ...tot)); const max = Math.max(st, Math.ceil(Math.max(1, ...tot) / st) * st);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
    const y = (v) => mt + (H - mt - mb) * (1 - v / max);
    for (let v = 0; v <= max; v += st) { svg.append(s('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), style: 'stroke: var(--line)', 'stroke-dasharray': '4 4' })); svg.append(t(ml - 8, y(v) + 4, v, 'end')); }
    const bw = (W - ml - mr) / etiquettes.length;
    etiquettes.forEach((lab, i) => {
      const x = ml + i * bw + (bw * (1 - largeurBarre)) / 2; const w = bw * largeurBarre; let base = 0;
      series.forEach((se) => {
        const v = se.valeurs[i] || 0; if (!v) return;
        const y1 = y(base + v), y0 = y(base); const r = Math.min(6, w / 4);
        const g = s('path', { d: `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`, fill: se.couleur });
        const ti = s('title'); ti.textContent = `${lab} — ${se.nom} : ${v}`; g.append(ti); svg.append(g); base += v;
      });
      svg.append(t(ml + i * bw + bw / 2, H - 10, lab));
    });
    return svg;
  }

  /* Anneaux concentriques : parts = [{ v (0 à 1), couleur, info (texte de l'infobulle) }] */
  function anneau({ parts, taille = 150, epaisseur = 16 }) {
    const svg = s('svg', { viewBox: `0 0 ${taille} ${taille}`, width: taille, height: taille, class: 'chart' });
    parts.forEach((p, i) => {
      const r = taille / 2 - epaisseur / 2 - i * (epaisseur + 6); if (r <= 0) return;
      const c = 2 * Math.PI * r; const frac = Math.max(0, Math.min(1, p.v));
      const fond = s('circle', { cx: taille / 2, cy: taille / 2, r, fill: 'none', style: 'stroke: var(--chip-grey)', 'stroke-width': epaisseur });
      const arc = s('circle', { cx: taille / 2, cy: taille / 2, r, fill: 'none', stroke: p.couleur, 'stroke-width': epaisseur, 'stroke-linecap': 'round', 'stroke-dasharray': `${c * frac} ${c}`, transform: `rotate(-90 ${taille / 2} ${taille / 2})`, style: 'cursor:pointer' });
      if (p.info) { UI.infobulle(arc, p.info); UI.infobulle(fond, p.info); }
      svg.append(fond, arc);
    });
    return svg;
  }
  window.Charts = { barres, anneau };
})();


/* Graphiques complémentaires : secteurs (anneau), courbes, barres horizontales, pyramide des âges, barres groupées */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, ...kids) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined) el.setAttribute(k, v); kids.forEach((k) => k && el.append(k)); return el; };
  const t = (x, y, txt, anchor, cls) => { const el = s('text', { x, y, 'text-anchor': anchor || 'middle', class: cls || null }); el.textContent = txt; return el; };
  const PALETTE = ['#FE7701', '#014A96', '#4EA738', '#7C5CC4', '#0E9384', '#D6337A', '#F2B705', '#5B8DD6', '#A3541A', '#8A939C', '#2F7D22', '#C95A00'];
  const pas = (max) => { const p = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]; return p.find((x) => x >= max / 5) || Math.ceil(max / 5); };
  const fmt = (v, u) => (typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('fr-FR') : v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })) : v) + (u || '');
  const bulle = (el, html) => { if (window.UI && UI.infobulle) UI.infobulle(el, () => { const d = document.createElement('div'); d.innerHTML = html; return d; }); return el; };

  /* Anneau à secteurs : items = [{ label, v }] */
  function secteurs({ items, taille = 220, unite }) {
    const tot = items.reduce((a, x) => a + x.v, 0) || 1; const r = taille / 2 - 18, cx = taille / 2, cy = taille / 2, ep = 34;
    const svg = s('svg', { viewBox: `0 0 ${taille} ${taille}`, class: 'chart', style: `max-width:${taille}px` });
    let a0 = -Math.PI / 2;
    items.forEach((x, i) => {
      const a1 = a0 + (2 * Math.PI * x.v) / tot; const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      const [x0, y0] = p(a0, r), [x1, y1] = p(Math.min(a1, a0 + 2 * Math.PI - 0.0001), r), [x2, y2] = p(Math.min(a1, a0 + 2 * Math.PI - 0.0001), r - ep), [x3, y3] = p(a0, r - ep);
      const path = s('path', { d: `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r - ep},${r - ep} 0 ${large} 0 ${x3},${y3} Z`, fill: x.couleur || PALETTE[i % PALETTE.length], stroke: 'var(--surface)', 'stroke-width': 2, class: 'arc-part' });
      bulle(path, `<b>${x.label}</b><br>${Math.round((100 * x.v) / tot)} % (${fmt(x.v, unite)})`);
      svg.append(path); a0 = a1;
    });
    svg.append(t(cx, cy - 2, fmt(items.reduce((a, x) => a + x.v, 0)), 'middle', 'big'), t(cx, cy + 18, 'au total', 'middle'));
    return svg;
  }
  const legende = (items, tot) => { const d = document.createElement('div'); d.className = 'legend-list';
    items.forEach((x, i) => { const r = document.createElement('div'); r.innerHTML = `<i style="background:${x.couleur || PALETTE[i % PALETTE.length]}"></i><span>${x.label}</span><b>${Math.round((100 * x.v) / (tot || 1))} % <small>(${fmt(x.v)})</small></b>`; d.append(r); }); return d; };

  /* Barres horizontales : items = [{ label, v, sous }] */
  function hbarres({ items, couleur = '#014A96', unite, max, largeur }) {
    const W = largeur || 700, lh = 30, ml = W < 600 ? 140 : 170;
    const mr = 14 + 7.2 * Math.max(4, ...items.map((x) => (fmt(x.v, unite) + (x.pct !== undefined ? ` (${x.pct} %)` : '')).length)); const H = items.length * lh + 8; const M = max || Math.max(1, ...items.map((x) => x.v));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
    items.forEach((x, i) => { const y = 4 + i * lh; const w = ((W - ml - mr) * x.v) / M;
      svg.append(t(ml - 10, y + 18, x.label.length > (W < 600 ? 20 : 26) ? x.label.slice(0, W < 600 ? 19 : 25) + '…' : x.label, 'end'));
      svg.append(s('rect', { x: ml, y: y + 7, width: W - ml - mr, height: 14, rx: 7, style: 'fill: var(--line-2)' }));
      svg.append(bulle(s('rect', { x: ml, y: y + 7, width: Math.max(2, w), height: 14, rx: 7, fill: x.couleur || couleur }), `<b>${x.label}</b><br>${fmt(x.v, unite)}${x.sous ? '<br>' + x.sous : ''}`));
      svg.append(t(ml + Math.max(2, w) + 8, y + 18, fmt(x.v, unite) + (x.pct !== undefined ? ` (${x.pct} %)` : ''), 'start', 'val'));
    });
    return svg;
  }

  /* Courbes : series = [{ nom, couleur, valeurs }] */
  function courbes({ etiquettes, series, hauteur = 300, unite, largeur }) {
    const W = largeur || 760, H = hauteur, ml = 44, mb = 30, mt = 12, mr = 14; const max0 = Math.max(1, ...series.flatMap((x) => x.valeurs)); const st = pas(max0); const max = Math.ceil(max0 / st) * st;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
    const X = (i) => ml + ((W - ml - mr) * i) / Math.max(1, etiquettes.length - 1), Y = (v) => mt + (H - mt - mb) * (1 - v / max);
    for (let v = 0; v <= max; v += st) { svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), style: 'stroke: var(--line)', 'stroke-dasharray': '4 4' })); svg.append(t(ml - 8, Y(v) + 4, fmt(v), 'end')); }
    const pasLab = Math.ceil(etiquettes.length / 12);
    etiquettes.forEach((e, i) => { if (i % pasLab === 0) svg.append(t(X(i), H - 8, e)); });
    series.forEach((se, k) => {
      const col = se.couleur || PALETTE[k % PALETTE.length]; const pts = se.valeurs.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
      if (series.length === 1) svg.append(s('polygon', { points: `${X(0)},${Y(0)} ${pts} ${X(se.valeurs.length - 1)},${Y(0)}`, fill: col, opacity: 0.12 }));
      svg.append(s('polyline', { points: pts, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      se.valeurs.forEach((v, i) => svg.append(bulle(s('circle', { cx: X(i), cy: Y(v), r: 4.5, fill: col, stroke: 'var(--surface)', 'stroke-width': 2 }), `<b>${etiquettes[i]}</b><br>${se.nom} : ${fmt(v, unite)}`)));
    });
    return svg;
  }

  /* Barres groupées ou empilées avec infobulles : series = [{ nom, couleur, valeurs }] */
  function groupes({ etiquettes, series, empile = true, hauteur = 320, unite }) {
    const W = 760, H = hauteur, ml = 44, mb = 46, mt = 12, mr = 8;
    const tot = etiquettes.map((_, i) => (empile ? series.reduce((a, x) => a + (x.valeurs[i] || 0), 0) : Math.max(...series.map((x) => x.valeurs[i] || 0))));
    const st = pas(Math.max(1, ...tot)); const max = Math.max(st, Math.ceil(Math.max(1, ...tot) / st) * st);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
    const Y = (v) => mt + (H - mt - mb) * (1 - v / max);
    for (let v = 0; v <= max; v += st) { svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), style: 'stroke: var(--line)', 'stroke-dasharray': '4 4' })); svg.append(t(ml - 8, Y(v) + 4, fmt(v), 'end')); }
    const bw = (W - ml - mr) / etiquettes.length;
    etiquettes.forEach((lab, i) => {
      let base = 0; const n = series.length; const larg = bw * 0.62; const x0 = ml + i * bw + (bw - larg) / 2;
      series.forEach((se, k) => {
        const v = se.valeurs[i] || 0; if (!v) return; const col = se.couleur || PALETTE[k % PALETTE.length];
        const x = empile ? x0 : x0 + (larg / n) * k; const w = empile ? larg : larg / n - 2;
        const y1 = empile ? Y(base + v) : Y(v), y0 = empile ? Y(base) : Y(0);
        svg.append(bulle(s('rect', { x, y: y1, width: Math.max(1, w), height: Math.max(1, y0 - y1), rx: Math.min(5, w / 3), fill: col }), `<b>${lab}</b><br>${se.nom} : ${fmt(v, unite)}`));
        if (empile) base += v;
      });
      const lb = lab.length > 14 ? lab.slice(0, 13) + '…' : lab;
      svg.append(t(ml + i * bw + bw / 2, H - 26, lb));
    });
    return svg;
  }

  /* Pyramide des âges : tranches (du plus jeune au plus âgé), hommes, femmes */
  function pyramide({ tranches, hommes, femmes, largeur }) {
    const W = largeur || 700, lh = 30, mid = W / 2, lab = 70; const H = tranches.length * lh + 30; const M = Math.max(1, ...hommes, ...femmes);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' }); const lw = mid - lab / 2 - 50;
    tranches.slice().reverse().forEach((tr, j) => { const i = tranches.length - 1 - j; const y = 4 + j * lh;
      const wh = (lw * hommes[i]) / M, wf = (lw * femmes[i]) / M;
      svg.append(bulle(s('rect', { x: mid - lab / 2 - wh, y: y + 6, width: Math.max(1, wh), height: 18, rx: 4, fill: '#014A96' }), `<b>Hommes ${tr}</b><br>${hommes[i]}`));
      svg.append(bulle(s('rect', { x: mid + lab / 2, y: y + 6, width: Math.max(1, wf), height: 18, rx: 4, fill: '#FE7701' }), `<b>Femmes ${tr}</b><br>${femmes[i]}`));
      svg.append(t(mid, y + 20, tr), t(mid - lab / 2 - wh - 6, y + 20, hommes[i], 'end', 'val'), t(mid + lab / 2 + wf + 6, y + 20, femmes[i], 'start', 'val'));
    });
    svg.append(t(mid - lab / 2 - 4, H - 6, 'Hommes', 'end', 'val'), t(mid + lab / 2 + 4, H - 6, 'Femmes', 'start', 'val'));
    return svg;
  }
  Object.assign(window.Charts, { secteurs, legende, hbarres, courbes, groupes, pyramide, PALETTE });
})();
