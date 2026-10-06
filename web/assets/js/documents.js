/* Documents produits par la plateforme : fiche unique du migrant (recto : photo, identifiant, code QR ; verso : parcours dessiné),
   attestation de retour à code QR, fiche de référencement, page publique de vérification.
   Bibliothèques embarquées : jsPDF (MIT), qrcode-generator de Kazuhiko Arase (MIT). */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const D = {};
  const BLEU = [1, 74, 150], VERT = [78, 167, 56], ORANGE = [254, 119, 1], TEXTE = [33, 43, 54], GRIS = [110, 117, 125];
  const STRUCT = (c) => (M.structures.find((s) => s.code === c) || { nom: c }).nom;
  /* jsPDF (polices standard) ne connaît que le jeu Latin-1 : on remplace les caractères hors jeu */
  const t = (v) => String(v === undefined || v === null ? '' : v).replace(/[  ]/g, ' ').replace(/[’‘]/g, '\'').replace(/[“”]/g, '"').replace(/→/g, '>').replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').replace(/[^\x00-\xFFŒœ–—…€]/g, '');
  const val = (v) => (v === undefined || v === null || v === '' ? '—' : typeof v === 'object' ? (v.n || v.ville || v.pays || Object.values(v).filter(Boolean).join(', ')) : String(v));
  const dt = (iso) => (iso ? UI.fmtDate(String(iso).length === 10 ? iso : iso) : '—');
  const img = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  async function png(src, w, hgt) { const im = await img(src); if (!im) return null; const c = document.createElement('canvas'); c.width = w || im.naturalWidth || 256; c.height = hgt || im.naturalHeight || 256; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }

  /* ---------- Code de vérification et code QR ---------- */
  D.cle = function (identifiant) { let x = 0x811c9dc5; const s = 'R360|' + identifiant + '|verif'; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).toUpperCase().padStart(8, '0'); };
  D.url = (identifiant) => location.origin + location.pathname + '#/verifier/' + encodeURIComponent(identifiant) + '/' + D.cle(identifiant);
  const qr = (texte) => { const q = qrcode(0, 'M'); q.addData(texte, 'Byte'); q.make(); return q; };
  D.qrSvg = (texte, taille) => { const q = qr(texte); const n = q.getModuleCount(); const el = document.createElement('div'); el.className = 'qr'; el.innerHTML = q.createSvgTag({ cellSize: Math.max(2, Math.floor((taille || 160) / (n + 8))), margin: 4, scalable: true }); return el; };
  function dessinerQR(doc, texte, x, y, taille) {
    const q = qr(texte); const n = q.getModuleCount(); const c = taille / (n + 2);
    doc.setFillColor(255, 255, 255); doc.rect(x, y, taille, taille, 'F'); doc.setFillColor(0, 0, 0);
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) doc.rect(x + c * (k + 1), y + c * (r + 1), c + 0.01, c + 0.01, 'F');
  }

  /* ---------- Éléments communs ---------- */
  async function nouveau() {
    if (!window.jspdf) throw new Error('Bibliothèque PDF indisponible');
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc._embleme = await png('assets/img/embleme.png', 200, 200);
    return doc;
  }
  function entete(doc, titre, sousTitre) {
    const W = 210;
    doc.setFillColor(...BLEU); doc.rect(0, 0, W, 24, 'F');
    doc.setFillColor(...ORANGE); doc.rect(0, 24, W / 3, 1.3, 'F'); doc.setFillColor(255, 255, 255); doc.rect(W / 3, 24, W / 3, 1.3, 'F'); doc.setFillColor(...VERT); doc.rect((2 * W) / 3, 24, W / 3, 1.3, 'F');
    if (doc._embleme) { doc.setFillColor(255, 255, 255); doc.circle(18, 12, 8.5, 'F'); doc.addImage(doc._embleme, 'PNG', 11, 5, 14, 14); }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Retour CI 360', 31, 10.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.text(t('Gestion intégrée du retour et de la réinsertion des Ivoiriens de l\'extérieur'), 31, 15.5);
    doc.setFontSize(7.6); doc.text(t('RÉPUBLIQUE DE CÔTE D\'IVOIRE'), W - 10, 10, { align: 'right' }); doc.text(t('Union – Discipline – Travail'), W - 10, 14.5, { align: 'right' });
    doc.setTextColor(...TEXTE); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(t(titre), W / 2, 38, { align: 'center' });
    if (sousTitre) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS); doc.text(t(sousTitre), W / 2, 44, { align: 'center' }); }
  }
  function pied(doc, mention) {
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setDrawColor(225); doc.line(12, 284, 198, 284); doc.setFontSize(7); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal');
      doc.text(t(mention || 'Données à caractère personnel protégées (loi n° 2013-450 du 19 juin 2013). Document de démonstration — données fictives.'), 12, 288.5);
      doc.text(t('Page ' + i + ' sur ' + n), 198, 288.5, { align: 'right' });
    }
  }
  const lib = (doc, x, y, label, valeur, w, maxL) => { const n = maxL || 2; doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text(t(label.toUpperCase()), x, y); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...TEXTE); let l = doc.splitTextToSize(t(valeur), w || 70); if (l.length > n) { l = l.slice(0, n); l[n - 1] = l[n - 1].replace(/.{0,2}$/, '') + '…'; } doc.text(l, x, y + 4.8); return y + 4.8 + (l.length - 1) * 4.6 + 6; };
  async function photo(doc, d, x, y, w, hh) {
    const ph = d.medias && d.medias.photo;
    doc.setDrawColor(210); doc.setFillColor(242, 244, 246); doc.roundedRect(x, y, w, hh, 2, 2, 'FD');
    if (ph) { try { const fmt = /^data:image\/png/.test(ph) ? 'PNG' : 'JPEG'; const im = await img(ph); let iw = w, ih = hh; if (im) { const r = Math.min(w / im.naturalWidth, hh / im.naturalHeight); iw = im.naturalWidth * r; ih = im.naturalHeight * r; } doc.addImage(ph, fmt, x + (w - iw) / 2, y + (hh - ih) / 2, iw, ih); return; } catch (e) { /* repli sur les initiales */ } }
    const ini = UI.initials(((d.resume || {}).nom || '?') + ' ' + ((d.resume || {}).prenoms || ''));
    doc.setTextColor(170, 178, 186); doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(28, w * 0.7)); doc.text(t(ini), x + w / 2, y + hh / 2 + 3, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.text('Photo non disponible', x + w / 2, y + hh - 4, { align: 'center' });
  }
  async function contexte(d) {
    let arrs = [], sites = [];
    try { arrs = await Store.db.list('arrivees'); sites = await Store.db.list('sites'); } catch (e) { /* hors connexion */ }
    if (!arrs.length && App.profil && App.profil.tablette) { arrs = Store.LS.get('r360.tablette.arrivees.' + App.profil.tablette, []); sites = Store.LS.get('r360.tablette.sites.' + App.profil.tablette, []); }
    const a = arrs.find((x) => x.id === d.arrivee_id) || null;
    const s = sites.find((x) => x.id === (d.site_id || (a && a.site_id))) || null;
    return { a, s };
  }
  const identifiant = (d) => d.identifiant || d.identifiantProvisoire || '—';
  const nomComplet = (d) => ((d.resume.nom || '') + ' ' + (d.resume.prenoms || '')).trim() || '—';
  const sauver = async (doc, nom, action, d) => D.apercu(doc, nom, action, identifiant(d));
  /* Aperçu du PDF dans la plateforme avant impression ou téléchargement */
  D.apercu = function (doc, nom, titre, objet) {
    const url = doc.output('bloburl'); const pages = doc.internal.getNumberOfPages();
    const cadre = h('iframe', { class: 'pdf-frame', src: url + '#toolbar=0&navpanes=0&view=FitH', title: titre });
    const journal = (action) => Store.audit(action, objet || nom, nom).catch(() => {});
    const m = UI.modal({ title: titre, icon: 'file-text', body: h('div', { class: 'pdf-apercu' },
      h('div', { class: 'row between', style: { marginBottom: '10px' } }, h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'badge grey' }, icon('file'), nom), h('span', { class: 'badge info' }, pages + ' page(s)')),
        h('span', { class: 'tiny muted' }, 'Aperçu : vérifiez le document avant de l\'imprimer ou de le télécharger.')), cadre),
      actions: [{ label: 'Fermer', onclick: () => { setTimeout(() => URL.revokeObjectURL(url), 1000); } },
        { label: 'Télécharger', icon: 'download', onclick: () => { doc.save(nom); journal('Téléchargement : ' + titre); return false; } },
        { label: 'Imprimer', cls: 'primary', icon: 'printer', onclick: () => { try { cadre.contentWindow.focus(); cadre.contentWindow.print(); } catch (e) { window.open(url, '_blank'); } journal('Impression : ' + titre); return false; } }] });
    m.el.classList.add('modal-pdf');
    journal('Aperçu : ' + titre);
    return m;
  };

  /* ---------- Carte du parcours (dessin vectoriel sur un canevas, sans fond en ligne) ---------- */
  D.carteParcours = function (etapes, retourLL, W, H) {
    W = W || 1800; H = H || 1150;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const pts = etapes.map((e) => e.ll).concat(retourLL ? [retourLL] : []);
    let la0 = Math.min(...pts.map((p) => p[0])), la1 = Math.max(...pts.map((p) => p[0])), lo0 = Math.min(...pts.map((p) => p[1])), lo1 = Math.max(...pts.map((p) => p[1]));
    const latC = (la0 + la1) / 2; const kx = Math.cos((latC * Math.PI) / 180);
    let spanX = Math.max(10, (lo1 - lo0) * 1.35) * kx, spanY = Math.max(8, (la1 - la0) * 1.35);
    const ratio = W / H; if (spanX / spanY > ratio) spanY = spanX / ratio; else spanX = spanY * ratio;
    const cx = ((lo0 + lo1) / 2) * kx, cy = (la0 + la1) / 2;
    const X = (lo) => ((lo * kx - (cx - spanX / 2)) / spanX) * W; const Y = (la) => ((cy + spanY / 2 - la) / spanY) * H;
    g.fillStyle = '#E6F0FA'; g.fillRect(0, 0, W, H);
    const surRoute = new Set(etapes.map((e) => e.code));
    const geo = (window.AFRIQUE_GEO || { features: [] }).features;
    geo.forEach((f) => {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      g.beginPath(); polys.forEach((poly) => poly.forEach((ring) => ring.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la))))));
      const cc = f.properties.c; g.fillStyle = cc === 'CI' ? '#FFDCC0' : surRoute.has(cc) ? '#D6ECCD' : '#F5F6F7'; g.fill('evenodd');
      g.strokeStyle = '#B8C2CC'; g.lineWidth = 1.6; g.stroke();
    });
    // noms des pays traversés
    g.textAlign = 'center'; g.font = '600 30px Helvetica, Arial, sans-serif';
    [...surRoute].forEach((cc) => { const p = REF.pays.find((x) => x.c === cc); if (!p || !p.ll) return; const x = X(p.ll[1]), y = Y(p.ll[0]); if (x < 40 || x > W - 40 || y < 40 || y > H - 40) return; g.fillStyle = 'rgba(70,84,98,.55)'; g.fillText(t(p.n).toUpperCase(), x, y); });
    // trajet aller
    const chemin = Carte.chemin(etapes);
    const trace = (pp, couleur, larg, tirets) => { g.beginPath(); pp.forEach(([la, lo], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.setLineDash(tirets || []); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF'; g.lineWidth = larg + 8; g.stroke(); g.strokeStyle = couleur; g.lineWidth = larg; g.stroke(); g.setLineDash([]); };
    if (chemin.length > 1) trace(chemin, '#FE7701', 7);
    // flèches de direction
    for (let i = 1; i < etapes.length; i++) { const seg = Carte.arc(etapes[i - 1].ll, etapes[i].ll); const m = seg[Math.floor(seg.length / 2)], m2 = seg[Math.floor(seg.length / 2) + 1]; if (!m2) continue; const a = Math.atan2(Y(m2[0]) - Y(m[0]), X(m2[1]) - X(m[1])); g.save(); g.translate(X(m[1]), Y(m[0])); g.rotate(a); g.fillStyle = '#C95A00'; g.beginPath(); g.moveTo(14, 0); g.lineTo(-10, -11); g.lineTo(-10, 11); g.closePath(); g.fill(); g.restore(); }
    // retour
    if (retourLL && etapes.length) { const fin = etapes[etapes.length - 1].ll; trace(Carte.arc(fin, retourLL, -0.22, 30), '#014A96', 5, [18, 14]); }
    // marqueurs numérotés
    g.font = 'bold 26px Helvetica, Arial, sans-serif';
    etapes.forEach((e, i) => {
      const x = X(e.ll[1]), y = Y(e.ll[0]); const r = 21;
      g.beginPath(); g.arc(x, y, r + 4, 0, 2 * Math.PI); g.fillStyle = '#FFFFFF'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fillStyle = i === 0 ? '#4EA738' : i === etapes.length - 1 ? '#D92D20' : '#014A96'; g.fill();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x, y + 1);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '600 25px Helvetica, Arial, sans-serif'; const lab = t(e.n);
      const tw = g.measureText(lab).width; const lx = x + tw + 40 > W ? x - tw - 34 : x + 30;
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(lx - 5, y - 22, tw + 10, 32); g.fillStyle = '#212B36'; g.fillText(lab, lx, y + 2); g.font = 'bold 26px Helvetica, Arial, sans-serif';
    });
    if (retourLL) { const x = X(retourLL[1]), y = Y(retourLL[0]); g.beginPath(); g.arc(x, y, 15, 0, 2 * Math.PI); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#014A96'; g.stroke(); }
    // légende
    g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(24, H - 112, 560, 88); g.strokeStyle = '#D0D6DC'; g.lineWidth = 2; g.strokeRect(24, H - 112, 560, 88);
    g.font = '500 24px Helvetica, Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.strokeStyle = '#FE7701'; g.lineWidth = 7; g.beginPath(); g.moveTo(44, H - 86); g.lineTo(104, H - 86); g.stroke(); g.fillStyle = '#212B36'; g.fillText('Trajet aller déclaré', 118, H - 86);
    g.strokeStyle = '#014A96'; g.lineWidth = 5; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(44, H - 48); g.lineTo(104, H - 48); g.stroke(); g.setLineDash([]); g.fillText('Retour en Côte d\'Ivoire', 118, H - 48);
    g.font = '400 18px Helvetica, Arial, sans-serif'; g.fillStyle = '#7A8590'; g.textAlign = 'right'; g.fillText('Contours : Natural Earth (domaine public) — villes : GeoNames', W - 20, H - 16);
    return c;
  };
  const km = (et) => et.reduce((s, x, i) => { if (!i) return 0; const [a1, o1] = et[i - 1].ll, [a2, o2] = x.ll; const R = 6371, r = Math.PI / 180; const dA = (a2 - a1) * r, dO = (o2 - o1) * r; const q = Math.sin(dA / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2; return s + 2 * R * Math.asin(Math.sqrt(q)); }, 0);

  /* ======================= Fiche unique du migrant (document sécurisé, recto et verso) ======================= */
  const NAVY = [12, 35, 64], BLEU2 = [36, 99, 172], LIGNE = [205, 212, 222], FOND = [240, 243, 247];
  /* Texte espacé : jsPDF ne compte pas l'espacement dans l'alignement, on le calcule ici */
  const espace = (doc, txt, x, y, o) => { const opt = { charSpace: 0.45, ...(o || {}) }; const s2 = t(txt); const w = doc.getTextWidth(s2) + Math.max(0, s2.length - 1) * opt.charSpace;
    const x0 = opt.align === 'center' ? x - w / 2 : opt.align === 'right' ? x - w : x; delete opt.align; doc.text(s2, x0, y, opt); return w; };
  async function empreinte(texte) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let a = ''; for (let i = 0; i < 8; i++) a += D.cle(texte + i).toLowerCase(); return a; }
  }
  function drapeau(doc, x, y) { const w = 4.2; doc.setFillColor(...ORANGE); doc.rect(x, y, w, 9, 'F'); doc.setFillColor(255, 255, 255); doc.rect(x + w, y, w, 9, 'F'); doc.setFillColor(...VERT); doc.rect(x + 2 * w, y, w, 9, 'F'); doc.setDrawColor(...LIGNE); doc.setLineWidth(0.15); doc.rect(x, y, 3 * w, 9); }
  function hachures(doc, y) { for (let x = 0; x < 212; x += 3.2) { doc.setFillColor(...(Math.round(x / 3.2) % 2 ? BLEU2 : NAVY)); doc.triangle(x, y, x + 1.6, y, x, y + 1.6, 'F'); doc.triangle(x + 1.6, y, x + 3.2, y, x + 1.6, y + 1.6, 'F'); doc.triangle(x + 1.6, y, x, y + 1.6, x + 1.6, y + 1.6, 'F'); } doc.setFillColor(...NAVY); doc.rect(0, y + 1.6, 210, 0.4, 'F'); }
  function entetePlein(doc, logo, compact, id) {
    const W = 210;
    drapeau(doc, 15, compact ? 4.5 : 7);
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(compact ? 8 : 9.5); espace(doc, 'RÉPUBLIQUE DE CÔTE D\'IVOIRE', 32, compact ? 10.5 : 11.5, { charSpace: 0.9 });
    if (!compact) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text('Union · Discipline · Travail', 32, 16); }
    if (logo) doc.addImage(logo, 'PNG', W - 15 - (compact ? 10 : 16), compact ? 2 : 3, compact ? 10 : 16, compact ? 9.7 : 15.6);
    const y0 = compact ? 15 : 22, hh = compact ? 11 : 20;
    doc.setFillColor(...NAVY); doc.rect(0, y0, W, hh, 'F'); hachures(doc, y0 + hh);
    doc.setTextColor(255, 255, 255);
    if (compact) {
      doc.setFont('times', 'bold'); doc.setFontSize(11.5); doc.text(t('DGIE · Fiche unique du migrant de retour (verso)'), 15, y0 + 7.3);
      doc.setFont('courier', 'bold'); doc.setFontSize(11); doc.text(t(id), W - 15, y0 + 7.3, { align: 'right' });
    } else {
      doc.setFont('times', 'bold'); doc.setFontSize(15); doc.text(t('Direction Générale des Ivoiriens de l\'Extérieur'), 15, y0 + 8.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); espace(doc, 'FICHE UNIQUE DU MIGRANT DE RETOUR', 15, y0 + 15, { charSpace: 0.9 });
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.35); doc.roundedRect(W - 15 - 52, y0 + 3.5, 52, 7, 3.5, 3.5);
      doc.setFontSize(7.8); espace(doc, 'EXEMPLAIRE MIGRANT', W - 15 - 26, y0 + 8.2, { align: 'center', charSpace: 0.8 });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(205, 215, 230); doc.text(t('Établie en application de [texte de référence à confirmer]'), W - 15, y0 + 15.5, { align: 'right' });
    }
    return y0 + hh + 2;
  }
  function titreSection(doc, n, txt, y) {
    doc.setFillColor(...NAVY); doc.rect(15, y - 2.4, 2.4, 2.4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6); doc.setTextColor(...NAVY); const lib = n + ' · ' + txt.toUpperCase(); const w = espace(doc, lib, 20, y, { charSpace: 0.75 }); doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.line(20 + w + 3, y - 1.1, 195, y - 1.1);
  }
  function champ(doc, x, y, label, valeur, w, opts) {
    const o = opts || {};
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...GRIS); espace(doc, label.toUpperCase(), x, y, { charSpace: 0.55 });
    doc.setFont(o.mono ? 'courier' : 'helvetica', 'bold'); doc.setFontSize(o.taille || 10.2); doc.setTextColor(...TEXTE);
    let l = doc.splitTextToSize(t(valeur === undefined || valeur === null || valeur === '' ? '—' : valeur), w || 55); if (l.length > (o.lignes || 1)) { l = l.slice(0, o.lignes || 1); l[l.length - 1] = l[l.length - 1].replace(/.{0,2}$/, '') + '…'; }
    doc.text(l, x, y + 4.7);
  }
  function puce(doc, x, y, txt, style) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); const w = doc.getTextWidth(t(txt)) + (style === 'plein' || style === 'orange' ? Math.max(0, t(txt).length - 1) * 0.5 : 0) + 7;
    if (style === 'plein' || style === 'orange') { doc.setFillColor(...(style === 'orange' ? [201, 90, 0] : [23, 114, 69])); doc.rect(x, y, w, 6.2, 'F'); doc.setTextColor(255, 255, 255); espace(doc, txt, x + 3.5, y + 4.2, { charSpace: style === 'plein' || style === 'orange' ? 0.5 : 0 }); }
    else { doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, 6.2, 1, 1); doc.setTextColor(...TEXTE); doc.text(t(txt), x + 3.5, y + 4.2); }
    return x + w + 2.5;
  }
  function microtexte(doc, motif) { doc.setFont('helvetica', 'normal'); doc.setFontSize(3.2); doc.setTextColor(150, 158, 170); const m = t(motif).replace(/\s+/g, ''); doc.text((m + '·').repeat(14).slice(0, 360), 3, 295.2); }
  function piedSecurise(doc, hash, page, total, motif) {
    doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.line(15, 274, 195, 274);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4); doc.setTextColor(...GRIS); espace(doc, 'EMPREINTE D\'INTÉGRITÉ SHA-256', 15, 279);
    doc.setFont('courier', 'normal'); doc.setFontSize(7); doc.setTextColor(...TEXTE); doc.text([hash.slice(0, 40), hash.slice(40)], 15, 283);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4); doc.setTextColor(...GRIS); espace(doc, 'CONTRÔLE', 98, 279);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...TEXTE); doc.text(doc.splitTextToSize(t('Tout agent habilité vérifie ce document en scannant le code QR. Un document non reconnu par la plateforme est réputé invalide.'), 58), 98, 283);
    doc.setFontSize(7); doc.setTextColor(...GRIS); doc.text(t('Généré le ' + UI.fmtDate(new Date().toISOString(), true)), 195, 279, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...TEXTE); doc.text('Page ' + page + ' / ' + total, 195, 284, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS); doc.text('Système Retour CI 360 v1 · données fictives', 195, 288, { align: 'right' });
    microtexte(doc, motif);
  }

  D.ficheMigrant = async function (d) {
    try {
      UI.toast('Préparation de la fiche migrant…', 'loader');
      if (!window.jspdf) throw new Error('Bibliothèque PDF indisponible');
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const logo = await png('assets/img/logo-retour-ci-360.png', 300, 292);
      const r = d.reponses || {}; const { a, s } = await contexte(d); const id = identifiant(d); const prov = !d.identifiant;
      const cleImp = 'r360.impressions.' + d.id; const nImp = (Store.LS.get(cleImp, 0) || 0) + 1; Store.LS.set(cleImp, nImp);
      const hash = await empreinte([id, d.resume.nom, d.resume.prenoms, d.resume.date_naissance, r['IDT-019'], a ? a.code : '', d.structure, d.synced_at || d.created_at].join('|'));
      const motif = 'RETOURCI360 · FICHEUNIQUEDUMIGRANT · ' + id + ' · DGIE · ';
      const urlVerif = prov ? 'RCI360-PROVISOIRE:' + id : D.url(id);
      const et = Form.etapes(d.itineraire || {});

      // ---------- RECTO ----------
      let y = entetePlein(doc, logo, false);
      y += 7; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...GRIS); espace(doc, prov ? 'N° D\'IDENTIFIANT PROVISOIRE' : 'N° D\'IDENTIFIANT NATIONAL UNIQUE', 15, y, { charSpace: 0.8 });
      doc.setFont('courier', 'bold'); doc.setFontSize(prov ? 19 : 25); doc.setTextColor(...NAVY); doc.text(t(id), 14.2, y + 11);
      let x = 15; const yc = y + 16;
      x = puce(doc, x, yc, prov ? 'PROVISOIRE' : 'ENREGISTRÉ', prov ? 'orange' : 'plein');
      x = puce(doc, x, yc, 'Impression n° ' + nImp);
      x = puce(doc, x, yc, 'Enregistré le ' + UI.fmtDate(d.created_at));
      puce(doc, x, yc, d.valide ? 'Validé le ' + UI.fmtDate(d.valide.date) : 'Validation en attente');
      const y3 = yc + 13;
      champ(doc, 15, y3, 'Structure d\'enrôlement', d.structure + (d.contributions && d.contributions.length > 1 ? ' (+ ' + d.contributions.filter((k) => k.structure !== d.structure).map((k) => k.structure).join(', ') + ')' : ''), 50);
      champ(doc, 70, y3, 'Site d\'accueil', s ? s.nom : d.site, 48);
      champ(doc, 122, y3, 'Arrivée', a ? a.code : d.arrivee_code, 34, { mono: true });
      // QR
      const qx = 160, qy = y - 3; doc.setDrawColor(...NAVY); doc.setLineWidth(0.4); doc.rect(qx, qy, 35, 35); dessinerQR(doc, urlVerif, qx + 1.5, qy + 1.5, 32);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...NAVY); espace(doc, 'VÉRIFICATION TERRAIN', qx + 17.5, qy + 39.5, { align: 'center', charSpace: 0.6 });
      doc.setFont('courier', 'normal'); doc.setFontSize(6.3); doc.setTextColor(...GRIS); doc.text(prov ? 'après synchronisation' : 'r360://verifier/' + D.cle(id), qx + 17.5, qy + 43, { align: 'center' });
      y = y3 + 12; doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.line(0, y, 210, y);

      // 1 · Identité
      y += 8; titreSection(doc, 1, 'Identité du migrant', y); y += 6;
      await photo(doc, d, 15, y, 30, 38);
      const cx = [50, 99, 148]; const w3 = 46;
      champ(doc, cx[0], y + 3, 'Nom', d.resume.nom, w3); champ(doc, cx[1], y + 3, 'Prénoms', d.resume.prenoms, w3); champ(doc, cx[2], y + 3, 'Sexe', d.resume.sexe, w3);
      champ(doc, cx[0], y + 15, 'Date de naissance', dt(d.resume.date_naissance) + (d.resume.age !== null && d.resume.age !== undefined ? ' · ' + d.resume.age + ' ans' : ''), w3); champ(doc, cx[1], y + 15, 'Lieu de naissance', val(r['IDT-008']), w3); champ(doc, cx[2], y + 15, 'Nationalité', val(r['IDT-009']), w3);
      champ(doc, cx[0], y + 27, 'Téléphone', r['IDT-011'] && r['IDT-011'].num !== 'Inconnu' ? r['IDT-011'].ind + ' ' + r['IDT-011'].num : '—', w3, { mono: true, taille: 9.5 }); champ(doc, cx[1], y + 27, 'Pièce d\'identité', r['RES-016'] || 'Non présentée', w3, { mono: !!r['RES-016'], taille: 9.5 }); champ(doc, cx[2], y + 27, 'Catégorie', (d.resume.categorie || '').split(' (')[0], w3);
      y += 44;

      // 2 · Retour et accueil
      titreSection(doc, 2, 'Retour et accueil', y); y += 6;
      champ(doc, 15, y, 'Mode de retour', val(r['IDT-016']), 56); champ(doc, 76, y, 'Moyen de retour', a ? a.type + ' · ' + (a.numero || '') : val(r['IDT-017']), 56); champ(doc, 137, y, 'Date de retour', dt(r['IDT-019']), 56);
      champ(doc, 15, y + 12, 'Pays de provenance', d.resume.provenance, 56); champ(doc, 76, y + 12, 'Organisme(s) ayant facilité', [].concat(r['IDT-018'] || []).join(', '), 56); champ(doc, 137, y + 12, 'Localité de retour', [d.resume.localite_retour, d.resume.region_retour].filter(Boolean).join(', '), 58);
      y += 26;

      // 3 · Trajet
      titreSection(doc, 3, 'Trajet', y); y += 4;
      doc.setFillColor(...FOND); doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.rect(15, y, 180, 30.5, 'FD');
      const dep = et[0], der = et[et.length - 1];
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...GRIS); espace(doc, 'DÉPART', 21, y + 6); espace(doc, 'DERNIÈRE ÉTAPE', 189, y + 6, { align: 'right' });
      doc.setFontSize(12.5); doc.setTextColor(...NAVY); doc.text(t((dep ? dep.n : val(r['PAR-002'])).toUpperCase()), 21, y + 12.5); doc.text(t((der && der !== dep ? der.n + ', ' + der.pays : d.resume.provenance || '—').toUpperCase()), 189, y + 12.5, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(...TEXTE); doc.text(t('Départ : ' + val(r['PAR-001'])), 21, y + 18); doc.text(t('Retour : ' + dt(r['IDT-019']) + (s ? ' · ' + s.localite : '')), 189, y + 18, { align: 'right' });
      doc.setDrawColor(...NAVY); doc.setLineWidth(0.5); doc.line(76, y + 10.5, 132, y + 10.5); doc.setFillColor(...NAVY); doc.triangle(132, y + 9, 135, y + 10.5, 132, y + 12, 'F');
      const pays = [...new Set(et.filter((e) => e.code !== 'CI').map((e) => e.pays))];
      const c1 = pays.length + ' pays traversé(s)', c2 = et.length > 1 ? Math.round(km(et)).toLocaleString('fr-FR') + ' km' : 'trajet non renseigné';
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); const largeur = doc.getTextWidth(t(c1)) + doc.getTextWidth(t(c2)) + 16.5;
      let px = 105 - largeur / 2; px = puce(doc, px, y + 21.5, c1); puce(doc, px, y + 21.5, c2);
      y += 37;

      // 4 · Situation et orientation
      titreSection(doc, 4, 'Situation et orientation à l\'enregistrement', y); y += 3;
      const lignes = [['Niveau d\'étude', val(r['EDU-001'])], ['Activité avant le départ', val(r['PER-010'])], ['Vulnérabilité évaluée', val(r['ORI-003'])], ['Besoins immédiats', [].concat(r['BIM-001'] || []).join(', ') || '—'],
        ['Orientation prévue', [].concat(r['ORI-004'] || []).join(', ') || '—'], ['Structures de référencement', [].concat(r['ORI-005'] || []).join(', ') || '—']];
      doc.autoTable({ startY: y, margin: { left: 15, right: 15 }, head: [['RUBRIQUE', 'CONSTAT', 'RUBRIQUE', 'CONSTAT']], body: [0, 2, 4].map((i) => [t(lignes[i][0]), t(lignes[i][1]), t(lignes[i + 1][0]), t(lignes[i + 1][1])]),
        styles: { font: 'helvetica', fontSize: 8.4, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, textColor: TEXTE, lineColor: LIGNE, lineWidth: 0 },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 } }, alternateRowStyles: { fillColor: [247, 249, 251] },
        columnStyles: { 0: { textColor: GRIS, cellWidth: 38 }, 1: { fontStyle: 'bold', cellWidth: 52 }, 2: { textColor: GRIS, cellWidth: 38 }, 3: { fontStyle: 'bold' } } });
      y = doc.lastAutoTable.finalY + 5;
      if (y < 258) {
        doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.rect(15, y, 87, 14); doc.rect(108, y, 87, 14);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...GRIS); espace(doc, 'ENTRETIEN RÉALISÉ PAR', 18, y + 4.5); espace(doc, 'STATUT DU SUIVI', 111, y + 4.5);
        doc.setFontSize(9); doc.setTextColor(...TEXTE); doc.text(t((d.contributions && d.contributions.length ? d.contributions.map((k) => k.agent + ' (' + k.structure + ')').join(', ') : d.agent + ' (' + d.structure + ')')), 18, y + 10, { maxWidth: 82 });
        doc.text(t((d.etat_suivi || 'Ouvert') + (d.reponses['SUI-002'] ? ' · ' + d.reponses['SUI-002'] : '')), 111, y + 10);
      }
      piedSecurise(doc, hash, 1, 2, motif);

      // ---------- VERSO ----------
      doc.addPage(); y = entetePlein(doc, logo, true, id) + 7;
      titreSection(doc, 5, 'Parcours migratoire', y); y += 3;
      if (et.length) {
        const retour = s ? s.ll : (REF.localitesCI.find((l) => l.n === 'Abidjan') || {}).ll;
        const canvas = D.carteParcours(et, retour, 1800, 860);
        doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 15, y, 180, 86, undefined, 'FAST'); doc.setDrawColor(...LIGNE); doc.rect(15, y, 180, 86); y += 92;
        titreSection(doc, 6, 'Étapes du parcours', y); y += 3;
        const pas = et.map((e, i) => [String(i + 1), t(e.n), t(e.pays), i ? Math.round(km([et[i - 1], e])).toLocaleString('fr-FR').replace(/\s/g, ' ') : '—']);
        const moitie = Math.ceil(pas.length / 2); const corps = Array.from({ length: moitie }, (_, i) => [...pas[i], ...(pas[i + moitie] || ['', '', '', ''])]);
        doc.autoTable({ startY: y, margin: { left: 15, right: 15 }, head: [['N°', 'VILLE', 'PAYS', 'KM', 'N°', 'VILLE', 'PAYS', 'KM']], body: corps,
          styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 1.6, bottom: 1.6, left: 2.5, right: 2.5 }, textColor: TEXTE }, headStyles: { fillColor: FOND, textColor: NAVY, fontStyle: 'bold', fontSize: 6.8 },
          columnStyles: { 0: { cellWidth: 9, textColor: GRIS }, 3: { halign: 'right', cellWidth: 16 }, 4: { cellWidth: 9, textColor: GRIS }, 7: { halign: 'right', cellWidth: 16 } } });
        y = doc.lastAutoTable.finalY + 8;
      } else { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS); doc.text('Itinéraire non renseigné (section VIII de l\'entretien).', 15, y + 8); y += 18; }
      // 7 · Visas de suivi
      titreSection(doc, et.length ? 7 : 6, 'Visas de suivi', y); y += 4;
      const sv = (d.suivis || []).slice(-4);
      for (let i = 0; i < 4; i++) { const bx = 15 + i * 45.75; doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3); doc.rect(bx, y, 42, 27);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...NAVY); espace(doc, 'SUIVI ' + (i + 1), bx + 3, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
        if (sv[i]) { doc.setTextColor(...TEXTE); doc.text(t(UI.fmtDate(sv[i].date) + ' · ' + sv[i].type), bx + 3, y + 10, { maxWidth: 37 }); doc.text(t(sv[i].par + ' (' + sv[i].structure + ')'), bx + 3, y + 17, { maxWidth: 37 }); }
        else { doc.text('Date · lieu', bx + 3, y + 10); doc.text('Agent · structure', bx + 3, y + 15); }
        doc.setTextColor(...GRIS); doc.text('Cachet et visa', bx + 3, y + 24.5); }
      y += 33;
      // 8 · Signatures
      titreSection(doc, et.length ? 8 : 7, 'Signatures', y); y += 4;
      [['LE MIGRANT', 'Nom, date'], ['L\'AGENT ENQUÊTEUR', d.agent + ' (' + d.structure + ')'], ['LE SUPERVISEUR', d.valide ? d.valide.par : 'Nom, qualité, date']].forEach(([l, sous], i) => {
        const bx = 15 + i * 61.5; doc.setDrawColor(...LIGNE); doc.rect(bx, y, 57, 30);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...NAVY); espace(doc, l, bx + 3.5, y + 5.5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS); doc.text(t(sous), bx + 3.5, y + 9.5, { maxWidth: 50 });
        doc.setDrawColor(...LIGNE); doc.line(bx + 3.5, y + 26.5, bx + 53.5, y + 26.5);
        if (i === 0 && d.medias && d.medias.signature) { try { doc.addImage(d.medias.signature, 'PNG', bx + 6, y + 11, 44, 14); } catch (e) { /* signature illisible */ } }
      });
      y += 36;
      // Mentions
      const hm = Math.max(16, 268 - y);
      if (hm >= 16) {
        doc.setFillColor(...FOND); doc.setDrawColor(...LIGNE); doc.rect(15, y, 180, Math.min(hm, 26), 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...NAVY); espace(doc, 'MENTIONS', 19, y + 5.5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...TEXTE);
        doc.text(doc.splitTextToSize(t('La présente fiche est strictement personnelle. Elle atteste l\'enregistrement du titulaire dans la base nationale des migrants ivoiriens de retour et ne constitue pas une pièce d\'identité. Toute rature, surcharge ou reproduction non autorisée la rend nulle. Les données à caractère personnel sont protégées (loi n° 2013-450 du 19 juin 2013). Données fictives de démonstration.'), 172), 19, y + 10.5);
      }
      piedSecurise(doc, hash, 2, 2, motif);
      await sauver(doc, 'fiche_migrant_' + id + '.pdf', 'Impression de la fiche migrant', d);
    } catch (e) { console.error(e); UI.toast('Fiche impossible : ' + e.message, 'alert-triangle'); }
  };

  /* ======================= Attestation de retour ======================= */
  D.attestation = async function (d) {
    try {
      if (!d.identifiant) { UI.toast('L\'attestation est délivrée après attribution de l\'identifiant national.', 'info'); return; }
      const doc = await nouveau(); const r = d.reponses || {}; const { a, s } = await contexte(d); const id = d.identifiant; const f = d.resume.sexe === 'Femme';
      entete(doc, 'ATTESTATION DE RETOUR', 'N° ATT-' + id.replace('RCI-', ''));
      let y = 60; doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...TEXTE);
      doc.text(t('Le Directeur Général des Ivoiriens de l\'Extérieur atteste que :'), 20, y); y += 10;
      doc.setFillColor(245, 247, 250); doc.roundedRect(20, y, 170, 44, 2, 2, 'F');
      lib(doc, 26, y + 8, 'Nom et prénoms', nomComplet(d), 100); lib(doc, 130, y + 8, 'Sexe', d.resume.sexe || '—', 50);
      lib(doc, 26, y + 22, 'Né(e) le', dt(d.resume.date_naissance) + ' à ' + val(r['IDT-008']), 100); lib(doc, 130, y + 22, 'Nationalité', val(r['IDT-009']), 50);
      lib(doc, 26, y + 36, 'Identifiant national', id, 100); y += 56;
      const prov = [a && a.ville_provenance, (a && a.provenance !== 'Plusieurs pays' ? a.provenance : null) || d.resume.provenance].filter(Boolean).join(' (') + ((a && a.ville_provenance && (a.provenance !== 'Plusieurs pays' ? a.provenance : d.resume.provenance)) ? ')' : '');
      const corps = (f ? 'est retournée' : 'est retourné') + ' en Côte d\'Ivoire le ' + dt(r['IDT-019']) + (prov ? ' en provenance de ' + prov : '') + (a ? ', par ' + a.type.toLowerCase() + ' ' + (a.numero || '') + ' (arrivée ' + a.code + ')' : '') + ', et a été ' + (f ? 'accueillie' : 'accueilli') + ' ' + (s ? 'au site « ' + s.nom + ' »' : 'par les services compétents') +
        ', où ' + (f ? 'elle' : 'il') + ' a été ' + (f ? 'enregistrée' : 'enregistré') + ' dans la base nationale des migrants ivoiriens de retour sous l\'identifiant ci-dessus.';
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); const l1 = doc.splitTextToSize(t(corps), 170); doc.text(l1, 20, y, { lineHeightFactor: 1.5 }); y += l1.length * 6.2 + 6;
      const l2 = doc.splitTextToSize(t('La présente attestation est délivrée à ' + (f ? 'l\'intéressée' : 'l\'intéressé') + ' pour servir et valoir ce que de droit. Elle ne constitue pas une pièce d\'identité.'), 170); doc.text(l2, 20, y, { lineHeightFactor: 1.5 }); y += l2.length * 6.2 + 12;
      doc.text(t('Fait à Abidjan, le ' + UI.fmtDate(new Date().toISOString())), 190, y, { align: 'right' }); y += 8;
      doc.setFont('helvetica', 'bold'); doc.text(t('Le Directeur Général'), 190, y, { align: 'right' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text('[Nom et signature à confirmer]', 190, y + 5, { align: 'right' });
      doc.setDrawColor(200); doc.roundedRect(140, y + 9, 50, 28, 2, 2); doc.text('Cachet', 165, y + 25, { align: 'center' });
      // vérification
      const yq = 228; dessinerQR(doc, D.url(id), 20, yq, 38);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...TEXTE); doc.text('Vérifier l\'authenticité de ce document', 64, yq + 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS);
      doc.text(doc.splitTextToSize(t('Scannez le code QR ou saisissez l\'identifiant et le code de vérification sur le portail public Retour CI 360 [adresse à confirmer].'), 125), 64, yq + 14);
      doc.setFont('courier', 'bold'); doc.setTextColor(...TEXTE); doc.setFontSize(10); doc.text('Code de vérification : ' + D.cle(id), 64, yq + 28);
      pied(doc, 'Modèle de démonstration — formulation juridique et signataire à valider [à confirmer]. Données fictives.');
      await sauver(doc, 'attestation_retour_' + id + '.pdf', 'Attestation de retour délivrée', d);
    } catch (e) { console.error(e); UI.toast('Attestation impossible : ' + e.message, 'alert-triangle'); }
  };

  /* ======================= Fiche de référencement ======================= */
  D.ficheReferencement = async function (ref, d) {
    try {
      const doc = await nouveau(); const tp = M.TYPES_SERVICE.find((x) => x.code === ref.type_service) || {}; const voitNom = Domaine.droits(App.profil, 'II').includes('L');
      entete(doc, 'FICHE DE RÉFÉRENCEMENT', 'N° REF-' + String(ref.id).slice(0, 8).toUpperCase() + ' — émise le ' + UI.fmtDate(ref.created_at, true));
      const bloc = async (x, titre, code) => {
        doc.setDrawColor(215); doc.roundedRect(x, 52, 88, 30, 2, 2); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text(titre, x + 4, 57);
        const cfg = (Admin.structures || []).find((s) => s.code === code); let lg = cfg && cfg.logo; if (lg && lg.startsWith('data:image/svg')) lg = await png(lg, 200, 200);
        if (lg) { try { doc.addImage(lg, 'PNG', x + 4, 60, 18, 18); } catch (e) { lg = null; } }
        if (!lg) { doc.setFillColor(...BLEU); doc.roundedRect(x + 4, 60, 18, 18, 2, 2, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(t(code.slice(0, 5)), x + 13, 70.5, { align: 'center' }); }
        doc.setTextColor(...TEXTE); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(t(code), x + 26, 66); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(doc.splitTextToSize(t(STRUCT(code)), 58).slice(0, 2), x + 26, 71.5);
      };
      await bloc(12, 'STRUCTURE ÉMETTRICE', ref.emetteur); await bloc(110, 'STRUCTURE DESTINATAIRE', ref.destinataire);
      doc.setFillColor(...ORANGE); doc.triangle(102, 63, 102, 71, 107, 67, 'F');
      let y = 92; doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...BLEU); doc.text('Bénéficiaire', 12, y); y += 7;
      const res = (d && d.resume) || {};
      lib(doc, 12, y, 'Identifiant national', ref.identifiant, 60); lib(doc, 76, y, 'Nom et prénoms', voitNom ? ref.beneficiaire : 'Accès restreint', 70); lib(doc, 150, y, 'Sexe et âge', [res.sexe, res.age !== undefined && res.age !== null ? res.age + ' ans' : null].filter(Boolean).join(', ') || '—', 48); y += 12;
      lib(doc, 12, y, 'Localité de retour', [res.localite_retour, res.region_retour].filter(Boolean).join(', ') || '—', 60); lib(doc, 76, y, 'Consentement au partage des données', d && d.reponses && d.reponses['ENT-010'] === 'Oui' ? 'Oui (ENT-010)' : 'À vérifier', 70); y += 16;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...BLEU); doc.text('Service demandé', 12, y); y += 7;
      y = Math.max(lib(doc, 12, y, 'Type de service', tp.label || ref.type_service, 90), lib(doc, 110, y, 'Délai de réception', (tp.reception ? tp.reception + ' h — avant le ' : 'Avant le ') + UI.fmtDate(ref.echeance_reception, true), 88)) + 1;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text('MOTIF DU RÉFÉRENCEMENT', 12, y); doc.setFontSize(10); doc.setTextColor(...TEXTE); const lm = doc.splitTextToSize(t(ref.motif || '—'), 186); doc.text(lm, 12, y + 5); y += 5 + lm.length * 4.6 + 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...BLEU); doc.text('Suivi du référencement', 12, y); y += 2;
      doc.autoTable({ startY: y, margin: { left: 12, right: 12 }, head: [['Date', 'Statut', 'Par', 'Observation']], body: (ref.historique || []).map((x) => [UI.fmtDate(x.date, true), t(x.statut), t(x.par), t(x.motif || '')]), styles: { fontSize: 8.5, cellPadding: 1.6, textColor: TEXTE }, headStyles: { fillColor: BLEU } });
      y = doc.lastAutoTable.finalY + 8;
      doc.setDrawColor(200); doc.roundedRect(12, y, 186, 42, 2, 2); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...TEXTE); doc.text('Retour d\'information — réservé à la structure destinataire', 16, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS); ['Date de prise en charge :', 'Service effectivement rendu :', 'Observations :'].forEach((l, i) => { doc.text(t(l), 16, y + 15 + i * 9); doc.setDrawColor(220); doc.line(62, y + 15.5 + i * 9, 194, y + 15.5 + i * 9); });
      y += 50; doc.roundedRect(12, y, 90, 24, 2, 2); doc.roundedRect(108, y, 90, 24, 2, 2); doc.text(t('Signature et cachet — ' + ref.emetteur), 15, y + 5); doc.text(t('Signature et cachet — ' + ref.destinataire), 111, y + 5);
      dessinerQR(doc, D.url(ref.identifiant), 172, 255, 24); doc.setFontSize(6.5); doc.text('Vérification du dossier', 184, 282, { align: 'center' });
      pied(doc);
      await sauver(doc, 'fiche_referencement_' + ref.identifiant + '_' + ref.destinataire + '.pdf', 'Fiche de référencement imprimée', { identifiant: ref.identifiant });
    } catch (e) { console.error(e); UI.toast('Fiche impossible : ' + e.message, 'alert-triangle'); }
  };

  /* ======================= Page publique de vérification ======================= */
  D.verifier = async function (el, idEnc, k) {
    const id = decodeURIComponent(idEnc || '');
    const zone = h('div', { class: 'verif-card' });
    el.append(h('div', { class: 'public-page' }, h('div', { class: 'public-head' }, h('img', { src: 'assets/img/logo-retour-ci-360.png', alt: 'Retour CI 360', class: 'logo-full', style: { height: '64px' } }), h('a', { class: 'btn sm', href: '#/' }, icon('arrow-left'), 'Accueil')),
      h('h1', null, 'Vérification d\'un document'), h('p', { class: 'muted' }, 'Attestation de retour, fiche migrant ou fiche de référencement émise par la plateforme Retour CI 360.'), zone));
    let d = null; let indispo = false;
    try { d = (await Store.db.listDossiers()).find((x) => x.identifiant === id); } catch (e) { indispo = true; }
    const ok = !!d && k === D.cle(id) && Domaine.verifIdentifiant(id);
    const masque = (s) => String(s || '').split(/\s+/).filter(Boolean).map((x) => x[0] + '.').join(' ');
    if (!id) zone.append(h('div', { class: 'notice' }, icon('scan-line'), 'Scannez le code QR du document ou saisissez son identifiant et son code de vérification ci-dessous.'));
    else if (indispo || (App.mode === 'supabase' && !d)) zone.append(h('div', { class: 'notice warn' }, icon('info'), 'Vérification indisponible dans ce mode de démonstration : en production, la vérification interroge le serveur national [adresse à confirmer].'));
    else if (ok) zone.append(h('div', { class: 'verif ok' }, h('span', { class: 'ticon lg g' }, icon('shield-check')), h('div', null, h('h2', null, 'Document authentique'), h('p', { class: 'muted' }, 'L\'identifiant et le code de vérification correspondent à un dossier enregistré.'))),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Identifiant national'), h('span', null, h('b', null, id))), h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Titulaire (initiales)'), h('span', null, masque(d.resume.nom + ' ' + d.resume.prenoms))),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Date de retour'), h('span', null, dt(d.reponses['IDT-019']))), h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Enregistré par'), h('span', null, d.structure)),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Code de vérification'), h('span', null, k)), h('p', { class: 'tiny muted', style: { marginTop: '12px' } }, 'Seules les initiales sont affichées pour protéger les données personnelles.'));
    else zone.append(h('div', { class: 'verif ko' }, h('span', { class: 'ticon lg r' }, icon('shield-x')), h('div', null, h('h2', null, 'Document non reconnu'), h('p', { class: 'muted' }, 'Aucun dossier ne correspond à cet identifiant et à ce code. Le document peut être falsifié ou mal saisi.'))),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Identifiant saisi'), h('span', null, id || '—')));
    const idIn = h('input', { class: 'input', placeholder: 'RCI-AAAA-NNNNNN-C', value: id }); const kIn = h('input', { class: 'input', placeholder: 'Code de vérification (8 caractères)', value: k || '' });
    el.querySelector('.public-page').append(h('div', { class: 'card', style: { marginTop: '20px' } }, h('h3', { style: { marginTop: 0 } }, 'Vérifier un autre document'), h('div', { class: 'form-grid' }, idIn, kIn),
      h('button', { class: 'btn primary', style: { marginTop: '12px' }, onclick: () => App.go('#/verifier/' + encodeURIComponent(idIn.value.trim()) + '/' + kIn.value.trim().toUpperCase()) }, icon('search'), 'Vérifier')));
    UI.refreshIcons();
  };
  window.Documents = D;
})();
