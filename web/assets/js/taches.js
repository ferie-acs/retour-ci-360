/* Outils du gestionnaire de cas : écran « Mes tâches », transfert de dossier entre structures (distinct du référencement),
   validations par le superviseur paramétrables, enregistrement des suivis */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const T = { filtre: 'toutes' };
  const STRUCT = (c) => (M.structures.find((s) => s.code === c) || { nom: c }).nom;
  const DEFAUT = { id: 'validations', validation_dossier: true, transfert: true, cloture: true, fusion: true, relance_jours: 7 };
  const DELAI_SUIVI = { 'Urgent': 3, 'Sous 2 semaines': 14, 'Sous 1 mois': 30, 'Suivi standard': 90 };
  const PRIO = { Haute: 'danger', Moyenne: 'warn', Basse: 'grey' };
  T.params = (data) => ({ ...DEFAUT, ...((data && data.parametres) || []).find((x) => x.id === 'validations') });
  T.responsable = (d) => d.structure_responsable || d.structure;
  const estSup = (p) => p.role === 'admin' || p.role === 'superviseur';
  const jours = (n) => n * 86400000;

  /* Prochaine échéance de suivi : dernier suivi (ou synchronisation) + délai fixé en section XV (SUI-002) */
  T.echeanceSuivi = (d) => {
    const der = (d.suivis || []).map((x) => x.date).sort().pop() || d.synced_at || d.created_at;
    const prochaine = (d.suivis || []).map((x) => x.prochaine).filter(Boolean).sort().pop();
    if (prochaine && prochaine > der) return prochaine;
    return new Date(new Date(der).getTime() + jours(DELAI_SUIVI[d.reponses['SUI-002']] || 90)).toISOString();
  };

  /* ---------- Calcul des tâches du profil connecté ---------- */
  T.calculer = function (p, data) {
    const out = []; const now = Date.now(); const prm = T.params(data);
    const dossier = (id) => data.ds.find((d) => d.id === id);
    const nom = (d) => (d && Domaine.droits(p, 'II').includes('L') ? ((d.resume.nom || '') + ' ' + (d.resume.prenoms || '')).trim() : '');
    // 1. Référencements reçus
    data.refs.filter((r) => (r.destinataire === p.structure || (p.role === 'admin' && r.statut === 'Émis' && new Date(r.echeance_reception) < now)) && ['Émis', 'Reçu'].includes(r.statut)).forEach((r) => {
      const retard = r.statut === 'Émis' && new Date(r.echeance_reception) < now; const tp = M.TYPES_SERVICE.find((x) => x.code === r.type_service) || {};
      out.push({ cat: 'referencements', ic: 'send', t: 'v', titre: (r.statut === 'Émis' ? 'Accuser réception du référencement' : 'Accepter ou refuser le référencement') + ' — ' + r.emetteur + ' → ' + r.destinataire, detail: tp.label + (r.motif ? ' · ' + r.motif : ''),
        dossier: { id: r.dossier_id, identifiant: r.identifiant, nom: nom(dossier(r.dossier_id)) }, echeance: r.statut === 'Émis' ? r.echeance_reception : null, priorite: retard ? 'Haute' : 'Moyenne',
        actions: r.destinataire === p.structure ? (r.statut === 'Émis' ? [['Reçu', 'primary']] : [['Accepté', 'primary'], ['Refusé', 'danger']]).map(([st, cls]) => ({ label: st === 'Reçu' ? 'Accuser réception' : st === 'Accepté' ? 'Accepter' : 'Refuser', cls, fn: () => Portail.changerStatut(r, st) })) : [{ label: 'Voir', fn: () => App.go('#/portail/referencements') }] });
    });
    // 2. Alertes ouvertes notifiées à ma structure
    data.als.filter((a) => a.statut === 'Ouverte' && ((a.notifie || []).includes(p.structure) || (p.structure === 'DGIE' && estSup(p)))).forEach((a) => {
      out.push({ cat: 'alertes', ic: 'siren', t: 'r', titre: 'Prendre en charge l\'alerte : ' + a.titre, detail: 'Gravité ' + a.gravite + ' · délai ' + a.delai + ' · ' + a.conduite, dossier: { id: a.dossier_id, identifiant: a.identifiant, nom: nom(dossier(a.dossier_id)) },
        echeance: null, priorite: a.gravite === 'Critique' ? 'Haute' : 'Moyenne', actions: [{ label: 'Prendre en charge', cls: 'primary', fn: async () => { a.statut = 'Prise en charge'; a.pris_par = p.structure; await Store.db.upsert('alertes', a); await Store.audit('Alerte prise en charge', a.identifiant, a.titre); UI.toast('Alerte prise en charge.'); App.render(); } }] });
    });
    // 3. Transferts entrants et sortants
    (data.transferts || []).forEach((tr) => {
      if (tr.statut === 'Demandé' && (tr.vers === p.structure || p.role === 'admin')) out.push({ cat: 'transferts', ic: 'arrow-right-left', t: 'b', titre: 'Transfert de dossier reçu de ' + tr.de + (p.role === 'admin' ? ' vers ' + tr.vers : ''), detail: tr.motif, dossier: { id: tr.dossier_id, identifiant: tr.identifiant, nom: Domaine.droits(p, 'II').includes('L') ? tr.beneficiaire : '' },
        echeance: new Date(new Date(tr.created_at).getTime() + jours(prm.relance_jours)).toISOString(), priorite: 'Haute', actions: [{ label: 'Accepter', cls: 'primary', fn: () => T.repondreTransfert(tr, 'Accepté', data) }, { label: 'Refuser', cls: 'danger', fn: () => T.repondreTransfert(tr, 'Refusé', data) }] });
      else if (tr.de === p.structure && ['Demandé', 'En attente de validation'].includes(tr.statut)) out.push({ cat: 'transferts', ic: 'hourglass', t: 'grey', titre: 'Transfert vers ' + tr.vers + ' en attente (' + tr.statut.toLowerCase() + ')', detail: tr.motif, dossier: { id: tr.dossier_id, identifiant: tr.identifiant, nom: Domaine.droits(p, 'II').includes('L') ? tr.beneficiaire : '' }, echeance: null, priorite: 'Basse', actions: [] });
    });
    // 4. Validations du superviseur
    if (estSup(p)) (data.approbations || []).filter((a) => a.statut === 'En attente' && (p.role === 'admin' || a.structure === p.structure)).forEach((a) => {
      out.push({ cat: 'validations', ic: 'stamp', t: 'o', titre: 'Valider : ' + a.type.toLowerCase(), detail: a.motif + ' — demandé par ' + a.demande_par + ' (' + a.structure + ')', dossier: { id: a.dossier_id, identifiant: a.identifiant, nom: nom(dossier(a.dossier_id)) },
        echeance: new Date(new Date(a.created_at).getTime() + jours(2)).toISOString(), priorite: a.type === 'Transfert' ? 'Haute' : 'Moyenne', actions: [{ label: 'Approuver', cls: 'primary', fn: () => T.decider(a, true, data) }, { label: 'Rejeter', cls: 'danger', fn: () => T.decider(a, false, data) }] });
    });
    // 5. Doublons à examiner
    if (estSup(p)) data.dbl.filter((x) => x.statut === 'À examiner').forEach((x) => out.push({ cat: 'validations', ic: 'copy', t: 'p', titre: 'Examiner un doublon possible', detail: (x.candidats || []).map((c) => c.identifiant + ' (score ' + c.score + ')').join(', '), dossier: { id: x.dossier_id, identifiant: x.identifiant, nom: '' }, echeance: null, priorite: 'Moyenne', actions: [{ label: 'Examiner', fn: () => App.go('#/portail/doublons') }] }));
    // 6. Suivis à échéance
    if (p.role !== 'admin') data.ds.filter((d) => T.responsable(d) === p.structure && d.statut === 'Synchronisé' && (d.etat_suivi || 'Ouvert') === 'Ouvert').forEach((d) => {
      const ech = T.echeanceSuivi(d); const reste = (new Date(ech) - now) / jours(1);
      if (reste > prm.relance_jours) return;
      out.push({ cat: 'suivis', ic: 'calendar-check', t: 'g', titre: 'Suivi à réaliser (' + (d.reponses['SUI-002'] || 'suivi standard').toLowerCase() + ')', detail: (d.suivis || []).length ? 'Dernier suivi le ' + UI.fmtDate((d.suivis || []).map((x) => x.date).sort().pop()) : 'Aucun suivi depuis l\'enregistrement',
        dossier: { id: d.id, identifiant: d.identifiant, nom: nom(d) }, echeance: ech, priorite: reste < 0 ? 'Haute' : 'Basse', actions: [{ label: 'Enregistrer un suivi', cls: 'primary', fn: () => T.suivi(d) }] });
    });
    const ordre = { Haute: 0, Moyenne: 1, Basse: 2 };
    return out.sort((a, b) => ordre[a.priorite] - ordre[b.priorite] || (a.echeance || '9').localeCompare(b.echeance || '9'));
  };

  /* ---------- Écran « Mes tâches » ---------- */
  T.page = function (c, data) {
    const p = App.profil; const tout = T.calculer(p, data); const now = Date.now();
    const CATS = [['toutes', 'Toutes', 'list-checks'], ['referencements', 'Référencements', 'send'], ['alertes', 'Alertes', 'siren'], ['transferts', 'Transferts', 'arrow-right-left'], ['validations', 'Validations', 'stamp'], ['suivis', 'Suivis', 'calendar-check']];
    const n = (k) => (k === 'toutes' ? tout.length : tout.filter((x) => x.cat === k).length);
    const kcard = (t, ic, label, val) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val)), UI.filigrane(ic));
    const list = h('div'); const tabs = h('div', { class: 'tabs', style: { margin: '0 0 0', padding: '0 12px' } });
    const paintTabs = () => { tabs.innerHTML = ''; CATS.forEach(([k, l, ic]) => tabs.append(h('button', { class: k === T.filtre ? 'on' : '', onclick: () => { T.filtre = k; paintTabs(); paint(); } }, icon(ic), l, h('span', { class: 'badge ' + (k === T.filtre ? 'accent' : 'grey') }, n(k))))); UI.refreshIcons(); };
    const paint = () => {
      const rows = tout.filter((x) => T.filtre === 'toutes' || x.cat === T.filtre); list.innerHTML = '';
      if (!rows.length) { list.append(h('div', { class: 'empty' }, icon('party-popper'), h('div', null, 'Aucune tâche en attente dans cette catégorie.'))); UI.refreshIcons(); return; }
      list.append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Priorité', 'Tâche', 'Dossier', 'Échéance', 'Actions'].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((x) => { const dep = x.echeance && new Date(x.echeance) < now;
          return h('tr', null, h('td', null, h('span', { class: 'badge solid ' + PRIO[x.priorite] }, x.priorite)),
            h('td', null, h('div', { class: 'who', style: { alignItems: 'flex-start' } }, h('span', { class: 'ticon ' + x.t }, icon(x.ic)), h('div', { style: { maxWidth: '560px' } }, h('b', null, x.titre), h('div', { class: 'tiny muted' }, x.detail)))),
            h('td', null, x.dossier && x.dossier.id ? h('a', { class: 'idlink', href: '#/portail/dossier/' + x.dossier.id }, x.dossier.identifiant) : '—', x.dossier && x.dossier.nom ? h('div', { class: 'tiny muted' }, x.dossier.nom) : null),
            h('td', { class: 'small' }, x.echeance ? h('span', { class: dep ? 'badge danger' : '' }, (dep ? 'Dépassée : ' : '') + UI.fmtDate(x.echeance)) : '—'),
            h('td', null, h('div', { class: 'row', style: { gap: '6px' } }, x.actions.map((a) => h('button', { class: 'btn sm ' + (a.cls || ''), onclick: a.fn }, a.label)))));
        })))));
      UI.refreshIcons();
    };
    const lignes = () => [['Priorité', 'Catégorie', 'Tâche', 'Détail', 'Dossier', 'Échéance'], ...tout.filter((x) => T.filtre === 'toutes' || x.cat === T.filtre).map((x) => [x.priorite, x.cat, x.titre, x.detail, x.dossier ? x.dossier.identifiant : '', x.echeance ? UI.fmtDate(x.echeance) : ''])];
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Mes tâches'), h('p', { class: 'sub' }, 'Tout ce qui attend une action de ' + (p.role === 'admin' ? 'l\'administration' : 'votre part (' + p.structure + ')') + ' : référencements, alertes, transferts, validations et suivis à échéance.')),
      Export.menu({ titre: 'Mes tâches — ' + p.nom, lignes, noeud: () => list, pdfImage: false, fichier: 'mes_taches' })),
    h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kcard('o', 'list-checks', 'Tâches en attente', tout.length), kcard('d', 'flame', 'Priorité haute', tout.filter((x) => x.priorite === 'Haute').length),
      kcard('b', 'timer', 'Échéances dépassées', tout.filter((x) => x.echeance && new Date(x.echeance) < now).length), kcard('g', 'stamp', 'Validations à donner', tout.filter((x) => x.cat === 'validations').length)),
    h('div', { class: 'card p0' }, tabs, list));
    paintTabs(); paint();
  };

  /* ---------- Transfert d'un dossier ---------- */
  T.transferer = function (d, data) {
    const p = App.profil; const prm = T.params(data); const x = {};
    const enCours = (data.transferts || []).find((t) => t.dossier_id === d.id && ['Demandé', 'En attente de validation'].includes(t.statut));
    if (enCours) { UI.toast('Un transfert vers ' + enCours.vers + ' est déjà en cours pour ce dossier.', 'info'); return; }
    const motif = h('textarea', { class: 'textarea', placeholder: 'Raison du transfert de responsabilité' });
    UI.modal({ title: 'Transférer le dossier ' + d.identifiant, icon: 'arrow-right-left', body: h('div', { class: 'stack' },
      h('div', { class: 'notice' }, icon('info'), h('span', null, h('b', null, 'Transfert ≠ référencement. '), 'Le référencement demande un service ponctuel à une structure. Le transfert lui confie la responsabilité du dossier et de son suivi : elle devient structure responsable.')),
      h('div', null, h('label', { class: 'q' }, 'Structure responsable actuelle'), h('div', { class: 'row', style: { gap: '8px' } }, Admin.logo(T.responsable(d), 26), h('b', null, T.responsable(d)), h('span', { class: 'muted small' }, STRUCT(T.responsable(d))))),
      h('div', null, h('label', { class: 'q' }, 'Nouvelle structure responsable'), UI.dropdown({ items: M.structures.filter((s) => s.code !== T.responsable(d)).map((s) => ({ value: s.code, label: s.code + ' — ' + s.nom })), onChange: (v) => { x.vers = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Motif'), motif),
      prm.transfert ? h('div', { class: 'notice warn' }, icon('stamp'), 'Paramètre actif : le transfert sera soumis à la validation du superviseur avant d\'être proposé à la structure destinataire.') : null),
    actions: [{ label: 'Annuler' }, { label: 'Demander le transfert', cls: 'primary', icon: 'arrow-right-left', onclick: async () => {
      if (!x.vers || !motif.value.trim()) { UI.toast('Structure et motif obligatoires.', 'alert-triangle'); return false; }
      const now = new Date().toISOString(); const statut = prm.transfert && p.role !== 'admin' && p.role !== 'superviseur' ? 'En attente de validation' : 'Demandé'; const id = UI.uuid();
      await Store.db.upsert('transferts', { id, dossier_id: d.id, identifiant: d.identifiant, beneficiaire: d.resume.nom + ' ' + d.resume.prenoms, de: T.responsable(d), vers: x.vers, motif: motif.value.trim(), statut, demande_par: p.nom, created_at: now, historique: [{ date: now, statut, par: p.structure }] });
      if (statut === 'En attente de validation') await Store.db.upsert('approbations', { id: UI.uuid(), type: 'Transfert', objet_id: id, dossier_id: d.id, identifiant: d.identifiant, structure: p.structure, demande_par: p.nom, motif: 'Transfert vers ' + x.vers + ' : ' + motif.value.trim(), statut: 'En attente', created_at: now });
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Transfert demandé vers ' + x.vers + (statut === 'En attente de validation' ? ' (en attente de validation du superviseur)' : '') });
      await Store.db.upsertDossier(d, { sections: [] }); await Store.audit('Transfert demandé', d.identifiant, '→ ' + x.vers);
      UI.toast(statut === 'Demandé' ? 'Transfert proposé à ' + x.vers + '.' : 'Transfert soumis à la validation du superviseur.', 'arrow-right-left'); App.render();
    } }] });
  };
  T.repondreTransfert = async function (tr, statut, data) {
    const p = App.profil; let motif = '';
    if (statut === 'Refusé') { motif = await UI.prompt('Refuser le transfert', 'Motif du refus (obligatoire) :'); if (!motif) return; }
    const now = new Date().toISOString();
    tr.statut = statut; tr.historique = tr.historique || []; tr.historique.push({ date: now, statut, par: p.structure, motif });
    await Store.db.upsert('transferts', tr);
    const d = data.ds.find((x) => x.id === tr.dossier_id);
    if (d) {
      if (statut === 'Accepté') d.structure_responsable = tr.vers;
      d.historique = d.historique || []; d.historique.push({ date: now, par: p.nom, structure: p.structure, action: statut === 'Accepté' ? 'Transfert accepté : ' + tr.vers + ' devient structure responsable du dossier' : 'Transfert refusé par ' + tr.vers + ' : ' + motif });
      await Store.db.upsertDossier(d, { sections: [] });
    }
    await Store.audit('Transfert ' + statut.toLowerCase(), tr.identifiant, tr.de + ' → ' + tr.vers);
    UI.toast(statut === 'Accepté' ? 'Dossier transféré : votre structure en est désormais responsable.' : 'Transfert refusé.', 'arrow-right-left'); App.render();
  };

  /* ---------- Demande de clôture du suivi ---------- */
  T.demanderCloture = async function (d, data) {
    const p = App.profil; const prm = T.params(data);
    const motif = await UI.prompt('Clôturer le suivi du dossier', 'Motif de la clôture (ex. réinsertion achevée, perte de contact, re-migration) :'); if (!motif) return;
    const now = new Date().toISOString(); const directe = !prm.cloture || estSup(p);
    d.etat_suivi = directe ? 'Clôturé' : 'Clôture demandée';
    d.historique.push({ date: now, par: p.nom, structure: p.structure, action: (directe ? 'Suivi clôturé : ' : 'Clôture du suivi demandée : ') + motif });
    await Store.db.upsertDossier(d, { sections: [] });
    if (!directe) await Store.db.upsert('approbations', { id: UI.uuid(), type: 'Clôture', dossier_id: d.id, identifiant: d.identifiant, structure: p.structure, demande_par: p.nom, motif, statut: 'En attente', created_at: now });
    await Store.audit(directe ? 'Clôture du suivi' : 'Demande de clôture', d.identifiant, motif);
    UI.toast(directe ? 'Suivi clôturé.' : 'Demande de clôture transmise au superviseur.', 'stamp'); App.render();
  };

  /* ---------- Décision du superviseur ---------- */
  T.decider = async function (a, ok, data) {
    const p = App.profil; let motif = '';
    if (!ok) { motif = await UI.prompt('Rejeter la demande', 'Motif du rejet (transmis au demandeur) :'); if (!motif) return; }
    const now = new Date().toISOString();
    a.statut = ok ? 'Approuvée' : 'Rejetée'; a.decide_par = p.nom + ' (' + p.structure + ')'; a.decision_le = now; a.decision_motif = motif;
    await Store.db.upsert('approbations', a);
    const d = data.ds.find((x) => x.id === a.dossier_id);
    if (a.type === 'Transfert') {
      const tr = (data.transferts || []).find((x) => x.id === a.objet_id);
      if (tr) { tr.statut = ok ? 'Demandé' : 'Refusé'; tr.historique.push({ date: now, statut: ok ? 'Validé par le superviseur' : 'Rejeté par le superviseur', par: p.structure, motif }); await Store.db.upsert('transferts', tr); }
    }
    if (d) {
      if (a.type === 'Clôture') d.etat_suivi = ok ? 'Clôturé' : 'Ouvert';
      if (a.type === 'Validation du dossier') d.valide = ok ? { par: p.nom, date: now } : null;
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: a.type + (ok ? ' approuvée' : ' rejetée : ' + motif) });
      await Store.db.upsertDossier(d, { sections: [] });
    }
    await Store.audit(a.type + (ok ? ' approuvée' : ' rejetée'), a.identifiant, motif);
    UI.toast(a.type + (ok ? ' approuvée.' : ' rejetée.'), 'stamp'); App.render();
  };

  /* ---------- Suivi du migrant ---------- */
  T.suivi = function (d) {
    const p = App.profil; const x = { type: 'Appel téléphonique' };
    const date = h('input', { class: 'input', type: 'date', value: new Date().toISOString().slice(0, 10) }); const proch = h('input', { class: 'input', type: 'date' }); const note = h('textarea', { class: 'textarea', placeholder: 'Situation, besoins, orientations…' });
    UI.modal({ title: 'Enregistrer un suivi — ' + d.identifiant, icon: 'calendar-check', body: h('div', { class: 'form-grid' },
      h('div', null, h('label', { class: 'q' }, 'Type de suivi'), UI.dropdown({ items: ['Appel téléphonique', 'Visite à domicile', 'Entretien au bureau', 'Message', 'Échange avec une structure partenaire'].map((v) => ({ value: v, label: v })), value: x.type, onChange: (v) => { x.type = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Date'), date), h('div', { class: 'full' }, h('label', { class: 'q' }, 'Observations'), note), h('div', null, h('label', { class: 'q' }, 'Prochain suivi (facultatif)'), proch)),
    actions: [{ label: 'Annuler' }, { label: 'Enregistrer', cls: 'primary', icon: 'save', onclick: async () => {
      if (!note.value.trim()) { UI.toast('Observations obligatoires.', 'alert-triangle'); return false; }
      d.suivis = d.suivis || []; d.suivis.push({ id: UI.uuid(), date: new Date(date.value).toISOString(), par: p.nom, structure: p.structure, type: x.type, note: note.value.trim(), prochaine: proch.value ? new Date(proch.value).toISOString() : null });
      d.historique.push({ date: new Date().toISOString(), par: p.nom, structure: p.structure, action: 'Suivi enregistré (' + x.type.toLowerCase() + ')' });
      await Store.db.upsertDossier(d, { sections: [] }); await Store.audit('Suivi enregistré', d.identifiant, x.type); UI.toast('Suivi enregistré.', 'calendar-check'); App.render();
    } }] }).el.style.maxWidth = '680px';
  };

  /* ---------- Validation après synchronisation (si le paramètre est actif) ---------- */
  T.apresSynchro = async function (d, p) {
    try {
      const prm = { ...DEFAUT, ...((await Store.db.list('parametres')).find((x) => x.id === 'validations')) };
      if (!prm.validation_dossier) return;
      await Store.db.upsert('approbations', { id: UI.uuid(), type: 'Validation du dossier', dossier_id: d.id, identifiant: d.identifiant, structure: d.structure, demande_par: p.nom, motif: 'Dossier synchronisé depuis la tablette ' + p.tablette, statut: 'En attente', created_at: new Date().toISOString() });
    } catch (e) { console.warn('Validation', e); }
  };

  /* ---------- Paramètres des validations (administration) ---------- */
  T.parametres = function (c, data) {
    const prm = T.params(data);
    const lignes = [['validation_dossier', 'Validation de chaque nouveau dossier', 'Après la synchronisation, le superviseur de la structure d\'enrôlement vérifie le dossier avant qu\'il soit considéré comme validé.', 'file-check-2'],
      ['transfert', 'Validation des transferts de dossier', 'Un transfert demandé par un agent ou un gestionnaire de cas est validé par son superviseur avant d\'être proposé à la structure destinataire.', 'arrow-right-left'],
      ['cloture', 'Validation des clôtures de suivi', 'La clôture du suivi d\'un migrant (réinsertion achevée, perte de contact…) est approuvée par le superviseur.', 'flag'],
      ['fusion', 'Validation des fusions de doublons', 'Aucune fusion automatique : tout doublon possible est examiné par un superviseur.', 'copy']];
    const relance = h('input', { class: 'input', type: 'number', min: 1, max: 60, value: prm.relance_jours, style: { width: '110px' } });
    const stats = (type) => { const a = (data.approbations || []).filter((x) => x.type === type || (type === 'Validation du dossier' && x.type === type)); return a.filter((x) => x.statut === 'En attente').length + ' en attente · ' + a.filter((x) => x.statut !== 'En attente').length + ' traitée(s)'; };
    const TYPE = { validation_dossier: 'Validation du dossier', transfert: 'Transfert', cloture: 'Clôture', fusion: 'Fusion' };
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Paramètres des validations'), h('p', { class: 'sub' }, 'Choisissez les actions soumises à l\'approbation du superviseur. Les demandes apparaissent dans « Mes tâches » des superviseurs ; l\'administrateur général peut toujours décider.')),
      h('button', { class: 'btn primary', onclick: async () => { prm.relance_jours = Number(relance.value) || 7; prm.created_at = prm.created_at || new Date().toISOString(); await Store.db.upsert('parametres', prm); await Store.audit('Paramètres des validations', 'validations', JSON.stringify(prm)); UI.toast('Paramètres enregistrés.', 'save'); App.render(); } }, icon('save'), 'Enregistrer')),
      h('div', { class: 'card p0' }, lignes.map(([k, l, d, ic]) => h('div', { class: 'param-row' }, h('span', { class: 'ticon o' }, icon(ic)), h('div', { class: 'grow' }, h('b', null, l), h('div', { class: 'small muted' }, d), h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, stats(TYPE[k]))),
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: prm[k] ? true : null, onchange: (e) => { prm[k] = e.target.checked; } }), h('span', null)))),
        h('div', { class: 'param-row' }, h('span', { class: 'ticon b' }, icon('bell-ring')), h('div', { class: 'grow' }, h('b', null, 'Délai de relance (jours)'), h('div', { class: 'small muted' }, 'Un suivi ou un transfert apparaît dans « Mes tâches » ce nombre de jours avant son échéance ; au-delà, il passe en priorité haute.')), relance)));
    const hist = (data.approbations || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    c.append(h('div', { class: 'card p0', style: { marginTop: '20px' } }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon g' }, icon('history')), 'Historique des demandes de validation'), h('span', { class: 'badge accent' }, hist.length)),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Date', 'Type', 'Dossier', 'Demandé par', 'Statut', 'Décision'].map((x) => h('th', null, x)))),
        h('tbody', null, hist.map((a) => h('tr', null, h('td', { class: 'small' }, UI.fmtDate(a.created_at, true)), h('td', null, a.type), h('td', null, h('a', { class: 'idlink', href: '#/portail/dossier/' + a.dossier_id }, a.identifiant)), h('td', { class: 'small' }, a.demande_par + ' (' + a.structure + ')'),
          h('td', null, h('span', { class: 'badge solid ' + (a.statut === 'Approuvée' ? 'ok' : a.statut === 'Rejetée' ? 'danger' : 'warn') }, a.statut)), h('td', { class: 'small muted' }, a.decide_par ? a.decide_par + (a.decision_motif ? ' — ' + a.decision_motif : '') : '—'))))))));
  };
  window.Taches = T;
})();
