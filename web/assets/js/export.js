/* Exportation : PDF, classeur Excel, CSV ou image, depuis un menu commun.
   Bibliothèques embarquées (fonctionnent hors connexion) : jsPDF et jsPDF-AutoTable (MIT), SheetJS (Apache 2.0), html-to-image (MIT). */
(function () {
  const { h, icon } = UI;
  const E = {};
  const FORMATS = [
    { k: 'pdf', l: 'Document PDF', d: 'Graphique et tableau, prêt à imprimer', ic: 'file-text', t: 'r' },
    { k: 'xlsx', l: 'Classeur Excel', d: 'Fichier .xlsx modifiable', ic: 'file-spreadsheet', t: 'g' },
    { k: 'csv', l: 'Fichier CSV', d: 'Données brutes, séparateur point-virgule', ic: 'sheet', t: 'b' },
    { k: 'png', l: 'Image PNG', d: 'Capture haute définition', ic: 'file-image', t: 'v' },
  ];
  const Ad0 = () => window.Admin && App.profil && (Admin.structures || []).find((x) => x.code === App.profil.structure);
  const propre = (v) => String(v === undefined || v === null ? '' : v).replace(/[  ]/g, ' ').replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').replace(/[’]/g, '\'').trim();
  const horodatage = () => new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
  const telecharger = (blob, nom) => { const a = h('a', { href: URL.createObjectURL(blob), download: nom }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const dataURL = (src) => new Promise((res) => { const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res(c.toDataURL('image/png')); } catch (e) { res(null); } }; im.onerror = () => res(null); im.src = src; });

  /* Capture d'un bloc de la page ; les boutons d'action sont exclus. clair : force le thème clair pendant la capture */
  async function capture(noeud, clair, jpeg) {
    if (!noeud || !window.htmlToImage) return null;
    const racine = document.documentElement; const theme = racine.dataset.theme;
    if (clair && theme === 'dark') racine.dataset.theme = 'light';
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const fond = getComputedStyle(racine).getPropertyValue('--surface').trim() || '#ffffff';
      return await htmlToImage[jpeg ? 'toJpeg' : 'toPng'](noeud, { quality: 0.88, pixelRatio: jpeg ? 1.6 : 2, skipFonts: false, backgroundColor: fond, cacheBust: true, filter: (n) => !(n.classList && (n.classList.contains('no-export') || n.classList.contains('export-menu'))) });
    } catch (e) { console.warn('Capture impossible', e); return null; } finally { racine.dataset.theme = theme; }
  }

  const fichiers = {
    async csv(o) {
      const esc = (v) => `"${propre(v).replace(/"/g, '""')}"`;
      const lignes = [[o.titre], o.sousTitre ? [o.sousTitre] : null, [], ...o.lignes()].filter(Boolean);
      telecharger(new Blob(['﻿' + lignes.map((l) => l.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), o.fichier + '.csv');
    },
    async xlsx(o) {
      if (!window.XLSX) throw new Error('Bibliothèque Excel indisponible');
      const data = o.lignes().map((l) => l.map((v) => (typeof v === 'number' ? v : propre(v))));
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = (data[0] || []).map((_, i) => ({ wch: Math.min(60, Math.max(10, ...data.map((l) => String(l[i] === undefined ? '' : l[i]).length + 2))) }));
      const info = XLSX.utils.aoa_to_sheet([['Retour CI 360 — Gestion intégrée du retour et de la réinsertion des Ivoiriens de l\'extérieur'], [], ['Titre', propre(o.titre)], ['Critères', propre(o.sousTitre || 'Aucun')], ['Exporté le', new Date().toLocaleString('fr-FR')], ['Exporté par', App.profil ? App.profil.nom + ' (' + App.profil.structure + ')' : ''], [], ['Données fictives de démonstration.']]);
      info['!cols'] = [{ wch: 16 }, { wch: 90 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Données'); XLSX.utils.book_append_sheet(wb, info, 'Informations');
      XLSX.writeFile(wb, o.fichier + '.xlsx');
    },
    async png(o) {
      const img = await capture(o.noeud && o.noeud());
      if (!img) throw new Error('Aucun élément graphique à capturer');
      telecharger(await (await fetch(img)).blob(), o.fichier + '.png');
    },
    async pdf(o) {
      if (!window.jspdf) throw new Error('Bibliothèque PDF indisponible');
      const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
      const logo = await dataURL('assets/img/embleme.png');
      doc.setFillColor(1, 74, 150); doc.rect(0, 0, W, 22, 'F');
      doc.setFillColor(78, 167, 56); doc.rect(0, 22, W / 3, 1.2, 'F'); doc.setFillColor(254, 119, 1); doc.rect((2 * W) / 3, 22, W / 3, 1.2, 'F'); doc.setFillColor(255, 255, 255); doc.rect(W / 3, 22, W / 3, 1.2, 'F');
      if (logo) { doc.setFillColor(255, 255, 255); doc.circle(17, 11, 8, 'F'); doc.addImage(logo, 'PNG', 10.5, 4.5, 13, 13); }
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('Retour CI 360', 30, 10);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Gestion intégrée du retour et de la réinsertion des Ivoiriens de l\'extérieur', 30, 16);
      let ent = App.profil && (Ad0() || {}).logo; if (ent && ent.startsWith('data:image/svg')) ent = await dataURL(ent); if (ent) { try { doc.setFillColor(255, 255, 255); doc.roundedRect(W - 24, 3.5, 15, 15, 2, 2, 'F'); doc.addImage(ent, 'PNG', W - 23, 4.5, 13, 13); } catch (e) { ent = null; } }
      doc.setFontSize(8.5); doc.text('Exporté le ' + new Date().toLocaleString('fr-FR') + (App.profil ? ' par ' + App.profil.nom + ' (' + App.profil.structure + ')' : ''), W - (ent ? 28 : 10), 12, { align: 'right' });
      doc.setTextColor(33, 43, 54); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(doc.splitTextToSize(propre(o.titre), W - 20), 10, 33);
      let y = 40;
      if (o.sousTitre) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 107, 114); const t = doc.splitTextToSize('Critères : ' + propre(o.sousTitre), W - 20); doc.text(t, 10, y); y += t.length * 4 + 3; }
      const img = o.noeud && o.pdfImage !== false ? await capture(o.noeud(), true, true) : null;
      if (img) {
        const dims = await new Promise((r) => { const im = new Image(); im.onload = () => r([im.width, im.height]); im.src = img; });
        let w = W - 20, hh = (w * dims[1]) / dims[0]; const maxH = H - y - 14; if (hh > maxH) { hh = maxH; w = (hh * dims[0]) / dims[1]; }
        doc.addImage(img, 'JPEG', (W - w) / 2, y, w, hh, undefined, 'FAST'); y += hh + 6;
      }
      const lignes = o.lignes().map((l) => l.map(propre));
      if (lignes.length > 1) {
        if (img) { doc.addPage(); y = 16; }
        doc.autoTable({ head: [lignes[0]], body: lignes.slice(1), startY: y, margin: { left: 10, right: 10, bottom: 14 }, styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: [33, 43, 54] },
          headStyles: { fillColor: [1, 74, 150], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247, 247, 249] } });
      }
      const n = doc.internal.getNumberOfPages();
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text('Retour CI 360 — données fictives de démonstration', 10, H - 6); doc.text('Page ' + i + ' sur ' + n, W - 10, H - 6, { align: 'right' }); }
      if (window.Documents && o.apercu !== false) Documents.apercu(doc, o.fichier + '.pdf', 'Export PDF : ' + propre(o.titre)); else doc.save(o.fichier + '.pdf');
    },
  };

  /* Menu d'exportation : o = { titre, sousTitre, lignes: () => [[en-têtes], ...], noeud: () => Element, fichier, compact, formats } */
  E.menu = function (o) {
    const formats = FORMATS.filter((f) => !o.formats || o.formats.includes(f.k));
    const panel = h('div', { class: 'export-panel hidden' }, h('div', { class: 'tiny muted', style: { padding: '6px 10px 4px', fontWeight: 700 } }, 'Exporter au format'),
      formats.map((f) => h('button', { type: 'button', class: 'export-item', onclick: async (e) => {
        e.stopPropagation(); panel.classList.add('hidden');
        const nom = (o.fichier || 'export') + '_' + horodatage(); const btn = e.currentTarget; btn.disabled = true; const sousTitre = typeof o.sousTitre === 'function' ? o.sousTitre() : o.sousTitre;
        try { UI.toast('Préparation du fichier ' + f.l.toLowerCase() + '…', 'loader'); await fichiers[f.k]({ ...o, sousTitre, fichier: nom }); await Store.audit('Export ' + f.k.toUpperCase(), propre(o.titre), propre(sousTitre || '')); }
        catch (err) { console.error(err); UI.toast('Export impossible : ' + err.message, 'alert-triangle'); }
        finally { btn.disabled = false; }
      } }, h('span', { class: 'ticon ' + f.t }, icon(f.ic)), h('span', { style: { flex: 1, textAlign: 'left' } }, h('b', null, f.l), h('div', { class: 'tiny muted' }, f.d)))));
    const bouton = o.compact
      ? h('button', { type: 'button', class: 'btn sm', title: 'Exporter', onclick: (e) => { e.stopPropagation(); ouvrir(); } }, icon('download'))
      : h('button', { type: 'button', class: 'btn', onclick: (e) => { e.stopPropagation(); ouvrir(); } }, icon('download'), 'Exporter', icon('chevron-down'));
    const el = h('div', { class: 'export-menu' }, bouton, panel);
    function ouvrir() { document.querySelectorAll('.export-panel').forEach((x) => x !== panel && x.classList.add('hidden')); panel.classList.toggle('hidden'); UI.refreshIcons(); }
    document.addEventListener('click', (e) => { if (!el.contains(e.target)) panel.classList.add('hidden'); });
    return el;
  };
  /* Génération directe (rapports programmés, données ouvertes) */
  E.generer = (format, o) => fichiers[format]({ ...o, fichier: (o.fichier || 'export') + '_' + horodatage() });
  window.Export = E;
})();
