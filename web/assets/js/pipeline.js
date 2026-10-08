/* Pipeline du parcours : où en est chaque migrant, et quelle structure tient son dossier.
   Lecture seule — la vue ne décide rien, elle rend visible ce que les autres écrans produisent.
   Les colonnes viennent de Domaine.PHASES, la position d'un dossier de Domaine.etape(). */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const P = {};
  const STRUCT = (c) => (M.structures.find((s) => s.code === c) || {}).nom || c;
  /* Au-delà de ces durées, une attente devient un retard visible. En jours. */
  const SEUILS = { identification: 1, enregistrement: 2, orientation: 3, prise_en_charge: 7, suivi: 30 };

  const jours = (iso) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso)) / 86400000)) : null);

  /* Construit la liste des dossiers en cours, relais en attente compris.
     Un relais en attente ne figure pas dans la base des dossiers : il vit dans sa propre table,
     avec une copie du dossier. Sans lui, la colonne de la structure suivante resterait vide. */
  function elements(p, data) {
    const out = [];
    const lisible = Domaine.droits(p, 'II').includes('L');
    const nom = (d) => (lisible ? `${(d.resume || {}).nom || ''} ${(d.resume || {}).prenoms || ''}`.trim() : null);

    (data.relais || []).filter((r) => r.statut === 'En attente').forEach((r) => {
      const d = r.dossier || {};
      const avance = (r.sections || []).length;
      out.push({
        cle: 'relais-' + r.id, id: null, d,
        nom: lisible ? (r.nom || null) : null,
        ref: d.identifiantProvisoire || r.id.slice(0, 8),
        phase: Domaine.phase(avance >= 4 ? 'enregistrement' : 'identification'),
        chez: r.vers, de: r.de, attente: true, depuis: r.created_at || r.date,
        faites: r.sections || [],
      });
    });

    (data.acces || []).forEach(({ d }) => {
      if (d.statut === 'Relayé') return; // il est déjà listé côté relais en attente
      const e = Domaine.etape(d, { refs: data.refs, relais: data.relais });
      out.push({
        cle: d.id, id: d.id, d,
        nom: nom(d),
        ref: d.identifiant || d.identifiantProvisoire || '—',
        phase: e.phase, chez: e.chez, de: e.de, attente: !!e.attente, fini: !!e.fini, depuis: e.depuis,
        faites: d.sections_faites || [],
      });
    });
    return out;
  }

  /* Carte d'un migrant dans une colonne */
  function carte(x, p) {
    const j = jours(x.depuis);
    const retard = j !== null && j > (SEUILS[x.phase.id] || 7) && !x.fini;
    const pct = x.d && x.d.reponses ? Math.round(Agent.progression(x.d)) : null;
    const corps = h('div', { class: 'pp-card' + (retard ? ' retard' : '') },
      h('div', { class: 'pp-haut' },
        h('span', { class: 'av ticon ' + x.phase.ton }, UI.initials(x.nom || x.ref)),
        h('div', { class: 'grow', style: { minWidth: 0 } },
          h('div', { class: 'pp-nom' }, x.nom || h('span', { class: 'masked' }, '••••••')),
          h('div', { class: 'pp-ref' }, x.ref))),
      h('div', { class: 'pp-chez' },
        Admin.logo(x.chez, 18),
        h('span', { class: 'grow', title: STRUCT(x.chez) }, x.attente ? 'attend chez ' + x.chez : 'chez ' + x.chez),
        j === null ? null : h('span', { class: 'pp-delai' + (retard ? ' retard' : '') },
          retard ? icon('triangle-alert') : null, j === 0 ? "aujourd'hui" : j + ' j')),
      x.de && x.attente ? h('div', { class: 'pp-de' }, icon('arrow-right'), 'transmis par ' + x.de) : null,
      pct === null ? null : h('div', { class: 'pp-jauge', title: 'Formulaire rempli à ' + pct + ' %' },
        h('span', { style: { width: pct + '%' } })));
    return x.id ? h('a', { class: 'pp-lien', href: '#/portail/dossier/' + x.id }, corps) : corps;
  }

  P.page = function (c, data) {
    const p = App.profil;
    const tous = elements(p, data);
    const etat = P.etat || (P.etat = { filtre: 'cours' });
    const zone = h('div', { class: 'pp-zone' });

    const peindre = () => {
      /* Par défaut on ne montre que le travail en cours : une colonne « Suivi » remplie de
         dossiers clôturés masquerait ce qui attend réellement quelqu'un. */
      const rows = etat.filtre === 'moi' ? tous.filter((x) => x.chez === p.structure && !x.fini)
        : etat.filtre === 'tout' ? tous
        : tous.filter((x) => !x.fini);
      zone.replaceChildren();
      Domaine.PHASES.forEach((ph) => {
        const dedans = rows.filter((x) => x.phase.id === ph.id);
        const enRetard = dedans.filter((x) => { const j = jours(x.depuis); return j !== null && j > (SEUILS[ph.id] || 7) && !x.fini; }).length;
        zone.append(h('section', { class: 'pp-col' },
          h('header', { class: 'pp-tete' },
            h('span', { class: 'ticon ' + ph.ton }, icon(ph.ic)),
            h('div', { class: 'grow', style: { minWidth: 0 } },
              h('div', { class: 'pp-titre' }, ph.label),
              h('div', { class: 'pp-sous' }, ph.n + ' / ' + Domaine.PHASES.length)),
            h('span', { class: 'pp-compte' }, dedans.length),
            UI.aide(ph.desc + (ph.porteurs.length ? ' Portée par : ' + ph.porteurs.join(', ') + '.' : ' Portée par la structure référencée.')
              + ' Un dossier passe en retard au-delà de ' + (SEUILS[ph.id] || 7) + ' jour(s) dans cette phase.')),
          enRetard ? h('div', { class: 'pp-alerte' }, icon('triangle-alert'), enRetard + ' en retard') : null,
          h('div', { class: 'pp-liste' }, dedans.length
            ? dedans.sort((a, b) => (a.depuis || '').localeCompare(b.depuis || '')).map((x) => carte(x, p))
            : h('div', { class: 'pp-vide' }, icon(ph.ic), h('div', null, 'Rien dans cette phase')))));
      });
      UI.refreshIcons();
    };

    const filtres = h('div', { class: 'periods' }, [['cours', 'En cours'], ['moi', 'Ce qui attend ' + p.structure], ['tout', 'Clôturés compris']].map(([k, l]) =>
      h('button', { class: k === etat.filtre ? 'on' : '', onclick: (e) => { etat.filtre = k; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); peindre(); } }, l)));

    const enAttente = tous.filter((x) => x.attente).length;
    const clos = tous.filter((x) => x.fini).length;
    c.append(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'Pipeline du parcours'),
        h('p', { class: 'sub' }, (tous.length - clos) + ' dossier(s) en cours, dont ' + enAttente + ' en attente d\'une autre structure'
          + (clos ? ' — ' + clos + ' dossier(s) clôturé(s) masqué(s)' : '') + '. Une colonne par phase, de l\'identification à la clôture.')),
      h('div', { class: 'row' }, filtres,
        Export.menu({ compact: true, titre: 'Pipeline du parcours', fichier: 'pipeline',
          lignes: () => [['Migrant', 'Identifiant', 'Phase', 'Structure', 'En attente', 'Depuis (j)'],
            ...tous.map((x) => [x.nom || '—', x.ref, x.phase.label, x.chez, x.attente ? 'Oui' : 'Non', jours(x.depuis)])],
          noeud: () => zone, pdfImage: false }))));
    c.append(zone);
    peindre();
  };

  window.Pipeline = P;
})();
