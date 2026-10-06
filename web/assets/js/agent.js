/* Espace agent : tablette de terrain (fonctionne hors connexion, synchronise vers la base centrale) */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const A = {};
  const SECT_ORDER = Object.keys(M.SECTIONS);
  const codesOf = (s) => window.DICO.filter((q) => q.sect === s).map((q) => q.code);
  const STATUT_BADGE = { 'Brouillon': 'grey', 'Prêt à synchroniser': 'accent', 'Synchronisé': 'ok', 'Relayé': 'info' };

  function netbar(p, onSync) {
    const on = Store.Tablette.online(p.tablette);
    const pending = Store.Tablette.list(p.tablette).filter((d) => d.statut === 'Prêt à synchroniser').length;
    return h('div', { class: 'netbar' + (on ? '' : ' off') }, h('span', { class: 'dot' }),
      h('span', null, h('b', null, 'Tablette ' + p.tablette), ' — ', on ? 'connectée au réseau' : 'hors connexion (les entretiens restent enregistrés sur l\'appareil)'),
      h('span', { style: { flex: 1 } }),
      h('button', { class: 'btn sm', onclick: () => { Store.Tablette.online(p.tablette, !on); App.render(); } }, icon(on ? 'wifi-off' : 'wifi'), on ? 'Simuler une coupure' : 'Rétablir le réseau'),
      h('button', { class: 'btn sm primary', disabled: !on || !pending || null, onclick: onSync }, icon('refresh-cw'), `Synchroniser (${pending})`));
  }

  /* ---------- Liste des entretiens de la tablette ---------- */
  A.liste = function (root, p) {
    let ds = Store.Tablette.list(p.tablette).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const tous = ds;
    if (App.recherche) ds = ds.filter((d) => UI.norm([d.identifiant, d.identifiantProvisoire, d.resume && d.resume.nom, d.resume && d.resume.prenoms].join(' ')).includes(UI.norm(App.recherche)));
    const n = (st) => tous.filter((d) => d.statut === st).length;
    const kcard = (t, ic, label, val) => h('div', { class: 'kcard ' + t }, h('span', { class: 'ki' }, icon(ic)), h('div', null, h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val)));
    const AVT = ['b', 'o', 'g', 'v', 'p', 't'];
    root.append(h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Bienvenue, ' + p.nom), h('p', { class: 'sub' }, `${p.roleLabel} — ${p.structure}, ${p.site} · tablette ${p.tablette}`)),
        h('button', { class: 'btn primary lg', onclick: () => A.nouveau(p) }, icon('circle-plus'), 'Nouvel entretien')),
      netbar(p, () => A.synchroniser(p)),
      h('div', { class: 'grid g4', style: { marginBottom: '20px' } }, kcard('o', 'clipboard-list', 'Entretiens sur la tablette', tous.length), kcard('d', 'pencil-line', 'Brouillons', n('Brouillon')),
        kcard('b', 'cloud-upload', 'À synchroniser', n('Prêt à synchroniser')), kcard('g', 'cloud-check', 'Synchronisés', n('Synchronisé'))),
      h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon o' }, icon('clipboard-list')), 'Entretiens'),
        App.recherche ? h('span', { class: 'badge accent' }, 'Recherche : ' + App.recherche) : null),
        ds.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, ['Identifiant', 'Migrant', 'Catégorie', 'Progression', 'Statut', 'Modifié', ''].map((x) => h('th', null, x)))),
          h('tbody', null, ds.map((d, i) => {
            const prog = A.progression(d); const nom = d.resume && (d.resume.nom + ' ' + d.resume.prenoms).trim();
            return h('tr', { class: 'click', onclick: () => App.go('#/agent/e/' + d.id) },
              h('td', null, h('span', { class: 'idlink' }, d.identifiant || d.identifiantProvisoire), d.identifiant ? h('div', { class: 'tiny muted' }, d.identifiantProvisoire) : null),
              h('td', null, h('div', { class: 'who' }, h('span', { class: 'av ticon ' + AVT[i % AVT.length] }, nom ? UI.initials(nom) : icon('user-round')), nom ? h('b', null, nom) : h('span', { class: 'muted' }, 'Non renseigné'))),
              h('td', null, (d.resume && d.resume.categorie) || '—', d.drapeaux && d.drapeaux.mna ? h('span', { class: 'badge solid danger', style: { marginLeft: '6px' } }, 'MNA') : null),
              h('td', null, h('div', { class: 'row', style: { gap: '8px' } }, h('div', { class: 'progress' }, h('div', { style: { width: prog + '%' } })), h('span', { class: 'tiny muted' }, prog + ' %'))),
              h('td', null, h('span', { class: 'badge solid ' + (STATUT_BADGE[d.statut] || '') }, d.statut)),
              h('td', { class: 'small muted' }, UI.ago(d.updated_at)), h('td', null, icon('chevron-right')));
          })))) : h('div', { class: 'empty' }, icon('clipboard-list'), h('div', null, App.recherche ? 'Aucun entretien ne correspond à la recherche.' : 'Aucun entretien sur cette tablette.'), h('div', { class: 'small' }, 'Commencez par « Nouvel entretien ».')))));
  };

  /* Tout entretien est rattaché à une arrivée (vol, convoi) et, si possible, à un passager du manifeste appelé depuis la file d'attente */
  A.nouveau = async function (p) {
    const choix = await Sites.choisirArrivee(p); if (!choix) return;
    const { arrivee: a, passager: px, site } = choix;
    if (choix.relais) return A.reprendreRelais(p, choix);
    // reprise d'un entretien déjà ouvert pour ce passager
    const deja = px && Store.Tablette.list(p.tablette).find((x) => x.passager_id === px.id && x.statut === 'Brouillon');
    if (deja) { App.go('#/agent/e/' + deja.id); return; }
    const n = Store.Tablette.seq(p.tablette); const now = new Date().toISOString();
    const d = { id: UI.uuid(), identifiantProvisoire: `TMP-${p.tablette}-${String(n).padStart(4, '0')}`, statut: 'Brouillon', structure: p.structure, agent: p.nom, site: site ? site.nom : p.site, tablette: p.tablette,
      arrivee_id: a.id, arrivee_code: a.code, site_id: a.site_id, passager_id: px ? px.id : UI.uuid(),
      created_at: now, updated_at: now, reponses: {}, medias: { documents: [] }, itineraire: { ci: [], pays: [] }, referencementsProposes: [], alertes: [],
      historique: [{ date: now, par: p.nom, structure: p.structure, action: 'Ouverture de l\'entretien sur la tablette ' + p.tablette + ' — arrivée ' + a.code + (px && px.ticket ? ', ticket ' + px.ticket : '') }] };
    // pré-remplissage depuis le manifeste et l'arrivée
    const r = d.reponses;
    if (px) { if (px.nom) r['IDT-001'] = px.nom; if (px.prenoms) r['IDT-002'] = px.prenoms; if (px.sexe) r['IDT-005'] = px.sexe; if (px.date_naissance) r['IDT-006'] = px.date_naissance; }
    if (Sites.IDT017[a.type]) r['IDT-017'] = Sites.IDT017[a.type];
    r['IDT-019'] = (a.date_reelle || a.date_prevue || now).slice(0, 10);
    if (site) r['ENT-002'] = site.nom;
    Domaine.calculs(d, p); Store.Tablette.save(p.tablette, d);
    if (Store.Tablette.online(p.tablette)) { try { await Sites.majPassager(a.id, d.passager_id, { statut: 'En entretien', agent: p.nom, structure: p.structure, appel: now, ...(px ? {} : { nom: '(hors manifeste)', prenoms: '' }) }, p); } catch (e) { console.warn(e); } }
    App.go('#/agent/e/' + d.id);
  };

  /* Questions visibles, obligatoires et manquantes */
  A.manquants = function (d, s) {
    const out = [];
    for (const code of codesOf(s)) {
      const q = Domaine.Q[code]; if (q.widget === 'auto' || q.widget === 'hidden') continue;
      if (!Domaine.visible(q, d.reponses, d) || !Domaine.obligatoire(q, d.reponses)) continue;
      if (q.widget === 'bio' || q.widget === 'capture') continue;
      if (Domaine.estVide(d.reponses[code])) out.push(q);
    }
    return out;
  };
  A.progression = function (d) {
    let tot = 0, ok = 0;
    for (const s of SECT_ORDER) for (const code of codesOf(s)) {
      const q = Domaine.Q[code]; if (q.widget === 'auto' || q.widget === 'hidden' || q.widget === 'bio' || q.widget === 'capture') continue;
      if (!Domaine.visible(q, d.reponses, d) || !Domaine.obligatoire(q, d.reponses)) continue;
      tot++; if (!Domaine.estVide(d.reponses[code])) ok++;
    }
    return tot ? Math.round((100 * ok) / tot) : 0;
  };
  const consentOk = (d) => d.reponses['ENT-009'] === 'Oui';

  /* ---------- Assistant d'entretien ---------- */
  A.entretien = function (root, p, id, sectParam) {
    const d = Store.Tablette.get(p.tablette, id);
    if (!d) { App.go('#/agent'); return; }
    const lecture = d.statut !== 'Brouillon';
    const parSection = {}; (d.contributions || []).forEach((c) => c.sections.forEach((s) => { parSection[s] = c; }));
    let cur = sectParam && SECT_ORDER.includes(sectParam) ? sectParam : (d._derniere || 'I');
    if (!consentOk(d) && cur !== 'I') cur = 'I';
    const stepsEl = h('div', { class: 'card steps' }); const body = h('div');
    const ctx = {
      refreshers: [], onChangeHooks: [],
      save(quiet) { derive(); d.updated_at = new Date().toISOString(); Store.Tablette.save(p.tablette, d); if (!quiet) paintSteps(); },
      changed(code, val, quiet) {
        Domaine.calculs(d, p);
        ctx.onChangeHooks.forEach((f) => f(code));
        ctx.refreshers.forEach((f) => f());
        verifierAlerte(code);
        if (code === 'ENT-009' || code === 'ENT-010') paintSteps();
        ctx.save(quiet);
      },
    };
    function derive() {
      const r = d.reponses;
      if (d.medias.photo || d.medias.documents.length) r['ENT-012'] = [d.medias.photo ? 'Photo' : null, d.medias.documents.length ? d.medias.documents.length + ' page(s) numérisée(s)' : null].filter(Boolean).join(' + '); else delete r['ENT-012'];
      if (d.medias.signature) { r['SUI-004'] = 'Signée le ' + UI.fmtDate(d.medias.signature_date, true); r['SUI-005'] = p.nom; } else { delete r['SUI-004']; }
      const dest = (d.referencementsProposes || []).filter((x) => x.destinataire).map((x) => x.destinataire);
      if (dest.length) r['ORI-005'] = dest; else delete r['ORI-005'];
      Domaine.calculs(d, p);
    }
    function verifierAlerte(code) {
      const a = M.ALERTES.find((x) => x.q === code); if (!a) return;
      d.alertes = d.alertes || [];
      const deja = d.alertes.find((x) => x.regle === code);
      if (a.v.includes(d.reponses[code])) {
        if (deja) return;
        d.alertes.push({ id: UI.uuid(), regle: code, titre: a.titre, gravite: a.gravite, notifie: a.notifie, delai: a.delai, conduite: a.conduite, created_at: new Date().toISOString() });
        UI.modal({ title: 'Alerte : ' + a.titre, icon: 'siren', kind: 'alert', body: h('div', { class: 'stack' },
          h('div', { class: 'row' }, h('span', { class: 'badge danger' }, 'Gravité ' + a.gravite), h('span', { class: 'badge grey' }, 'Délai : ' + a.delai)),
          h('div', null, h('b', null, 'Conduite à tenir'), h('p', { style: { margin: '6px 0 0' } }, a.conduite)),
          h('div', { class: 'notice' }, icon('bell-ring'), h('span', null, a.notifie.length ? 'Structures notifiées à la synchronisation : ' + a.notifie.join(', ') + ' (et le superviseur DGIE).' : 'Structure compétente à désigner. Le superviseur DGIE est notifié à la synchronisation.'))),
          actions: [{ label: 'J\'ai pris connaissance', cls: 'primary', icon: 'check' }] });
      } else if (deja) d.alertes = d.alertes.filter((x) => x.regle !== code);
    }
    function paintSteps() {
      stepsEl.innerHTML = '';
      stepsEl.append(h('div', { class: 'small muted', style: { padding: '4px 10px 8px' } }, 'Sections du formulaire'));
      SECT_ORDER.forEach((s, i) => {
        const lock = s !== 'I' && !consentOk(d);
        const miss = A.manquants(d, s).length;
        const touched = codesOf(s).some((c) => d.reponses[c] !== undefined && Domaine.Q[c].widget !== 'auto');
        stepsEl.append(h('div', { class: 'step' + (s === cur ? ' cur' : '') + (lock ? ' lock' : '') + (touched && !miss ? ' done' : ''), onclick: () => { if (lock) { UI.toast('Consentement éclairé (ENT-009) requis pour poursuivre.', 'lock'); return; } go(s); } },
          h('span', { class: 'n' }, touched && !miss ? icon('check') : i + 1), h('span', { style: { flex: 1 } }, M.SECTIONS[s]), parSection[s] && parSection[s].structure !== p.structure ? h('span', { class: 'badge info', title: 'Saisie par ' + parSection[s].agent + ' (' + parSection[s].structure + ')' }, parSection[s].structure) : null, lock ? icon('lock') : (touched && miss ? h('span', { class: 'badge warn' }, miss) : null)));
      });
      UI.refreshIcons();
    }
    function go(s) {
      if (cur === 'II' && s !== 'II') verifierDoublons();
      cur = s; d._derniere = s; Store.Tablette.save(p.tablette, d); paintBody(); paintSteps(); window.scrollTo({ top: 0 });
    }
    async function verifierDoublons() {
      if (!d.reponses['IDT-001']) return;
      const locaux = Store.Tablette.list(p.tablette);
      let centraux = [];
      if (Store.Tablette.online(p.tablette)) { try { centraux = await Store.db.candidatsDoublons(d); } catch (e) { console.warn(e); } }
      const tous = [...centraux, ...locaux.filter((x) => !centraux.some((c) => c.id === x.id))];
      const res = Domaine.doublons(d, tous).filter((x) => x.score >= UI.PARAMS.doublon);
      d.doublonsSignales = res.map((x) => ({ id: x.dossier.id, identifiant: x.dossier.identifiant || x.dossier.identifiantProvisoire, score: x.score, regles: x.regles }));
      Store.Tablette.save(p.tablette, d);
      if (!res.length) return;
      UI.modal({ title: 'Doublon possible', icon: 'copy', body: h('div', { class: 'stack' },
        h('p', { style: { margin: 0 } }, 'Les dossiers suivants présentent des similitudes. Aucune fusion n\'est réalisée automatiquement : le cas est signalé au superviseur pour examen.'),
        h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Dossier', 'Nom', 'Naissance', 'Enrôlé par', 'Score', 'Règles'].map((x) => h('th', null, x)))),
          h('tbody', null, res.slice(0, 5).map((x) => h('tr', null, h('td', null, x.dossier.identifiant || x.dossier.identifiantProvisoire), h('td', null, (x.dossier.resume || {}).nom + ' ' + (x.dossier.resume || {}).prenoms),
            h('td', null, UI.fmtDate((x.dossier.resume || {}).date_naissance)), h('td', null, x.dossier.structure + ', ' + (x.dossier.site || '')), h('td', null, h('span', { class: 'badge ' + (x.score >= 85 ? 'danger' : 'warn') }, x.score)), h('td', { class: 'small' }, x.regles.join(' ; '))))))),
        actions: [{ label: 'Poursuivre l\'entretien', cls: 'primary' }] });
    }
    function paintBody() {
      body.innerHTML = ''; ctx.refreshers = []; ctx.onChangeHooks = [];
      const idx = SECT_ORDER.indexOf(cur);
      const card = h('div', { class: 'card' });
      card.append(h('div', { class: 'section-head' }, h('div', null, h('div', { class: 'tiny muted' }, `Section ${cur} — ${idx + 1} sur ${SECT_ORDER.length}`), h('h2', { style: { margin: 0 } }, M.SECTIONS[cur])),
        h('span', { class: 'sens ' + M.sensibiliteSections[cur] }, 'Sensibilité ' + M.sensibiliteSections[cur])));
      if (cur === 'IX' || cur === 'X') card.append(h('div', { class: 'notice warn', style: { marginTop: '10px' } }, icon('shield-alert'), 'Section sensible : poser les questions en confidentialité. Une réponse « Oui » à certaines questions déclenche une alerte.'));
      if (cur === 'V') card.append(h('div', { class: 'notice', style: { marginTop: '10px' } }, icon('fingerprint'), d.reponses['ENT-010'] === 'Oui' ? 'Démonstration : le relevé est simulé. Le lecteur d\'empreintes sera raccordé dans la version définitive.' : 'Relevé impossible : consentement à l\'utilisation des données (ENT-010) non donné.'));
      const form = Form.section(d, codesOf(cur), ctx);
      if (lecture) form.querySelectorAll('input, textarea, button, canvas').forEach((x) => { x.disabled = true; x.style.pointerEvents = 'none'; });
      card.append(form);
      if (cur === 'I' && !consentOk(d)) card.append(h('div', { class: 'notice danger', style: { marginTop: '10px' } }, icon('lock'), 'Sans consentement éclairé (ENT-009 = Oui), l\'entretien ne peut pas se poursuivre.'));
      const prev = idx > 0 ? h('button', { class: 'btn', onclick: () => go(SECT_ORDER[idx - 1]) }, icon('arrow-left'), 'Précédent') : h('span');
      const next = idx < SECT_ORDER.length - 1
        ? h('button', { class: 'btn primary', onclick: () => { if (!consentOk(d)) { UI.toast('Consentement éclairé (ENT-009) requis.', 'lock'); return; } go(SECT_ORDER[idx + 1]); } }, 'Suivant', icon('arrow-right'))
        : (lecture ? h('span') : h('button', { class: 'btn accent', onclick: cloturer }, icon('check-circle-2'), 'Clôturer l\'entretien'));
      body.append(card, h('div', { class: 'wizard-foot' }, prev, next));
      UI.refreshIcons();
    }
    function cloturer() {
      derive();
      const manq = SECT_ORDER.flatMap((s) => A.manquants(d, s).map((q) => ({ s, q })));
      const sansSig = !d.medias.signature;
      if (manq.length || sansSig) {
        UI.modal({ title: 'Entretien incomplet', icon: 'list-checks', body: h('div', { class: 'stack' },
          sansSig ? h('div', { class: 'notice warn' }, icon('pen-line'), 'La signature du migrant (SUI-004) est requise.') : null,
          manq.length ? h('p', { style: { margin: 0 } }, `${manq.length} question(s) obligatoire(s) sans réponse :`) : null,
          h('div', { style: { maxHeight: '300px', overflow: 'auto' } }, manq.slice(0, 60).map(({ s, q }) => h('div', { class: 'row', style: { padding: '4px 0', borderBottom: '1px solid #EEF1F4' } },
            h('span', { class: 'qcode' }, q.code), h('span', { style: { flex: 1 } }, q.label), h('button', { class: 'btn sm', onclick: () => { document.querySelector('.modal-bg').remove(); go(s); setTimeout(() => { const el = document.querySelector(`[data-code="${q.code}"]`); el && el.scrollIntoView({ block: 'center' }); }, 60); } }, 'Aller'))))),
          actions: [{ label: 'Continuer la saisie', cls: 'primary' }, { label: 'Clôturer quand même (démonstration)', onclick: () => valider(true) }] });
        return;
      }
      valider(false);
    }
    function valider(force) {
      d.statut = 'Prêt à synchroniser'; const now = new Date().toISOString();
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Entretien clôturé' + (force ? ' (incomplet, démonstration)' : '') });
      Store.Tablette.save(p.tablette, d);
      UI.toast(Store.Tablette.online(p.tablette) ? 'Entretien clôturé. Il peut être synchronisé.' : 'Entretien clôturé et conservé sur la tablette jusqu\'au retour du réseau.', 'check-circle-2');
      App.go('#/agent');
      UI.modal({ title: 'Enregistrement terminé', icon: 'check-circle-2', body: h('div', { class: 'stack' }, h('p', { style: { margin: 0 } }, 'L\'entretien de ' + ((d.resume.nom || '') + ' ' + (d.resume.prenoms || '')).trim() + ' est clôturé.'),
        h('div', { class: 'notice' }, icon('id-card'), 'Imprimez la fiche unique du migrant : photo, identifiant et code QR au recto, parcours migratoire dessiné au verso. L\'identifiant reste provisoire jusqu\'à la synchronisation.')),
        actions: [{ label: 'Plus tard' }, { label: 'Imprimer la fiche migrant', cls: 'primary', icon: 'printer', onclick: () => Documents.ficheMigrant(d) }] });
    }
    const head = h('div', { class: 'page-head' }, h('div', null,
      h('h1', null, (d.resume.nom || d.resume.prenoms) ? `${d.resume.nom} ${d.resume.prenoms}` : 'Nouvel entretien'),
      h('div', { class: 'row', style: { gap: '8px', marginTop: '4px' } }, h('span', { class: 'idlink' }, d.identifiant || d.identifiantProvisoire), h('span', { class: 'badge solid ' + (STATUT_BADGE[d.statut] || '') }, d.statut), d.arrivee_code ? h('span', { class: 'badge info' }, icon('plane-landing'), 'Arrivée ' + d.arrivee_code) : null, (d.alertes || []).length ? h('span', { class: 'badge solid danger' }, (d.alertes || []).length + ' alerte(s)') : null)),
      h('div', { class: 'row' }, lecture && d.statut !== 'Relayé' ? h('button', { class: 'btn primary', onclick: () => Documents.ficheMigrant(d) }, icon('printer'), 'Imprimer la fiche migrant') : null,
        !lecture && d.arrivee_id ? h('button', { class: 'btn', onclick: () => A.passerRelais(d, p) }, icon('arrow-right-left'), 'Passer le relais') : null,
        h('button', { class: 'btn', onclick: () => App.go('#/agent') }, icon('arrow-left'), 'Entretiens')));
    root.append(h('div', { class: 'page' }, head, netbar(p, () => A.synchroniser(p)),
      d.statut === 'Relayé' ? h('div', { class: 'notice', style: { marginBottom: '14px' } }, icon('arrow-right-left'), 'Relais passé à ' + (d.relais_vers || '') + ' : l\'entretien se poursuit sur la tablette d\'un agent de cette structure. Consultation seule.')
        : lecture ? h('div', { class: 'notice ok', style: { marginBottom: '14px' } }, icon('lock'), 'Entretien clôturé : consultation seule. Les compléments se font ensuite sur le portail.') : null,
      (d.contributions || []).length ? h('div', { class: 'notice', style: { marginBottom: '14px' } }, icon('users'), 'Entretien à plusieurs mains : ' + d.contributions.map((c) => c.structure + ' (' + c.agent + ') sections ' + c.sections.join(', ')).join(' ; ') + '.') : null,
      h('div', { class: 'wizard' }, stepsEl, body)));
    paintSteps(); paintBody();
  };

  /* ---------- Synchronisation : attribution de l'identifiant national, création des référencements et des alertes ---------- */
  A.synchroniser = async function (p) {
    const prets = Store.Tablette.list(p.tablette).filter((d) => d.statut === 'Prêt à synchroniser');
    if (!prets.length) return;
    const db = Store.db; let ok = 0;
    try {
      for (const d of prets) {
        const now = new Date().toISOString();
        const n = await db.nextNumero(); d.identifiant = Domaine.identifiant(new Date().getFullYear(), n);
        d.statut = 'Synchronisé'; d.synced_at = now; d.updated_at = now;
        if ((d.contributions || []).length) { const deja = new Set(d.contributions.flatMap((c) => c.sections)); d.contributions.push({ structure: p.structure, agent: p.nom, tablette: p.tablette, sections: SECT_ORDER.filter((x) => !deja.has(x)), date: now }); }
        d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Synchronisation : identifiant national ' + d.identifiant + ' attribué' });
        if ((d.doublonsSignales || []).length) d.historique.push({ date: now, par: 'Plateforme', structure: '', action: 'Doublon possible signalé au superviseur : ' + d.doublonsSignales.map((x) => x.identifiant + ' (' + x.score + ')').join(', ') });
        const central = { ...d }; delete central.referencementsProposes; delete central.alertes; delete central._derniere;
        await db.upsertDossier(central);
        for (const a of d.alertes || []) await db.upsert('alertes', { id: a.id, dossier_id: d.id, identifiant: d.identifiant, regle: a.regle, titre: a.titre, gravite: a.gravite, notifie: a.notifie, delai: a.delai, conduite: a.conduite, emetteur: p.structure, created_at: now, statut: 'Ouverte', pris_par: null });
        for (const x of (d.referencementsProposes || []).filter((y) => y.destinataire)) {
          const t = M.TYPES_SERVICE.find((y) => y.code === x.type_service) || M.TYPES_SERVICE[5];
          await db.upsert('referencements', { id: x.id, dossier_id: d.id, identifiant: d.identifiant, beneficiaire: d.resume.nom + ' ' + d.resume.prenoms, emetteur: p.structure, destinataire: x.destinataire, type_service: t.code,
            motif: x.motif || '', statut: 'Émis', created_at: now, echeance_reception: new Date(Date.now() + t.reception * 3600000).toISOString(), historique: [{ date: now, statut: 'Émis', par: p.structure }] });
        }
        if (d.arrivee_id) { try { await Sites.majPassager(d.arrivee_id, d.passager_id, { statut: 'Enregistré', dossier_id: d.id, identifiant: d.identifiant, agent: p.nom, structure: p.structure, site_id: d.site_id, nom: d.resume.nom, prenoms: d.resume.prenoms, sexe: d.resume.sexe }, p); } catch (e) { console.warn('Arrivée', e); } }
        await Taches.apresSynchro(d, p);
        if ((d.doublonsSignales || []).length) await db.upsert('doublons', { id: UI.uuid(), dossier_id: d.id, identifiant: d.identifiant, candidats: d.doublonsSignales, statut: 'À examiner', created_at: now });
        Store.Tablette.save(p.tablette, d);
        await Store.audit('Synchronisation', d.identifiant, 'Depuis la tablette ' + p.tablette);
        ok++;
      }
      UI.toast(`${ok} entretien(s) synchronisé(s) avec la base centrale.`, 'cloud-upload');
    } catch (e) { console.error(e); UI.toast('Échec de la synchronisation : ' + (e.message || e), 'alert-triangle'); }
    App.render();
  };
  /* ---------- Prise de relais : une structure commence l'entretien, une autre le poursuit sur le même migrant ---------- */
  const sectionsFaites = (d) => SECT_ORDER.filter((s) => codesOf(s).some((c) => d.reponses[c] !== undefined && Domaine.Q[c].widget !== 'auto') && !A.manquants(d, s).length);
  A.passerRelais = function (d, p) {
    if (!Store.Tablette.online(p.tablette)) { UI.toast('Le relais nécessite le réseau : la suite de l\'entretien doit être disponible pour l\'autre structure.', 'wifi-off'); return; }
    if (d.reponses['ENT-009'] !== 'Oui') { UI.toast('Consentement éclairé (ENT-009) requis avant de passer le relais.', 'lock'); return; }
    const faites = sectionsFaites(d); const x = { vers: p.structure === 'DGIE' ? 'OIM' : 'DGIE' };
    const note = h('textarea', { class: 'textarea', placeholder: 'Ex. : identification faite, reste le parcours et la vulnérabilité' });
    UI.modal({ title: 'Passer le relais', icon: 'arrow-right-left', body: h('div', { class: 'stack' },
      h('div', { class: 'notice' }, icon('info'), 'L\'entretien quitte votre tablette et rejoint la file d\'attente de l\'arrivée avec le statut « Relais ». Un agent de la structure choisie le reprend en un clic depuis « Nouvel entretien » et poursuit sur le même dossier, sans ressaisie. Chaque section garde la trace de qui l\'a renseignée.'),
      h('div', null, h('label', { class: 'q' }, 'Sections terminées par vous'), h('div', { class: 'row', style: { gap: '6px' } }, faites.length ? faites.map((s) => h('span', { class: 'badge ok' }, s + ' — ' + M.SECTIONS[s])) : h('span', { class: 'small muted' }, 'Aucune section complète.'))),
      h('div', null, h('label', { class: 'q' }, 'Structure qui prend la main'), UI.dropdown({ items: M.structures.filter((s2) => s2.code !== p.structure && (Admin.structures || []).some((c) => c.code === s2.code && c.enrolement)).map((s2) => ({ value: s2.code, label: s2.code + ' — ' + s2.nom })), value: x.vers, onChange: (v) => { x.vers = v; } }).el),
      h('div', null, h('label', { class: 'q' }, 'Consigne pour l\'agent suivant (facultatif)'), note)),
    actions: [{ label: 'Annuler' }, { label: 'Passer le relais', cls: 'primary', icon: 'send', onclick: async () => {
      const now = new Date().toISOString();
      d.contributions = (d.contributions || []).concat([{ structure: p.structure, agent: p.nom, tablette: p.tablette, sections: faites, date: now }]);
      d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Relais passé à ' + x.vers + ' (sections ' + (faites.join(', ') || 'aucune') + ' renseignées)' + (note.value.trim() ? ' : ' + note.value.trim() : '') });
      const copie = JSON.parse(JSON.stringify(d)); delete copie._derniere;
      try {
        await Store.db.upsert('relais', { id: d.id, dossier: copie, nom: ((d.resume.nom || '') + ' ' + (d.resume.prenoms || '')).trim() || d.identifiantProvisoire, de: p.structure, de_agent: p.nom, de_tablette: p.tablette, vers: x.vers, sections: faites, note: note.value.trim(), arrivee_id: d.arrivee_id, passager_id: d.passager_id, statut: 'En attente', created_at: now });
        await Sites.majPassager(d.arrivee_id, d.passager_id, { statut: 'Relais', relais: { de: p.structure, vers: x.vers, sections: faites, agent: p.nom, date: now }, agent: null, structure: null, nom: d.resume.nom, prenoms: d.resume.prenoms }, p);
        await Store.audit('Relais d\'entretien', d.identifiantProvisoire, p.structure + ' → ' + x.vers);
      } catch (e) { console.error(e); UI.toast('Relais impossible : ' + e.message, 'alert-triangle'); return false; }
      d.statut = 'Relayé'; d.relais_vers = x.vers; Store.Tablette.save(p.tablette, d);
      UI.toast('Relais transmis à ' + x.vers + ' : le migrant apparaît dans la file d\'attente.', 'arrow-right-left'); App.go('#/agent');
    } }] }).el.style.maxWidth = '720px';
  };
  A.reprendreRelais = async function (p, { arrivee: a, relais: rl, site }) {
    const frais = (await Store.db.list('relais')).find((x) => x.id === rl.id);
    if (!frais || frais.statut !== 'En attente') { UI.toast('Ce relais a déjà été repris par un autre agent.', 'info'); return; }
    const now = new Date().toISOString(); const d = JSON.parse(JSON.stringify(frais.dossier));
    const n = Store.Tablette.seq(p.tablette);
    Object.assign(d, { statut: 'Brouillon', structure: p.structure, agent: p.nom, tablette: p.tablette, site: site ? site.nom : d.site, identifiantProvisoire: `TMP-${p.tablette}-${String(n).padStart(4, '0')}`, updated_at: now, relais_de: frais.de });
    d.reponses['ENT-003'] = p.nom; d.reponses['ENT-005'] = p.structure;
    d.historique.push({ date: now, par: p.nom, structure: p.structure, action: 'Reprise du relais de ' + frais.de + ' (' + frais.de_agent + ') sur la tablette ' + p.tablette + ' : sections ' + frais.sections.join(', ') + ' déjà renseignées' });
    d._derniere = SECT_ORDER.find((s) => !frais.sections.includes(s)) || 'I';
    Domaine.calculs(d, p); Store.Tablette.save(p.tablette, d);
    frais.statut = 'Repris'; frais.repris_par = p.nom + ' (' + p.structure + ')'; frais.repris_le = now; await Store.db.upsert('relais', frais);
    await Sites.majPassager(a.id, d.passager_id, { statut: 'En entretien', agent: p.nom, structure: p.structure, appel: now }, p);
    await Store.audit('Reprise de relais', d.identifiantProvisoire, frais.de + ' → ' + p.structure);
    UI.toast('Vous avez la main : l\'entretien reprend à la section ' + d._derniere + '.', 'hand'); App.go('#/agent/e/' + d.id);
  };
  /* Annonces et arrivées sur la tablette : lues en ligne, conservées pour la consultation hors connexion */
  A.annoncesTablette = async function (p) {
    const k = 'r360.tablette.annonces.' + p.tablette;
    if (Store.Tablette.online(p.tablette)) { try { const annonces = await Store.db.list('annonces'); const arrivees = await Store.db.list('arrivees'); Store.LS.set(k, annonces); Store.LS.set('r360.tablette.arrivees.' + p.tablette, arrivees); return { annonces, arrivees }; } catch (e) { /* lecture locale */ } }
    return { annonces: Store.LS.get(k, []), arrivees: Store.LS.get('r360.tablette.arrivees.' + p.tablette, []) };
  };
  window.Agent = A;
})();
