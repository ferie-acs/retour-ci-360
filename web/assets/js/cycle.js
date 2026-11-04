/* Cycle de vie du dossier : retours successifs (épisodes), consentements et retraits, conflits de synchronisation
   soumis à l'arbitrage du superviseur, annulation d'un rattachement de doublons.
   Cahier des charges v0.4 : 7.6, 8.2 (EF-IDU-07, EF-IDU-08), 8.8 (EF-CON-04, EF-CON-07), 21 (ENF-SYN-02, ENF-SYN-05), RG-07, RG-08. */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const C = {};
  const maintenant = () => new Date().toISOString();
  const lib = (v) => (v === undefined || v === null || v === '' ? '(vide)' : P().fmt(v));
  const P = () => window.Portail;
  const egal = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  const codesOf = (s) => window.DICO.filter((q) => q.sect === s).map((q) => q.code);

  /* ====================================================================================
     1. Retours successifs : un seul dossier par personne, un épisode par retour
     Les informations stables (état civil, filiation, éducation, origine) appartiennent à la
     personne ; ce qui change d'un retour à l'autre appartient à l'épisode.
     ==================================================================================== */
  /* Relèvent de l'épisode : l'entretien et ses consentements, le retour (programme, mode, date, provenance),
     la situation avant ce départ et pendant ce voyage, le parcours, les vulnérabilités, la santé, les besoins,
     l'orientation et le suivi. Relèvent de la personne : état civil, filiation, origine, éducation, pièce d'identité. */
  C.SECTIONS_EPISODE = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
  C.CODES_EPISODE_HORS_SECTIONS = ['ENT-001', 'ENT-002', 'ENT-003', 'ENT-004', 'ENT-005', 'ENT-006', 'ENT-007', 'ENT-009', 'ENT-010', 'ENT-011', 'ENT-012', 'ENT-013', 'ENT-014', 'ENT-015',
    'IDT-013', 'IDT-015', 'IDT-016', 'IDT-017', 'IDT-018', 'IDT-019', 'RES-001', 'RES-002', 'RES-004', 'RES-005', 'RES-006', 'RES-007', 'RES-008', 'RES-009', 'RES-010', 'RES-011', 'RES-012', 'RES-013', 'EDU-013'];
  C.estCodeEpisode = (code) => { const q = Domaine.Q[code]; return !!q && (C.SECTIONS_EPISODE.includes(q.sect) || C.CODES_EPISODE_HORS_SECTIONS.includes(code)); };
  const instantane = (d, n) => ({
    n, id: UI.uuid(), created_at: d.created_at, date_retour: d.reponses['IDT-019'] || (d.created_at || '').slice(0, 10), type_retour: d.reponses['IDT-017'] || '',
    provenance: (d.resume && d.resume.provenance) || '', arrivee_id: d.arrivee_id || null, arrivee_code: d.arrivee_code || null, site: d.site, structure: d.structure, agent: d.agent,
    reponses: Object.fromEntries(Object.entries(d.reponses || {}).filter(([k]) => C.estCodeEpisode(k))), itineraire: JSON.parse(JSON.stringify(d.itineraire || { ci: [], pays: [] })),
    signature: !!(d.medias && d.medias.signature),
  });
  C.episodes = (d) => (d.episodes && d.episodes.length ? d.episodes : [instantane(d, 1)]);

  /* Sur la tablette : l'agent reconnaît la personne parmi les dossiers existants */
  C.rattacherEpisode = function (d, existant, p) {
    d.episode_de = { id: existant.id, identifiant: existant.identifiant, nom: ((existant.resume.nom || '') + ' ' + (existant.resume.prenoms || '')).trim(), n: C.episodes(existant).length + 1 };
    /* RG-01 : ce qui est déjà connu n'est pas redemandé ; c'est proposé pour confirmation */
    d.prerempli = [];
    for (const [code, v] of Object.entries(existant.reponses || {})) {
      if (C.estCodeEpisode(code) || Domaine.Q[code] && Domaine.Q[code].widget === 'auto') continue;
      if (d.reponses[code] === undefined) { d.reponses[code] = JSON.parse(JSON.stringify(v)); d.prerempli.push(code); }
    }
    d.historique.push({ date: maintenant(), par: p.nom, structure: p.structure, action: 'Personne reconnue : nouvel épisode de retour (n° ' + d.episode_de.n + ') du dossier ' + existant.identifiant + ' ; ' + d.prerempli.length + ' réponse(s) déjà connue(s) proposée(s) pour confirmation' });
  };
  C.annulerRattachementEpisode = function (d, p) {
    (d.prerempli || []).forEach((c) => { delete d.reponses[c]; });
    d.historique.push({ date: maintenant(), par: p.nom, structure: p.structure, action: 'Rattachement au dossier ' + d.episode_de.identifiant + ' annulé : nouvelle personne' });
    delete d.episode_de; delete d.prerempli;
  };

  /* À la synchronisation : l'entretien devient un nouvel épisode du dossier existant.
     Les réponses stables qui diffèrent de celles du serveur ne l'écrasent pas : chaque écart devient un conflit. */
  C.fusionnerEpisode = async function (existant, d, p) {
    const now = maintenant();
    existant.episodes = C.episodes(existant).map((e) => ({ ...e }));
    const n = existant.episodes.length + 1;
    const conflits = [];
    for (const [code, v] of Object.entries(d.reponses)) {
      if (C.estCodeEpisode(code)) continue;
      const q = Domaine.Q[code]; if (!q || q.widget === 'auto') continue;
      const s = existant.reponses[code];
      if (Domaine.estVide(s) && !Domaine.estVide(v)) { existant.reponses[code] = v; continue; }
      if (!Domaine.estVide(v) && !egal(s, v)) conflits.push(await C.creerConflit(existant, code, { v: s, par: 'Valeur enregistrée lors d\'un retour précédent', structure: existant.structure, date: existant.updated_at },
        { v, par: p.nom, structure: p.structure, date: now, source: 'Tablette ' + p.tablette + ' — épisode n° ' + n }, 'Retour successif : réponse différente de celle du dossier'));
    }
    /* épisode courant : ses réponses remplacent celles de l'épisode précédent, archivé intact */
    for (const k of Object.keys(existant.reponses)) if (C.estCodeEpisode(k)) delete existant.reponses[k];
    for (const [k, v] of Object.entries(d.reponses)) if (C.estCodeEpisode(k)) existant.reponses[k] = v;
    existant.itineraire = d.itineraire;
    Object.assign(existant, { arrivee_id: d.arrivee_id, arrivee_code: d.arrivee_code, site_id: d.site_id, site: d.site, passager_id: d.passager_id, updated_at: now, version: (existant.version || 1) + 1 });
    existant.medias = existant.medias || { documents: [] };
    if (d.medias.photo) existant.medias.photo = d.medias.photo;
    if (d.medias.signature) { existant.medias.signature = d.medias.signature; existant.medias.signature_date = d.medias.signature_date; }
    existant.medias.documents = (existant.medias.documents || []).concat(d.medias.documents || []);
    existant.consentements = C.consentements(existant).concat((d.consentements || []).map((x) => ({ ...x, episode: n })));
    existant.verifications_oneci = (existant.verifications_oneci || []).concat(d.verifications_oneci || []);
    if ((existant.etat_suivi || 'Ouvert') === 'Clôturé') { existant.etat_suivi = 'Ouvert'; existant.historique.push({ date: now, par: 'Plateforme', structure: '', action: 'Dossier rouvert : nouveau retour de la personne' }); }
    existant.historique = (existant.historique || []).concat((d.historique || []).filter((x) => x.date >= d.created_at));
    existant.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Épisode de retour n° ' + n + ' rattaché (retour du ' + UI.fmtDate(d.reponses['IDT-019'] || d.created_at) + ', arrivée ' + (d.arrivee_code || '—') + ')' + (conflits.length ? ' — ' + conflits.length + ' conflit(s) soumis au superviseur' : '') });
    Domaine.calculs(existant);
    existant.episodes.push(Object.assign(instantane(existant, n), { created_at: d.created_at, structure: p.structure, agent: p.nom }));
    return { dossier: existant, n, conflits };
  };

  C.carteEpisodes = function (d) {
    const eps = C.episodes(d); if (eps.length < 2) return null;
    return P().carte('repeat', 'b', 'Retours successifs', h('span', { class: 'badge accent' }, eps.length + ' retours'),
      h('div', { class: 'card-b', style: { paddingTop: '4px', paddingBottom: '4px' } }, eps.slice().reverse().map((e, i) => h('div', { class: 'li' },
        h('span', { class: 'thumbx', style: { background: 'var(--bg)' } }, 'n° ' + e.n),
        h('div', { class: 'grow' }, h('div', { class: 't1' }, 'Retour du ' + UI.fmtDate(e.date_retour)),
          h('div', { class: 't2' }, [e.provenance ? 'depuis ' + e.provenance : '', e.type_retour, e.arrivee_code].filter(Boolean).join(' · ')),
          h('div', { class: 'tiny muted' }, e.structure + ' — ' + e.agent)),
        i === 0 ? h('span', { class: 'badge solid ok' }, 'en cours') : h('button', { class: 'btn sm', onclick: () => C.voirEpisode(d, e) }, icon('eye'), 'Consulter')))));
  };
  C.voirEpisode = function (d, e) {
    const p = App.profil; const corps = h('div', { class: 'stack' });
    corps.append(h('div', { class: 'notice' }, icon('history'), 'Épisode archivé : réponses telles qu\'enregistrées lors de ce retour. Elles ne sont plus modifiables.'));
    for (const s of ['I', 'II', 'IV'].concat(C.SECTIONS_EPISODE)) {
      const dr = Domaine.droits(p, s); const sens = M.sensibiliteSections[s];
      const codes = codesOf(s).filter((c) => e.reponses[c] !== undefined && C.estCodeEpisode(c) && Domaine.codeAutorise(p, c));
      if (!codes.length && s !== 'VIII') continue;
      const bloc = h('div', null, h('div', { class: 'sub-head' }, s + ' — ' + M.SECTIONS[s]));
      if (!dr.includes('L')) bloc.append(h('div', { class: 'small muted' }, 'Section non accessible à votre structure.'));
      else if (sens === 'N3') bloc.append(h('div', { class: 'small muted' }, 'Sensibilité N3 : consultation sur demande motivée depuis la section du dossier.'));
      else {
        codes.forEach((c) => bloc.append(h('div', { class: 'kv' }, h('span', { class: 'k' }, h('span', { class: 'qcode' }, c), ' ', Domaine.Q[c].label), h('span', null, P().fmt(e.reponses[c])))));
        if (s === 'VIII') { const et = Form.etapes(e.itineraire || {}); if (et.length) bloc.append(P().etapesListe(et)); }
      }
      corps.append(bloc);
    }
    Store.audit('Consultation d\'un épisode archivé', d.identifiant, 'Épisode n° ' + e.n);
    UI.modal({ title: 'Retour n° ' + e.n + ' du ' + UI.fmtDate(e.date_retour), icon: 'repeat', body: corps }).el.style.maxWidth = '860px';
  };

  /* ====================================================================================
     2. Consentements : un enregistrement par finalité, retrait daté sans effacement
     ==================================================================================== */
  C.FINALITES = {
    'ENT-009': { lib: 'Consentement éclairé à l\'entretien', effet: 'Traitements suspendus : seules l\'identification (sections I et II) et l\'historique restent consultables ; aucune saisie ni aucun référencement nouveaux.' },
    'ENT-010': { lib: 'Utilisation des données', effet: 'Biométrie (section V), fiche décadactylaire, pièces numérisées et vérification ONECI suspendues.' },
    'ENT-011': { lib: 'Prise de photo', effet: 'La photo n\'est plus affichée ni imprimée sur les documents.' },
    'ENT-013': { lib: 'Consentement du tuteur (mineur)', effet: 'Mêmes effets que le retrait du consentement éclairé.' },
  };
  C.VERSION_NOTICE = 'Notice d\'information aux migrants, version 1.0 (démonstration)';
  /* Les dossiers enregistrés avant ce suivi n'ont que les réponses ENT : on en reconstitue le registre */
  C.consentements = function (d) {
    if (d.consentements && d.consentements.length) return d.consentements;
    return Object.keys(C.FINALITES).filter((k) => d.reponses && d.reponses[k] !== undefined).map((k) => ({ id: UI.uuid(), finalite: k, valeur: d.reponses[k], date: d.reponses['ENT-001'] || d.created_at, agent: d.agent, structure: d.structure, notice: C.VERSION_NOTICE, retrait: null, reconstitue: true }));
  };
  C.noterConsentement = function (d, code, valeur, p) {
    if (!C.FINALITES[code]) return;
    d.consentements = (d.consentements || []).filter((x) => !(x.finalite === code && x.entretien === d.id && !x.retrait));
    if (valeur !== undefined) d.consentements.push({ id: UI.uuid(), finalite: code, valeur, date: maintenant(), agent: p.nom, structure: p.structure, notice: C.VERSION_NOTICE, entretien: d.id, retrait: null });
  };
  C.retire = (d, code) => (d.retraits || []).includes(code) || (code === 'ENT-010' && (d.retraits || []).some((x) => ['ENT-009', 'ENT-013'].includes(x)));
  C.suspendu = (d) => (d.retraits || []).some((x) => ['ENT-009', 'ENT-013'].includes(x));
  /* Restriction sur le serveur : les médias concernés quittent les données utilisées par la plateforme sans être effacés */
  const restreindre = (d, codes) => {
    d.medias = d.medias || { documents: [] }; d.medias_restreints = d.medias_restreints || {};
    if (codes.includes('ENT-011') && d.medias.photo) { d.medias_restreints.photo = d.medias.photo; delete d.medias.photo; }
    if (codes.some((c) => ['ENT-010', 'ENT-009', 'ENT-013'].includes(c))) {
      if (d.medias.fiche) { d.medias_restreints.fiche = d.medias.fiche; delete d.medias.fiche; }
      if ((d.medias.documents || []).length) { d.medias_restreints.documents = d.medias.documents; d.medias.documents = []; }
    }
  };
  C.peutRetirer = (p, d) => ['admin', 'superviseur'].includes(p.role) || p.structure === d.structure || p.structure === (d.structure_responsable || d.structure);
  C.carteConsentements = function (d) {
    const p = App.profil; const liste = C.consentements(d);
    const actifs = liste.filter((x) => x.valeur === 'Oui' && !x.retrait && !(d.retraits || []).includes(x.finalite));
    return P().carte('shield-check', 'g', 'Consentements', actifs.length && C.peutRetirer(p, d) ? h('button', { class: 'btn sm', onclick: () => C.retirer(d) }, icon('shield-x'), 'Enregistrer un retrait') : null,
      h('div', { class: 'card-b', style: { paddingTop: '4px', paddingBottom: '4px' } }, liste.length ? liste.map((x) => h('div', { class: 'li' },
        h('div', { class: 'grow', title: x.notice + (x.reconstitue ? ' — registre reconstitué depuis les réponses de l\'entretien' : '') }, h('div', { class: 't1' }, (C.FINALITES[x.finalite] || {}).lib || x.finalite),
          h('div', { class: 't2' }, '« ' + x.valeur + ' » le ' + UI.fmtDate(x.date) + ', ' + x.agent + ' (' + x.structure + ')' + (x.episode ? ', retour n° ' + x.episode : '')),
          x.retrait ? h('div', { class: 'tiny', style: { color: 'var(--danger)', marginTop: '2px' } }, 'Retiré le ' + UI.fmtDate(x.retrait.date) + ' (' + x.retrait.mode.toLowerCase() + ', enregistré par ' + x.retrait.par + ')' + (x.retrait.motif ? ' : ' + x.retrait.motif : '')) : null),
        h('span', { class: 'badge solid ' + (x.retrait ? 'danger' : x.valeur === 'Oui' ? 'ok' : 'grey') }, x.retrait ? 'Retiré' : x.valeur === 'Oui' ? 'Actif' : x.valeur))).concat([h('div', { class: 'tiny muted', style: { padding: '10px 0' } }, 'Texte présenté : ' + C.VERSION_NOTICE + '.')]) : h('div', { class: 'small muted', style: { padding: '12px 0' } }, 'Aucun consentement enregistré.')));
  };
  C.retirer = function (d) {
    const p = App.profil; const liste = C.consentements(d);
    const actifs = liste.filter((x) => x.valeur === 'Oui' && !x.retrait && !(d.retraits || []).includes(x.finalite));
    const choisis = new Set(); const st = { mode: 'Déclaration orale', date: maintenant().slice(0, 10) };
    const motif = h('textarea', { class: 'textarea', placeholder: 'Facultatif : circonstances du retrait' });
    UI.modal({ title: 'Retrait de consentement', icon: 'shield-x', body: h('div', { class: 'stack' },
      h('div', { class: 'notice' }, icon('info'), 'Le retrait est enregistré avec sa date ; il n\'efface pas l\'historique. Il restreint immédiatement les traitements sur le serveur, puis sur chaque tablette à sa synchronisation suivante, où les données concernées sont retirées.'),
      h('div', null, h('label', { class: 'q' }, 'Finalités retirées'), h('div', { class: 'stack' }, actifs.map((x) => { const cb = h('input', { type: 'checkbox', onchange: () => (cb.checked ? choisis.add(x.finalite) : choisis.delete(x.finalite)) });
        return h('label', { class: 'row', style: { gap: '8px', alignItems: 'flex-start', cursor: 'pointer' } }, cb, h('span', null, h('b', null, C.FINALITES[x.finalite].lib), h('div', { class: 'tiny muted' }, C.FINALITES[x.finalite].effet))); }))),
      h('div', { class: 'grid g2' }, h('div', null, h('label', { class: 'q' }, 'Date du retrait'), h('input', { class: 'input', type: 'date', value: st.date, max: st.date, onchange: (e) => { st.date = e.target.value; } })),
        h('div', null, h('label', { class: 'q' }, 'Forme'), UI.dropdown({ items: ['Déclaration orale', 'Déclaration écrite', 'Par l\'intermédiaire du tuteur'].map((v) => ({ value: v, label: v })), value: st.mode, onChange: (v) => { st.mode = v; } }).el)),
      h('div', null, h('label', { class: 'q' }, 'Observations'), motif)),
    actions: [{ label: 'Annuler' }, { label: 'Enregistrer le retrait', cls: 'danger', icon: 'shield-x', onclick: async () => {
      if (!choisis.size) { UI.toast('Choisir au moins une finalité.', 'alert-triangle'); return false; }
      const now = maintenant(); const codes = [...choisis];
      d.consentements = liste.map((x) => (codes.includes(x.finalite) && !x.retrait && x.valeur === 'Oui' ? { ...x, retrait: { date: st.date, enregistre_le: now, mode: st.mode, motif: motif.value.trim(), par: p.nom + ' (' + p.structure + ')' } } : x));
      d.retraits = [...new Set((d.retraits || []).concat(codes))];
      restreindre(d, codes); d.updated_at = now; d.version = (d.version || 1) + 1;
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Retrait de consentement (' + codes.map((c) => C.FINALITES[c].lib.toLowerCase()).join(', ') + ') daté du ' + UI.fmtDate(st.date) + ' : traitements restreints sur le serveur' });
      await Store.db.upsertDossier(d);
      await Store.audit('Retrait de consentement', d.identifiant, codes.join(', ') + ' — ' + st.mode);
      UI.toast('Retrait enregistré : traitements restreints.', 'shield-x'); App.render();
    } }] }).el.style.maxWidth = '640px';
  };
  /* Tablette : à la synchronisation, les données dont le consentement a été retiré quittent la base locale */
  C.appliquerRetraitsTablette = async function (p) {
    const locaux = Store.Tablette.list(p.tablette).filter((d) => d.statut === 'Synchronisé'); let n = 0;
    for (const loc of locaux) {
      const central = await Store.db.getDossier(loc.fusionne_dans || loc.id); if (!central || !(central.retraits || []).length) continue;
      const deja = loc.retraits_appliques || []; const nouveaux = central.retraits.filter((c) => !deja.includes(c)); if (!nouveaux.length) continue;
      loc.medias = loc.medias || { documents: [] };
      if (nouveaux.includes('ENT-011')) delete loc.medias.photo;
      if (nouveaux.some((c) => ['ENT-010', 'ENT-009', 'ENT-013'].includes(c))) { delete loc.medias.fiche; loc.medias.documents = []; }
      if (nouveaux.some((c) => ['ENT-009', 'ENT-013'].includes(c))) {
        for (const k of Object.keys(loc.reponses)) { const q = Domaine.Q[k]; if (q && !['I', 'II'].includes(q.sect)) delete loc.reponses[k]; }
        loc.itineraire = { ci: [], pays: [] };
      }
      loc.retraits_appliques = deja.concat(nouveaux);
      loc.historique.push({ date: maintenant(), par: 'Plateforme', structure: '', action: 'Retrait de consentement appliqué à la tablette ' + p.tablette + ' : données concernées retirées de la base locale' });
      Store.Tablette.save(p.tablette, loc); n++;
    }
    if (n) UI.toast(n + ' dossier(s) : consentement retiré, données retirées de la tablette.', 'shield-x');
    return n;
  };

  /* ====================================================================================
     3. Conflits de synchronisation : « la dernière modification l'emporte » est proscrite
     ==================================================================================== */
  C.creerConflit = async function (d, code, serveur, entrant, origine) {
    const q = Domaine.Q[code] || {};
    const row = { id: UI.uuid(), dossier_id: d.id, identifiant: d.identifiant, structure: d.structure, code, section: q.sect, libelle: q.label, origine,
      serveur, entrant, statut: 'À arbitrer', created_at: maintenant() };
    await Store.db.upsert('conflits', row);
    d.historique = d.historique || []; d.historique.push({ date: row.created_at, par: 'Plateforme', structure: '', action: 'Conflit sur ' + code + ' : « ' + lib(serveur.v) + ' » (serveur) / « ' + lib(entrant.v) + ' » (' + (entrant.source || entrant.structure) + ') — soumis au superviseur' });
    return row;
  };
  C.ouverts = (data, d) => (data.conflits || []).filter((x) => x.statut === 'À arbitrer' && (!d || x.dossier_id === d.id));
  C.visibles = (p, data) => C.ouverts(data).filter((x) => p.role === 'admin' || (p.role === 'superviseur' && x.structure === p.structure));
  /* Enregistrement depuis le portail avec verrouillage optimiste : la saisie est confrontée à la version
     relue au moment de l'enregistrement ; une valeur modifiée entre-temps par un autre utilisateur n'est pas écrasée. */
  C.enregistrerAvecControle = async function (d, base, propose, codes, p, libelleAction) {
    const frais = (await Store.db.getDossier(d.id)) || d;
    const appliques = []; const conflits = [];
    for (const c of codes) {
      const avant = base[c], moi = propose[c], serveur = frais.reponses[c];
      if (egal(avant, moi)) continue;
      if (!egal(serveur, avant) && !egal(serveur, moi)) {
        const auteur = [...(frais.historique || [])].reverse().find((x) => (x.action || '').includes(c));
        conflits.push(await C.creerConflit(frais, c, { v: serveur, par: auteur ? auteur.par : 'Autre utilisateur', structure: auteur ? auteur.structure : '', date: auteur ? auteur.date : frais.updated_at },
          { v: moi, par: p.nom, structure: p.structure, date: maintenant(), source: 'Portail — ' + p.structure }, 'Modification concurrente : la valeur a changé depuis l\'ouverture du formulaire'));
        continue;
      }
      if (moi === undefined) delete frais.reponses[c]; else frais.reponses[c] = moi; appliques.push(c);
    }
    frais.updated_at = maintenant(); frais.version = (frais.version || 1) + 1;
    if (appliques.length) frais.historique.push({ date: frais.updated_at, par: p.nom, structure: p.structure, action: libelleAction + ' (' + appliques.join(', ') + ')' });
    Domaine.calculs(frais);
    await Store.db.upsertDossier(frais);
    return { appliques, conflits, dossier: frais };
  };
  C.arbitrer = function (x, d) {
    const st = {}; const motif = h('textarea', { class: 'textarea', placeholder: 'Ex. : numéro confirmé par un appel au migrant le 04/11' });
    const opt = (k, titre, val) => { const b = h('button', { type: 'button', class: 'choix-conflit', onclick: () => { st.k = k; corps.querySelectorAll('.choix-conflit').forEach((e) => e.classList.toggle('on', e === b)); } },
      h('div', { class: 'tiny muted' }, titre), h('b', null, lib(val.v)), h('div', { class: 'tiny muted' }, [val.par, val.structure].filter(Boolean).join(', ') + (val.date ? ' — ' + UI.fmtDate(val.date, true) : '')), val.source ? h('div', { class: 'tiny muted' }, val.source) : null); return b; };
    const corps = h('div', { class: 'stack' }, h('div', null, h('span', { class: 'qcode' }, x.code), ' ', h('b', null, x.libelle), h('div', { class: 'tiny muted' }, 'Section ' + x.section + ' — ' + x.origine)),
      h('div', { class: 'grid g2' }, opt('serveur', 'Valeur du serveur', x.serveur), opt('entrant', 'Valeur entrante', x.entrant)),
      h('div', null, h('label', { class: 'q' }, 'Motif de l\'arbitrage *'), motif));
    UI.modal({ title: 'Arbitrer le conflit — dossier ' + x.identifiant, icon: 'git-compare-arrows', body: corps, actions: [{ label: 'Annuler' }, { label: 'Retenir cette valeur', cls: 'primary', icon: 'gavel', onclick: async () => {
      if (!st.k) { UI.toast('Choisir l\'une des deux valeurs.', 'info'); return false; }
      if (!motif.value.trim()) { UI.toast('Le motif est obligatoire.', 'alert-triangle'); return false; }
      const p = App.profil; const now = maintenant(); const retenu = x[st.k]; const dd = (await Store.db.getDossier(x.dossier_id)) || d;
      if (retenu.v === undefined || retenu.v === null) delete dd.reponses[x.code]; else dd.reponses[x.code] = retenu.v;
      Domaine.calculs(dd); dd.updated_at = now; dd.version = (dd.version || 1) + 1;
      dd.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Conflit arbitré sur ' + x.code + ' : valeur ' + (st.k === 'serveur' ? 'du serveur' : 'entrante') + ' retenue (« ' + lib(retenu.v) + ' ») — ' + motif.value.trim() });
      await Store.db.upsertDossier(dd);
      Object.assign(x, { statut: 'Arbitré', decision: { choix: st.k, valeur: retenu.v, par: p.nom + ' (' + p.structure + ')', date: now, motif: motif.value.trim() } });
      await Store.db.upsert('conflits', x); await Store.audit('Arbitrage d\'un conflit', x.identifiant, x.code + ' : ' + (st.k === 'serveur' ? 'serveur' : 'entrante') + ' — ' + motif.value.trim());
      UI.toast('Conflit arbitré.', 'gavel'); App.render();
    } }] }).el.style.maxWidth = '720px';
  };
  C.conflitsPage = function (c, data) {
    const p = App.profil; const tous = (data.conflits || []).filter((x) => p.role === 'admin' || x.structure === p.structure).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const ouverts = tous.filter((x) => x.statut === 'À arbitrer'); const faits = tous.filter((x) => x.statut !== 'À arbitrer');
    const carte = (x) => h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon p' }, icon('git-compare-arrows')),
      h('a', { class: 'idlink', href: '#/portail/dossier/' + x.dossier_id }, x.identifiant), ' — ', h('span', { class: 'qcode' }, x.code), ' ', x.libelle),
      h('span', { class: 'badge solid ' + (x.statut === 'À arbitrer' ? 'warn' : 'ok') }, x.statut)),
      h('div', { class: 'card-b' }, h('div', { class: 'small muted', style: { marginBottom: '10px' } }, x.origine + ' — signalé ' + UI.ago(x.created_at)),
        h('div', { class: 'grid g2' }, ['serveur', 'entrant'].map((k) => h('div', { class: 'conflit-val' + (x.decision && x.decision.choix === k ? ' retenu' : '') },
          h('div', { class: 'tiny muted' }, k === 'serveur' ? 'Valeur du serveur' : 'Valeur entrante'), h('b', null, lib(x[k].v)),
          h('div', { class: 'tiny muted' }, [x[k].par, x[k].structure].filter(Boolean).join(', ') + (x[k].date ? ' — ' + UI.fmtDate(x[k].date, true) : '')), x[k].source ? h('div', { class: 'tiny muted' }, x[k].source) : null))),
        x.statut === 'À arbitrer' ? h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn primary', onclick: () => C.arbitrer(x) }, icon('gavel'), 'Arbitrer'), h('span', { class: 'tiny muted' }, 'Les deux valeurs sont conservées jusqu\'à la décision ; le dossier garde la valeur du serveur entre-temps.'))
          : h('div', { class: 'notice', style: { marginTop: '12px' } }, icon('gavel'), 'Arbitré par ' + x.decision.par + ' le ' + UI.fmtDate(x.decision.date, true) + ' : ' + x.decision.motif)));
    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Conflits de synchronisation'), h('p', { class: 'sub' }, 'Quand deux utilisateurs modifient la même donnée sans se voir (tablette hors connexion, retour successif, saisies simultanées), aucune valeur n\'écrase l\'autre : les deux sont conservées et le superviseur décide, avec un motif tracé.'))),
      h('div', { class: 'grid g2', style: { marginBottom: '20px' } }, h('div', { class: 'kcard o' }, h('span', { class: 'ki' }, icon('git-compare-arrows')), h('div', null, h('div', { class: 'kl' }, 'À arbitrer'), h('div', { class: 'kv' }, ouverts.length)), UI.filigrane('git-compare-arrows')),
        h('div', { class: 'kcard g' }, h('span', { class: 'ki' }, icon('gavel')), h('div', null, h('div', { class: 'kl' }, 'Arbitrés'), h('div', { class: 'kv' }, faits.length)), UI.filigrane('gavel'))),
      h('div', { class: 'stack' }, ouverts.length ? ouverts.map(carte) : h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('check-check'), h('div', null, 'Aucun conflit à arbitrer.'))),
        faits.length ? h('div', { class: 'sub-head', style: { marginTop: '10px' } }, 'Décisions rendues') : null, faits.map(carte)));
  };

  /* ====================================================================================
     4. Annulation d'un rattachement de doublons (EF-IDU-07, RG-07)
     ==================================================================================== */
  C.annulerFusion = function (x, data) {
    const byId = Object.fromEntries(data.ds.map((d) => [d.id, d]));
    const sec = byId[x.dossier_id]; const pri = byId[x.principal_id] || data.ds.find((d) => d.identifiant === (sec && sec.rattache_a));
    if (!sec || !pri) { UI.toast('Dossiers introuvables.', 'alert-triangle'); return; }
    const depuis = x.decision_le || '';
    const elements = [];
    data.refs.filter((r) => [sec.id, pri.id].includes(r.dossier_id) && r.created_at > depuis).forEach((r) => elements.push({ type: 'ref', obj: r, de: r.dossier_id, lib: 'Référencement ' + r.emetteur + ' → ' + r.destinataire + ' (' + r.statut.toLowerCase() + ')', date: r.created_at }));
    data.als.filter((a) => [sec.id, pri.id].includes(a.dossier_id) && a.created_at > depuis).forEach((a) => elements.push({ type: 'alerte', obj: a, de: a.dossier_id, lib: 'Alerte : ' + a.titre, date: a.created_at }));
    [sec, pri].forEach((d) => (d.suivis || []).filter((s) => s.date > depuis).forEach((s) => elements.push({ type: 'suivi', obj: s, de: d.id, lib: 'Suivi : ' + s.type + ' — ' + s.note, date: s.date })));
    elements.forEach((e) => { e.vers = e.de; });
    const motif = h('textarea', { class: 'textarea', placeholder: 'Ex. : les empreintes de la fiche décadactylaire ne correspondent pas ; il s\'agit de deux personnes.' });
    const lignes = elements.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Intervention enregistrée après le rattachement', 'Date', 'Affecter au dossier'].map((t) => h('th', null, t)))),
      h('tbody', null, elements.map((e) => { const seg = h('div', { class: 'seg' }); [pri, sec].forEach((d) => { const b = h('button', { type: 'button', class: e.vers === d.id ? 'on' : '', onclick: () => { e.vers = d.id; seg.querySelectorAll('button').forEach((y) => y.classList.toggle('on', y === b)); } }, d.identifiant); seg.append(b); });
        return h('tr', null, h('td', { class: 'small' }, e.lib), h('td', { class: 'small' }, UI.fmtDate(e.date, true)), h('td', null, seg)); })))) : h('div', { class: 'small muted' }, 'Aucune intervention enregistrée depuis le rattachement.');
    UI.modal({ title: 'Annuler le rattachement', icon: 'split', body: h('div', { class: 'stack' },
      h('div', { class: 'notice' }, icon('info'), 'Le dossier ' + sec.identifiant + ' retrouve son état antérieur au rattachement à ' + pri.identifiant + '. Chaque intervention enregistrée depuis est réaffectée à l\'un ou l\'autre dossier, sur votre décision ; chaque réaffectation est tracée.'),
      h('div', null, h('label', { class: 'q' }, 'Interventions à réaffecter'), lignes),
      h('div', null, h('label', { class: 'q' }, 'Motif de la décision *'), motif)),
    actions: [{ label: 'Annuler' }, { label: 'Annuler le rattachement', cls: 'danger', icon: 'split', onclick: async () => {
      if (!motif.value.trim()) { UI.toast('Le motif est obligatoire (RG-07).', 'alert-triangle'); return false; }
      const p = App.profil; const now = maintenant(); const reaff = [];
      const av = x.avant || {}; sec.etat_suivi = av.etat_suivi || 'Ouvert'; delete sec.rattache_a;
      if (av.rattache_a) sec.rattache_a = av.rattache_a;
      for (const e of elements) {
        if (e.vers === e.de) continue;
        const cible = e.vers === sec.id ? sec : pri; const source = e.de === sec.id ? sec : pri;
        if (e.type === 'ref') { Object.assign(e.obj, { dossier_id: cible.id, identifiant: cible.identifiant, beneficiaire: cible.resume.nom + ' ' + cible.resume.prenoms }); await Store.db.upsert('referencements', e.obj); }
        if (e.type === 'alerte') { Object.assign(e.obj, { dossier_id: cible.id, identifiant: cible.identifiant }); await Store.db.upsert('alertes', e.obj); }
        if (e.type === 'suivi') { source.suivis = (source.suivis || []).filter((s) => s !== e.obj); cible.suivis = (cible.suivis || []).concat([e.obj]); }
        const t = 'Réaffecté de ' + source.identifiant + ' à ' + cible.identifiant + ' : ' + e.lib;
        source.historique.push({ date: now, par: p.nom, structure: p.structure, action: t }); cible.historique.push({ date: now, par: p.nom, structure: p.structure, action: t }); reaff.push(t);
      }
      sec.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Rattachement à ' + pri.identifiant + ' annulé : dossier rétabli dans son état antérieur — ' + motif.value.trim() });
      pri.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Rattachement de ' + sec.identifiant + ' annulé — ' + motif.value.trim() });
      sec.updated_at = pri.updated_at = now;
      await Store.db.upsertDossier(sec); await Store.db.upsertDossier(pri);
      Object.assign(x, { statut: 'Rattachement annulé', annulation: { par: p.nom + ' (' + p.structure + ')', date: now, motif: motif.value.trim(), reaffectations: reaff } });
      await Store.db.upsert('doublons', x);
      await Store.audit('Annulation d\'un rattachement', sec.identifiant, pri.identifiant + ' — ' + motif.value.trim() + (reaff.length ? ' — ' + reaff.length + ' réaffectation(s)' : ''));
      UI.toast('Rattachement annulé : les deux dossiers sont rétablis.', 'split'); App.render();
    } }] }).el.style.maxWidth = '820px';
  };

  window.Cycle = C;
})();
