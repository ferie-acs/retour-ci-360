/* Statistiques : recherche multicritère, catalogue d'indicateurs (OIM, DTM, ODD, Pacte mondial, indicateurs nationaux) et graphiques */
(function () {
  const { h, icon } = UI; const M = window.METIER;
  const S = { etat: null };
  const pays = (n) => (REF.pays.find((x) => x.n === n) || {}).f || '';
  const XOF = { XOF: 1, EUR: 655.957, USD: 600, MAD: 60, TND: 195, DZD: 4.5, LYD: 125, GBP: 770 };
  const enXOF = (m) => (m && m.montant && XOF[m.devise] ? +m.montant * XOF[m.devise] : null);
  const TRANCHES = ['0-14 ans', '15-17 ans', '18-24 ans', '25-34 ans', '35-44 ans', '45-59 ans', '60 ans et plus'];
  const tranche = (a) => (a === null || a === undefined || a === '' ? null : a < 15 ? TRANCHES[0] : a < 18 ? TRANCHES[1] : a < 25 ? TRANCHES[2] : a < 35 ? TRANCHES[3] : a < 45 ? TRANCHES[4] : a < 60 ? TRANCHES[5] : TRANCHES[6]);
  const mois = (d) => { const x = d.reponses['IDT-019'] || d.created_at; return x ? x.slice(0, 7) : null; };
  const libMois = (k) => { const [a, m] = k.split('-'); return new Date(+a, +m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', ''); };
  const transit = (d) => { const p = (d.itineraire && d.itineraire.pays) || []; return p.slice(0, -1).map((x) => x.nom); };
  const oui = (v) => v === 'Oui';
  const multi = (code) => (d) => d.reponses[code] || [];
  const val = (code) => (d) => d.reponses[code];
  const absence = (d) => { const r = d.reponses; if (!r['PAR-001'] || !r['IDT-019']) return null; return (new Date(r['IDT-019']) - new Date(r['PAR-001'] + '-01')) / (30.44 * 86400000); };
  const dist = (a, b) => { const R = 6371, k = Math.PI / 180; const x = Math.sin(((b[0] - a[0]) * k) / 2) ** 2 + Math.cos(a[0] * k) * Math.cos(b[0] * k) * Math.sin(((b[1] - a[1]) * k) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const km = (d) => { if (!d.itineraire) return null; const e = Form.etapes(d.itineraire); return e.length > 1 ? e.reduce((s2, x, i) => (i ? s2 + dist(e[i - 1].ll, x.ll) : 0), 0) : null; };
  const exploitations = (d) => { const r = d.reponses; return [['VUL-018', 'Exploitation sexuelle'], ['VUL-019', 'Exploitation économique'], ['VUL-020', 'Exploitation domestique'], ['VUL-021', 'Travail forcé'], ['VUL-022', 'Servitude domestique'], ['VUL-023', 'Mendicité forcée'], ['VUL-024', 'Autres formes']].filter(([c]) => oui(r[c])).map(([, l]) => l); };
  const violences = (d) => { const r = d.reponses; return [['VUL-014', 'Violences physiques'], ['VUL-015', 'Violences verbales'], ['VUL-016', 'Menaces'], ['VUL-017', 'Autres violences']].filter(([c]) => oui(r[c])).map(([, l]) => l); };
  const vulnerabilites = (d) => { const r = d.reponses, f = d.drapeaux || {}; return [[f.mna, 'Mineur non accompagné'], [f.traite, 'Traite présumée'], [f.sante_mentale, 'Santé mentale (alerte)'], [oui(r['VUL-001']), 'Handicap'], [oui(r['VUL-002']), 'Maladie'],
    [r['VUL-004'] === 'Oui', 'Femme enceinte'], [r['VUL-005'] === 'Oui', 'Femme allaitante'], [oui(r['VUL-007']), 'Grande précarité économique'], [oui(r['VUL-010']), 'Documents confisqués'], [r['VUL-006'] === 'Oui', 'Personne âgée']].filter(([x]) => x).map(([, l]) => l); };
  const souffrance = (d) => ['SAN-013', 'SAN-014', 'SAN-015', 'SAN-016', 'SAN-017', 'SAN-018'].filter((c) => oui(d.reponses[c])).length;

  /* ---------- Dimensions : critères de filtre et de ventilation ---------- */
  const DIM = {
    sexe: { l: 'Sexe', f: (d) => d.resume.sexe },
    age: { l: 'Tranche d\'âge', f: (d) => tranche(d.resume.age), ordre: TRANCHES },
    categorie: { l: 'Catégorie', f: (d) => (d.resume.categorie || '').split(' (')[0] || null },
    provenance: { l: 'Pays de provenance', f: (d) => d.resume.provenance || null, s: 'IV' },
    transit: { l: 'Pays de transit', f: transit, multi: true, s: 'VIII' },
    region: { l: 'Région de retour', f: (d) => d.resume.region_retour || null, s: 'IV' },
    structure: { l: 'Structure d\'enrôlement', f: (d) => d.structure },
    mode: { l: 'Mode de retour', f: val('IDT-016') },
    type: { l: 'Type de retour', f: val('IDT-017') },
    organisme: { l: 'Organisme ayant facilité le retour', f: multi('IDT-018'), multi: true },
    mois: { l: 'Mois de retour', f: mois, temps: true },
    education: { l: 'Niveau d\'étude', f: val('EDU-001'), s: 'VI' },
    motif: { l: 'Motif de départ', f: multi('PAR-006'), multi: true, s: 'VIII' },
    passeur: { l: 'Recours à un passeur', f: val('PAR-024'), s: 'VIII' },
    vulnerabilite: { l: 'Vulnérabilité', f: vulnerabilites, multi: true, s: 'IX' },
    niveau: { l: 'Niveau de vulnérabilité évalué', f: val('ORI-003'), s: 'XIV', ordre: ['Faible', 'Modéré', 'Élevé', 'Critique'] },
  };
  const FILTRES = ['sexe', 'age', 'categorie', 'provenance', 'transit', 'region', 'structure', 'mode', 'type', 'education', 'motif', 'passeur', 'vulnerabilite', 'niveau'];
  const VENTIL = ['sexe', 'age', 'categorie', 'region', 'provenance', 'structure', 'mode', 'type', 'mois'];

  /* ---------- Catalogue d'indicateurs ----------
     t : repartition (distribution d'une variable), taux (part des dossiers vérifiant une condition), moyenne, evolution (série mensuelle)
     src : référentiel ; s : section du dossier requise (droit de lecture) ; off : indicateur à collecter (non calculable avec le formulaire V1) */
  const R = { OIM: 'OIM — Retour et réintégration (Key Highlights)', RSS: 'OIM — Enquête de durabilité de la réintégration (RSS)', DTM: 'OIM — Matrice de suivi des déplacements (DTM, suivi des flux)', ODD: 'Objectifs de développement durable (ODD 10.7, 16.2)', PMM: 'Pacte mondial pour les migrations (objectif 21)', CTDC: 'Lutte contre la traite (CTDC, Protocole de Palerme)', DGIE: 'Indicateurs nationaux et de pilotage (DGIE)' };
  const IND = [
    // Volume et profil
    { id: 'vol', g: 'Volume et profil des migrants de retour', l: 'Nombre de migrants de retour enregistrés', t: 'evolution', src: [R.OIM, R.DGIE], def: 'Nombre de migrants dont l\'enregistrement est terminé, par mois de retour.' },
    { id: 'sexe', g: 'Volume et profil des migrants de retour', l: 'Répartition par sexe', t: 'repartition', dim: 'sexe', src: [R.OIM, R.ODD], def: 'Ventilation obligatoire de tout indicateur ODD relatif aux migrations.' },
    { id: 'age', g: 'Volume et profil des migrants de retour', l: 'Répartition par tranche d\'âge (pyramide des âges)', t: 'pyramide', src: [R.OIM, R.ODD], def: 'Structure par âge et par sexe des migrants de retour.' },
    { id: 'mineurs', g: 'Volume et profil des migrants de retour', l: 'Proportion de mineurs parmi les migrants de retour', t: 'taux', num: (d) => d.drapeaux && d.drapeaux.mineur, src: [R.OIM], def: 'Part des migrants de moins de 18 ans.' },
    { id: 'provenance', g: 'Volume et profil des migrants de retour', l: 'Pays de provenance (pays d\'accueil ou de transit au moment du retour)', t: 'repartition', dim: 'provenance', s: 'IV', src: [R.OIM, R.DTM], def: 'Pays d\'où le migrant est revenu en Côte d\'Ivoire.' },
    { id: 'region', g: 'Volume et profil des migrants de retour', l: 'Région de retour en Côte d\'Ivoire', t: 'repartition', dim: 'region', s: 'IV', src: [R.OIM, R.DGIE], def: 'Région de la localité de retour déclarée.' },
    { id: 'mode', g: 'Volume et profil des migrants de retour', l: 'Retours volontaires assistés et retours forcés', t: 'repartition', dim: 'mode', src: [R.OIM, R.PMM], def: 'Répartition selon le mode de retour.' },
    { id: 'type', g: 'Volume et profil des migrants de retour', l: 'Moyen de retour (vol commercial, vol affrété, voie terrestre)', t: 'repartition', dim: 'type', src: [R.OIM] },
    { id: 'organisme', g: 'Volume et profil des migrants de retour', l: 'Organisme ayant facilité le retour', t: 'repartition', dim: 'organisme', src: [R.OIM, R.DGIE] },
    // Parcours migratoire
    { id: 'motif', g: 'Parcours migratoire', l: 'Motifs de départ', t: 'repartition', dim: 'motif', s: 'VIII', src: [R.DTM], def: 'Raisons déclarées du départ de Côte d\'Ivoire (plusieurs réponses possibles).' },
    { id: 'transit', g: 'Parcours migratoire', l: 'Pays de transit', t: 'repartition', dim: 'transit', s: 'VIII', src: [R.DTM], def: 'Pays traversés avant le pays de provenance.' },
    { id: 'destnon', g: 'Parcours migratoire', l: 'Proportion de migrants n\'ayant pas atteint la destination envisagée', t: 'taux', s: 'VIII', den: (d) => d.reponses['PAR-034'] && d.reponses['PAR-035'], num: (d) => d.reponses['PAR-034'] !== d.reponses['PAR-035'], src: [R.DTM] },
    { id: 'destination', g: 'Parcours migratoire', l: 'Destination finale envisagée', t: 'repartition', dim: null, f: val('PAR-034'), s: 'VIII', src: [R.DTM] },
    { id: 'duree', g: 'Parcours migratoire', l: 'Durée moyenne d\'absence (mois)', t: 'moyenne', v: absence, unite: ' mois', s: 'VIII', src: [R.DTM, R.DGIE], def: 'Du mois de départ (PAR-001) à la date de retour (IDT-019).' },
    { id: 'distance', g: 'Parcours migratoire', l: 'Distance moyenne parcourue (km)', t: 'moyenne', v: km, unite: ' km', s: 'VIII', src: [R.DGIE], def: 'Somme des distances entre les villes déclarées de l\'itinéraire.' },
    { id: 'cout', g: 'Parcours migratoire', l: 'Coût moyen du voyage (francs CFA)', t: 'moyenne', v: (d) => enXOF(d.reponses['PAR-011']), unite: ' FCFA', s: 'VIII', src: [R.DTM], def: 'Montants déclarés convertis en francs CFA.' },
    { id: 'coutrevenu', g: 'Parcours migratoire', l: 'Coût du voyage rapporté au revenu mensuel avant le départ (en mois de revenu)', t: 'moyenne', v: (d) => { const c = enXOF(d.reponses['PAR-011']), r = enXOF(d.reponses['PRO-009']); return c && r ? c / r : null; }, unite: ' mois', s: 'VIII', src: [R.ODD], def: 'Approche de l\'ODD 10.7.1 (coût du recrutement supporté par le travailleur rapporté à son revenu).' },
    { id: 'financement', g: 'Parcours migratoire', l: 'Sources de financement du voyage', t: 'repartition', f: multi('PAR-012'), multi: true, s: 'VIII', src: [R.DTM] },
    { id: 'dette', g: 'Parcours migratoire', l: 'Proportion de migrants endettés à cause du voyage', t: 'taux', num: (d) => oui(d.reponses['PAR-013']), den: (d) => d.reponses['PAR-013'], s: 'VIII', src: [R.DTM, R.RSS] },
    { id: 'passeur', g: 'Parcours migratoire', l: 'Recours à un passeur', t: 'taux', num: (d) => oui(d.reponses['PAR-024']), den: (d) => d.reponses['PAR-024'], s: 'VIII', src: [R.DTM, R.PMM], def: 'Indicateur de trafic illicite de migrants.' },
    { id: 'transport', g: 'Parcours migratoire', l: 'Moyens de transport utilisés', t: 'repartition', f: multi('PAR-022'), multi: true, s: 'VIII', src: [R.DTM] },
    { id: 'sansdoc', g: 'Parcours migratoire', l: 'Voyages effectués sans document de voyage', t: 'taux', num: (d) => (d.reponses['PAR-020'] || []).includes('Aucun document'), den: (d) => (d.reponses['PAR-020'] || []).length, s: 'VIII', src: [R.DTM, R.PMM] },
    // Vulnérabilités et protection
    { id: 'vulntaux', g: 'Vulnérabilités et protection', l: 'Proportion de migrants en situation de vulnérabilité', t: 'taux', num: (d) => vulnerabilites(d).length > 0, s: 'IX', src: [R.OIM], def: 'Au moins une vulnérabilité déclarée ou détectée.' },
    { id: 'vulntypes', g: 'Vulnérabilités et protection', l: 'Types de vulnérabilité', t: 'repartition', dim: 'vulnerabilite', s: 'IX', src: [R.OIM] },
    { id: 'traite', g: 'Vulnérabilités et protection', l: 'Victimes présumées de traite des personnes (par sexe et âge)', t: 'taux', num: (d) => d.drapeaux && d.drapeaux.traite, s: 'IX', src: [R.ODD, R.CTDC], def: 'ODD 16.2.2 : victimes de la traite par sexe, âge et forme d\'exploitation.', ventil: 'sexe' },
    { id: 'exploitation', g: 'Vulnérabilités et protection', l: 'Formes d\'exploitation subies', t: 'repartition', f: exploitations, multi: true, s: 'IX', src: [R.CTDC, R.ODD] },
    { id: 'violences', g: 'Vulnérabilités et protection', l: 'Violences subies pendant le parcours', t: 'repartition', f: violences, multi: true, s: 'IX', src: [R.DTM, R.OIM] },
    { id: 'confisques', g: 'Vulnérabilités et protection', l: 'Documents confisqués', t: 'taux', num: (d) => oui(d.reponses['VUL-010']), den: (d) => d.reponses['VUL-010'], s: 'IX', src: [R.CTDC] },
    { id: 'promesse', g: 'Vulnérabilités et protection', l: 'Promesse de départ non tenue (recrutement trompeur)', t: 'taux', num: (d) => ['Non', 'Partiellement'].includes(d.reponses['PAR-018']), den: (d) => oui(d.reponses['PAR-016']), s: 'VIII', src: [R.CTDC], def: 'Parmi les migrants partis sur la foi d\'une promesse.' },
    { id: 'mna', g: 'Vulnérabilités et protection', l: 'Mineurs non accompagnés ou séparés', t: 'taux', num: (d) => d.drapeaux && d.drapeaux.mna, den: (d) => d.drapeaux && d.drapeaux.mineur, s: 'IX', src: [R.OIM, R.PMM] },
    { id: 'niveau', g: 'Vulnérabilités et protection', l: 'Niveau de vulnérabilité évalué', t: 'repartition', dim: 'niveau', s: 'XIV', src: [R.DGIE] },
    // Santé et bien-être
    { id: 'medical', g: 'Santé et bien-être (dimension psychosociale)', l: 'Besoin d\'assistance médicale', t: 'taux', num: (d) => oui(d.reponses['SAN-004']), s: 'X', src: [R.OIM, R.RSS] },
    { id: 'detresse', g: 'Santé et bien-être (dimension psychosociale)', l: 'Détresse psychosociale', t: 'taux', num: (d) => oui(d.reponses['SAN-011']), den: (d) => d.reponses['SAN-011'], s: 'X', src: [R.RSS] },
    { id: 'souffrance', g: 'Santé et bien-être (dimension psychosociale)', l: 'Signes de souffrance psychologique (nombre moyen sur 6)', t: 'moyenne', v: souffrance, unite: '', s: 'X', src: [R.RSS], def: 'Nervosité, désespoir, agitation, dépression, effort constant, sentiment d\'inutilité.' },
    { id: 'alertes', g: 'Santé et bien-être (dimension psychosociale)', l: 'Alertes de santé mentale (idées suicidaires, automutilation, hallucinations)', t: 'taux', num: (d) => d.drapeaux && d.drapeaux.sante_mentale, s: 'X', src: [R.DGIE] },
    // Réintégration
    { id: 'education', g: 'Réintégration (dimensions économique et sociale)', l: 'Niveau d\'étude', t: 'repartition', dim: 'education', s: 'VI', src: [R.DTM, R.RSS] },
    { id: 'emploi', g: 'Réintégration (dimensions économique et sociale)', l: 'Emploi avant le départ', t: 'taux', num: (d) => oui(d.reponses['PRO-001']), den: (d) => d.reponses['PRO-001'], s: 'VII', src: [R.DTM, R.RSS] },
    { id: 'secteur', g: 'Réintégration (dimensions économique et sociale)', l: 'Secteur d\'activité souhaité au retour', t: 'repartition', f: val('PER-010'), s: 'XI', src: [R.RSS, R.DGIE] },
    { id: 'besoins', g: 'Réintégration (dimensions économique et sociale)', l: 'Besoins immédiats exprimés', t: 'repartition', f: multi('BIM-001'), multi: true, s: 'XII', src: [R.OIM] },
    { id: 'orientation', g: 'Réintégration (dimensions économique et sociale)', l: 'Orientation recommandée', t: 'repartition', f: multi('ORI-004'), multi: true, s: 'XIV', src: [R.OIM, R.PMM], def: 'Assistance économique, sociale ou psychosociale envisagée.' },
    { id: 'piece', g: 'Réintégration (dimensions économique et sociale)', l: 'Possession d\'un document d\'identité', t: 'taux', num: (d) => oui(d.reponses['RES-014']), den: (d) => d.reponses['RES-014'], s: 'IV', src: [R.RSS], def: 'Dimension sociale de la RSS : accès aux documents.' },
    { id: 'logement', g: 'Réintégration (dimensions économique et sociale)', l: 'Situation de logement au retour', t: 'repartition', f: multi('RES-008'), multi: true, s: 'IV', src: [R.RSS] },
    { id: 'remigrer', g: 'Réintégration (dimensions économique et sociale)', l: 'Intention de repartir dans le pays de migration', t: 'repartition', f: val('PER-004'), s: 'XI', src: [R.RSS], def: 'Dimension psychosociale de la RSS : capacité à rester dans le pays.' },
    { id: 'assistance', g: 'Réintégration (dimensions économique et sociale)', l: 'Assistance fournie à l\'arrivée', t: 'repartition', f: multi('SUI-001'), multi: true, s: 'XV', src: [R.OIM] },
    // Pilotage des services
    { id: 'refdest', g: 'Pilotage des services et des structures', l: 'Référencements par structure destinataire', t: 'refs', f: (r) => r.destinataire, src: [R.DGIE] },
    { id: 'refstatut', g: 'Pilotage des services et des structures', l: 'Statut des référencements', t: 'refs', f: (r) => r.statut, src: [R.DGIE] },
    { id: 'refdelai', g: 'Pilotage des services et des structures', l: 'Délai moyen de réception des référencements (heures)', t: 'refdelai', src: [R.DGIE] },
    { id: 'completude', g: 'Pilotage des services et des structures', l: 'Complétude moyenne des dossiers (%)', t: 'moyenne', v: (d) => Agent.progression(d), unite: ' %', src: [R.DGIE] },
    { id: 'suivi', g: 'Pilotage des services et des structures', l: 'Niveau de suivi requis', t: 'repartition', f: val('SUI-002'), s: 'XV', src: [R.DGIE] },
    // À collecter
    { id: 'rss', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Indice composite de durabilité de la réintégration (score RSS global)', off: 'Nécessite l\'enquête de suivi RSS (32 questions) à 3, 6 et 12 mois après le retour.', src: [R.RSS] },
    { id: 'rssdim', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Scores RSS par dimension : économique, sociale, psychosociale', off: 'Même enquête de suivi ; scores pondérés par dimension.', src: [R.RSS] },
    { id: 'emploi6', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Taux d\'accès à un emploi ou à une activité génératrice de revenus à 6 mois', off: 'Nécessite le suivi de la section XV dans le temps.', src: [R.RSS, R.PMM] },
    { id: 'scol', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Taux de rescolarisation des mineurs de retour', off: 'Nécessite le retour d\'information de la DELC.', src: [R.ODD, R.PMM] },
    { id: 'remig12', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Taux de re-migration à 12 mois', off: 'Nécessite le suivi des migrants après le retour.', src: [R.RSS] },
    { id: 'satisf', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Satisfaction des bénéficiaires vis-à-vis de l\'assistance reçue', off: 'Nécessite un questionnaire de satisfaction.', src: [R.OIM] },
    { id: 'deces', g: 'Indicateurs à collecter (enquêtes de suivi)', l: 'Migrants décédés ou disparus sur les routes migratoires (ODD 10.7.3)', off: 'Hors périmètre du formulaire ; source : projet Migrants disparus de l\'OIM.', src: [R.ODD] },
  ];
  S.IND = IND; S.R = R;

  /* ---------- Calcul ---------- */
  const valeurs = (ind, d) => { const f = ind.f || (ind.dim && DIM[ind.dim].f); const v = f(d); return Array.isArray(v) ? v : v === null || v === undefined || v === '' ? [] : [v]; };
  const ordonner = (cles, dim) => (dim && DIM[dim] && DIM[dim].ordre ? DIM[dim].ordre.filter((x) => cles.includes(x)) : dim && DIM[dim] && DIM[dim].temps ? cles.sort() : cles);
  function calculer(ind, ds, refs, ventil) {
    const groupes = {}; const gk = (d) => (ventil ? [].concat(DIM[ventil].f(d) || []).filter(Boolean) : ['Ensemble']);
    if (ind.t === 'repartition') {
      const comptes = {}; let base = 0;
      ds.forEach((d) => { const v = valeurs(ind, d); if (!v.length) return; base++; gk(d).forEach((g) => { groupes[g] = groupes[g] || {}; v.forEach((x) => { groupes[g][x] = (groupes[g][x] || 0) + 1; }); }); v.forEach((x) => { comptes[x] = (comptes[x] || 0) + 1; }); });
      const cles = ordonner(Object.keys(comptes).sort((a, b) => comptes[b] - comptes[a]), ind.dim);
      return { t: 'repartition', base, items: cles.map((k) => ({ label: k, v: comptes[k], pct: Math.round((100 * comptes[k]) / (base || 1)) })), groupes, cles };
    }
    if (ind.t === 'taux') {
      const parG = {}; let num = 0, den = 0;
      ds.forEach((d) => { if (ind.den && !ind.den(d)) return; const ok = !!ind.num(d); den++; if (ok) num++; gk(d).forEach((g) => { parG[g] = parG[g] || { num: 0, den: 0 }; parG[g].den++; if (ok) parG[g].num++; }); });
      return { t: 'taux', num, den, pct: den ? (100 * num) / den : 0, groupes: parG };
    }
    if (ind.t === 'moyenne') {
      const parG = {}; const tous = [];
      ds.forEach((d) => { const v = ind.v(d); if (v === null || v === undefined || isNaN(v)) return; tous.push(v); gk(d).forEach((g) => { (parG[g] = parG[g] || []).push(v); }); });
      const moy = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0); const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : 0; };
      return { t: 'moyenne', n: tous.length, moy: moy(tous), med: med(tous), min: tous.length ? Math.min(...tous) : 0, max: tous.length ? Math.max(...tous) : 0, groupes: Object.fromEntries(Object.entries(parG).map(([k, a]) => [k, { moy: moy(a), n: a.length }])) };
    }
    if (ind.t === 'evolution' || ind.t === 'pyramide') {
      const parM = {}; ds.forEach((d) => { const m = mois(d); if (!m) return; parM[m] = parM[m] || {}; gk(d).forEach((g) => { parM[m][g] = (parM[m][g] || 0) + 1; }); });
      const ms = Object.keys(parM).sort(); const gs = [...new Set(ms.flatMap((m) => Object.keys(parM[m])))];
      const pyr = { hommes: TRANCHES.map((tr) => ds.filter((d) => tranche(d.resume.age) === tr && d.resume.sexe === 'Homme').length), femmes: TRANCHES.map((tr) => ds.filter((d) => tranche(d.resume.age) === tr && d.resume.sexe === 'Femme').length) };
      return { t: ind.t, total: ds.length, mois: ms, groupes: ordonner(gs, ventil), parM, pyr };
    }
    if (ind.t === 'refs') {
      const ids = new Set(ds.map((d) => d.id)); const rs = refs.filter((r) => ids.has(r.dossier_id)); const comptes = {};
      rs.forEach((r) => { const k = ind.f(r); comptes[k] = (comptes[k] || 0) + 1; });
      const cles = Object.keys(comptes).sort((a, b) => comptes[b] - comptes[a]);
      return { t: 'repartition', base: rs.length, items: cles.map((k) => ({ label: k, v: comptes[k], pct: Math.round((100 * comptes[k]) / (rs.length || 1)) })), groupes: {}, cles };
    }
    if (ind.t === 'refdelai') {
      const ids = new Set(ds.map((d) => d.id)); const parS = {}; const tous = [];
      refs.filter((r) => ids.has(r.dossier_id)).forEach((r) => { const e = (r.historique || []).find((x) => x.statut === 'Émis'), re = (r.historique || []).find((x) => x.statut === 'Reçu'); if (!e || !re) return; const hrs = (new Date(re.date) - new Date(e.date)) / 3600000; if (hrs < 0) return; tous.push(hrs); (parS[r.destinataire] = parS[r.destinataire] || []).push(hrs); });
      const moy = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
      return { t: 'moyenne', n: tous.length, moy: moy(tous), med: 0, min: tous.length ? Math.min(...tous) : 0, max: tous.length ? Math.max(...tous) : 0, groupes: Object.fromEntries(Object.entries(parS).map(([k, a]) => [k, { moy: moy(a), n: a.length }])), ventilForcee: 'Structure destinataire' };
    }
    return null;
  }
  S.calculer = calculer;
  Object.assign(S, { DIM, FILTRES, VENTIL, TRANCHES, tranche, libMois, mois });

  /* ---------- Page ---------- */
  S.page = function (c, data) {
    const p = App.profil; const petit = p.role !== 'admin' && p.structure !== 'DGIE';
    const peut = (s) => !s || Domaine.droits(p, s).includes('L');
    const tous = data.acces.map((x) => x.d).filter((d) => d.statut === 'Synchronisé');
    const st = S.etat || (S.etat = { f: {}, ind: 'vol', ventil: '', vue: 'auto', du: '', au: '' });
    const appliquer = () => tous.filter((d) => {
      for (const k of FILTRES) { const sel = st.f[k]; if (!sel || !sel.length) continue; const v = [].concat(DIM[k].f(d) || []); if (!v.some((x) => sel.includes(x))) return false; }
      const m = d.reponses['IDT-019'] || (d.created_at || '').slice(0, 10);
      if (st.du && m < st.du) return false; if (st.au && m > st.au) return false;
      return true;
    });
    const compteur = h('span', { class: 'badge solid accent' }); const resultat = h('div'); const galerie = h('div', { class: 'galerie' });
    const masque = (n) => (petit && UI.estMasque(n) ? UI.libMasque() : n);

    // Formulaire multicritère : chaque liste comporte sa recherche
    const options = (k) => { const vs = new Set(); tous.forEach((d) => [].concat(DIM[k].f(d) || []).forEach((x) => x && vs.add(x))); return ordonner([...vs].sort((a, b) => String(a).localeCompare(String(b), 'fr')), k).map((x) => ({ value: x, label: x, flag: ['provenance', 'transit'].includes(k) ? pays(x) : '' })); };
    const grille = h('div', { class: 'filtres' },
      FILTRES.filter((k) => peut(DIM[k].s)).map((k) => h('div', null, h('label', { class: 'q' }, DIM[k].l), UI.dropdown({ items: options(k), value: st.f[k] || [], multiple: true, placeholder: 'Tous', onChange: (v) => { st.f[k] = v; tout(); } }).el)),
      h('div', null, h('label', { class: 'q' }, 'Retour à partir du'), h('input', { class: 'input', type: 'date', value: st.du, onchange: (e) => { st.du = e.target.value; tout(); } })),
      h('div', null, h('label', { class: 'q' }, 'Retour jusqu\'au'), h('input', { class: 'input', type: 'date', value: st.au, onchange: (e) => { st.au = e.target.value; tout(); } })));

    // Choix de l'indicateur, de la ventilation et du type de graphique
    const indItems = IND.map((x) => ({ value: x.id, label: x.l, group: x.g, right: x.off ? 'à collecter' : !peut(x.s) ? 'accès restreint' : '', keywords: x.src.join(' ') + ' ' + (x.def || '') }));
    const ddInd = UI.dropdown({ items: indItems, value: st.ind, groupBy: true, searchPlaceholder: 'Rechercher un indicateur (ex. traite, coût, OIM, ODD)…', onChange: (v) => { st.ind = v; const i = IND.find((x) => x.id === v); if (i && i.ventil) st.ventil = i.ventil; ddVent.set(st.ventil); afficher(); } });
    const ddVent = UI.dropdown({ items: [{ value: '', label: 'Sans ventilation' }].concat(VENTIL.filter((k) => peut(DIM[k].s)).map((k) => ({ value: k, label: 'Par ' + DIM[k].l.toLowerCase() }))), value: st.ventil, onChange: (v) => { st.ventil = v; afficher(); } });
    const vues = h('div', { class: 'periods' }, [['auto', 'Automatique'], ['barres', 'Barres'], ['hbarres', 'Horizontal'], ['secteurs', 'Secteurs'], ['courbe', 'Courbe'], ['tableau', 'Tableau']].map(([k, l]) => h('button', { class: k === st.vue ? 'on' : '', onclick: (e) => { st.vue = k; e.target.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === e.target)); afficher(); } }, l)));

    let dernier = null;
    function afficher() {
      const ds = appliquer(); compteur.textContent = ds.length + ' migrant(s) correspondent';
      resultat.innerHTML = ''; resultat.classList.remove('fondu'); void resultat.offsetWidth; resultat.classList.add('fondu');
      const ind = IND.find((x) => x.id === st.ind) || IND[0];
      const entete = h('div', { class: 'stack' }, h('div', { class: 'row', style: { gap: '6px' } }, ind.src.map((s2) => h('span', { class: 'ref-chip' }, icon('book-open'), s2))), ind.def ? h('p', { class: 'small muted', style: { margin: 0 } }, ind.def) : null);
      if (ind.off) { resultat.append(h('div', { class: 'card' }, h('h3', null, ind.l), entete, h('div', { class: 'notice warn', style: { marginTop: '12px' } }, icon('clipboard-list'), 'Indicateur non calculable avec le formulaire V1 : ' + ind.off))); UI.refreshIcons(); return; }
      if (!peut(ind.s)) { resultat.append(h('div', { class: 'card' }, h('div', { class: 'locked' }, icon('lock'), 'Cet indicateur repose sur la section ' + ind.s + ', non accessible à votre structure.'))); UI.refreshIcons(); return; }
      const r = calculer(ind, ds, data.refs, ind.t === 'refdelai' ? '' : st.ventil); dernier = { ind, r };
      const graphe = h('div'); const cote = h('div', { class: 'stack' });
      const vue = st.vue;
      const lignes = []; // tableau de valeurs (export)
      if (r.t === 'repartition') {
        const items = r.items.slice(0, 15);
        cote.append(h('div', null, h('div', { class: 'chiffre-cle', style: { fontSize: r.items[0] && r.items[0].label.length > 12 ? '26px' : null } }, r.items[0] ? r.items[0].label : '—'), h('div', { class: 'muted' }, r.items[0] ? `Modalité la plus fréquente : ${r.items[0].pct} % (${masque(r.items[0].v)}) — base : ${r.base} migrant(s)` : 'Aucune donnée')));
        if (st.ventil && Object.keys(r.groupes).length && ind.t !== 'refs') {
          const gs = ordonner(Object.keys(r.groupes), st.ventil); const cles = r.cles.slice(0, 8);
          if (vue === 'tableau') graphe.append(tableau(['Modalité', ...gs], cles.map((k) => [k, ...gs.map((g) => masque(r.groupes[g][k] || 0))])));
          else graphe.append(legendeSeries(gs), Charts.groupes({ etiquettes: cles, series: gs.map((g, i) => ({ nom: g, couleur: Charts.PALETTE[i % 12], valeurs: cles.map((k) => r.groupes[g][k] || 0) })), empile: vue !== 'barres' ? true : false }));
          cles.forEach((k) => lignes.push([k, ...gs.map((g) => r.groupes[g][k] || 0)])); lignes.unshift(['Modalité', ...gs]);
        } else {
          const choix = vue === 'auto' ? (items.length <= 5 ? 'secteurs' : 'hbarres') : vue;
          if (choix === 'secteurs') graphe.append(h('div', { class: 'donut-legend' }, Charts.secteurs({ items }), Charts.legende(items, r.base)));
          else if (choix === 'barres' || choix === 'courbe') graphe.append(Charts.groupes({ etiquettes: items.map((x) => x.label), series: [{ nom: ind.l, couleur: '#FE7701', valeurs: items.map((x) => x.v) }] }));
          else if (choix === 'tableau') graphe.append(tableau(['Modalité', 'Effectif', 'Part'], items.map((x) => [x.label, masque(x.v), x.pct + ' %'])));
          else graphe.append(Charts.hbarres({ items: items.map((x) => ({ ...x, label: (pays(x.label) ? pays(x.label) + ' ' : '') + x.label })), couleur: '#014A96' }));
          lignes.push(['Modalité', 'Effectif', 'Part (%)'], ...r.items.map((x) => [x.label, x.v, x.pct]));
        }
      } else if (r.t === 'taux') {
        cote.append(h('div', null, h('div', { class: 'chiffre-cle' }, Math.round(r.pct) + ' %'), h('div', { class: 'muted' }, `${masque(r.num)} sur ${r.den} migrant(s) concerné(s)`)));
        const gs = ordonner(Object.keys(r.groupes), st.ventil).filter((g) => g !== 'Ensemble');
        if (st.ventil && gs.length) {
          const items = gs.map((g) => ({ label: g, v: Math.round((100 * r.groupes[g].num) / (r.groupes[g].den || 1)), sous: `${masque(r.groupes[g].num)} sur ${r.groupes[g].den}` }));
          if (vue === 'tableau') graphe.append(tableau([DIM[st.ventil].l, 'Taux', 'Effectif', 'Base'], gs.map((g) => [g, Math.round((100 * r.groupes[g].num) / (r.groupes[g].den || 1)) + ' %', masque(r.groupes[g].num), r.groupes[g].den])));
          else if (vue === 'courbe' || DIM[st.ventil].temps) graphe.append(Charts.courbes({ etiquettes: gs.map((g) => (DIM[st.ventil].temps ? libMois(g) : g)), series: [{ nom: 'Taux', couleur: '#FE7701', valeurs: items.map((x) => x.v) }], unite: ' %' }));
          else graphe.append(Charts.hbarres({ items, couleur: '#FE7701', unite: ' %', max: 100 }));
          lignes.push([DIM[st.ventil].l, 'Numérateur', 'Dénominateur', 'Taux (%)'], ...gs.map((g) => [g, r.groupes[g].num, r.groupes[g].den, Math.round((100 * r.groupes[g].num) / (r.groupes[g].den || 1))]));
        } else {
          const items = [{ label: 'Oui', v: r.num, couleur: '#FE7701' }, { label: 'Non', v: r.den - r.num, couleur: '#014A96' }];
          graphe.append(h('div', { class: 'donut-legend' }, Charts.secteurs({ items }), Charts.legende(items, r.den)));
          lignes.push(['Indicateur', 'Numérateur', 'Dénominateur', 'Taux (%)'], [ind.l, r.num, r.den, Math.round(r.pct)]);
        }
      } else if (r.t === 'moyenne') {
        const f = (v) => (v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M' : Math.round(v * 10) / 10).toLocaleString('fr-FR');
        cote.append(h('div', null, h('div', { class: 'chiffre-cle' }, f(r.moy) + (ind.unite || ' h')), h('div', { class: 'muted' }, `Moyenne sur ${r.n} valeur(s) · minimum ${f(r.min)} · maximum ${f(r.max)}` + (r.med ? ` · médiane ${f(r.med)}` : ''))));
        const gs = Object.keys(r.groupes).filter((g) => g !== 'Ensemble');
        if (gs.length) {
          const og = r.ventilForcee ? gs : ordonner(gs, st.ventil);
          const items = og.map((g) => ({ label: DIM[st.ventil] && DIM[st.ventil].temps ? libMois(g) : g, v: Math.round(r.groupes[g].moy * 10) / 10, sous: r.groupes[g].n + ' valeur(s)' }));
          if (vue === 'tableau') graphe.append(tableau([r.ventilForcee || DIM[st.ventil].l, 'Moyenne', 'Valeurs'], og.map((g, i) => [items[i].label, items[i].v.toLocaleString('fr-FR') + (ind.unite || ' h'), r.groupes[g].n])));
          else if (vue === 'courbe' || (DIM[st.ventil] && DIM[st.ventil].temps)) graphe.append(Charts.courbes({ etiquettes: items.map((x) => x.label), series: [{ nom: 'Moyenne', couleur: '#2F7D22', valeurs: items.map((x) => x.v) }], unite: ind.unite }));
          else graphe.append(Charts.hbarres({ items, couleur: '#2F7D22', unite: ind.unite || ' h' }));
          lignes.push([r.ventilForcee || DIM[st.ventil].l, 'Moyenne', 'Valeurs'], ...og.map((g, i) => [items[i].label, items[i].v, r.groupes[g].n]));
        } else { graphe.append(h('div', { class: 'notice' }, icon('info'), 'Choisissez une ventilation pour comparer la moyenne entre groupes (sexe, âge, région, provenance…).')); lignes.push(['Indicateur', 'Moyenne', 'Valeurs'], [ind.l, Math.round(r.moy * 10) / 10, r.n]); }
      } else if (r.t === 'evolution') {
        cote.append(h('div', null, h('div', { class: 'chiffre-cle' }, r.total), h('div', { class: 'muted' }, `migrant(s) de retour sur ${r.mois.length} mois`)));
        const series = (st.ventil ? r.groupes : ['Ensemble']).map((g, i) => ({ nom: g, couleur: st.ventil ? Charts.PALETTE[i % 12] : '#FE7701', valeurs: r.mois.map((m) => (r.parM[m] || {})[g] || 0) }));
        if (vue === 'tableau') graphe.append(tableau(['Mois', ...series.map((x) => x.nom)], r.mois.map((m, i) => [libMois(m), ...series.map((x) => masque(x.valeurs[i]))])));
        else if (vue === 'barres' || vue === 'hbarres' || vue === 'secteurs') graphe.append(st.ventil ? legendeSeries(series.map((x) => x.nom)) : '', Charts.groupes({ etiquettes: r.mois.map(libMois), series }));
        else graphe.append(st.ventil ? legendeSeries(series.map((x) => x.nom)) : '', Charts.courbes({ etiquettes: r.mois.map(libMois), series }));
        lignes.push(['Mois', ...series.map((x) => x.nom)], ...r.mois.map((m, i) => [m, ...series.map((x) => x.valeurs[i])]));
      } else if (r.t === 'pyramide') {
        cote.append(h('div', null, h('div', { class: 'chiffre-cle' }, r.pyr.hommes.reduce((a, b) => a + b, 0) + ' / ' + r.pyr.femmes.reduce((a, b) => a + b, 0)), h('div', { class: 'muted' }, 'hommes / femmes')));
        graphe.append(vue === 'tableau' ? tableau(['Tranche d\'âge', 'Hommes', 'Femmes'], TRANCHES.map((tr, i) => [tr, masque(r.pyr.hommes[i]), masque(r.pyr.femmes[i])])) : Charts.pyramide({ tranches: TRANCHES, hommes: r.pyr.hommes, femmes: r.pyr.femmes }));
        lignes.push(['Tranche d\'âge', 'Hommes', 'Femmes'], ...TRANCHES.map((tr, i) => [tr, r.pyr.hommes[i], r.pyr.femmes[i]]));
      }
      dernier.lignes = lignes;
      const sous = critères() + (st.ventil && ind.t !== 'refdelai' ? ' — ventilation par ' + DIM[st.ventil].l.toLowerCase() : '');
      const zone = h('div', { class: 'res-grid' });
      const menu = Export.menu({ titre: ind.l, sousTitre: sous, lignes: () => dernier.lignes, noeud: () => zone, fichier: 'indicateur_' + ind.id });
      cote.append(entete, h('div', { class: 'small muted' }, petit ? 'Les effectifs inférieurs à ' + UI.PARAMS.secret + ' sont masqués (secret statistique).' : 'Effectifs complets (profil DGIE).'), h('div', { class: 'row' }, menu, ['admin', 'superviseur'].includes(p.role) ? h('button', { class: 'btn', onclick: () => Qualite.formRapport({ nom: ind.l, indicateur: ind.id, ventilation: ind.t === 'refdelai' ? '' : st.ventil, filtres: JSON.parse(JSON.stringify(st.f)), criteres: sous }) }, icon('calendar-clock'), 'Programmer ce rapport') : null));
      zone.append(h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon o' }, icon('chart-column')), ind.l), st.ventil && ind.t !== 'refdelai' ? h('span', { class: 'badge accent' }, 'Par ' + DIM[st.ventil].l.toLowerCase()) : null), h('div', { class: 'card-b' }, graphe)),
        h('div', { class: 'card' }, cote));
      resultat.append(zone);
      UI.refreshIcons();
    }
    const legendeSeries = (noms) => h('div', { class: 'map-legend', style: { margin: '0 0 10px' } }, noms.map((n, i) => h('span', null, h('i', { class: 'sq', style: { background: Charts.PALETTE[i % 12] } }), n)));
    const tableau = (ent, rows) => h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ent.map((x) => h('th', null, x)))), h('tbody', null, rows.map((r) => h('tr', null, r.map((x) => h('td', null, x)))))));
    const critères = () => { const f = FILTRES.filter((k) => (st.f[k] || []).length).map((k) => DIM[k].l + ' : ' + st.f[k].join(', ')); if (st.du) f.push('retour à partir du ' + UI.fmtDate(st.du)); if (st.au) f.push('retour jusqu\'au ' + UI.fmtDate(st.au)); return f.join(' | ') || 'Aucun critère (ensemble des migrants accessibles)'; };

    // Galerie : vue d'ensemble statistique de la sélection
    function remplirGalerie() {
      const ds = appliquer(); galerie.innerHTML = '';
      /* `titre` peut être un texte ou [texte, pastille d'aide] ; l'export ne garde que le texte. */
      const carte = (ic, t, titre, corps, id, lignes) => { const lib = Array.isArray(titre) ? String(titre[0]) : titre;
        const el = h('div', { class: 'card p0' }); el.append(h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon ' + t }, icon(ic)), titre),
        h('div', { class: 'row', style: { gap: '10px' } }, id ? h('button', { class: 'link', onclick: () => { st.ind = id; ddInd.set(id); afficher(); document.querySelector('.res-zone').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Analyser') : null,
          lignes ? Export.menu({ compact: true, titre: lib, sousTitre: critères(), lignes, noeud: () => el, fichier: 'graphique_' + (id || 'statistique') }) : null)), h('div', { class: 'card-b' }, corps)); return el; };
      const lig = (items, ent) => () => [ent || ['Modalité', 'Effectif', 'Part (%)'], ...items.map((x) => [x.label, x.v, x.pct])];
      /* Aide d'un graphique de la galerie : reprend la définition et les référentiels du catalogue
         d'indicateurs, puis précise le périmètre réellement calculé et le secret statistique. */
      const aideInd = (id, lecture) => {
        const ind = IND.find((x) => x.id === id); if (!ind) return null;
        return UI.aide([ind.def || ind.l, lecture,
          'Calculé sur ' + ds.length + ' dossier(s) accessible(s). Filtres actifs — ' + critères() + '.',
          ind.s ? 'Repose sur la section ' + ind.s + ' du formulaire.' : '',
          ind.src && ind.src.length ? 'Référentiels : ' + ind.src.join(' ; ') + '.' : '',
          petit ? 'Les effectifs inférieurs à ' + UI.PARAMS.secret + ' sont masqués (secret statistique).' : ''].filter(Boolean).join(' '));
      };
      const rep = (id, n) => { const ind = IND.find((x) => x.id === id); if (!peut(ind.s)) return null; return calculer(ind, ds, data.refs, '').items.slice(0, n || 6); };
      const ev = calculer(IND[0], ds, data.refs, '');
      galerie.append(carte('trending-up', 'o', ['Retours par mois', aideInd('vol', 'Un point par mois ; la surface orange sous la courbe n\'ajoute aucune information, elle aide seulement à suivre le niveau.')], Charts.courbes({ etiquettes: ev.mois.map(libMois), series: [{ nom: 'Migrants', couleur: '#FE7701', valeurs: ev.mois.map((m) => (ev.parM[m] || {}).Ensemble || 0) }], hauteur: 300, largeur: 480 }), 'vol', () => [['Mois', 'Migrants'], ...ev.mois.map((m) => [libMois(m), (ev.parM[m] || {}).Ensemble || 0])]));
      galerie.append(carte('users', 'b', ['Pyramide des âges', aideInd('age', 'Hommes à gauche en bleu, femmes à droite en orange ; une ligne par tranche d\'âge, de la plus jeune en haut à la plus âgée en bas.')], Charts.pyramide({ tranches: TRANCHES, hommes: ev.pyr.hommes, femmes: ev.pyr.femmes, largeur: 460 }), 'age', () => [['Tranche d\'âge', 'Hommes', 'Femmes'], ...TRANCHES.map((tr, i) => [tr, ev.pyr.hommes[i], ev.pyr.femmes[i]])]));
      const sx = rep('sexe'); galerie.append(carte('venus-and-mars', 'p', ['Répartition par sexe', aideInd('sexe')], h('div', { class: 'donut-legend' }, Charts.secteurs({ items: sx.map((x, i) => ({ ...x, couleur: ['#014A96', '#FE7701', '#C8CFD6'][i] })), taille: 170 }), Charts.legende(sx.map((x, i) => ({ ...x, couleur: ['#014A96', '#FE7701', '#C8CFD6'][i] })), sx.reduce((a, x) => a + x.v, 0))), 'sexe', lig(sx)));
      [['provenance', 'globe', 'v', 'Pays de provenance', '#014A96'], ['motif', 'target', 'g', 'Motifs de départ', '#2F7D22'], ['vulntypes', 'shield-alert', 'r', 'Vulnérabilités', '#D92D20'], ['besoins', 'hand-heart', 'o', 'Besoins immédiats', '#FE7701'], ['region', 'map-pin', 't', 'Régions de retour', '#0E6B63'], ['education', 'graduation-cap', 'b', 'Niveau d\'étude', '#4B3F8C']].forEach(([id, ic, t, titre, col]) => {
        const it = rep(id); if (!it) return;
        galerie.append(carte(ic, t, [titre, aideInd(id, 'Les modalités sont classées de la plus fréquente à la moins fréquente ; seules les 6 premières sont représentées ici. Le détail complet est dans l\'analyse de l\'indicateur.')], it.length ? Charts.hbarres({ items: it.map((x) => ({ ...x, label: (pays(x.label) ? pays(x.label) + ' ' : '') + x.label })), couleur: col, largeur: 480 }) : h('div', { class: 'empty' }, 'Aucune donnée'), id, lig(it)));
      });
      UI.refreshIcons();
    }
    function tout() { afficher(); remplirGalerie(); }

    // Catalogue
    const catalogue = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Thème', 'Indicateur', 'Référentiels', 'Disponibilité', ''].map((x) => h('th', null, x)))),
      h('tbody', null, IND.map((x) => h('tr', { class: 'ind-row' + (x.off ? ' off' : '') }, h('td', { class: 'small muted' }, x.g), h('td', null, h('b', null, x.l), x.def ? h('div', { class: 'tiny muted' }, x.def) : null),
        h('td', { class: 'small' }, x.src.map((s2) => h('div', null, s2))), h('td', null, x.off ? h('span', { class: 'badge solid warn' }, 'À collecter') : !peut(x.s) ? h('span', { class: 'badge solid grey' }, 'Accès restreint') : h('span', { class: 'badge solid ok' }, 'Calculable')),
        h('td', null, x.off || !peut(x.s) ? null : h('button', { class: 'btn sm', onclick: () => { st.ind = x.id; ddInd.set(x.id); afficher(); document.querySelector('.res-zone').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, icon('chart-column'), 'Afficher')))))));

    c.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Statistiques'), h('p', { class: 'sub' }, `${IND.filter((x) => !x.off).length} indicateurs calculables et ${IND.filter((x) => x.off).length} à collecter, alignés sur les référentiels de l'OIM, des ODD et du Pacte mondial pour les migrations.`)),
      h('button', { class: 'btn', onclick: () => { S.etat = null; App.render(); } }, icon('rotate-ccw'), 'Réinitialiser les critères')),
      h('div', { class: 'card p0' }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon b' }, icon('sliders-horizontal')), 'Recherche multicritère'), compteur), h('div', { class: 'card-b' }, grille)),
      h('div', { class: 'card res-zone', style: { margin: '20px 0' } }, h('div', { class: 'row', style: { alignItems: 'flex-end' } },
        h('div', { style: { flex: '2 1 380px' } }, h('label', { class: 'q' }, 'Indicateur'), ddInd.el),
        h('div', { style: { flex: '1 1 220px' } }, h('label', { class: 'q' }, 'Ventilation'), ddVent.el),
        h('div', null, h('label', { class: 'q' }, 'Représentation'), vues))),
      resultat,
      h('div', { class: 'page-head', style: { margin: '28px 0 14px' } }, h('div', null, h('h2', { style: { margin: 0 } }, 'Vue d\'ensemble de la sélection'), h('p', { class: 'sub' }, 'Les graphiques suivent les critères de recherche ci-dessus.'))),
      galerie,
      h('div', { class: 'card p0', style: { marginTop: '20px' } }, h('div', { class: 'card-h' }, h('h3', { class: 'title' }, h('span', { class: 'ticon g' }, icon('library')), 'Catalogue des indicateurs'), h('span', { class: 'badge accent' }, IND.length + ' indicateurs')), catalogue));
    tout();
  };
  window.Stats = S;
})();
