/* Identité et référentiels : vérification d'identité auprès de l'ONECI (simulateur), contrôle des numéros de
   téléphone au format E.164, fiche décadactylaire (étiquette à code QR, numérisation au scanner, rattachement
   automatique) et file des localités « à géolocaliser ». Cahier des charges v0.4 : 8.3, 8.4, 8.5.2, 13.3, 32. */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const I = {};
  const maintenant = () => new Date().toISOString();

  /* ====================================================================================
     1. Téléphones : plan de numérotation du pays choisi, enregistrement au format E.164
     ==================================================================================== */
  const LIB = () => window.libphonenumber;
  I.paysDeIndicatif = (ind) => { const p = REF.pays.find((x) => x.d === ind); return p ? p.c : null; };
  /* Contrôle d'un numéro { ind, num, pays? } : valide, forme E.164 et forme lisible. « Inconnu » est admis (EF-TEL-04). */
  I.controlerTel = function (v) {
    if (!v || !v.num) return { vide: true };
    if (v.num === 'Inconnu') return { valide: true, inconnu: true };
    const pays = v.pays || I.paysDeIndicatif(v.ind) || 'CI';
    const L = LIB(); if (!L) return { valide: true };
    try {
      const n = L.parsePhoneNumberFromString(String(v.num), pays);
      if (n && n.isValid() && n.countryCallingCode === String(v.ind || '').replace('+', '')) {
        /* Côte d'Ivoire : 10 chiffres lus par paires (+225 07 48 21 66 90), comme sur les documents officiels */
        const lisible = pays === 'CI' ? '+225 ' + String(n.nationalNumber).replace(/(\d{2})(?=\d)/g, '$1 ') : n.formatInternational();
        return { valide: true, e164: n.number, lisible, pays };
      }
    } catch (e) { /* numéro illisible : non valide */ }
    return { valide: false, pays };
  };
  /* Questions téléphone dont la valeur saisie est hors du plan de numérotation : bloquent la clôture de l'entretien. */
  I.telephonesInvalides = function (d) {
    return window.DICO.filter((q) => q.widget === 'phone' && Domaine.visible(q, d.reponses, d))
      .filter((q) => { const v = d.reponses[q.code]; return v && v.num && !I.controlerTel(v).valide; });
  };

  /* ====================================================================================
     2. Vérification d'identité auprès de l'ONECI — simulateur (EF-ONE-01 à 05)
     Seuls les champs strictement nécessaires sont transmis. Le simulateur rend un résultat
     reproductible selon le dernier chiffre du numéro de pièce :
       0 à 6 → identité confirmée · 7 → non confirmée · 8 → non trouvée
       9 → erreur du service à la première tentative, confirmée au renvoi automatique.
     ==================================================================================== */
  I.PIECES_ONECI = ['CNI', 'Passeport', 'Extrait de naissance', 'Carte consulaire'];
  I.CHAMPS_TRANSMIS = ['Nature de la pièce', 'Numéro de la pièce', 'Nom', 'Prénoms', 'Date de naissance'];
  const STATUT_BADGE = { 'Confirmée': 'ok', 'Non confirmée': 'danger', 'Non trouvée': 'warn', 'Erreur du service': 'grey', 'En attente': 'info' };
  I.badgeStatut = (s) => STATUT_BADGE[s] || 'grey';
  I.verifications = (d) => d.verifications_oneci || [];
  I.derniere = (d) => I.verifications(d).slice(-1)[0] || null;
  I.verifiable = (d) => {
    const r = d.reponses || {};
    if (Cycle.retire(d, 'ENT-010')) return { ok: false, motif: 'Consentement à l\'utilisation des données retiré : vérification suspendue.' };
    if (r['RES-014'] !== 'Oui') return { ok: false, motif: 'Le migrant ne présente pas de document d\'identité (RES-014).' };
    if (!I.PIECES_ONECI.includes(r['RES-015'])) return { ok: false, motif: 'Vérification réservée aux pièces ivoiriennes : ' + I.PIECES_ONECI.join(', ') + ' (RES-015).' };
    if (!r['RES-016'] || r['RES-016'] === 'Non disponible') return { ok: false, motif: 'Numéro de la pièce à saisir (RES-016).' };
    return { ok: true };
  };
  I.simulateurONECI = function (req, tentative) {
    const m = /(\d)\D*$/.exec(req.piece || ''); const ch = m ? +m[1] : (String(req.piece || '').length % 7);
    if (ch === 9 && tentative <= 1) return { statut: 'Erreur du service', motif: 'Service de l\'ONECI indisponible (simulation) : la demande sera renvoyée automatiquement.' };
    if (ch === 7) return { statut: 'Non confirmée', motif: 'La date de naissance déclarée diffère de celle du registre (simulation).' };
    if (ch === 8) return { statut: 'Non trouvée', motif: 'Aucune pièce portant ce numéro dans le registre (simulation).' };
    return { statut: 'Confirmée', motif: 'Identité conforme au registre (simulation).' };
  };
  const requete = (d) => { const r = d.reponses; return { nature: r['RES-015'], piece: r['RES-016'], nom: r['IDT-001'] || '', prenoms: r['IDT-002'] || '', date_naissance: r['IDT-006'] || '' }; };
  /* Exécute (en ligne) ou met en attente (hors connexion) une demande. Renvoie l'entrée ajoutée au dossier. */
  I.demander = function (d, p, enLigne) {
    d.verifications_oneci = d.verifications_oneci || [];
    const req = requete(d);
    const tentative = d.verifications_oneci.filter((x) => x.piece === req.piece && x.statut !== 'En attente').length + 1;
    const e = { id: UI.uuid(), date: maintenant(), piece: req.piece, nature: req.nature, transmis: I.CHAMPS_TRANSMIS, par: p.nom, structure: p.structure, tentative };
    if (enLigne) Object.assign(e, I.simulateurONECI(req, tentative));
    else Object.assign(e, { statut: 'En attente', motif: 'Hors connexion : demande conservée sur la tablette, envoyée à la prochaine synchronisation.' });
    d.verifications_oneci.push(e);
    (d.historique = d.historique || []).push({ date: e.date, par: p.nom, structure: p.structure, action: 'Vérification d\'identité ONECI (' + req.nature + ' ' + req.piece + ') : ' + e.statut });
    return e;
  };
  /* À la synchronisation : les demandes en attente et les erreurs du service sont renvoyées automatiquement. */
  I.traiterEnAttente = function (d, p) {
    const der = I.derniere(d);
    if (!der || !['En attente', 'Erreur du service'].includes(der.statut) || !I.verifiable(d).ok) return null;
    if (der.statut === 'En attente') d.verifications_oneci.pop();
    const e = I.demander(d, p, true); e.automatique = true; return e;
  };

  /* Carte de vérification, dans l'entretien (section IV) et sur la fiche du dossier */
  I.carteONECI = function (d, p, opts) {
    const o = opts || {}; const wrap = h('div', { class: 'card flat oneci', style: { marginTop: '14px', padding: '14px' } });
    const paint = () => {
      wrap.replaceChildren();
      const ok = I.verifiable(d); const der = I.derniere(d);
      wrap.append(h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '10px' } }, h('span', { class: 'ticon b' }, icon('badge-check')),
          h('div', null, h('b', null, 'Vérification d\'identité auprès de l\'ONECI'), h('div', { class: 'tiny muted' }, 'Simulateur du service — champs transmis : ' + I.CHAMPS_TRANSMIS.join(', ').toLowerCase()))),
        der ? h('span', { class: 'badge solid ' + I.badgeStatut(der.statut) }, der.statut) : h('span', { class: 'badge grey' }, 'Non vérifiée')));
      if (der) wrap.append(h('div', { class: 'small', style: { marginTop: '8px' } }, der.motif, h('span', { class: 'muted' }, ' — ' + UI.fmtDate(der.date, true) + ', ' + der.par + ' (' + der.structure + ')' + (der.automatique ? ', renvoi automatique' : ''))));
      if (!o.lecture) {
        if (!ok.ok) wrap.append(h('div', { class: 'tiny muted', style: { marginTop: '8px' } }, ok.motif));
        else wrap.append(h('div', { class: 'row', style: { marginTop: '10px', gap: '8px' } },
          h('button', { type: 'button', class: 'btn sm primary', onclick: async (e) => {
            const enLigne = o.enLigne ? o.enLigne() : true; const b = e.currentTarget;
            if (enLigne) { b.disabled = true; b.textContent = 'Interrogation du service…'; await new Promise((r) => setTimeout(r, 700)); }
            const res = I.demander(d, p, enLigne);
            if (o.save) await o.save();
            await Store.audit('Vérification d\'identité ONECI', d.identifiant || d.identifiantProvisoire, res.nature + ' ' + res.piece + ' : ' + res.statut);
            UI.toast(enLigne ? 'Résultat ONECI : ' + res.statut.toLowerCase() + '.' : 'Hors connexion : la demande sera envoyée à la synchronisation.', enLigne ? 'badge-check' : 'wifi-off');
            if (o.apres) o.apres(); else paint();
          } }, icon('badge-check'), der ? 'Relancer la vérification' : 'Vérifier auprès de l\'ONECI'),
          h('span', { class: 'tiny muted', title: 'Simulateur : dernier chiffre du numéro 0 à 6 confirmée, 7 non confirmée, 8 non trouvée, 9 service indisponible puis renvoi automatique.' }, icon('info'), ' Simulateur')));
      }
      if (I.verifications(d).length > 1) wrap.append(h('details', { style: { marginTop: '8px' } }, h('summary', { class: 'small' }, 'Historique des demandes (' + I.verifications(d).length + ')'),
        h('div', { class: 'stack', style: { marginTop: '6px' } }, I.verifications(d).slice().reverse().map((x) => h('div', { class: 'row small', style: { gap: '8px' } },
          h('span', { class: 'badge ' + I.badgeStatut(x.statut) }, x.statut), h('span', null, x.nature + ' ' + x.piece), h('span', { class: 'muted' }, UI.fmtDate(x.date, true) + ' — ' + x.par))))));
      UI.refreshIcons();
    };
    paint(); wrap.peindre = paint; return wrap;
  };
  /* Notification du superviseur : une identité non confirmée devient une tâche jusqu'à son examen motivé */
  I.aExaminer = (d) => { const der = I.derniere(d); return der && der.statut === 'Non confirmée' && !(d.examen_oneci && d.examen_oneci.verification_id === der.id); };
  I.examiner = async function (d) {
    const motif = await UI.prompt('Identité non confirmée par l\'ONECI', 'Constat et suite donnée (obligatoire), par exemple : pièce présentée à nouveau, erreur de saisie corrigée, signalement :', '');
    if (!motif) return;
    const p = App.profil; const der = I.derniere(d);
    d.examen_oneci = { verification_id: der.id, par: p.nom + ' (' + p.structure + ')', date: maintenant(), motif };
    d.historique.push({ date: d.examen_oneci.date, par: p.nom, structure: p.structure, action: 'Identité non confirmée par l\'ONECI examinée : ' + motif });
    await Store.db.upsertDossier(d, { sections: [] }); await Store.audit('Examen d\'une identité non confirmée', d.identifiant, motif);
    UI.toast('Examen enregistré.', 'check'); App.render();
  };

  /* ====================================================================================
     3. Fiche décadactylaire : étiquette à code QR, numérisation au scanner du site,
        contrôle de la résolution (500 ppp) et rattachement automatique (ENF-BIO-01 à 03, ENF-EQP-02)
     ==================================================================================== */
  I.PPP_MIN = 500;
  const QR_PREFIXE = 'R360-FICHE:';
  I.qrFiche = (d) => QR_PREFIXE + d.id;
  const dessinerQR = (doc, texte, x, y, taille) => {
    const q = qrcode(0, 'M'); q.addData(texte, 'Byte'); q.make();
    const n = q.getModuleCount(); const m = taille / n; doc.setFillColor(0, 0, 0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(x + c * m, y + r * m, m + 0.02, m + 0.02, 'F');
  };
  /* Étiquette 62 × 29 mm, à coller en haut à droite de la fiche papier avant le relevé */
  I.etiquette = function (d) {
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: [62, 29], orientation: 'landscape' });
    dessinerQR(doc, I.qrFiche(d), 2.5, 2.5, 24);
    const nom = ((d.resume && (d.resume.nom + ' ' + d.resume.prenoms)) || '').trim();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(1, 74, 150); doc.text('FICHE DECADACTYLAIRE', 29, 6);
    doc.setTextColor(20, 20, 20); doc.setFontSize(8.5); doc.text(d.identifiant || d.identifiantProvisoire || '', 29, 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(doc.splitTextToSize(nom.normalize('NFD').replace(/[̀-ͯ]/g, ''), 31).slice(0, 2), 29, 16);
    doc.setFontSize(5.5); doc.setTextColor(110, 110, 110); doc.text('Retour CI 360 - ' + new Date().toLocaleDateString('fr-FR'), 29, 25.5);
    Documents.apercu(doc, 'etiquette_fiche_' + (d.identifiant || d.identifiantProvisoire), 'Étiquette de la fiche décadactylaire', d.identifiant || d.identifiantProvisoire);
  };
  const lireImage = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => res({ im, url: r.result }); im.onerror = () => rej(new Error('Format d\'image non lisible par le navigateur')); im.src = r.result; }; r.onerror = rej; r.readAsDataURL(file); });
  const empreinte = async (file) => { const b = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); };
  /* Lecture du code QR : image entière réduite, puis quart supérieur droit (emplacement de l'étiquette) à meilleure résolution */
  I.lireQR = function (im) {
    if (!window.jsQR) return null;
    const essai = (sx, sy, sw, sh, cible) => {
      const k = Math.min(1, cible / Math.max(sw, sh)); const c = document.createElement('canvas');
      c.width = Math.round(sw * k); c.height = Math.round(sh * k); const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const px = g.getImageData(0, 0, c.width, c.height); const r = window.jsQR(px.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
      return r ? r.data : null;
    };
    const W = im.naturalWidth, H = im.naturalHeight;
    return essai(0, 0, W, H, 1400) || essai(W / 2, 0, W / 2, H / 2, 1400) || essai(0, 0, W / 2, H / 2, 1400);
  };
  /* Contrôle et rattachement d'une image numérisée. `attendu` : dossier imposé (dépôt depuis la fiche du dossier). */
  I.traiterFiche = async function (file, ds, attendu) {
    const res = { fichier: file.name };
    let lu; try { lu = await lireImage(file); } catch (e) { return { ...res, ok: false, motif: e.message }; }
    const W = lu.im.naturalWidth, H = lu.im.naturalHeight;
    res.ppp = Math.round(Math.min(W, H) / 8.27); res.dim = W + ' × ' + H + ' px';
    const qr = I.lireQR(lu.im); res.qr = qr;
    const id = qr && qr.startsWith(QR_PREFIXE) ? qr.slice(QR_PREFIXE.length) : null;
    const d = attendu || ds.find((x) => x.id === id);
    if (attendu && id && id !== attendu.id) return { ...res, ok: false, motif: 'L\'étiquette de cette fiche désigne un autre dossier.' };
    if (!d) return { ...res, ok: false, motif: qr ? 'Code QR lu, mais aucun dossier ne correspond.' : 'Code QR illisible : vérifier l\'étiquette ou rattacher depuis la fiche du dossier.' };
    res.dossier = d;
    if (res.ppp < I.PPP_MIN) return { ...res, ok: false, motif: 'Résolution insuffisante : environ ' + res.ppp + ' ppp pour un format A4 (minimum ' + I.PPP_MIN + ' ppp, ENF-BIO-01). Numériser à nouveau.' };
    if (Cycle.retire(d, 'ENT-010')) return { ...res, ok: false, motif: 'Consentement à l\'utilisation des données retiré : la fiche ne peut pas être rattachée.' };
    const p = App.profil;
    /* Stockage de démonstration : aperçu en niveaux de gris ; l'original sans perte et son empreinte restent au stockage chiffré dans la version définitive */
    const k = Math.min(1, 1100 / Math.max(W, H)); const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d'); g.filter = 'grayscale(1)'; g.drawImage(lu.im, 0, 0, c.width, c.height);
    d.medias = d.medias || { documents: [] };
    d.medias.fiche = c.toDataURL('image/jpeg', 0.7);
    d.fiche_meta = { date: maintenant(), par: p.nom, structure: p.structure, fichier: file.name, largeur: W, hauteur: H, ppp: res.ppp, sha256: await empreinte(file), source: 'Scanner à plat du site, dépôt sur le portail', rattachement: qr ? 'Code QR de l\'étiquette' : 'Manuel, depuis la fiche du dossier' };
    d.historique = d.historique || []; d.historique.push({ date: d.fiche_meta.date, par: p.nom, structure: p.structure, action: 'Fiche décadactylaire numérisée (' + res.ppp + ' ppp) et rattachée — ' + d.fiche_meta.rattachement });
    await Store.db.upsertDossier(d);
    await Store.audit('Numérisation de la fiche décadactylaire', d.identifiant || d.identifiantProvisoire, file.name + ', ' + res.ppp + ' ppp');
    return { ...res, ok: true, motif: 'Rattachée au dossier ' + (d.identifiant || d.identifiantProvisoire) };
  };
  /* Fiche de test : A4 à 500 ppp (ou 150 ppp pour tester le refus), dix cases et étiquette à code QR */
  I.ficheTest = async function (d, ppp) {
    const W = Math.round(8.27 * ppp), H = Math.round(11.69 * ppp); const u = ppp / 25.4;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineWidth = Math.max(1, 0.3 * u);
    g.font = `bold ${6 * u}px Helvetica, Arial`; g.fillText('FICHE DÉCADACTYLAIRE', 15 * u, 25 * u);
    g.font = `${3.6 * u}px Helvetica, Arial`; g.fillText('Fiche de test générée par la démonstration — aucune empreinte réelle', 15 * u, 33 * u);
    const doigts = ['Pouce', 'Index', 'Majeur', 'Annulaire', 'Auriculaire'];
    ['Main droite', 'Main gauche'].forEach((m, j) => doigts.forEach((x, i) => {
      const x0 = (15 + i * 36) * u, y0 = (60 + j * 62) * u; g.strokeRect(x0, y0, 34 * u, 50 * u);
      g.fillText(x + ' — ' + m.toLowerCase(), x0 + 1.5 * u, y0 + 4.5 * u);
      g.beginPath(); for (let k = 1; k < 9; k++) g.ellipse(x0 + 17 * u, y0 + 28 * u, k * 1.6 * u, k * 2.2 * u, 0, 0, Math.PI * 2); g.stroke();
    }));
    g.strokeRect(15 * u, 190 * u, 88 * u, 70 * u); g.strokeRect(107 * u, 190 * u, 88 * u, 70 * u);
    g.fillText('Quatre doigts — main gauche', 17 * u, 195 * u); g.fillText('Quatre doigts — main droite', 109 * u, 195 * u);
    /* étiquette : 62 × 29 mm en haut à droite */
    const ex = 140 * u, ey = 10 * u; g.strokeRect(ex, ey, 62 * u, 29 * u);
    const q = qrcode(0, 'M'); q.addData(I.qrFiche(d), 'Byte'); q.make(); const n = q.getModuleCount(); const m = (24 * u) / n;
    for (let r = 0; r < n; r++) for (let cc = 0; cc < n; cc++) if (q.isDark(r, cc)) g.fillRect(ex + 2.5 * u + cc * m, ey + 2.5 * u + r * m, Math.ceil(m), Math.ceil(m));
    g.font = `bold ${3 * u}px Helvetica, Arial`; g.fillText(d.identifiant || d.identifiantProvisoire || '', ex + 29 * u, ey + 11 * u);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const a = h('a', { href: URL.createObjectURL(blob), download: 'fiche_test_' + (d.identifiant || 'dossier') + '_' + ppp + 'ppp.png' }); document.body.append(a); a.click(); a.remove();
  };
  /* Affichage dans la section V de la fiche (déjà masquée N3 par défaut) */
  I.blocFiche = function (d, peutDeposer) {
    const box = h('div', { class: 'stack', style: { marginTop: '12px' } }, h('div', { class: 'sub-head' }, 'Fiche décadactylaire numérisée'));
    if (Cycle.retire(d, 'ENT-010')) { box.append(h('div', { class: 'locked' }, icon('shield-x'), 'Traitement restreint : consentement à l\'utilisation des données retiré.')); return box; }
    if (d.medias && d.medias.fiche) {
      const m = d.fiche_meta || {};
      box.append(h('div', { class: 'row', style: { gap: '14px', alignItems: 'flex-start' } }, h('img', { class: 'fiche-img', src: d.medias.fiche, alt: 'Fiche décadactylaire' }),
        h('div', { class: 'small stack', style: { gap: '4px' } }, h('div', null, h('b', null, 'Résolution : '), (m.ppp || '—') + ' ppp (' + (m.largeur || '?') + ' × ' + (m.hauteur || '?') + ' px)'),
          h('div', null, h('b', null, 'Rattachement : '), m.rattachement || '—'), h('div', null, h('b', null, 'Numérisée le : '), UI.fmtDate(m.date, true) + ' par ' + (m.par || '—') + ' (' + (m.structure || '') + ')'),
          h('div', { class: 'tiny muted', style: { wordBreak: 'break-all' } }, 'Empreinte SHA-256 de l\'original : ' + (m.sha256 || '—')))));
    } else box.append(h('div', { class: 'small muted' }, 'Aucune fiche numérisée pour ce dossier.'));
    box.append(h('div', { class: 'row', style: { gap: '8px' } },
      h('button', { class: 'btn sm', onclick: () => I.etiquette(d) }, icon('qr-code'), 'Imprimer l\'étiquette QR'),
      peutDeposer ? h('label', { class: 'btn sm' }, icon('scan-line'), d.medias && d.medias.fiche ? 'Remplacer la numérisation' : 'Déposer la numérisation',
        h('input', { type: 'file', accept: 'image/png,image/jpeg', class: 'hidden', onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return; const r = await I.traiterFiche(f, [], d);
          UI.toast(r.ok ? 'Fiche rattachée au dossier.' : r.motif, r.ok ? 'check' : 'alert-triangle'); if (r.ok) App.render();
        } })) : null));
    return box;
  };
  I.peutNumeriser = (p) => p.role === 'admin' || Domaine.droits(p, 'V').includes('S');
  /* Page « Fiches décadactylaires » : dépôt d'un lot de numérisations, rattachement par le code QR */
  I.fichesPage = function (c, data) {
    const p = App.profil;
    if (!I.peutNumeriser(p)) { c.append(h('div', { class: 'notice danger' }, icon('lock'), 'La numérisation des fiches est réservée aux structures habilitées à la section V.')); return; }
    const ds = data.acces.map((x) => x.d);
    const sans = ds.filter((d) => !(d.medias && d.medias.fiche) && d.reponses['ENT-010'] === 'Oui' && !Cycle.retire(d, 'ENT-010'));
    const resultats = h('div'); let lignes = [];
    const peindre = () => {
      resultats.replaceChildren(lignes.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Fichier', 'Résolution', 'Code QR', 'Dossier', 'Résultat'].map((x) => h('th', null, x)))),
        h('tbody', null, lignes.map((r) => h('tr', null, h('td', { class: 'small' }, r.fichier, h('div', { class: 'tiny muted' }, r.dim || '')),
          h('td', null, r.ppp ? h('span', { class: 'badge ' + (r.ppp >= I.PPP_MIN ? 'ok' : 'danger') }, r.ppp + ' ppp') : '—'),
          h('td', null, r.qr ? h('span', { class: 'badge ok' }, icon('qr-code'), 'lu') : h('span', { class: 'badge warn' }, 'illisible')),
          h('td', null, r.dossier ? h('a', { class: 'idlink', href: '#/portail/dossier/' + r.dossier.id }, r.dossier.identifiant || r.dossier.identifiantProvisoire) : '—'),
          h('td', { class: 'small' }, h('span', { class: 'badge solid ' + (r.ok ? 'ok' : 'danger') }, r.ok ? 'Rattachée' : 'Refusée'), ' ', r.motif)))))) : h('div', { class: 'empty' }, icon('scan-line'), h('div', null, 'Déposez les numérisations du scanner : chaque fiche est rattachée par le code QR de son étiquette.')));
      UI.refreshIcons();
    };
    const depot = h('label', { class: 'depot' }, icon('scan-line'), h('b', null, 'Déposer les fiches numérisées'), h('span', { class: 'small muted' }, 'PNG ou JPEG, A4, ' + I.PPP_MIN + ' ppp au minimum. Plusieurs fichiers à la fois.'),
      h('input', { type: 'file', accept: 'image/png,image/jpeg', multiple: true, class: 'hidden', onchange: async (e) => {
        const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
        UI.toast('Lecture de ' + fs.length + ' fiche(s)…', 'scan-line');
        for (const f of fs) { lignes.unshift(await I.traiterFiche(f, data.ds)); peindre(); }
      } }));
    const choix = {}; const test = h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } },
      h('div', { style: { width: '320px' } }, UI.dropdown({ items: ds.map((d) => ({ value: d.id, label: (d.identifiant || '') + ' — ' + d.resume.nom + ' ' + d.resume.prenoms })), placeholder: 'Dossier pour la fiche de test…', onChange: (v) => { choix.id = v; } }).el),
      h('button', { class: 'btn sm', onclick: () => { const d = ds.find((x) => x.id === choix.id); if (!d) return UI.toast('Choisir un dossier.', 'info'); I.ficheTest(d, 500); } }, icon('download'), 'Fiche de test à 500 ppp'),
      h('button', { class: 'btn sm', onclick: () => { const d = ds.find((x) => x.id === choix.id); if (!d) return UI.toast('Choisir un dossier.', 'info'); I.ficheTest(d, 150); } }, icon('download'), 'Fiche de test à 150 ppp (refus attendu)'));
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Fiches décadactylaires'), h('p', { class: 'sub' }, 'Les empreintes sont relevées sur fiche papier, numérisées au scanner à plat du site, puis rattachées automatiquement grâce au code QR de l\'étiquette. La caméra de la tablette n\'est pas admise pour ce document.'))),
      h('div', { class: 'grid g2', style: { marginBottom: '20px' } },
        h('div', { class: 'card' }, depot),
        h('div', { class: 'card' }, h('h3', { class: 'title', style: { marginTop: 0 } }, h('span', { class: 'ticon o' }, icon('flask-conical')), 'Démonstration'),
          h('p', { class: 'small muted' }, 'Sans scanner, générez une fiche de test portant l\'étiquette d\'un dossier, puis déposez-la ci-contre.'), test,
          h('div', { class: 'small', style: { marginTop: '12px' } }, h('b', null, sans.length), ' dossier(s) consentant(s) sans fiche numérisée.'))),
      h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon b' }, icon('list-checks')), 'Résultats du dépôt')), resultats));
    peindre();
  };

  /* ====================================================================================
     4. Localités « à géolocaliser » (EF-GEO-04, EF-ADM-05, 13.3)
     ==================================================================================== */
  I.CODES_LOCALITE = () => window.DICO.filter((q) => q.widget === 'locality').map((q) => q.code);
  const connue = (n) => REF.localitesCI.some((l) => l.n === n);
  /* Les localités ajoutées par l'administrateur rejoignent le référentiel embarqué (portail et tablettes) */
  I.fusionnerLocalites = function (rows) {
    (rows || []).forEach((x) => { if (x.n && !connue(x.n)) REF.localitesCI.push({ n: x.n, r: x.r, ll: x.ll, ajout: true }); });
  };
  I.aGeolocaliser = function (ds) {
    const codes = I.CODES_LOCALITE(); const m = new Map();
    for (const d of ds) for (const code of codes) {
      const v = d.reponses && d.reponses[code];
      if (!v || typeof v !== 'string' || connue(v)) continue;
      const k = v.trim(); if (!m.has(k)) m.set(k, { n: k, occ: [] }); m.get(k).occ.push({ d, code });
    }
    return [...m.values()].sort((a, b) => b.occ.length - a.occ.length || a.n.localeCompare(b.n, 'fr'));
  };
  I.estAGeolocaliser = (code, v) => I.CODES_LOCALITE().includes(code) && typeof v === 'string' && !!v && !connue(v);
  const proximite = (a, b) => {
    a = UI.norm(a).replace(/[^a-z]/g, ''); b = UI.norm(b).replace(/[^a-z]/g, ''); if (!a || !b) return 0;
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - m[a.length][b.length] / Math.max(a.length, b.length);
  };
  I.suggestions = (n) => REF.localitesCI.map((l) => ({ l, s: proximite(n, l.n) })).filter((x) => x.s >= 0.55).sort((a, b) => b.s - a.s).slice(0, 3);
  const appliquer = async (item, nouveau, action) => {
    const p = App.profil; const now = maintenant();
    const parDossier = new Map(); item.occ.forEach((o) => { if (!parDossier.has(o.d.id)) parDossier.set(o.d.id, { d: o.d, codes: [] }); parDossier.get(o.d.id).codes.push(o.code); });
    for (const { d, codes } of parDossier.values()) {
      codes.forEach((c) => { d.reponses[c] = nouveau; });
      Domaine.calculs(d); d.updated_at = now;
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: action + ' (' + codes.join(', ') + ') : « ' + item.n + ' »' + (nouveau !== item.n ? ' → « ' + nouveau + ' »' : '') });
      await Store.db.upsertDossier(d);
    }
    return parDossier.size;
  };
  I.rapprocher = function (item) {
    const x = { v: (I.suggestions(item.n)[0] || {}).l ? I.suggestions(item.n)[0].l.n : undefined };
    UI.modal({ title: 'Rapprocher « ' + item.n + ' »', icon: 'git-compare-arrows', body: h('div', { class: 'stack' },
      h('p', { style: { margin: 0 } }, 'La saisie libre est remplacée, dans les ' + item.occ.length + ' réponse(s) concernée(s), par une localité du référentiel. La région est alors déduite automatiquement.'),
      h('label', { class: 'q' }, 'Localité du référentiel'), UI.dropdown({ items: REF.localitesCI.map((l) => ({ value: l.n, label: l.n, right: l.r })), value: x.v, onChange: (v) => { x.v = v; }, placeholder: 'Choisir une localité…' }).el),
    actions: [{ label: 'Annuler' }, { label: 'Rapprocher', cls: 'primary', icon: 'check', onclick: async () => {
      if (!x.v) { UI.toast('Choisir une localité.', 'info'); return false; }
      const n = await appliquer(item, x.v, 'Localité rapprochée du référentiel');
      await Store.audit('Localité rapprochée', item.n, '→ ' + x.v + ' (' + n + ' dossier(s))'); UI.toast(n + ' dossier(s) corrigé(s).', 'check'); App.render();
    } }] });
  };
  I.ajouter = function (item) {
    const x = { n: item.n, r: undefined, lat: '', lon: '' };
    const lat = h('input', { class: 'input', placeholder: 'Latitude (ex. 6,82)', oninput: (e) => { x.lat = e.target.value; maj(); } });
    const lon = h('input', { class: 'input', placeholder: 'Longitude (ex. -5,28)', oninput: (e) => { x.lon = e.target.value; maj(); } });
    const carte = h('div', { class: 'map', style: { height: '260px' } }); let map = null, mk = null;
    const num = (s) => parseFloat(String(s).replace(',', '.'));
    const maj = () => { const a = num(x.lat), o = num(x.lon); if (!map || !Number.isFinite(a) || !Number.isFinite(o)) return; if (mk) mk.setLatLng([a, o]); else mk = L.marker([a, o]).addTo(map); };
    UI.modal({ title: 'Ajouter « ' + item.n + ' » au référentiel', icon: 'map-pin-plus', body: h('div', { class: 'stack' },
      h('div', { class: 'grid g2' }, h('div', null, h('label', { class: 'q' }, 'Nom de la localité'), h('input', { class: 'input', value: x.n, oninput: (e) => { x.n = e.target.value.trim(); } })),
        h('div', null, h('label', { class: 'q' }, 'Région'), UI.dropdown({ items: REF.regionsCI.map((r) => ({ value: r, label: r })), onChange: (v) => { x.r = v; }, placeholder: 'Choisir la région…' }).el)),
      h('div', { class: 'grid g2' }, lat, lon), carte, h('div', { class: 'help' }, 'Cliquez sur la carte pour placer la localité. Les coordonnées s\'appliquent à tous les dossiers concernés et la localité rejoint les listes des tablettes à leur prochaine synchronisation.')),
    actions: [{ label: 'Annuler' }, { label: 'Ajouter au référentiel', cls: 'primary', icon: 'map-pin-plus', onclick: async () => {
      const a = num(x.lat), o = num(x.lon);
      if (!x.n || !x.r || !Number.isFinite(a) || !Number.isFinite(o)) { UI.toast('Nom, région et coordonnées sont nécessaires.', 'alert-triangle'); return false; }
      if (a < 4 || a > 11 || o < -9 || o > -2) { UI.toast('Coordonnées hors de la Côte d\'Ivoire.', 'alert-triangle'); return false; }
      const p = App.profil; const row = { id: UI.uuid(), n: x.n, r: x.r, ll: [a, o], ajoute_par: p.nom + ' (' + p.structure + ')', created_at: maintenant(), origine: item.n };
      await Store.db.upsert('localites', row); I.fusionnerLocalites([row]);
      const n = await appliquer(item, x.n, 'Localité géolocalisée et ajoutée au référentiel');
      await Store.audit('Localité ajoutée au référentiel', x.n, x.r + ' — ' + a + ', ' + o + ' (' + n + ' dossier(s))'); UI.toast('« ' + x.n + ' » ajoutée au référentiel.', 'map-pin-plus'); App.render();
    } }] }).el.style.maxWidth = '720px';
    setTimeout(() => {
      if (!window.L) return; map = L.map(carte).setView([7.6, -5.5], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', { maxZoom: 14, attribution: '© OpenStreetMap' }).addTo(map);
      map.on('click', (e) => { x.lat = e.latlng.lat.toFixed(5); x.lon = e.latlng.lng.toFixed(5); lat.value = x.lat.replace('.', ','); lon.value = x.lon.replace('.', ','); maj(); });
      setTimeout(() => map.invalidateSize(), 80);
    }, 60);
  };
  I.localitesPage = function (c, data) {
    const items = I.aGeolocaliser(data.ds); const ajoutees = (data.localites || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const Q = Domaine.Q;
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Localités à géolocaliser'), h('p', { class: 'sub' }, 'Localités saisies dans « Autre » faute de figurer au référentiel. Elles sont exclues de la carte et des calculs de distance jusqu\'à leur traitement : rapprochement d\'une localité existante, ou ajout au référentiel avec ses coordonnées.'))),
      h('div', { class: 'card p0', style: { marginBottom: '20px' } }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon o' }, icon('map-pin')), 'File de validation'), h('span', { class: 'badge accent' }, items.length + ' localité(s)')),
        items.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Localité saisie', 'Réponses', 'Questions', 'Suggestions du référentiel', ''].map((x) => h('th', null, x)))),
          h('tbody', null, items.map((it) => h('tr', null, h('td', null, h('b', null, it.n), h('div', null, h('span', { class: 'badge warn' }, 'à géolocaliser'))),
            h('td', null, it.occ.length, h('div', { class: 'tiny' }, [...new Set(it.occ.map((o) => o.d))].slice(0, 4).map((d) => h('a', { class: 'idlink', style: { marginRight: '6px' }, href: '#/portail/dossier/' + d.id }, d.identifiant)))),
            h('td', { class: 'small' }, [...new Set(it.occ.map((o) => o.code))].map((k) => k + ' — ' + Q[k].label).join(' ; ')),
            h('td', { class: 'small' }, I.suggestions(it.n).map((s) => s.l.n + ' (' + s.l.r + ')').join(', ') || h('span', { class: 'muted' }, 'aucune')),
            h('td', null, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, h('button', { class: 'btn sm', onclick: () => I.rapprocher(it) }, icon('git-compare-arrows'), 'Rapprocher'),
              h('button', { class: 'btn sm primary', onclick: () => I.ajouter(it) }, icon('map-pin-plus'), 'Ajouter')))))))) : h('div', { class: 'empty' }, icon('map-pin-check'), h('div', null, 'Aucune localité en attente.'))),
      h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon g' }, icon('map-pin-plus')), 'Localités ajoutées au référentiel')),
        ajoutees.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Localité', 'Région', 'Coordonnées', 'Saisie d\'origine', 'Ajoutée par'].map((x) => h('th', null, x)))),
          h('tbody', null, ajoutees.map((l) => h('tr', null, h('td', null, h('b', null, l.n)), h('td', null, l.r), h('td', { class: 'small' }, l.ll.map((v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 4 })).join(' ; ')), h('td', { class: 'small' }, l.origine || '—'), h('td', { class: 'small' }, l.ajoute_par, h('div', { class: 'tiny muted' }, UI.fmtDate(l.created_at, true)))))))) : h('div', { class: 'small muted', style: { padding: '16px 20px' } }, 'Aucune localité ajoutée pour l\'instant.')));
  };

  window.Identite = I;
})();
