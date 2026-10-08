/* Règles métier : identifiant, âge et catégorie, conditions d'affichage, alertes, doublons, habilitations */
(function () {
  const M = window.METIER;
  const DICO = window.DICO;
  const Q = Object.fromEntries(DICO.map((q) => [q.code, q]));
  const D = { Q };

  /* Identifiant national : RCI-AAAA-NNNNNN-C, chiffre de contrôle de Luhn */
  D.luhn = function (digits) {
    let sum = 0; let dbl = true;
    for (let i = digits.length - 1; i >= 0; i--) { let n = +digits[i]; if (dbl) { n *= 2; if (n > 9) n -= 9; } sum += n; dbl = !dbl; }
    return (10 - (sum % 10)) % 10;
  };
  D.identifiant = function (annee, numero) {
    const n = String(numero).padStart(6, '0');
    return `RCI-${annee}-${n}-${D.luhn(annee + n)}`;
  };
  D.verifIdentifiant = (id) => { const m = /^RCI-(\d{4})-(\d{6})-(\d)$/.exec(id || ''); return !!m && D.luhn(m[1] + m[2]) === +m[3]; };

  /* Âge et catégorie */
  D.age = function (r) {
    const dn = r['IDT-006'];
    if (dn) { const b = new Date(dn); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const mm = t.getMonth() - b.getMonth(); if (mm < 0 || (mm === 0 && t.getDate() < b.getDate())) a--; return a; }
    const e = r['IDT-007']; return e !== undefined && e !== '' && e !== null ? +e : null;
  };
  D.calculs = function (d, profil) {
    const r = d.reponses;
    const age = D.age(r);
    if (r['IDT-006']) r['IDT-007'] = age;
    if (age !== null) r['ENT-008'] = age < 18 ? 'Mineur (0-17 ans)' : 'Adulte (18 ans +)';
    if (age !== null) r['VUL-006'] = age >= 60 ? 'Oui' : 'Non';
    r['VUL-009'] = r['SAN-011'];
    const reg = (code) => { const l = window.REF.localitesCI.find((x) => x.n === r[code]); return l ? l.r : r[code + '_region'] || undefined; };
    if (r['RES-001']) r['RES-002'] = reg('RES-001');
    if (r['RES-005']) r['RES-006'] = reg('RES-005');
    const it = d.itineraire;
    if (it && it.ci && it.ci.length) r['PAR-004'] = it.ci[it.ci.length - 1].n;
    if (it) r['PAR-021'] = (it.pays || []).map((p) => p.nom + (p.villes.length ? ' (' + p.villes.map((v) => v.n).join(', ') + ')' : '')).join(' ; ');
    if (profil) { r['ENT-003'] = r['ENT-003'] || profil.nom; r['ENT-004'] = r['ENT-004'] || 'Enquêteur'; r['ENT-005'] = r['ENT-005'] || profil.structure; r['ENT-002'] = r['ENT-002'] || profil.site; }
    r['ENT-001'] = r['ENT-001'] || d.created_at;
    d.resume = { nom: r['IDT-001'] || '', prenoms: r['IDT-002'] || '', sexe: r['IDT-005'] || '', date_naissance: r['IDT-006'] || '', age,
      categorie: r['ENT-008'] || '', region_retour: r['RES-006'] || '', localite_retour: r['RES-005'] || '', provenance: (r['RES-004'] || {}).pays || '',
      telephone: r['IDT-011'] ? r['IDT-011'].ind + ' ' + r['IDT-011'].num : '', piece: r['RES-016'] || '', ref_oim: r['IDT-013'] || '' };
    d.drapeaux = {
      mineur: age !== null && age < 18, age_scolaire: age !== null && age > 3 && age < 18,
      mna: r['VUL-027'] === 'Oui' || r['VUL-028'] === 'Oui', traite: ['Oui', 'Suspectée'].includes(r['VUL-025']),
      sante_mentale: ['Oui'].includes(r['SAN-009']) || r['SAN-010'] === 'Oui' || r['SAN-012'] === 'Oui',
    };
    return d;
  };

  /* Conditions d'affichage issues du dictionnaire */
  D.visible = function (q, r, d) {
    if (q.widget === 'hidden') return false;
    const c = q.cond; if (!c) return true;
    const test = (a) => {
      const v = a.q === '_age' ? D.age(r) : r[a.q];
      switch (a.op) {
        case 'in': return a.v.includes(v === undefined ? null : v);
        case 'nin': return !a.v.includes(v === undefined ? null : v);
        case 'gt': return v !== undefined && v !== '' && +v > a.v;
        case 'ge': return v !== null && v !== undefined && +v >= a.v;
        case 'contains': return Array.isArray(v) ? v.some((x) => String(x).includes(a.v)) : String(v || '').includes(a.v);
        case 'ne_q': return !!v && !!r[a.v] && v !== r[a.v];
        default: return true;
      }
    };
    if (c.all) return c.all.every(test);
    if (c.any) return c.any.some(test);
    return true;
  };
  D.obligatoire = (q, r) => q.car === 'O' || (q.car === 'C' && q.widget !== 'auto' && /Obligatoire si ENT-008 = Mineur/.test(q.condText || '') && r['ENT-008'] === 'Mineur (0-17 ans)');
  D.estVide = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && v.num === '');

  /* Alertes déclenchées par les réponses */
  D.alertesDeclenchees = (r) => M.ALERTES.filter((a) => a.v.includes(r[a.q]));

  /* Doublons : règles R1 à R5 (score indicatif) */
  const lev = (a, b) => {
    a = UI.norm(a).replace(/[^a-z]/g, ''); b = UI.norm(b).replace(/[^a-z]/g, '');
    if (!a || !b) return 0;
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - m[a.length][b.length] / Math.max(a.length, b.length);
  };
  /* Prénoms : comparaison globale, ou mot à mot quand un prénom est omis (« Akissi » / « Akissi Marie ») */
  const levPrenoms = (a, b) => {
    const ta = UI.norm(a).split(/[\s-]+/).filter(Boolean), tb = UI.norm(b).split(/[\s-]+/).filter(Boolean);
    const [p, g] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    const motAMot = p.length ? p.reduce((s, x) => s + Math.max(...g.map((y) => lev(x, y))), 0) / p.length : 0;
    return Math.max(lev(a, b), motAMot * 0.95);
  };
  D.doublons = function (d, tous) {
    const r = d.reponses; const out = [];
    for (const x of tous) {
      if (x.id === d.id) continue;
      const s = x.reponses || {}; const regles = []; let score = 0;
      if (r['RES-016'] && s['RES-016'] && UI.norm(r['RES-016']) === UI.norm(s['RES-016'])) { regles.push('R1 — même numéro de pièce'); score = 100; }
      if (r['IDT-013'] && s['IDT-013'] && r['IDT-013'] === s['IDT-013']) { regles.push('R2 — même Référence OIM'); score = 100; }
      const nom = lev(r['IDT-001'], s['IDT-001']), pre = levPrenoms(r['IDT-002'], s['IDT-002']);
      const memeDate = r['IDT-006'] && s['IDT-006'] && r['IDT-006'] === s['IDT-006'];
      const anProche = r['IDT-006'] && s['IDT-006'] && Math.abs(new Date(r['IDT-006']).getFullYear() - new Date(s['IDT-006']).getFullYear()) <= 1;
      if (nom > 0.75 && pre > 0.6 && (memeDate || anProche)) { regles.push('R3 — noms proches et naissance proche'); score = Math.max(score, Math.round(40 + 30 * nom + 20 * pre + (memeDate ? 10 : 0))); }
      if (r['IDT-011'] && s['IDT-011'] && r['IDT-011'].num && r['IDT-011'].num === s['IDT-011'].num && nom > 0.7) { regles.push('R4 — même téléphone'); score = Math.max(score, 85); }
      if (r['FAM-009'] && s['FAM-009'] && r['FAM-015'] && s['FAM-015'] && lev(r['FAM-009'], s['FAM-009']) > 0.8 && lev(r['FAM-015'], s['FAM-015']) > 0.8 && anProche) { regles.push('R5 — même filiation'); score = Math.max(score, 80); }
      if (regles.length) out.push({ dossier: x, score: Math.min(score, 100), regles });
    }
    return out.sort((a, b) => b.score - a.score);
  };

  /* Habilitations : la structure est-elle concernée par le dossier, et quels droits sur chaque section ? */
  D.concerne = function (p, d, refs, alertes) {
    if (p.role === 'admin' || (['superviseur', 'responsable'].includes(p.role) && p.structure === d.structure)) return 'Supervision';
    if (d.structure === p.structure) return 'Structure d\'enrôlement';
    if (d.structure_responsable && d.structure_responsable === p.structure) return 'Dossier transféré';
    if ((refs || []).some((x) => x.dossier_id === d.id && x.destinataire === p.structure)) return 'Référencement reçu';
    if ((alertes || []).some((a) => a.dossier_id === d.id && (a.notifie || []).includes(p.structure))) return 'Alerte reçue';
    const f = d.drapeaux || {};
    if (p.structure === 'DPE' && f.mna) return 'Mission : mineur non accompagné';
    if (p.structure === 'CNLTP' && f.traite) return 'Mission : traite présumée';
    if (p.structure === 'DELC' && f.age_scolaire) return 'Mission : mineur en âge scolaire';
    return null;
  };
  D.droits = function (p, section) {
    if (p.role === 'admin') return ['L'];
    const m = M.matrice[p.structure]; if (!m) return [];
    return m[section] || [];
  };
  D.restriction = function (p, section) { const m = M.matrice[p.structure]; return (m && m._notes && m._notes[section]) || ''; };
  D.codeAutorise = function (p, code) {
    const q = Q[code]; const r = D.restriction(p, q.sect);
    if (r === 'orientation') return ['ORI-004', 'ORI-005', 'ORI-006', 'ORI-007'].includes(code);
    if (r === 'documents') return ['RES-014', 'RES-015', 'RES-016', 'RES-017', 'RES-018'].includes(code);
    return true;
  };
  /* ---------- Parcours du dossier entre structures ----------
     Le dossier traverse cinq phases, chacune tenue par une structure différente. La phase
     courante n'est pas stockée : elle se DÉDUIT de l'état réel (relais en attente, sections
     renseignées, référencements, suivis). Un champ stocké se désynchroniserait du reste. */
  D.PHASES = [
    { id: 'identification', n: 1, label: 'Identification', court: 'Identification',
      desc: 'État civil, pièce d\'identité et biométrie. Sections I à V.',
      sections: ['I', 'II', 'III', 'IV', 'V'], porteurs: ['ONECI', 'DGIE'], ic: 'id-card', ton: 'v' },
    { id: 'enregistrement', n: 2, label: 'Enregistrement', court: 'Enregistrement',
      desc: 'Entretien complet : parcours migratoire, vulnérabilités, besoins. Sections VI à XIII.',
      sections: ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'], porteurs: ['DGIE', 'OIM'], ic: 'clipboard-list', ton: 'o' },
    { id: 'orientation', n: 3, label: 'Orientation', court: 'Orientation',
      desc: 'Analyse du dossier et référencement vers les structures de service. Section XIV.',
      sections: ['XIV'], porteurs: ['DGIE'], ic: 'send', ton: 'b' },
    { id: 'prise_en_charge', n: 4, label: 'Prise en charge', court: 'Prise en charge',
      desc: 'Service rendu par la structure référencée : protection, santé, insertion.',
      sections: [], porteurs: [], ic: 'heart-handshake', ton: 'g' },
    { id: 'suivi', n: 5, label: 'Suivi et clôture', court: 'Suivi',
      desc: 'Échéances de suivi puis clôture du dossier. Section XV.',
      sections: ['XV'], porteurs: [], ic: 'flag', ton: 't' },
  ];
  D.phase = (id) => D.PHASES.find((x) => x.id === id) || D.PHASES[0];

  /* Phase courante d'un dossier + qui en a la charge. `ctx` apporte ce que le dossier ne
     contient pas : relais en attente, référencements le concernant. */
  D.etape = function (d, ctx) {
    const c = ctx || {}; const refs = (c.refs || []).filter((r) => r.dossier_id === d.id);
    const relais = (c.relais || []).find((r) => r.id === d.id && r.statut === 'En attente');
    if (relais) return { phase: D.phase(relais.sections && relais.sections.length > 4 ? 'enregistrement' : 'identification'),
      chez: relais.vers, depuis: relais.created_at || relais.date, attente: true, de: relais.de };
    if (d.statut === 'Brouillon' || d.statut === 'Prêt à synchroniser') {
      const faites = D.PHASES[0].sections.filter((x) => (d.sections_faites || []).includes(x)).length;
      return { phase: D.phase(faites >= 4 ? 'enregistrement' : 'identification'), chez: d.structure, depuis: d.created_at };
    }
    if ((d.etat_suivi || 'Ouvert') === 'Clôturé') return { phase: D.phase('suivi'), chez: d.structure_responsable || d.structure, depuis: d.updated_at, fini: true };
    const actifs = refs.filter((r) => ['Accepté', 'En cours de prise en charge'].includes(r.statut));
    if (actifs.length) return { phase: D.phase('prise_en_charge'), chez: actifs[0].destinataire, depuis: actifs[0].created_at };
    const emis = refs.filter((r) => ['Émis', 'Reçu'].includes(r.statut));
    if (emis.length) return { phase: D.phase('orientation'), chez: emis[0].destinataire, depuis: emis[0].created_at, attente: true, de: emis[0].emetteur };
    /* Plus aucun référencement en attente ni en cours : le dossier est enregistré et suivi.
       Le renvoyer en « Orientation » gonflerait la colonne de dossiers qui n'attendent rien. */
    return { phase: D.phase('suivi'), chez: d.structure_responsable || d.structure, depuis: d.updated_at || d.synced_at || d.created_at };
  };

  window.Domaine = D;
})();
