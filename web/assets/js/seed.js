/* Jeu de données fictif : les six cas types du kit d'atelier (C1 à C6) et un volume de dossiers simplifiés pour le tableau de bord */
(function () {
  const M = window.METIER;
  const jours = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const tel = (num) => ({ ind: '+225', num });
  const ville = (cc, nom) => { const v = (REF.villes[cc] || []).find((x) => x[0] === nom); return v ? [v[1], v[2]] : null; };
  const loc = (n) => { const l = REF.localitesCI.find((x) => x.n === n); return l ? { n: l.n, ll: l.ll, r: l.r } : null; };
  const pays = (c, villes) => { const p = REF.pays.find((x) => x.c === c); return { c, nom: p.n, villes: villes.map((n) => ({ n, ll: ville(c, n) || (p.cap && p.cap.ll) })).filter((x) => x.ll) }; };
  const base = {
    'ENT-006': 'Français', 'ENT-007': 'Non', 'ENT-009': 'Oui', 'ENT-010': 'Oui', 'ENT-011': 'Oui', 'IDT-009': "Côte d'Ivoire", 'IDT-010': "Côte d'Ivoire",
    'IDT-015': 'MPRR', 'FAM-004': 0, 'FAM-007': 0, 'FAM-008': 'Oui', 'RES-008': ['Chez la famille'], 'RES-018': 'Non', 'EDU-005': 'Non', 'EDU-007': 'Non',
    'PRO-001': 'Non', 'PRO-013': 'Non', 'PAR-007': '1 à 3 mois', 'PAR-008': 'Non', 'PAR-013': 'Non', 'PAR-016': 'Non', 'PAR-024': 'Non', 'PAR-030': 'Aucun', 'PAR-037': 'Non',
    'VUL-001': 'Non', 'VUL-002': 'Non', 'VUL-003': 'Non', 'VUL-007': 'Non', 'VUL-008': 'Non', 'VUL-010': 'Non', 'VUL-014': 'Non', 'VUL-015': 'Non', 'VUL-016': 'Non', 'VUL-017': 'Non',
    'VUL-018': 'Non', 'VUL-019': 'Non', 'VUL-020': 'Non', 'VUL-021': 'Non', 'VUL-022': 'Non', 'VUL-023': 'Non', 'VUL-024': 'Non', 'VUL-025': 'Non', 'VUL-026': 'Non',
    'SAN-001': 'Non', 'SAN-006': 'Non', 'SAN-007': 'Non', 'SAN-008': 'Non', 'SAN-009': 'Non', 'SAN-010': 'Non', 'SAN-011': 'Non', 'SAN-012': 'Non', 'SAN-013': 'Non', 'SAN-014': 'Non',
    'SAN-015': 'Non', 'SAN-016': 'Non', 'SAN-017': 'Non', 'SAN-018': 'Non', 'SAN-019': ['Soutien familial'], 'PER-004': 'Non', 'PER-006': 'Non', 'PER-013': 'Non', 'PER-014': 'Non',
    'PER-015': 'Partiellement', 'PER-016': 'Oui', 'PER-017': 'Oui', 'PER-018': 'Immédiatement', 'PER-019': 'Immédiatement', 'PER-020': 'Peut-être', 'SUI-002': 'Suivi standard',
  };
  const CAS = [
    { cas: 'C1', jours: 40, profil: 'agent-oim', r: { 'IDT-001': 'KOUASSI', 'IDT-002': 'Yao Christian', 'IDT-005': 'Homme', 'IDT-006': '1999-03-14', 'IDT-008': 'Abidjan', 'IDT-011': tel('07 48 21 33 90'),
      'IDT-013': 'OIM-CI-2026-0412', 'IDT-016': 'Retour volontaire assisté', 'IDT-017': 'Charter', 'IDT-018': ['OIM'], 'IDT-019': '2026-08-25', 'FAM-001': 'Célibataire', 'FAM-009': 'KOUASSI', 'FAM-010': 'Koffi', 'FAM-015': 'AKA', 'FAM-016': 'Adjoua',
      'RES-001': 'Abidjan', 'RES-003': 'Abidjan', 'RES-004': { pays: 'Libye', ville: 'Tripoli' }, 'RES-005': 'Abidjan', 'RES-007': 'Yopougon', 'RES-011': 'KOUASSI Koffi', 'RES-012': tel('05 44 10 20 30'),
      'RES-014': 'Oui', 'RES-015': 'CNI', 'RES-016': 'CI002918374', 'RES-017': '2030-05-02', 'EDU-001': 'Secondaire 1er cycle', 'EDU-002': '3e', 'EDU-003': 'BEPC', 'EDU-009': 'Oui', 'EDU-010': 'Oui', 'EDU-011': 'Non',
      'PRO-001': 'Oui', 'PRO-002': 'Vendeur', 'PRO-003': 'Oui', 'PRO-004': 'Indépendant', 'PRO-005': 'Commerce', 'PRO-007': 'Informel', 'PAR-001': '2023-04', 'PAR-002': 'Abidjan', 'PAR-006': ['Raisons économiques', 'Recherche d\'emploi'],
      'PAR-011': { montant: 1200000, devise: 'XOF' }, 'PAR-012': ['Épargne personnelle', 'Famille'], 'PAR-015': ['Épargne', 'Aide familiale'], 'PAR-020': ['CNI'], 'PAR-022': ['Car'], 'PAR-033': 'Mali', 'PAR-034': 'Italie', 'PAR-035': 'Libye',
      'PER-001': ['Difficultés économiques'], 'PER-002': '1 à 3 mois', 'PER-008': 'Petit commerce de vêtements', 'PER-010': 'Commerce', 'PER-011': 'Abidjan', 'BIM-001': ['Logement'], 'BAC-002': ['Business plan', 'Financement'],
      'ORI-003': 'Faible', 'ORI-004': ['Entrepreneuriat'], 'ORI-006': ['Entrepreneuriat'], 'SUI-001': ['Transport', 'Kits'] },
      itin: { ci: ['Abidjan', 'Bouaké', 'Korhogo'], pays: [['ML', ['Bamako', 'Gao']], ['NE', ['Agadez']], ['LY', ['Sebha', 'Tripoli']]] },
      refs: [{ destinataire: 'EJ', type_service: 'INS', motif: 'Projet de petit commerce : accompagnement à l\'entrepreneuriat', statut: 'Accepté' }] },

    { cas: 'C2', jours: 21, profil: 'agent-dgie', r: { 'IDT-001': 'DIABY', 'IDT-002': 'Moussa', 'IDT-005': 'Homme', 'IDT-006': '2011-06-02', 'IDT-008': 'Daloa', 'IDT-011': { ind: '+225', num: 'Inconnu' }, 'ENT-011': 'Non', 'ENT-013': 'Non applicable',
      'IDT-016': 'Retour volontaire assisté', 'IDT-017': 'Charter', 'IDT-018': ['OIM', 'DGIE'], 'IDT-019': '2026-09-12', 'FAM-001': 'Célibataire', 'FAM-009': 'DIABY', 'FAM-010': 'Sékou', 'FAM-015': 'KONATÉ', 'FAM-016': 'Mariam',
      'RES-001': 'Daloa', 'RES-003': 'Daloa', 'RES-004': { pays: 'Maroc', ville: 'Tanger' }, 'RES-005': 'Daloa', 'RES-009': 'DIABY Sékou', 'RES-010': tel('07 07 12 45 66'), 'RES-011': 'DIABY Sékou', 'RES-012': tel('07 07 12 45 66'),
      'RES-014': 'Non', 'RES-018': 'Oui', 'EDU-001': 'Secondaire 1er cycle', 'EDU-002': '5e', 'EDU-003': 'Aucun', 'EDU-009': 'Oui', 'EDU-010': 'Oui', 'EDU-011': 'Non',
      'PAR-001': '2025-02', 'PAR-002': 'Daloa', 'PAR-006': ['Recherche d\'emploi'], 'PAR-008': 'Oui', 'PAR-009': 'Tiers', 'PAR-010': ['Organisation du voyage'], 'PAR-011': { montant: 650000, devise: 'XOF' }, 'PAR-012': ['Famille'], 'PAR-015': ['Aide familiale'],
      'PAR-020': ['Aucun document'], 'PAR-022': ['Car'], 'PAR-024': 'Oui', 'PAR-025': 'Mali', 'PAR-026': ['Transport', 'Passage de frontière'], 'PAR-033': 'Mali', 'PAR-034': 'Espagne', 'PAR-035': 'Maroc',
      'VUL-027': 'Oui', 'VUL-028': 'Non applicable', 'VUL-007': 'Oui', 'VUL-026': 'Suspecté', 'ORI-002': ['Recours à un passeur'], 'PER-001': ['Difficultés administratives'], 'PER-002': 'Moins d\'un mois', 'PER-008': 'Reprendre l\'école', 'PER-010': 'Autre', 'PER-011': 'Haut-Sassandra',
      'BIM-001': ['Hébergement', 'Alimentation'], 'BAC-003': ['Assistance psychosociale'], 'ORI-003': 'Élevé', 'ORI-004': ['Référencement spécialisé'], 'ORI-006': ['Protection'], 'SUI-001': ['Hébergement', 'Alimentation'], 'SUI-002': 'Urgent' },
      itin: { ci: ['Daloa', 'Odienné'], pays: [['ML', ['Bamako']], ['DZ', ['Tamanrasset', 'Oran']], ['MA', ['Oujda', 'Tanger']]] },
      refs: [{ destinataire: 'DPE', type_service: 'PROT', motif: 'Mineur non accompagné : réunification familiale à Daloa', statut: 'En cours de prise en charge' },
        { destinataire: 'DELC', type_service: 'INS', motif: 'Rescolarisation (classe de 5e)', statut: 'Émis' }] },

    { cas: 'C3', jours: 12, profil: 'agent-dgie', r: { 'IDT-001': 'BAMBA', 'IDT-002': 'Salimata', 'IDT-005': 'Femme', 'IDT-006': '2002-01-20', 'IDT-008': 'Abidjan', 'IDT-011': tel('01 52 63 74 85'),
      'IDT-016': 'Retour volontaire assisté', 'IDT-017': 'Vol commercial', 'IDT-018': ['DGIE'], 'IDT-019': '2026-09-20', 'FAM-001': 'Célibataire', 'FAM-009': 'BAMBA', 'FAM-010': 'Lassina', 'FAM-015': 'COULIBALY', 'FAM-016': 'Awa',
      'RES-001': 'Abidjan', 'RES-003': 'Abidjan', 'RES-004': { pays: 'Liban', ville: 'Beyrouth' }, 'RES-005': 'Abidjan', 'RES-007': 'Abobo', 'RES-011': 'BAMBA Lassina', 'RES-012': tel('05 01 02 03 04'),
      'RES-014': 'Non', 'RES-018': 'Oui', 'EDU-001': 'Primaire', 'EDU-002': 'CM2', 'EDU-003': 'CEP', 'EDU-009': 'Oui', 'EDU-010': 'Oui', 'EDU-011': 'Non', 'PRO-013': 'Oui', 'PRO-014': 'Salarié', 'PRO-015': 'Non', 'PRO-016': 'Domestique',
      'PAR-001': '2024-03', 'PAR-002': 'Abidjan', 'PAR-006': ['Recherche d\'emploi'], 'PAR-008': 'Oui', 'PAR-009': 'Tiers', 'PAR-010': ['Organisation du voyage', 'Information'], 'PAR-011': { montant: 900000, devise: 'XOF' }, 'PAR-012': ['Emprunt'],
      'PAR-013': 'Oui', 'PAR-014': { montant: 500000, devise: 'XOF' }, 'PAR-015': ['Emprunt'], 'PAR-016': 'Oui', 'PAR-017': ['Emploi', 'Salaire élevé'], 'PAR-018': 'Non', 'PAR-019': 'Passeport confisqué, travail domestique sans salaire, interdiction de sortir.',
      'PAR-020': ['Passeport', 'Visa'], 'PAR-022': ['Avion'], 'PAR-030': 'Intermédiaire du quartier', 'PAR-031': [{ nom: 'Tantie R.', contact: 'Inconnu' }], 'PAR-033': 'Liban', 'PAR-034': 'Liban', 'PAR-035': 'Liban', 'PAR-037': 'Non',
      'VUL-008': 'Oui', 'VUL-010': 'Oui', 'VUL-011': 'Oui', 'VUL-012': 'Oui', 'VUL-013': 'Non', 'VUL-015': 'Oui', 'VUL-016': 'Oui', 'VUL-019': 'Oui', 'VUL-020': 'Oui', 'VUL-021': 'Oui', 'VUL-022': 'Oui', 'VUL-025': 'Suspectée',
      'ORI-001': ['Exploitation domestique', 'Travail forcé'], 'SAN-011': 'Oui', 'SAN-013': 'Oui', 'SAN-014': 'Oui', 'PER-001': ['Difficultés familiales'], 'PER-002': '4 à 6 mois', 'PER-008': 'Couture', 'PER-010': 'Artisanat', 'PER-011': 'Abidjan',
      'BIM-001': ['Soutien psychosocial', 'Assistance documentaire'], 'BAC-003': ['Assistance traite', 'Assistance psychosociale'], 'ORI-003': 'Élevé', 'ORI-004': ['Appui psychosocial', 'Formation'], 'ORI-006': ['Protection', 'Psychosocial'], 'SUI-002': 'Sous 2 semaines' },
      itin: { ci: ['Abidjan'], pays: [['LB', ['Beyrouth']]] },
      refs: [{ destinataire: 'CNLTP', type_service: 'PROT', motif: 'Victime présumée de traite : passeport confisqué, travail sans salaire', statut: 'Reçu' },
        { destinataire: 'ONECI', type_service: 'JUR', motif: 'Reconstitution des pièces d\'identité', statut: 'Émis' }] },

    { cas: 'C4', jours: 5, profil: 'agent-oim', r: { 'IDT-001': 'TRAORÉ', 'IDT-002': 'Adama', 'IDT-005': 'Homme', 'IDT-006': '1992-11-08', 'IDT-008': 'Korhogo', 'IDT-011': tel('07 89 45 12 03'),
      'IDT-013': 'OIM-CI-2026-0587', 'IDT-016': 'Retour volontaire assisté', 'IDT-017': 'voie terrestre', 'IDT-018': ['OIM'], 'IDT-019': '2026-09-28', 'FAM-001': 'Marié(e)', 'FAM-002': 'TRAORÉ Fanta', 'FAM-004': 2, 'FAM-005': 2,
      'FAM-009': 'TRAORÉ', 'FAM-010': 'Daouda', 'FAM-015': 'SORO', 'FAM-016': 'Kadidja', 'RES-001': 'Korhogo', 'RES-003': 'Korhogo', 'RES-004': { pays: 'Niger', ville: 'Agadez' }, 'RES-005': 'Korhogo', 'RES-011': 'TRAORÉ Fanta', 'RES-012': tel('07 89 45 12 04'),
      'RES-014': 'Oui', 'RES-015': 'Laissez-passer', 'RES-016': 'LP-2026-NE-1187', 'EDU-001': 'Aucun', 'EDU-009': 'Non', 'EDU-010': 'Non', 'EDU-011': 'Non', 'PRO-001': 'Oui', 'PRO-002': 'Cultivateur', 'PRO-005': 'Agriculture', 'PRO-003': 'Oui', 'PRO-004': 'Indépendant', 'PRO-007': 'Informel',
      'PAR-001': '2024-10', 'PAR-002': 'Korhogo', 'PAR-006': ['Raisons économiques'], 'PAR-011': { montant: 400000, devise: 'XOF' }, 'PAR-012': ['Vente de biens'], 'PAR-015': ['Vente de biens'], 'PAR-020': ['CNI'], 'PAR-022': ['Car'],
      'PAR-033': 'Burkina Faso', 'PAR-034': 'Algérie', 'PAR-035': 'Niger', 'PAR-036': 'Refoulé à la frontière algérienne.', 'SAN-001': 'Oui', 'SAN-002': 'Blessure à la jambe non soignée', 'SAN-003': 'Non', 'SAN-004': 'Oui', 'SAN-005': 'Oui',
      'SAN-009': 'Oui', 'SAN-011': 'Oui', 'SAN-014': 'Oui', 'SAN-016': 'Oui', 'SAN-018': 'Oui', 'VUL-002': 'Oui', 'VUL-008': 'Oui', 'VUL-007': 'Oui', 'PER-001': ['Problèmes de santé'], 'PER-002': 'Moins d\'un mois', 'PER-008': 'Agriculture', 'PER-010': 'Agriculture', 'PER-011': 'Poro',
      'BIM-001': ['Santé', 'Soutien psychosocial'], 'BAC-003': ['Assistance médicale', 'Assistance psychosociale'], 'ORI-003': 'Critique', 'ORI-004': ['Assistance médicale', 'Appui psychosocial'], 'ORI-006': ['Médical', 'Psychosocial'], 'SUI-001': ['Santé', 'Psychosocial'], 'SUI-002': 'Urgent' },
      itin: { ci: ['Korhogo', 'Ouangolodougou'], pays: [['BF', ['Bobo-Dioulasso', 'Ouagadougou']], ['NE', ['Niamey', 'Agadez']]] },
      refs: [{ destinataire: 'PNSM', type_service: 'PSY', motif: 'Pensées suicidaires déclarées : évaluation en urgence', statut: 'Accepté' },
        { destinataire: 'DMHP', type_service: 'MED', motif: 'Blessure à la jambe non soignée', statut: 'Émis' }] },

    { cas: 'C5', jours: 182, profil: 'agent-oim', r: { 'IDT-001': "N'GUESSAN", 'IDT-002': 'Akissi', 'IDT-005': 'Femme', 'IDT-006': '1996-07-19', 'IDT-008': 'Bouaké', 'IDT-011': tel('07 22 33 44 55'),
      'IDT-013': 'OIM-CI-2026-0098', 'IDT-016': 'Retour volontaire assisté', 'IDT-017': 'Charter', 'IDT-018': ['OIM'], 'IDT-019': '2026-03-30', 'FAM-001': 'Veuf(ve)', 'FAM-004': 1, 'FAM-005': 1,
      'FAM-009': "N'GUESSAN", 'FAM-010': 'Kouadio', 'FAM-015': 'KOFFI', 'FAM-016': 'Amenan', 'RES-001': 'Bouaké', 'RES-003': 'Bouaké', 'RES-004': { pays: 'Tunisie', ville: 'Sfax' }, 'RES-005': 'Abidjan', 'RES-007': 'Koumassi', 'RES-011': "N'GUESSAN Kouadio", 'RES-012': tel('07 22 33 44 56'),
      'RES-014': 'Oui', 'RES-015': 'CNI', 'RES-016': 'CI004455667', 'EDU-001': 'Secondaire 1er cycle', 'EDU-002': '4e', 'EDU-003': 'Aucun', 'EDU-009': 'Oui', 'EDU-010': 'Oui', 'EDU-011': 'Non',
      'PAR-001': '2023-09', 'PAR-002': 'Bouaké', 'PAR-006': ['Raisons économiques'], 'PAR-011': { montant: 1500000, devise: 'XOF' }, 'PAR-012': ['Épargne personnelle'], 'PAR-015': ['Épargne'], 'PAR-020': ['Passeport'], 'PAR-022': ['Avion', 'Car'],
      'PAR-033': 'Tunisie', 'PAR-034': 'Italie', 'PAR-035': 'Tunisie', 'PER-001': ['Absence d\'emploi'], 'PER-002': '1 à 3 mois', 'PER-008': 'Restauration', 'PER-010': 'Services', 'PER-011': 'Gbêkê',
      'BIM-001': ['Logement'], 'BAC-001': ['Formation professionnelle'], 'ORI-003': 'Modéré', 'ORI-004': ['Formation'], 'ORI-006': ['Formation'], 'SUI-001': ['Transport'] },
      itin: { ci: ['Bouaké', 'Abidjan'], pays: [['TN', ['Tunis', 'Sfax']]] },
      refs: [{ destinataire: 'AGEFOP', type_service: 'INS', motif: 'Formation en restauration', statut: 'Clôturé' }] },

    { cas: 'C6', jours: 2, profil: 'agent-dgie', r: { 'IDT-001': 'GBAGBO', 'IDT-002': 'Hervé Junior', 'IDT-005': 'Homme', 'IDT-006': '2004-05-30', 'IDT-008': 'Gagnoa', 'IDT-011': tel('05 66 77 88 99'),
      'IDT-016': 'Retour forcé', 'IDT-017': 'Vol commercial', 'IDT-018': ['DGIE'], 'IDT-019': '2026-10-02', 'FAM-001': 'Célibataire', 'FAM-009': 'GBAGBO', 'FAM-010': 'Marcel', 'FAM-015': 'ZADI', 'FAM-016': 'Odette',
      'RES-001': 'Gagnoa', 'RES-003': 'Gagnoa', 'RES-004': { pays: 'France', ville: 'Paris' }, 'RES-005': 'Gagnoa', 'RES-011': 'GBAGBO Marcel', 'RES-012': tel('05 66 77 88 00'),
      'RES-014': 'Oui', 'RES-015': 'Passeport', 'RES-016': '21AC54321', 'RES-017': '2031-01-15', 'EDU-001': 'Secondaire 2nd cycle', 'EDU-002': 'Terminale', 'EDU-003': 'BAC', 'EDU-004': 'Scientifique', 'EDU-009': 'Oui', 'EDU-010': 'Oui', 'EDU-011': 'Oui',
      'PRO-013': 'Oui', 'PRO-014': 'Salarié', 'PRO-015': 'Oui', 'PRO-016': 'Aide-mécanicien', 'PAR-001': '2024-09', 'PAR-002': 'Gagnoa', 'PAR-006': ['Études'], 'PAR-011': { montant: 2500, devise: 'EUR' }, 'PAR-012': ['Famille'], 'PAR-015': ['Aide familiale'],
      'PAR-020': ['Passeport', 'Visa'], 'PAR-022': ['Avion'], 'PAR-033': 'France', 'PAR-034': 'France', 'PAR-035': 'France', 'PAR-037': 'Oui', 'PER-001': ['Difficultés administratives'], 'PER-002': 'Je n\'envisageais pas le retour',
      'PER-008': 'Mécanicien automobile', 'PER-009': 'Mécanique automobile', 'PER-010': 'Services', 'PER-011': 'Gôh', 'PER-014': 'Oui', 'BIM-001': ['Logement'], 'BAC-001': ['Formation professionnelle', 'Apprentissage'],
      'ORI-003': 'Faible', 'ORI-004': ['Formation', 'Apprentissage'], 'ORI-006': ['Formation'], 'SUI-001': ['Transport'] },
      itin: { ci: ['Gagnoa', 'Abidjan'], pays: [['FR', ['Paris']]] },
      refs: [{ destinataire: 'AGEFOP', type_service: 'INS', motif: 'Formation en mécanique automobile (AGEFOP absente lors de l\'enrôlement)', statut: 'Émis' }] },
  ];

  /* Dossiers simplifiés pour donner du volume au tableau de bord */
  const NOMS = ['KONÉ', 'OUATTARA', 'YAO', 'KOFFI', 'TOURÉ', 'DIALLO', 'SORO', 'KOUAMÉ', 'ASSI', 'BROU', 'AKA', 'ZADI', 'GNAHORÉ', 'SILUÉ', 'DOUMBIA', 'TANOH', 'KOUADIO', 'N\'DRI'];
  const PRE_H = ['Ibrahim', 'Jean', 'Seydou', 'Arsène', 'Mamadou', 'Didier', 'Yacouba', 'Christ', 'Fabrice', 'Lacina'];
  const PRE_F = ['Aminata', 'Rose', 'Fatim', 'Prisca', 'Nadège', 'Maïmouna', 'Grâce', 'Estelle', 'Kadi', 'Bintou'];
  /* Corridors migratoires plausibles (poids = fréquence relative dans le jeu fictif) */
  const CORR = [
    { prov: 'Libye', w: 6, terre: true, path: [['ML', ['Bamako', 'Gao']], ['NE', ['Agadez']], ['LY', ['Sebha', 'Tripoli']]] },
    { prov: 'Libye', w: 3, terre: true, path: [['BF', ['Ouagadougou']], ['NE', ['Niamey', 'Agadez']], ['LY', ['Sebha', 'Tripoli']]] },
    { prov: 'Tunisie', w: 3, terre: true, path: [['ML', ['Bamako', 'Gao']], ['DZ', ['Tamanrasset', 'Alger']], ['TN', ['Sfax']]] },
    { prov: 'Tunisie', w: 2, terre: false, path: [['TN', ['Tunis', 'Sfax']]] },
    { prov: 'Niger', w: 3, terre: true, path: [['BF', ['Ouagadougou']], ['NE', ['Niamey', 'Agadez']]] },
    { prov: 'Maroc', w: 3, terre: true, path: [['ML', ['Bamako']], ['DZ', ['Tamanrasset', 'Oran']], ['MA', ['Oujda', 'Rabat']]] },
    { prov: 'Maroc', w: 2, terre: true, path: [['ML', ['Bamako', 'Kayes']], ['MR', ['Nouakchott', 'Nouadhibou']], ['MA', ['Casablanca']]] },
    { prov: 'Algérie', w: 2, terre: true, path: [['ML', ['Bamako', 'Gao']], ['DZ', ['Tamanrasset', 'Alger']]] },
    { prov: 'Mali', w: 1, terre: true, path: [['ML', ['Bamako']]] },
    { prov: 'Liban', w: 1, terre: false, path: [['LB', ['Beyrouth']]] },
  ];
  const corridor = (r) => { const tot = CORR.reduce((a, c) => a + c.w, 0); let x = r() * tot; for (const c of CORR) { x -= c.w; if (x <= 0) return c; } return CORR[0]; };
  const LOCS = ['Abidjan', 'Bouaké', 'Daloa', 'San-Pédro', 'Korhogo', 'Man', 'Yamoussoukro', 'Gagnoa', 'Divo', 'Soubré', 'Abengourou', 'Séguéla'];
  function rnd(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

  async function seed(db) {
    const existing = await db.listDossiers();
    if (existing.length) return false;
    const r = rnd(42); const pick = (a) => a[Math.floor(r() * a.length)];
    const all = [];
    for (const c of CAS) all.push({ ...c, r: { ...base, ...c.r } });
    for (let i = 0; i < 44; i++) {
      /* les 4 derniers dossiers proviennent du vol affrété en cours d'accueil aujourd'hui */
      const live = i >= 40;
      const f = r() < 0.3; let co = corridor(r); const l = pick(LOCS); const age = 17 + Math.floor(r() * 25);
      const vul = r(); const sm = r() < 0.08; let jr = 3 + Math.floor(r() * 170);
      if (live) { co = CORR[0]; jr = 0.03 * (i - 39); }
      const retour = new Date(Date.now() - (live ? 0 : jr + 2) * 86400000); const absence = 6 + Math.floor(r() * 30);
      const depart = new Date(retour.getFullYear(), retour.getMonth() - absence, 1);
      const passeur = co.terre && r() < 0.6; const dette = r() < 0.38;
      const villeProv = co.path[co.path.length - 1][1].slice(-1)[0];
      all.push({ cas: null, live, jours: jr, profil: r() < 0.55 ? 'agent-dgie' : 'agent-oim', r: { ...base,
        'IDT-001': pick(NOMS), 'IDT-002': f ? pick(PRE_F) : pick(PRE_H), 'IDT-005': f ? 'Femme' : 'Homme', 'IDT-006': `${2026 - age}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
        'IDT-008': l, 'IDT-011': tel('07 ' + String(10 + Math.floor(r() * 89)) + ' ' + String(10 + Math.floor(r() * 89)) + ' ' + String(10 + Math.floor(r() * 89)) + ' ' + String(10 + Math.floor(r() * 89))),
        'IDT-016': r() < 0.85 ? 'Retour volontaire assisté' : 'Retour forcé', 'IDT-017': live ? 'Charter' : co.terre ? pick(['Charter', 'Charter', 'voie terrestre']) : 'Vol commercial', 'IDT-018': [r() < 0.6 ? 'OIM' : 'DGIE'],
        'IDT-019': retour.toISOString().slice(0, 10),
        'RES-001': l, 'RES-003': l, 'RES-004': { pays: co.prov, ville: villeProv }, 'RES-005': r() < 0.4 ? 'Abidjan' : l, 'RES-014': r() < 0.6 ? 'Oui' : 'Non',
        'EDU-001': pick(['Aucun', 'Primaire', 'Secondaire 1er cycle', 'Secondaire 2nd cycle', 'Supérieur']), 'PAR-001': depart.toISOString().slice(0, 7), 'PAR-002': l,
        'PAR-006': [pick(['Raisons économiques', 'Raisons économiques', 'Recherche d\'emploi', 'Recherche d\'emploi', 'Études', 'Raisons familiales'])], 'PAR-035': co.prov,
        'PAR-011': { montant: (co.terre ? 300 : 900) * 1000 + Math.floor(r() * 18) * 100000, devise: 'XOF' }, 'PAR-013': dette ? 'Oui' : 'Non', 'PAR-024': passeur ? 'Oui' : 'Non',
        'PAR-022': co.terre ? ['Car'] : ['Avion'], 'VUL-010': passeur && r() < 0.4 ? 'Oui' : 'Non',
        'VUL-025': vul < 0.07 ? 'Suspectée' : 'Non', 'VUL-014': vul > 0.85 ? 'Oui' : 'Non', 'SAN-001': sm ? 'Oui' : 'Non', 'SAN-004': sm ? 'Oui' : undefined, 'SAN-011': sm ? 'Oui' : 'Non',
        'PER-010': pick(['Agriculture', 'Commerce', 'Services', 'Artisanat', 'Transport', 'Construction']), 'BIM-001': [pick(['Logement', 'Alimentation', 'Santé', 'Hébergement'])],
        'ORI-003': pick(['Faible', 'Faible', 'Modéré', 'Élevé']), 'ORI-004': [pick(['Formation', 'Entrepreneuriat', 'Emploi salarié', 'Apprentissage'])],
        'PAR-012': [pick(['Épargne personnelle', 'Famille', 'Famille', 'Emprunt', 'Vente de biens'])], 'PAR-034': co.terre ? pick(['Italie', 'Italie', 'Espagne', 'France', co.prov]) : co.prov,
        'PRO-001': r() < 0.55 ? 'Oui' : 'Non', 'PRO-005': pick(['Agriculture', 'Commerce', 'Services', 'Construction', 'Transport']), 'PRO-003': 'Oui', 'PRO-009': { montant: 40000 + Math.floor(r() * 16) * 10000, devise: 'XOF' },
        'PAR-016': co.terre && r() < 0.35 ? 'Oui' : 'Non', 'PAR-018': r() < 0.7 ? 'Non' : 'Partiellement', 'VUL-019': r() < 0.2 ? 'Oui' : 'Non', 'VUL-021': r() < 0.12 ? 'Oui' : 'Non', 'VUL-015': r() < 0.3 ? 'Oui' : 'Non', 'VUL-016': r() < 0.2 ? 'Oui' : 'Non',
        'SAN-013': r() < 0.3 ? 'Oui' : 'Non', 'SAN-014': r() < 0.2 ? 'Oui' : 'Non', 'SAN-016': r() < 0.12 ? 'Oui' : 'Non', 'PER-004': pick(['Non', 'Non', 'Non', 'Peut-être', 'Oui']), 'PER-006': pick(['Non', 'Non', 'Peut-être']),
        'RES-008': [pick(['Chez la famille', 'Chez la famille', 'Chez des amis', 'Location', 'Sans domicile'])], 'SUI-001': [pick(['Transport', 'Kits', 'Alimentation', 'Hébergement'])], 'SUI-002': pick(['Suivi standard', 'Suivi standard', 'Sous 1 mois', 'Sous 2 semaines', 'Urgent']) },
        itin: { ci: [l, co.terre ? (co.path[0][0] === 'BF' ? 'Ouangolodougou' : 'Odienné') : 'Abidjan'].filter((x, i, a) => a.indexOf(x) === i), pays: co.path },
        refs: r() < 0.5 ? [{ destinataire: pick(['EJ', 'AGEFOP', 'DAIP']), type_service: 'INS', motif: 'Insertion socioprofessionnelle', statut: pick(M.STATUTS_REF) }] : [] });
    }
    all.sort((a, b) => b.jours - a.jours);
    const arrivees = preparerArrivees(all, r, pick);
    const crees = [];
    for (const c of all) {
      const p = M.PROFILS.find((x) => x.id === c.profil);
      const created = jours(c.jours); const synced = jours(Math.max(0, c.jours - 0.2));
      const d = { id: UI.uuid(), statut: 'Synchronisé', structure: p.structure, agent: p.nom, site: p.site, tablette: p.tablette, created_at: created, updated_at: synced, synced_at: synced,
        reponses: Object.fromEntries(Object.entries(c.r).filter(([, v]) => v !== undefined)), medias: { documents: [] }, cas: c.cas,
        itineraire: { ci: c.itin.ci.map(loc).filter(Boolean), pays: c.itin.pays.map(([cc, vs]) => pays(cc, vs)) } };
      d.reponses['ENT-001'] = created; d.reponses['ENT-002'] = p.site; d.reponses['ENT-003'] = p.nom; d.reponses['ENT-004'] = 'Enquêteur'; d.reponses['ENT-005'] = p.structure;
      d.reponses['SUI-004'] = 'Signée'; d.reponses['SUI-005'] = p.nom;
      Domaine.calculs(d, p);
      const n = await db.nextNumero(); const an = new Date(created).getFullYear();
      d.identifiant = Domaine.identifiant(an, n); d.identifiantProvisoire = `TMP-${p.tablette}-${String(n).padStart(4, '0')}`;
      if (c.arr) {
        const st = SITES.find((x) => x.id === (c.arr.type === 'Voie terrestre' ? c.arr.site_id : p.structure === 'OIM' && c.arr.type === 'Vol commercial' ? 'site-oim' : c.arr.site_id));
        d.arrivee_id = c.arr.id; d.site_id = st.id; d.site = st.nom; d.passager_id = c.pid; d.reponses['ENT-002'] = st.nom;
        const ps = c.arr.manifeste.find((x) => x.id === c.pid); Object.assign(ps, { dossier_id: d.id, agent: p.nom, structure: p.structure, site_id: st.id });
      }
      d.etat_suivi = 'Ouvert'; d.suivis = []; crees.push(d);
      d.historique = [{ date: created, par: p.nom, structure: p.structure, action: 'Entretien réalisé sur la tablette ' + p.tablette },
        { date: synced, par: p.nom, structure: p.structure, action: 'Synchronisation : identifiant national ' + d.identifiant + ' attribué' }];
      if (c.arr) { const ps = c.arr.manifeste.find((x) => x.id === c.pid); ps.identifiant = d.identifiant; }
      if (!c.live && c.jours > 6) d.valide = { par: 'Mariam Touré', date: jours(c.jours - 1) };
      await db.upsertDossier(d);
      for (const a of Domaine.alertesDeclenchees(d.reponses)) {
        await db.upsert('alertes', { id: UI.uuid(), dossier_id: d.id, identifiant: d.identifiant, regle: a.q, titre: a.titre, gravite: a.gravite, notifie: a.notifie, delai: a.delai, conduite: a.conduite,
          emetteur: p.structure, created_at: synced, statut: c.jours > 10 ? 'Prise en charge' : 'Ouverte', pris_par: c.jours > 10 ? (a.notifie[0] || 'DGIE') : null });
      }
      for (const x of c.refs) {
        const t = M.TYPES_SERVICE.find((y) => y.code === x.type_service);
        const idx = M.STATUTS_REF.indexOf(x.statut);
        const hist = M.STATUTS_REF.slice(0, x.statut === 'Refusé' ? 1 : Math.max(1, idx + 1)).filter((s) => s !== 'Refusé' || x.statut === 'Refusé').map((s, i) => ({ date: jours(Math.max(0, c.jours - 0.2 - i * 0.6)), statut: s, par: i === 0 ? p.structure : x.destinataire }));
        if (x.statut === 'Refusé') hist.push({ date: jours(Math.max(0, c.jours - 1)), statut: 'Refusé', par: x.destinataire, motif: 'Hors du champ de compétence' });
        await db.upsert('referencements', { id: UI.uuid(), dossier_id: d.id, identifiant: d.identifiant, beneficiaire: d.resume.nom + ' ' + d.resume.prenoms, emetteur: p.structure, destinataire: x.destinataire,
          type_service: x.type_service, motif: x.motif, statut: x.statut, created_at: synced, echeance_reception: new Date(new Date(synced).getTime() + t.reception * 3600000).toISOString(), historique: hist });
      }
    }
    await completer(db, crees, arrivees, r, pick);
    await db.upsert('audit', { id: UI.uuid(), created_at: new Date().toISOString(), profil: 'Système', role: '', structure: '', action: 'Initialisation', objet: 'Démonstration', detail: all.length + ' dossiers fictifs chargés' });
    return true;
  }
  /* ---------- Sites d'accueil et arrivées ---------- */
  const ABJ = 'District autonome d\'Abidjan';
  const SITES = [
    { id: 'site-fhb', code: 'SIT-01', nom: 'Aéroport international Félix-Houphouët-Boigny', type: 'Aéroport', localite: 'Port-Bouët, Abidjan', region: ABJ, ll: [5.2614, -3.9263], structures: ['DGIE', 'OIM', 'PNSM', 'DPE', 'CNLTP'], responsable: 'Mariam Touré (DGIE)', capacite: 300 },
    { id: 'site-oim', code: 'SIT-02', nom: 'Bureau OIM, Abidjan', type: 'Centre d\'accueil', localite: 'Cocody, Abidjan', region: ABJ, ll: [5.3596, -3.9869], structures: ['OIM', 'DGIE'], responsable: 'Jean-Marc Yao (OIM)', capacite: 60 },
    { id: 'site-bke', code: 'SIT-03', nom: 'Centre de transit de Bouaké', type: 'Centre d\'accueil', localite: 'Bouaké', region: 'Gbêkê', ll: [7.694, -5.03], structures: ['DGIE', 'OIM', 'DPE'], responsable: '[à confirmer]', capacite: 120 },
    { id: 'site-oua', code: 'SIT-04', nom: 'Poste frontière de Ouangolodougou', type: 'Poste frontière', localite: 'Ouangolodougou', region: 'Tchologo', ll: [9.968, -5.149], structures: ['DGIE', 'OIM', 'CNLTP'], responsable: '[à confirmer]', capacite: 80 },
    { id: 'site-noe', code: 'SIT-05', nom: 'Poste frontière de Noé', type: 'Poste frontière', localite: 'Noé', region: 'Sud-Comoé', ll: [5.297, -2.797], structures: ['DGIE', 'CNLTP'], responsable: '[à confirmer]', capacite: 40 },
    { id: 'site-dlo', code: 'SIT-06', nom: 'Antenne régionale de Daloa', type: 'Antenne régionale', localite: 'Daloa', region: 'Haut-Sassandra', ll: [6.877, -6.45], structures: ['DGIE', 'EJ', 'AGEFOP'], responsable: '[à confirmer]', capacite: 30 },
  ];
  const TYPE_ARR = (t) => (/terrestre/i.test(t || '') ? 'Voie terrestre' : /charter/i.test(t || '') ? 'Vol affrété' : 'Vol commercial');
  const semaine = (iso) => { const d = new Date(iso); return Math.floor((d - new Date(2026, 0, 5)) / (7 * 86400000)); };
  const PRESENTES = { 'Vol affrété': ['DGIE', 'OIM', 'PNSM', 'DPE', 'CNLTP'], 'Vol commercial': ['DGIE', 'OIM'], 'Voie terrestre': ['DGIE', 'OIM', 'CNLTP'] };
  const passager = (o) => ({ id: UI.uuid(), nom: '', prenoms: '', sexe: '', date_naissance: '', document: 'Laissez-passer', statut: 'Attendu', ticket: null, heure_arrivee: null, dossier_id: null, identifiant: null, agent: null, structure: null, site_id: null, priorite: '', ...o });

  /* Regroupe les dossiers fictifs en arrivées : vols affrétés par provenance et quinzaine, vols commerciaux et convois terrestres par semaine */
  function preparerArrivees(all, r, pick) {
    const groupes = {};
    for (const c of all) {
      const t = TYPE_ARR(c.r['IDT-017']); const ret = c.r['IDT-019'] || jours(c.jours).slice(0, 10);
      const prov = (c.r['RES-004'] && c.r['RES-004'].pays) || c.r['PAR-035'] || '';
      const k = c.live ? 'live' : t === 'Vol affrété' ? t + '|' + Math.floor(semaine(ret) / 4) + '|' + prov : t + '|' + Math.floor(semaine(ret) / 4);
      (groupes[k] = groupes[k] || { t, prov, ret, cs: [] }).cs.push(c);
      if (ret < groupes[k].ret) groupes[k].ret = ret;
    }
    const liste = Object.entries(groupes).sort((a, b) => a[1].ret.localeCompare(b[1].ret));
    const arr = []; let n = 0; let nv = 100;
    for (const [k, g] of liste) {
      n++; const live = k === 'live';
      const site = g.t === 'Voie terrestre' ? (g.cs.some((c) => /Ghana/.test(c.r['PAR-035'] || '')) ? 'site-noe' : 'site-oua') : 'site-fhb';
      const date = live ? new Date(new Date().setHours(8, 40, 0, 0)).toISOString() : g.ret + 'T' + pick(['06:15', '09:40', '14:05', '18:30', '22:10']) + ':00.000Z';
      const a = { id: live ? 'arr-live' : 'arr-' + n, code: 'ARR-' + date.slice(0, 4) + '-' + String(n).padStart(4, '0'), type: g.t, statut: live ? 'En cours' : 'Clôturée',
        numero: g.t === 'Vol affrété' ? 'CHT-' + (++nv) : g.t === 'Vol commercial' ? 'Vols réguliers (période)' : 'Convoi ' + (++nv),
        provenance: live ? 'Libye' : g.t === 'Vol commercial' ? 'Plusieurs pays' : g.prov, ville_provenance: live ? 'Tripoli' : '',
        date_prevue: date, date_reelle: live ? new Date(new Date().setHours(9, 5, 0, 0)).toISOString() : date, site_id: site,
        organisateur: g.t === 'Vol commercial' ? 'DGIE' : 'OIM', structures_presentes: live ? ['DGIE', 'OIM', 'PNSM', 'DPE', 'CNLTP'] : PRESENTES[g.t], manifeste: [], created_at: date, cree_par: 'Mariam Touré (DGIE)' };
      let ticket = 0;
      for (const c of g.cs) {
        const ps = passager({ nom: c.r['IDT-001'], prenoms: c.r['IDT-002'], sexe: c.r['IDT-005'], date_naissance: c.r['IDT-006'], document: c.r['RES-016'] ? 'Passeport' : 'Laissez-passer', statut: 'Enregistré', ticket: ++ticket, heure_arrivee: a.date_reelle });
        a.manifeste.push(ps); c.arr = a; c.pid = ps.id;
      }
      if (g.t === 'Vol affrété' && !live && r() < 0.6) a.manifeste.push(passager({ nom: pick(NOMS), prenoms: pick(PRE_H), sexe: 'Homme', statut: 'Absent' }));
      if (live) {
        const st = ['En entretien', 'En entretien', 'En entretien', 'En attente', 'En attente', 'En attente', 'En attente', 'En attente', 'En attente', 'En attente', 'Absent'];
        for (let i = 0; i < 24; i++) {
          const fem = r() < 0.32; const age = 16 + Math.floor(r() * 26);
          const statut = st[i] || 'Attendu'; const arrive = statut !== 'Attendu' && statut !== 'Absent';
          a.manifeste.push(passager({ nom: pick(NOMS), prenoms: fem ? pick(PRE_F) : pick(PRE_H), sexe: fem ? 'Femme' : 'Homme', date_naissance: `${2026 - age}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
            statut, ticket: arrive ? ++ticket : null, heure_arrivee: arrive ? new Date(new Date().setHours(9, 10 + i * 2, 0, 0)).toISOString() : null,
            agent: statut === 'En entretien' ? (i % 2 ? 'Jean-Marc Yao' : 'Awa Koné') : null, structure: statut === 'En entretien' ? (i % 2 ? 'OIM' : 'DGIE') : null,
            priorite: age < 18 ? 'Mineur' : i === 5 ? 'Femme enceinte' : i === 12 ? 'Besoin médical' : '' }));
        }
      }
      a.nb_attendus = a.manifeste.length;
      arr.push(a);
    }
    // convoi terrestre annoncé dans trois jours
    const prevu = { id: 'arr-prevue', code: 'ARR-' + new Date().getFullYear() + '-' + String(n + 1).padStart(4, '0'), type: 'Voie terrestre', statut: 'Prévue', numero: 'Convoi ' + (++nv), provenance: 'Niger', ville_provenance: 'Niamey',
      date_prevue: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) + 'T15:00:00.000Z', date_reelle: null, site_id: 'site-oua', organisateur: 'OIM', structures_presentes: ['DGIE', 'OIM', 'CNLTP', 'DPE'], manifeste: [], created_at: new Date().toISOString(), cree_par: 'Mariam Touré (DGIE)' };
    for (let i = 0; i < 12; i++) { const fem = r() < 0.3; prevu.manifeste.push(passager({ nom: pick(NOMS), prenoms: fem ? pick(PRE_F) : pick(PRE_H), sexe: fem ? 'Femme' : 'Homme', date_naissance: `${1985 + Math.floor(r() * 20)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}` })); }
    prevu.nb_attendus = prevu.manifeste.length; arr.push(prevu);
    return arr;
  }

  /* Sites, arrivées, transferts, validations, paramètres et rapports programmés */
  /* ---------- Doublons fictifs : une même personne enregistrée deux fois (règles R1 à R5), plus des homonymes à écarter ---------- */
  const sansAccent = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const SCENARIOS = [
    { regle: 'R1', titre: 'Même numéro de passeport, nom saisi sans accent', statut: 'À examiner', cond: (r) => /[ÉÈ]/.test(r['IDT-001']),
      orig: (o) => { o['RES-016'] = 'CI' + (2010000 + o._n * 37); }, copie: (o) => { o['IDT-001'] = sansAccent(o['IDT-001']); } },
    { regle: 'R2', titre: 'Même référence OIM, enrôlé par les deux structures le même jour', statut: 'À examiner',
      orig: (o) => { o['IDT-013'] = 'OIM-CI-2026-' + String(700 + o._n).padStart(4, '0'); }, copie: (o) => { o['IDT-002'] = o['IDT-002'].split(' ')[0]; } },
    { regle: 'R3', titre: 'Faute de frappe sur le nom, même date de naissance', statut: 'À examiner', cond: (r) => r['IDT-001'].length > 4,
      orig: () => {}, copie: (o) => { const n = o['IDT-001']; o['IDT-001'] = n.slice(0, 3) + n[2] + n.slice(3); } },
    { regle: 'R3', titre: 'Prénoms inversés, même date de naissance', statut: 'À examiner',
      orig: (o) => { o['IDT-002'] = o['IDT-002'] + ' Marie'; }, copie: (o) => { o['IDT-002'] = o['IDT-002'].split(' ').reverse().join(' '); } },
    { regle: 'R4', titre: 'Même téléphone, nom légèrement différent, naissance mal saisie', statut: 'À examiner',
      orig: () => {}, copie: (o) => { o['IDT-001'] = o['IDT-001'] + 'E'; o['IDT-006'] = (Number(o['IDT-006'].slice(0, 4)) + 2) + o['IDT-006'].slice(4); } },
    { regle: 'R5', titre: 'Même filiation (père et mère), année de naissance voisine', statut: 'À examiner',
      orig: (o) => { o['FAM-009'] = o['IDT-001']; o['FAM-010'] = 'Lassina'; o['FAM-015'] = 'COULIBALY'; o['FAM-016'] = 'Mariam'; },
      copie: (o) => { o['IDT-002'] = o['IDT-002'].split(' ')[0] + ' Junior'; o['IDT-006'] = (Number(o['IDT-006'].slice(0, 4)) + 1) + o['IDT-006'].slice(4); o['IDT-011'] = { ind: '+225', num: 'Inconnu' }; } },
    { regle: 'R1+R3', titre: 'Pièce, nom et naissance identiques : enrôlement en double certain', statut: 'À examiner',
      orig: (o) => { o['RES-016'] = 'C00' + (4513200 + o._n); }, copie: () => {} },
    { regle: 'Homonyme', titre: 'Homonymes : même nom et prénom, naissances différentes, parents différents', statut: 'À examiner',
      orig: (o) => { o['FAM-009'] = o['IDT-001']; o['FAM-015'] = 'KOUASSI'; }, copie: (o) => { o['IDT-006'] = (Number(o['IDT-006'].slice(0, 4)) - 1) + '-11-0' + (1 + (o._n % 8)); o['FAM-009'] = 'TRAORÉ'; o['FAM-015'] = 'BAMBA'; o['IDT-011'] = { ind: '+225', num: '05 11 22 33 44' }; o['IDT-008'] = 'Man'; } },
    { regle: 'R4', titre: 'Déjà traité : même personne, rattachée', statut: 'Confirmé, à rattacher',
      orig: () => {}, copie: (o) => { o['IDT-002'] = o['IDT-002'] + ' '; } },
    { regle: 'R3', titre: 'Déjà traité : personnes différentes (frères jumeaux)', statut: 'Écarté',
      orig: () => {}, copie: (o) => { o['IDT-002'] = o['IDT-002'].slice(0, -1) + (o['IDT-002'].slice(-1) === 'e' ? 'a' : 'e'); o['IDT-011'] = { ind: '+225', num: '01 98 76 54 32' }; } },
  ];
  async function seedDoublons(db, crees) {
    const dispo = crees.filter((d) => !d.cas && d.statut === 'Synchronisé' && d.reponses['IDT-006'] && !d.structure_responsable && (d.etat_suivi || 'Ouvert') === 'Ouvert');
    const pris = new Set(); const noms = new Set();
    const sources = SCENARIOS.map((sc) => { const ok = (d) => !pris.has(d.id) && !noms.has(d.reponses['IDT-001']) && (!sc.cond || sc.cond(d.reponses));
      const d = dispo.filter((x, i) => i % 2 === 1).find(ok) || dispo.find(ok); if (d) { pris.add(d.id); noms.add(d.reponses['IDT-001']); } return d; }).filter(Boolean);
    const PROF = { DGIE: M.PROFILS.find((x) => x.id === 'agent-oim'), OIM: M.PROFILS.find((x) => x.id === 'agent-dgie') };
    const nouveaux = [];
    for (let i = 0; i < sources.length; i++) {
      const sc = SCENARIOS[i]; const o = sources[i];
      o.reponses._n = i; sc.orig(o.reponses); delete o.reponses._n; Domaine.calculs(o); await db.upsertDossier(o);
      const p = PROF[o.structure] || PROF.DGIE;
      const decal = Math.max(0.3, (Date.now() - new Date(o.created_at)) / 86400000 - (i % 3 === 0 ? 0.1 : 1 + (i % 4)));
      const c = JSON.parse(JSON.stringify(o)); c.reponses._n = i; sc.copie(c.reponses); delete c.reponses._n;
      Object.assign(c, { id: UI.uuid(), structure: p.structure, agent: p.nom, tablette: p.tablette, created_at: jours(decal), synced_at: jours(Math.max(0.2, decal - 0.1)), updated_at: jours(Math.max(0.2, decal - 0.1)),
        passager_id: null, structure_responsable: null, valide: null, suivis: [], etat_suivi: 'Ouvert', cas: null });
      if (c.site_id === 'site-fhb' && p.structure === 'OIM' && sc.regle !== 'R2') { c.site_id = 'site-oim'; c.site = 'Bureau OIM, Abidjan'; }
      c.reponses['ENT-003'] = p.nom; c.reponses['ENT-005'] = p.structure; c.reponses['ENT-001'] = c.created_at;
      Domaine.calculs(c, p);
      const n = await db.nextNumero(); c.identifiant = Domaine.identifiant(new Date(c.created_at).getFullYear(), n); c.identifiantProvisoire = `TMP-${p.tablette}-${String(n).padStart(4, '0')}`;
      c.historique = [{ date: c.created_at, par: p.nom, structure: p.structure, action: 'Entretien réalisé sur la tablette ' + p.tablette },
        { date: c.synced_at, par: p.nom, structure: p.structure, action: 'Synchronisation : identifiant national ' + c.identifiant + ' attribué' },
        { date: c.synced_at, par: 'Plateforme', structure: '', action: 'Doublon possible signalé au superviseur : ' + o.identifiant }];
      await db.upsertDossier(c); nouveaux.push({ c, o, sc });
    }
    const tous = crees.concat(nouveaux.map((x) => x.c));
    for (const { c, o, sc } of nouveaux) {
      let cand = Domaine.doublons(c, tous).filter((x) => x.score >= 55);
      if (!cand.some((x) => x.dossier.id === o.id)) cand.unshift({ dossier: o, score: 62, regles: ['R3 — noms identiques, naissance différente (homonymie possible)'] });
      const traite = sc.statut !== 'À examiner';
      await db.upsert('doublons', { id: UI.uuid(), dossier_id: c.id, identifiant: c.identifiant, scenario: sc.titre, candidats: cand.slice(0, 3).map((x) => ({ id: x.dossier.id, identifiant: x.dossier.identifiant, score: x.score, regles: x.regles })),
        statut: sc.statut, created_at: c.synced_at, decide_par: traite ? 'Mariam Touré (DGIE)' : null, decision_le: traite ? jours(1) : null, decision_motif: traite ? (sc.statut === 'Écarté' ? 'Jumeaux : actes de naissance distincts vérifiés.' : 'Même personne confirmée par la pièce et le téléphone.') : null });
      if (sc.statut === 'Confirmé, à rattacher') { c.etat_suivi = 'Clôturé'; c.historique.push({ date: jours(1), par: 'Mariam Touré', structure: 'DGIE', action: 'Doublon confirmé : dossier rattaché à ' + o.identifiant + ' (dossier principal)' }); c.rattache_a = o.identifiant; await db.upsertDossier(c); }
    }
  }

  async function completer(db, crees, arrivees, r, pick) {
    for (const s of SITES) await db.upsert('sites', { ...s, statut: 'Actif', created_at: jours(200) });
    for (const a of arrivees) await db.upsert('arrivees', a);
    await db.upsert('parametres', { id: 'validations', created_at: jours(200), validation_dossier: true, transfert: true, cloture: true, fusion: true, relance_jours: 7 });
    const ap = (o) => db.upsert('approbations', { id: UI.uuid(), statut: 'En attente', created_at: new Date().toISOString(), ...o });
    // validations de dossiers en attente (dossiers récents)
    for (const d of crees.filter((x) => !x.valide).slice(0, 7)) await ap({ type: 'Validation du dossier', dossier_id: d.id, identifiant: d.identifiant, structure: d.structure, demande_par: d.agent, motif: 'Dossier synchronisé depuis la tablette ' + d.tablette, created_at: d.synced_at });
    /* ---------- Première phase ONECI en attente de reprise par la DGIE ----------
       L'ONECI tient l'état civil : il ouvre le dossier (sections I à V), puis passe la main.
       Tant que personne ne reprend, le dossier n'existe PAS dans la base des dossiers — il vit
       dans la table « relais ». C'est ce que la colonne « Identification » du pipeline montre. */
    const AGENT_ONECI = { nom: 'Adjoua Kouassi', structure: 'ONECI', tablette: 'TAB-ONECI-02', site: 'Aéroport FHB, Abidjan' };
    const EN_COURS = [
      { nom: 'KOUADIO', prenoms: 'Affoué Nadège', sexe: 'Femme', naiss: '1994-03-12', prov: 'Libye', heures: 3, vers: 'DGIE' },
      { nom: 'BAMBA', prenoms: 'Souleymane', sexe: 'Homme', naiss: '1989-11-02', prov: 'Tunisie', heures: 9, vers: 'DGIE' },
      { nom: 'ZADI', prenoms: 'Gnoan Prisca', sexe: 'Femme', naiss: '2007-06-25', prov: 'Niger', heures: 28, vers: 'DGIE' },
      { nom: 'OUATTARA', prenoms: 'Lassina', sexe: 'Homme', naiss: '1998-01-30', prov: 'Algérie', heures: 51, vers: 'DGIE' },
      { nom: 'TANO', prenoms: 'Ama Sylvie', sexe: 'Femme', naiss: '1992-09-17', prov: 'Maroc', heures: 5, vers: 'OIM' },
    ];
    const arrEnCours = arrivees.find((a) => a.statut === 'En cours') || arrivees[0];
    let seqOneci = 0;
    for (const x of EN_COURS) {
      seqOneci += 1;
      const quand = new Date(Date.now() - x.heures * 3600000).toISOString();
      const tmp = `TMP-${AGENT_ONECI.tablette}-${String(seqOneci).padStart(4, '0')}`;
      /* Dossier partiel : seules les sections d'identité sont renseignées. */
      const dossier = {
        id: UI.uuid(), statut: 'Relayé', structure: AGENT_ONECI.structure, agent: AGENT_ONECI.nom,
        site: AGENT_ONECI.site, tablette: AGENT_ONECI.tablette, identifiantProvisoire: tmp,
        created_at: quand, updated_at: quand, arrivee_id: arrEnCours ? arrEnCours.id : null, passager_id: null,
        resume: { nom: x.nom, prenoms: x.prenoms, sexe: x.sexe, provenance: x.prov },
        reponses: { 'ENT-001': quand, 'ENT-002': AGENT_ONECI.site, 'ENT-003': AGENT_ONECI.nom, 'ENT-004': 'Enquêteur',
          'ENT-005': AGENT_ONECI.structure, 'ENT-009': 'Oui',
          'IDT-001': x.nom, 'IDT-002': x.prenoms, 'IDT-005': x.sexe, 'IDT-006': x.naiss },
        medias: { documents: [] }, drapeaux: {},
        contributions: [{ structure: AGENT_ONECI.structure, agent: AGENT_ONECI.nom, tablette: AGENT_ONECI.tablette, sections: ['I', 'II', 'III', 'IV', 'V'], date: quand }],
        historique: [{ date: quand, par: AGENT_ONECI.nom, structure: AGENT_ONECI.structure, action: 'Identification et biométrie réalisées' },
          { date: quand, par: AGENT_ONECI.nom, structure: AGENT_ONECI.structure, action: 'Relais passé à ' + x.vers + ' (sections I, II, III, IV, V renseignées)' }],
      };
      await db.upsert('relais', { id: dossier.id, dossier, nom: x.nom + ' ' + x.prenoms,
        de: AGENT_ONECI.structure, de_agent: AGENT_ONECI.nom, de_tablette: AGENT_ONECI.tablette,
        vers: x.vers, sections: ['I', 'II', 'III', 'IV', 'V'],
        note: 'État civil vérifié et biométrie prise. Reste le parcours migratoire et la vulnérabilité.',
        arrivee_id: dossier.arrivee_id, passager_id: null, statut: 'En attente', created_at: quand });
    }

    const ord = crees.filter((d) => !d.cas && d.valide);
    // transfert reçu par Emploi Jeune (déjà validé par le superviseur)
    const t1 = ord.find((d) => d.structure === 'OIM');
    if (t1) await db.upsert('transferts', { id: UI.uuid(), dossier_id: t1.id, identifiant: t1.identifiant, beneficiaire: t1.resume.nom + ' ' + t1.resume.prenoms, de: 'OIM', vers: 'EJ', motif: 'Projet d\'insertion professionnelle : la suite du dossier est confiée à l\'Agence Emploi Jeunes.', statut: 'Demandé', demande_par: 'Jean-Marc Yao', created_at: jours(2), historique: [{ date: jours(2), statut: 'Demandé', par: 'OIM' }] });
    // transfert en attente de validation du superviseur DGIE
    const t2 = ord.find((d) => d.structure === 'DGIE');
    if (t2) {
      const id = UI.uuid();
      await db.upsert('transferts', { id, dossier_id: t2.id, identifiant: t2.identifiant, beneficiaire: t2.resume.nom + ' ' + t2.resume.prenoms, de: 'DGIE', vers: 'AGEFOP', motif: 'Formation qualifiante demandée par le migrant ; suivi confié à l\'AGEFOP.', statut: 'En attente de validation', demande_par: 'Awa Koné', created_at: jours(1), historique: [{ date: jours(1), statut: 'En attente de validation', par: 'DGIE' }] });
      await ap({ type: 'Transfert', objet_id: id, dossier_id: t2.id, identifiant: t2.identifiant, structure: 'DGIE', demande_par: 'Awa Koné', motif: 'Transfert vers AGEFOP', created_at: jours(1) });
    }
    // transfert accepté : la CNLTP devient structure responsable du cas C3
    const c3 = crees.find((d) => d.cas === 'C3');
    if (c3) {
      await db.upsert('transferts', { id: UI.uuid(), dossier_id: c3.id, identifiant: c3.identifiant, beneficiaire: c3.resume.nom + ' ' + c3.resume.prenoms, de: 'DGIE', vers: 'CNLTP', motif: 'Traite présumée : prise en charge complète par la CNLTP.', statut: 'Accepté', demande_par: 'Awa Koné', created_at: jours(10), historique: [{ date: jours(10), statut: 'Demandé', par: 'DGIE' }, { date: jours(9.5), statut: 'Accepté', par: 'CNLTP' }] });
      c3.structure_responsable = 'CNLTP'; c3.historique.push({ date: jours(9.5), par: 'Ibrahim Sanogo', structure: 'CNLTP', action: 'Transfert accepté : la CNLTP devient structure responsable du dossier' });
      await db.upsertDossier(c3);
    }
    // demande de clôture en attente
    const cl = ord.filter((d) => d.structure === 'DGIE')[3];
    if (cl) {
      cl.etat_suivi = 'Clôture demandée'; cl.historique.push({ date: jours(1), par: 'Awa Koné', structure: 'DGIE', action: 'Clôture du suivi demandée : réinsertion achevée' });
      await db.upsertDossier(cl);
      await ap({ type: 'Clôture', dossier_id: cl.id, identifiant: cl.identifiant, structure: 'DGIE', demande_par: 'Awa Koné', motif: 'Réinsertion achevée, activité génératrice de revenus en place.', created_at: jours(1) });
    }
    // quelques suivis déjà réalisés
    for (const d of ord.slice(0, 12)) {
      d.suivis = [{ id: UI.uuid(), date: jours(Math.max(1, (Date.now() - new Date(d.synced_at)) / 86400000 - 8)), par: d.agent, structure: d.structure, type: pick(['Appel téléphonique', 'Visite à domicile', 'Entretien au bureau']), note: pick(['Situation stable.', 'Recherche d\'emploi en cours.', 'Orientation vers une formation acceptée.', 'Besoin d\'un appui au logement signalé.']) }];
      await db.upsertDossier(d);
    }
    // canal de diffusion
    const prev = arrivees.find((a) => a.id === 'arr-prevue'); const live = arrivees.find((a) => a.id === 'arr-live');
    await db.upsert('annonces', { id: UI.uuid(), categorie: 'Arrivée annoncée', importance: 'Importante', arrivee_id: prev.id, cibles: ['*'], titre: 'Convoi terrestre attendu dans 3 jours au poste frontière de Ouangolodougou',
      message: 'Un convoi organisé par l\'OIM en provenance de Niamey (Niger) est attendu le ' + UI.fmtDate(prev.date_prevue, true) + ' avec ' + prev.manifeste.length + ' personnes, dont plusieurs jeunes adultes. Présence souhaitée : DGIE, OIM, CNLTP et DPE. Le manifeste est disponible sur la fiche de l\'arrivée.', auteur: 'Mariam Touré', structure: 'DGIE', created_at: jours(0.6), lu_par: [], epingle: true });
    await db.upsert('annonces', { id: UI.uuid(), categorie: 'Arrivée annoncée', importance: 'Urgente', arrivee_id: live.id, cibles: ['DGIE', 'OIM', 'PNSM', 'DPE', 'CNLTP'], titre: 'Vol affrété en provenance de Tripoli : accueil en cours à l\'aéroport FHB',
      message: 'Le vol ' + live.numero + ' s\'est posé ce matin. ' + live.manifeste.length + ' passagers, dont des mineurs et une femme enceinte. Le PNSM et la DPE sont attendus au poste d\'accueil pour les situations prioritaires.', auteur: 'Administration générale', structure: 'DGIE', created_at: jours(0.15), lu_par: [], epingle: true });
    await db.upsert('annonces', { id: UI.uuid(), categorie: 'Réunion de coordination', importance: 'Normale', cibles: ['*'], titre: 'Réunion mensuelle des points focaux de la plateforme',
      message: 'La prochaine réunion des points focaux se tiendra à la DGIE [date et salle à confirmer]. Ordre du jour : délais de réception des référencements, qualité des données, retours sur les nouvelles fonctionnalités.', auteur: 'Administration générale', structure: 'DGIE', created_at: jours(3), lu_par: [], epingle: false });
    await db.upsert('annonces', { id: UI.uuid(), categorie: 'Consigne opérationnelle', importance: 'Normale', cibles: ['DGIE', 'OIM'], titre: 'Rappel : synchroniser les tablettes avant 18 h',
      message: 'Les entretiens réalisés sur le terrain doivent être synchronisés le jour même afin que les structures partenaires reçoivent les référencements et les alertes dans les délais.', auteur: 'Mariam Touré', structure: 'DGIE', created_at: jours(6), lu_par: [], epingle: false });
    // entretien à plusieurs mains déjà synchronisé, et relais en attente dans la file du vol affrété
    const oim = M.PROFILS.find((x) => x.id === 'agent-oim');
    const mix = crees.find((d) => d.arrivee_id === 'arr-live' && d.structure === 'DGIE');
    if (mix) {
      mix.contributions = [{ structure: 'OIM', agent: oim.nom, tablette: oim.tablette, sections: ['I', 'II'], date: jours(0.05) }, { structure: 'DGIE', agent: mix.agent, tablette: mix.tablette, sections: Object.keys(M.SECTIONS).filter((x) => !['I', 'II'].includes(x)), date: mix.synced_at }];
      mix.historique.splice(1, 0, { date: jours(0.05), par: oim.nom, structure: 'OIM', action: 'Relais passé à DGIE (sections I, II renseignées)' }, { date: jours(0.04), par: mix.agent, structure: 'DGIE', action: 'Reprise du relais de OIM (' + oim.nom + ')' });
      await db.upsertDossier(mix);
    }
    const lv = arrivees.find((a) => a.id === 'arr-live'); const px = lv && lv.manifeste.find((x) => x.statut === 'Attendu');
    if (px) {
      const now = new Date().toISOString(); const id = UI.uuid();
      const d = { id, statut: 'Brouillon', structure: 'OIM', agent: oim.nom, site: 'Aéroport international Félix-Houphouët-Boigny', tablette: oim.tablette, identifiantProvisoire: 'TMP-' + oim.tablette + '-0099', arrivee_id: lv.id, arrivee_code: lv.code, site_id: lv.site_id, passager_id: px.id,
        created_at: jours(0.02), updated_at: now, medias: { documents: [] }, itineraire: { ci: [], pays: [] }, referencementsProposes: [], alertes: [],
        reponses: { 'ENT-006': base['ENT-006'], 'ENT-007': 'Non', 'ENT-009': 'Oui', 'ENT-010': 'Oui', 'ENT-011': 'Oui', 'IDT-001': px.nom, 'IDT-002': px.prenoms, 'IDT-005': px.sexe, 'IDT-006': px.date_naissance, 'IDT-008': 'Bouaké', 'IDT-009': "Côte d'Ivoire", 'IDT-010': "Côte d'Ivoire",
          'IDT-011': tel('07 55 41 20 18'), 'IDT-015': 'MPRR', 'IDT-016': 'Retour volontaire assisté', 'IDT-017': 'Charter', 'IDT-018': ['OIM'], 'IDT-019': now.slice(0, 10) },
        contributions: [{ structure: 'OIM', agent: oim.nom, tablette: oim.tablette, sections: ['I', 'II'], date: jours(0.01) }],
        historique: [{ date: jours(0.02), par: oim.nom, structure: 'OIM', action: 'Ouverture de l\'entretien sur la tablette ' + oim.tablette + ' — arrivée ' + lv.code }, { date: jours(0.01), par: oim.nom, structure: 'OIM', action: 'Relais passé à DGIE (sections I, II renseignées) : identification faite, reste le parcours et la vulnérabilité' }] };
      Domaine.calculs(d, oim);
      await db.upsert('relais', { id, dossier: d, nom: px.nom + ' ' + px.prenoms, de: 'OIM', de_agent: oim.nom, de_tablette: oim.tablette, vers: 'DGIE', sections: ['I', 'II'], note: 'Identification faite, reste le parcours et la vulnérabilité', arrivee_id: lv.id, passager_id: px.id, statut: 'En attente', created_at: jours(0.01) });
      Object.assign(px, { statut: 'Relais', ticket: Math.max(0, ...lv.manifeste.map((y) => y.ticket || 0)) + 1, heure_arrivee: jours(0.03), relais: { de: 'OIM', vers: 'DGIE', sections: ['I', 'II'], agent: oim.nom, date: jours(0.01) } });
      await db.upsert('arrivees', lv);
    }
    await seedDoublons(db, crees);
    await db.upsert('rapports', { id: UI.uuid(), nom: 'Retours du mois par sexe', indicateur: 'vol', ventilation: 'sexe', filtres: {}, format: 'pdf', periodicite: 'Mensuelle', jour: 1, destinataires: ['DGIE', 'OIM'], actif: true, cree_par: 'Administration générale', created_at: jours(60), historique: [{ date: jours(5), statut: 'Envoyé', fichier: 'indicateur_vol.pdf' }, { date: jours(35), statut: 'Envoyé', fichier: 'indicateur_vol.pdf' }] });
    await db.upsert('rapports', { id: UI.uuid(), nom: 'Pays de provenance (hebdomadaire)', indicateur: 'provenance', ventilation: '', filtres: {}, format: 'xlsx', periodicite: 'Hebdomadaire', jour: 1, destinataires: ['DGIE'], actif: true, cree_par: 'Mariam Touré', created_at: jours(30), historique: [{ date: jours(3), statut: 'Envoyé', fichier: 'indicateur_provenance.xlsx' }] });
  }
  window.Seed = { seed, CAS, SITES };
})();
