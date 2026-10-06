/* Couche de données : base centrale (locale ou Supabase) et stockage propre à chaque tablette (toujours local) */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { UI.toast('Stockage local saturé : supprimer des pièces jointes ou réinitialiser la démonstration.', 'alert-triangle'); throw e; } },
  };
  const K = (t) => 'r360.central.' + t;

  /* ---------- Adaptateur local (mode de secours, sans internet) ---------- */
  const Local = {
    mode: 'local',
    async init() { return true; },
    async listDossiers() { return LS.get(K('dossiers'), []); },
    async getDossier(id) { return (await this.listDossiers()).find((d) => d.id === id) || null; },
    async upsertDossier(d) {
      const all = await this.listDossiers(); const i = all.findIndex((x) => x.id === d.id);
      if (i >= 0) all[i] = d; else all.push(d);
      LS.set(K('dossiers'), all); return d;
    },
    async candidatsDoublons() { return this.listDossiers(); },
    async nextNumero() { const n = LS.get(K('seq'), 0) + 1; LS.set(K('seq'), n); return n; },
    async list(t) { return LS.get(K(t), []); },
    async upsert(t, row) {
      const all = LS.get(K(t), []); const i = all.findIndex((x) => x.id === row.id);
      if (i >= 0) all[i] = row; else all.push(row);
      LS.set(K(t), all); return row;
    },
    async reset() { Object.keys(localStorage).filter((k) => k.startsWith('r360.') && k !== 'r360.theme').forEach((k) => localStorage.removeItem(k)); },
  };

  /* ---------- Adaptateur Supabase (base PostgreSQL partagée entre le portail web et l'application tablette) ---------- */
  const Supa = {
    mode: 'supabase', client: null, user: null,
    async init() {
      const c = window.R360_CONFIG || {};
      if (!c.supabaseUrl || !c.supabaseAnonKey || !window.supabase) return false;
      this.client = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey);
      return true;
    },
    async signIn(email, password) {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error; this.user = data.user; return data.user;
    },
    async signOut() { await this.client.auth.signOut(); this.user = null; },
    async listDossiers() {
      const { data: ds, error } = await this.client.from('dossiers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const ids = ds.map((d) => d.id); if (!ids.length) return [];
      const { data: secs, error: e2 } = await this.client.from('dossier_sections').select('dossier_id, section, data').in('dossier_id', ids);
      if (e2) throw e2;
      const { data: pcs } = await this.client.from('pieces').select('dossier_id, nature, contenu').in('dossier_id', ids);
      return ds.map((d) => fromRow(d, secs.filter((s) => s.dossier_id === d.id), (pcs || []).filter((p) => p.dossier_id === d.id)));
    },
    async getDossier(id) { return (await this.listDossiers()).find((d) => d.id === id) || null; },
    async upsertDossier(d, opts) {
      let { row, sections, pieces } = toRow(d);
      if (opts && opts.sections) { sections = sections.filter((s) => opts.sections.includes(s.section)); pieces = []; }
      let r = await this.ecrire('dossiers', row); if (r.error) throw r.error;
      if (sections.length) { r = await this.client.from('dossier_sections').upsert(sections); if (r.error) throw r.error; }
      if (pieces.length) { r = await this.client.from('pieces').upsert(pieces); if (r.error) throw r.error; }
      return d;
    },
    async candidatsDoublons(d) {
      const r = d.resume || {};
      const { data, error } = await this.client.rpc('candidats_doublons', { p_nom: r.nom || '', p_naissance: r.date_naissance || '', p_piece: r.piece || '', p_ref_oim: r.ref_oim || '', p_tel: r.telephone || '', p_exclure: d.id });
      if (error) throw error;
      return data.map((x) => { const t = (x.resume.telephone || '').split(' '); return { id: x.id, identifiant: x.identifiant, structure: x.structure, site: x.site, resume: x.resume,
        reponses: { 'IDT-001': x.resume.nom, 'IDT-002': x.resume.prenoms, 'IDT-006': x.resume.date_naissance, 'RES-016': x.resume.piece, 'IDT-013': x.resume.ref_oim, 'IDT-011': t.length > 1 ? { ind: t[0], num: t.slice(1).join(' ') } : undefined } }; });
    },
    async nextNumero() { const { data, error } = await this.client.rpc('prochain_numero'); if (error) throw error; return data; },
    async list(t) { const { data, error } = await this.client.from(t).select('*').order('created_at', { ascending: false }); if (error) throw error; return data; },
    /* Mise à jour si la ligne existe, sinon création : un upsert serait refusé par les règles de création
       (ex. une structure destinataire qui change le statut d'un référencement qu'elle n'a pas émis) */
    async ecrire(t, row) {
      const u = await this.client.from(t).update(row).eq('id', row.id).select('id');
      if (u.error) return u;
      if (u.data && u.data.length) return u;
      return this.client.from(t).insert(row);
    },
    async upsert(t, row) { const { error } = await this.ecrire(t, row); if (error) throw error; return row; },
    subscribe(onChange) {
      return this.client.channel('r360').on('postgres_changes', { event: '*', schema: 'public' }, onChange).subscribe();
    },
    async reset() { /* la réinitialisation de la base partagée se fait par le script SQL de démonstration */ },
  };
  const SECTION_OF = (code) => (window.DICO.find((q) => q.code === code) || {}).sect;
  function toRow(d) {
    const bySec = {};
    for (const [code, v] of Object.entries(d.reponses || {})) { const s = SECTION_OF(code) || 'I'; (bySec[s] = bySec[s] || {})[code] = v; }
    const sections = Object.entries(bySec).map(([section, data]) => ({ dossier_id: d.id, section, data }));
    const pieces = [];
    const m = d.medias || {};
    if (m.photo) pieces.push({ dossier_id: d.id, nature: 'photo', contenu: m.photo });
    if (m.signature) pieces.push({ dossier_id: d.id, nature: 'signature', contenu: m.signature });
    (m.documents || []).forEach((x, i) => pieces.push({ dossier_id: d.id, nature: 'document_' + i, contenu: x }));
    if (m.fiche) pieces.push({ dossier_id: d.id, nature: 'fiche_decadactylaire', contenu: m.fiche });
    const row = { id: d.id, identifiant: d.identifiant, identifiant_provisoire: d.identifiantProvisoire, statut: d.statut, structure_enrolement: d.structure,
      agent_nom: d.agent, site: d.site, cas: d.cas || null, tablette: d.tablette, created_at: d.created_at, updated_at: d.updated_at, synced_at: d.synced_at,
      resume: d.resume || {}, drapeaux: d.drapeaux || {}, itineraire: d.itineraire || null, historique: d.historique || [],
      arrivee_id: d.arrivee_id || null, site_id: d.site_id || null, passager_id: d.passager_id || null, structure_responsable: d.structure_responsable || null, etat_suivi: d.etat_suivi || 'Ouvert', valide: d.valide || null, suivis: d.suivis || [], contributions: d.contributions || [] };
    return { row, sections, pieces };
  }
  function fromRow(r, secs, pcs) {
    const reponses = {}; secs.forEach((s) => Object.assign(reponses, s.data));
    const medias = { documents: [] };
    pcs.forEach((p) => { if (p.nature === 'photo') medias.photo = p.contenu; else if (p.nature === 'signature') medias.signature = p.contenu; else if (p.nature === 'fiche_decadactylaire') medias.fiche = p.contenu; else medias.documents.push(p.contenu); });
    return { id: r.id, identifiant: r.identifiant, identifiantProvisoire: r.identifiant_provisoire, statut: r.statut, structure: r.structure_enrolement,
      agent: r.agent_nom, site: r.site, cas: r.cas, tablette: r.tablette, created_at: r.created_at, updated_at: r.updated_at, synced_at: r.synced_at,
      resume: r.resume, drapeaux: r.drapeaux, itineraire: r.itineraire, historique: r.historique, reponses, medias, sectionsVisibles: secs.map((s) => s.section),
      arrivee_id: r.arrivee_id, site_id: r.site_id, passager_id: r.passager_id, structure_responsable: r.structure_responsable, etat_suivi: r.etat_suivi, valide: r.valide, suivis: r.suivis || [], contributions: r.contributions || [] };
  }

  /* ---------- Tablette : stockage propre à l'appareil, synchronisé avec la base centrale ---------- */
  const Tablette = {
    key: (t) => 'r360.tablette.' + t,
    list(t) { return LS.get(this.key(t), []); },
    get(t, id) { return this.list(t).find((d) => d.id === id) || null; },
    save(t, d) { const all = this.list(t); const i = all.findIndex((x) => x.id === d.id); if (i >= 0) all[i] = d; else all.push(d); LS.set(this.key(t), all); return d; },
    remove(t, id) { LS.set(this.key(t), this.list(t).filter((d) => d.id !== id)); },
    seq(t) { const k = 'r360.tabseq.' + t; const n = LS.get(k, 0) + 1; LS.set(k, n); return n; },
    online(t, v) { const k = 'r360.online.' + t; if (v !== undefined) LS.set(k, v); return LS.get(k, true); },
  };

  window.Store = {
    db: Local, Local, Supa, Tablette, LS,
    async init() {
      const prefer = LS.get('r360.mode', 'auto');
      if (prefer !== 'local' && await Supa.init()) { this.db = Supa; return 'supabase'; }
      this.db = Local; return 'local';
    },
    async audit(action, objet, detail) {
      const p = window.App && App.profil;
      try { await this.db.upsert('audit', { id: UI.uuid(), created_at: new Date().toISOString(), profil: p ? p.nom : '—', role: p ? p.roleLabel : '', structure: p ? p.structure : '', action, objet: objet || '', detail: detail || '' }); } catch (e) { console.warn(e); }
    },
  };
})();
