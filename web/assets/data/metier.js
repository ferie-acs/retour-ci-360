/* Configuration métier du POC — propositions issues des schémas directeurs (à valider en atelier) */
(function () {
  const G = window.METIER_GEN;
  const SECTIONS = {
    I: 'Informations préliminaires et entretien', II: 'Identification du migrant', III: 'Filiation et composition familiale',
    IV: 'Origine, résidence et logement', V: 'Identification biométrique', VI: 'Éducation, formation et compétences',
    VII: 'Situation professionnelle', VIII: 'Parcours migratoire', IX: 'Vulnérabilités et protection', X: 'État de santé et bien-être',
    XI: 'Retour et perspectives', XII: 'Besoins immédiats', XIII: "Besoins d'accompagnement et orientation",
    XIV: 'Analyse, orientation et recommandations', XV: 'Suivi et assistance accordée',
  };
  const PROFILS = [
    { id: 'agent-dgie', nom: 'Awa Koné', role: 'agent', roleLabel: 'Agent enquêteur', structure: 'DGIE', site: 'Aéroport FHB, Abidjan', espace: 'agent', tablette: 'TAB-DGIE-01' },
    { id: 'agent-oim', nom: 'Jean-Marc Yao', role: 'agent', roleLabel: 'Agent enquêteur', structure: 'OIM', site: 'Bureau OIM, Abidjan', espace: 'agent', tablette: 'TAB-OIM-03' },
    { id: 'sup-dgie', nom: 'Mariam Touré', role: 'superviseur', roleLabel: 'Superviseure', structure: 'DGIE', site: 'Abidjan', espace: 'portail' },
    { id: 'admin', nom: 'Administration générale', role: 'admin', roleLabel: 'Administrateur général', structure: 'DGIE', site: 'Abidjan', espace: 'portail' },
    { id: 'gc-ej', nom: 'Koffi Brou', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'EJ', espace: 'portail' },
    { id: 'gc-agefop', nom: 'Fatou Diabaté', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'AGEFOP', espace: 'portail' },
    { id: 'gc-delc', nom: 'Serge Kouamé', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'DELC', espace: 'portail' },
    { id: 'gc-dpe', nom: 'Aminata Coulibaly', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'DPE', espace: 'portail' },
    { id: 'gc-pnsm', nom: 'Dr Éric N\'Guessan', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'PNSM', espace: 'portail' },
    { id: 'gc-dmhp', nom: 'Dr Clarisse Aka', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'DMHP', espace: 'portail' },
    { id: 'gc-cnltp', nom: 'Ibrahim Sanogo', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'CNLTP', espace: 'portail' },
    { id: 'gc-oneci', nom: 'Paul Gnagne', role: 'gestionnaire', roleLabel: 'Gestionnaire de cas', structure: 'ONECI', espace: 'portail' },
  ];
  const ALERTES = [
    { q: 'SAN-009', v: ['Oui'], gravite: 'Critique', notifie: ['PNSM'], delai: 'Immédiat', titre: 'Pensées suicidaires',
      conduite: "Ne pas laisser la personne seule. Orienter immédiatement vers une prise en charge. Appliquer la procédure d'urgence [à confirmer]." },
    { q: 'SAN-010', v: ['Oui'], gravite: 'Critique', notifie: ['PNSM'], delai: 'Immédiat', titre: 'Automutilation',
      conduite: "Ne pas laisser la personne seule. Orienter immédiatement vers une prise en charge. Appliquer la procédure d'urgence [à confirmer]." },
    { q: 'VUL-027', v: ['Oui'], gravite: 'Critique', notifie: ['DPE'], delai: 'Immédiat', titre: 'Mineur non accompagné',
      conduite: "Déclencher le parcours particulier des mineurs non accompagnés. Limiter l'enregistrement aux informations validées. Aucune photo sans décision paramétrée." },
    { q: 'VUL-028', v: ['Oui'], gravite: 'Critique', notifie: ['DPE'], delai: 'Immédiat', titre: 'Enfant séparé',
      conduite: "Déclencher le parcours particulier. Limiter l'enregistrement aux informations validées. Aucune photo sans décision paramétrée." },
    { q: 'VUL-025', v: ['Oui', 'Suspectée'], gravite: 'Élevée', notifie: ['CNLTP'], delai: '24 heures', titre: 'Traite des personnes',
      conduite: "Poursuivre l'entretien en confidentialité. Ne pas confronter la personne aux auteurs présumés. Renseigner les indicateurs de traite (ORI-001)." },
    { q: 'VUL-018', v: ['Oui'], gravite: 'Élevée', notifie: ['CNLTP', 'DMHP'], delai: '24 heures', titre: 'Exploitation sexuelle',
      conduite: 'Poursuivre en confidentialité. Proposer une prise en charge médicale et psychologique.' },
    { q: 'SAN-012', v: ['Oui'], gravite: 'Élevée', notifie: ['PNSM'], delai: '24 heures', titre: 'Hallucinations',
      conduite: 'Orienter vers une évaluation en santé mentale.' },
    { q: 'VUL-026', v: ['Oui', 'Suspecté'], gravite: 'Modérée', notifie: [], delai: '72 heures', titre: 'Trafic illicite de migrants',
      conduite: 'Renseigner les indicateurs de trafic (ORI-002). Structure compétente à désigner.' },
    { q: 'VUL-014', v: ['Oui'], gravite: 'Modérée', notifie: ['DMHP'], delai: '48 heures', titre: 'Violences physiques',
      conduite: 'Proposer une prise en charge médicale.' },
    { q: 'SAN-004', v: ['Oui'], gravite: 'Modérée', notifie: ['DMHP'], delai: '48 heures', titre: "Besoin d'assistance médicale",
      conduite: 'Orienter vers une structure de santé.' },
  ];
  const TYPES_SERVICE = [
    { code: 'PROT', label: 'Protection (mineur, victime présumée de traite)', reception: 24, decision: 48 },
    { code: 'MED', label: 'Prise en charge médicale', reception: 24, decision: 72 },
    { code: 'PSY', label: 'Soutien psychosocial et santé mentale', reception: 48, decision: 120 },
    { code: 'BIM', label: 'Besoins immédiats : hébergement, alimentation, transport', reception: 24, decision: 48 },
    { code: 'JUR', label: 'Assistance juridique et documentaire', reception: 120, decision: 240 },
    { code: 'INS', label: 'Emploi, formation, apprentissage, entrepreneuriat, service civique', reception: 120, decision: 360 },
  ];
  const STATUTS_REF = ['Émis', 'Reçu', 'Accepté', 'Refusé', 'En cours de prise en charge', 'Clôturé'];
  window.METIER = { ...G, SECTIONS, PROFILS, ALERTES, TYPES_SERVICE, STATUTS_REF };
})();
