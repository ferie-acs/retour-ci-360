-- =====================================================================
-- Retour CI 360 — POC : schéma de la base partagée (Supabase / PostgreSQL)
-- À exécuter une fois dans l'éditeur SQL du projet Supabase.
-- Données fictives uniquement.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Référentiels ----------
create table if not exists structures (
  code text primary key,
  nom  text not null
);

-- Matrice d'habilitations : droits L (lecture), S (saisie), M (modification), V (validation) par structure et par section
create table if not exists habilitations (
  structure text references structures(code) on delete cascade,
  section   text not null,
  droits    text[] not null default '{}',
  restriction text,                       -- 'orientation' (ORI-004 à 007) ou 'documents' (RES-014 à 018)
  primary key (structure, section)
);

-- Administration : configuration des structures (dont la matrice d'habilitations), annuaire des comptes, parc de tablettes
create table if not exists structures_cfg (
  id text primary key, code text unique not null, nom text not null, type text, point_focal text, email text, telephone text,
  statut text not null default 'Active', enrolement boolean not null default false, logo text, matrice jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists annuaire (
  id text primary key, nom text not null, email text unique not null, telephone text, role text not null, structure text not null,
  site text, tablette text, fonction text, statut text not null default 'En attente d''activation', created_at timestamptz not null default now(), derniere_connexion timestamptz
);
create table if not exists tablettes (
  id text primary key, structure text not null, site text, modele text, statut text not null default 'En stock', affectee text, created_at timestamptz not null default now()
);

-- Profils : rattache chaque compte à une structure et à un rôle
create table if not exists profils (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  profil_id text unique not null,         -- ex. 'gc-pnsm'
  nom       text not null,
  role      text not null check (role in ('agent','superviseur','gestionnaire','responsable','admin')),
  structure text not null references structures(code)
);

-- ---------- Dossiers ----------
create table if not exists dossiers (
  id uuid primary key,
  identifiant text unique,                -- RCI-AAAA-NNNNNN-C
  identifiant_provisoire text,            -- TMP-<tablette>-NNNN
  statut text not null default 'Synchronisé',
  structure_enrolement text not null references structures(code),
  agent_nom text, site text, tablette text, cas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at  timestamptz,
  resume     jsonb not null default '{}',
  drapeaux   jsonb not null default '{}',  -- mineur, age_scolaire, mna, traite, sante_mentale
  itineraire jsonb,
  historique jsonb not null default '[]',
  arrivee_id text,                        -- arrivée (vol, convoi) à laquelle l'enregistrement est rattaché
  site_id text,                           -- site d'accueil où l'entretien a eu lieu
  passager_id text,                       -- passager du manifeste
  structure_responsable text references structures(code),  -- après un transfert accepté
  etat_suivi text not null default 'Ouvert' check (etat_suivi in ('Ouvert','Clôture demandée','Clôturé')),
  valide jsonb,                           -- validation du superviseur { par, date }
  suivis jsonb not null default '[]',
  contributions jsonb not null default '[]' -- entretien à plusieurs mains : [{ structure, agent, sections }]
);

-- Réponses rangées par section : c'est la section qui porte le droit d'accès
create table if not exists dossier_sections (
  dossier_id uuid references dossiers(id) on delete cascade,
  section text not null,
  data jsonb not null default '{}',
  primary key (dossier_id, section)
);

-- Photo, pages numérisées, signature (base64 dans le POC ; stockage objet dans la version définitive)
create table if not exists pieces (
  dossier_id uuid references dossiers(id) on delete cascade,
  nature text not null,
  contenu text not null,
  primary key (dossier_id, nature)
);

create table if not exists referencements (
  id uuid primary key,
  dossier_id uuid references dossiers(id) on delete cascade,
  identifiant text, beneficiaire text,
  emetteur text references structures(code),
  destinataire text references structures(code),
  type_service text, motif text,
  statut text not null default 'Émis',
  created_at timestamptz not null default now(),
  echeance_reception timestamptz,
  historique jsonb not null default '[]'
);

create table if not exists alertes (
  id uuid primary key,
  dossier_id uuid references dossiers(id) on delete cascade,
  identifiant text, regle text, titre text, gravite text,
  notifie text[] not null default '{}',
  delai text, conduite text, emetteur text,
  created_at timestamptz not null default now(),
  statut text not null default 'Ouverte',
  pris_par text, pris_le timestamptz
);

create table if not exists doublons (
  id uuid primary key,
  dossier_id uuid references dossiers(id) on delete cascade,
  identifiant text,
  candidats jsonb not null default '[]',
  statut text not null default 'À examiner',
  created_at timestamptz not null default now()
);

create table if not exists audit (
  id uuid primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  profil text, role text, structure text,
  action text, objet text, detail text
);

-- ---------- Numérotation nationale ----------
-- ---------- Accueil : sites, arrivées et manifestes ----------
create table if not exists sites (
  id text primary key, code text, nom text not null, type text not null, localite text, region text,
  ll jsonb not null,                       -- [latitude, longitude]
  structures text[] not null default '{}', responsable text, capacite int, statut text not null default 'Actif',
  created_at timestamptz not null default now()
);
create table if not exists arrivees (
  id text primary key, code text unique, type text not null, numero text, provenance text, ville_provenance text,
  date_prevue timestamptz, date_reelle timestamptz, date_cloture timestamptz, site_id text references sites(id),
  organisateur text, structures_presentes text[] not null default '{}', nb_attendus int default 0,
  manifeste jsonb not null default '[]',   -- passagers : nom, prénoms, sexe, statut (Attendu, En attente, En entretien, Enregistré, Absent), ticket…
  statut text not null default 'Prévue' check (statut in ('Prévue','En cours','Clôturée')),
  cree_par text, created_at timestamptz not null default now()
);
-- ---------- Outils du gestionnaire de cas ----------
create table if not exists transferts (
  id uuid primary key, dossier_id uuid references dossiers(id), identifiant text, beneficiaire text,
  de text references structures(code), vers text references structures(code), motif text,
  statut text not null check (statut in ('En attente de validation','Demandé','Accepté','Refusé')),
  demande_par text, historique jsonb not null default '[]', created_at timestamptz not null default now()
);
create table if not exists approbations (
  id uuid primary key, type text not null, objet_id uuid, dossier_id uuid, identifiant text, structure text, demande_par text, motif text,
  statut text not null default 'En attente' check (statut in ('En attente','Approuvée','Rejetée')),
  decide_par text, decision_le timestamptz, decision_motif text, created_at timestamptz not null default now()
);
create table if not exists parametres (
  id text primary key, validation_dossier boolean default true, transfert boolean default true, cloture boolean default true, fusion boolean default true,
  relance_jours int default 7, created_at timestamptz not null default now()
);
create table if not exists rapports (
  id uuid primary key, nom text not null, indicateur text not null, ventilation text, filtres jsonb default '{}', criteres text,
  format text not null default 'pdf', periodicite text not null, jour int default 1, destinataires text[] default '{}', emails text,
  actif boolean default true, cree_par text, historique jsonb not null default '[]', created_at timestamptz not null default now()
);
-- ---------- Canal de diffusion ----------
create table if not exists annonces (
  id uuid primary key, titre text not null, message text not null, categorie text, importance text default 'Normale',
  cibles text[] not null default '{*}', arrivee_id text, auteur text, structure text, expire_le timestamptz,
  epingle boolean default false, archive boolean default false, lu_par text[] not null default '{}', created_at timestamptz not null default now()
);

-- ---------- Prise de relais : entretien commencé par une structure, poursuivi par une autre ----------
create table if not exists relais (
  id uuid primary key,                     -- identifiant du dossier en cours
  dossier jsonb not null,                  -- brouillon complet transmis par la tablette
  nom text, de text references structures(code), de_agent text, de_tablette text, vers text references structures(code),
  sections text[] not null default '{}', note text, arrivee_id text, passager_id text,
  statut text not null default 'En attente' check (statut in ('En attente','Repris','Annulé')),
  repris_par text, repris_le timestamptz, created_at timestamptz not null default now()
);
create table if not exists compteur (annee int primary key, valeur int not null default 0);

create or replace function prochain_numero() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into compteur(annee, valeur) values (1, 1)
    on conflict (annee) do update set valeur = compteur.valeur + 1
    returning valeur into n;
  return n;
end $$;

-- ---------- Fonctions d'aide aux règles d'accès ----------
create or replace function ma_structure() returns text language sql stable security definer set search_path = public as
$$ select structure from profils where user_id = auth.uid() $$;

create or replace function mon_role() returns text language sql stable security definer set search_path = public as
$$ select role from profils where user_id = auth.uid() $$;

-- Un dossier concerne-t-il la structure de l'utilisateur ? (enrôlement, référencement, alerte ou mission)
create or replace function peut_voir_dossier(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dossiers d
    where d.id = did and (
      mon_role() = 'admin'
      or d.structure_enrolement = ma_structure()
      or d.structure_responsable = ma_structure()
      or exists (select 1 from transferts t where t.dossier_id = d.id and t.vers = ma_structure() and t.statut in ('Demandé','Accepté'))
      or exists (select 1 from referencements r where r.dossier_id = d.id and r.destinataire = ma_structure())
      or exists (select 1 from alertes a where a.dossier_id = d.id and ma_structure() = any(a.notifie))
      or (ma_structure() = 'DPE'   and (d.drapeaux->>'mna')::boolean)
      or (ma_structure() = 'CNLTP' and (d.drapeaux->>'traite')::boolean)
      or (ma_structure() = 'DELC'  and (d.drapeaux->>'age_scolaire')::boolean)
    ))
$$;

-- Les droits sont lus dans la matrice administrée depuis la plateforme (structures_cfg.matrice)
create or replace function a_le_droit(sect text, droit text) returns boolean
language sql stable security definer set search_path = public as $$
  select mon_role() = 'admin' and droit = 'L'
      or exists (select 1 from structures_cfg s where s.code = ma_structure() and s.statut = 'Active' and coalesce(s.matrice -> sect, '[]'::jsonb) ? droit)
$$;

create or replace function est_agent_enroleur(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dossiers d where d.id = did and d.structure_enrolement = ma_structure() and mon_role() = 'agent')
$$;

-- Recherche de doublons sur l'ensemble de la base (l'agent ne voit pas les dossiers des autres structures :
-- la fonction ne renvoie que les éléments d'identification nécessaires à la comparaison)
create or replace function candidats_doublons(p_nom text, p_naissance text, p_piece text, p_ref_oim text, p_tel text, p_exclure uuid)
returns table (id uuid, identifiant text, structure text, site text, resume jsonb)
language sql stable security definer set search_path = public as $$
  select d.id, d.identifiant, d.structure_enrolement, d.site, d.resume
  from dossiers d
  where auth.uid() is not null and d.id <> coalesce(p_exclure, '00000000-0000-0000-0000-000000000000'::uuid) and (
       (p_piece   <> '' and d.resume->>'piece'   = p_piece)
    or (p_ref_oim <> '' and d.resume->>'ref_oim' = p_ref_oim)
    or (p_tel     <> '' and d.resume->>'telephone' = p_tel)
    or (p_naissance <> '' and d.resume->>'date_naissance' <> ''
        and abs(extract(year from (d.resume->>'date_naissance')::date) - extract(year from p_naissance::date)) <= 1
        and left(regexp_replace(lower(d.resume->>'nom'), '[^a-z]', '', 'g'), 3) = left(regexp_replace(lower(p_nom), '[^a-z]', '', 'g'), 3)))
  limit 20
$$;
grant execute on function candidats_doublons(text, text, text, text, text, uuid) to authenticated;

-- ---------- Règles d'accès (sécurité au niveau des lignes) ----------
alter table structures enable row level security;
alter table habilitations enable row level security;
alter table profils enable row level security;
alter table dossiers enable row level security;
alter table dossier_sections enable row level security;
alter table pieces enable row level security;
alter table referencements enable row level security;
alter table alertes enable row level security;
alter table doublons enable row level security;
alter table audit enable row level security;
alter table compteur enable row level security;
alter table structures_cfg enable row level security;
alter table annuaire enable row level security;
alter table tablettes enable row level security;

create policy lecture_structures on structures for select to authenticated using (true);
create policy lecture_habilitations on habilitations for select to authenticated using (true);
create policy lecture_profil on profils for select to authenticated using (user_id = auth.uid() or mon_role() = 'admin');

-- Dossiers : visibles s'ils concernent la structure ; créés par l'agent de la structure d'enrôlement
create policy dossiers_lecture on dossiers for select to authenticated using (peut_voir_dossier(id));
create policy dossiers_creation on dossiers for insert to authenticated
  with check (structure_enrolement = ma_structure() and mon_role() = 'agent');
create policy dossiers_maj on dossiers for update to authenticated using (peut_voir_dossier(id)) with check (peut_voir_dossier(id));

-- Sections : lecture si droit L ; écriture si S ou M ; l'agent enrôleur écrit toutes les sections de son entretien
create policy sections_lecture on dossier_sections for select to authenticated
  using (peut_voir_dossier(dossier_id) and (a_le_droit(section, 'L') or est_agent_enroleur(dossier_id)));
create policy sections_creation on dossier_sections for insert to authenticated
  with check (est_agent_enroleur(dossier_id) or (peut_voir_dossier(dossier_id) and (a_le_droit(section, 'S') or a_le_droit(section, 'M'))));
create policy sections_maj on dossier_sections for update to authenticated
  using (est_agent_enroleur(dossier_id) or (peut_voir_dossier(dossier_id) and (a_le_droit(section, 'S') or a_le_droit(section, 'M'))));

-- Pièces (photo, documents, signature) : rattachées à la section I
create policy pieces_lecture on pieces for select to authenticated using (peut_voir_dossier(dossier_id) and (a_le_droit('I', 'L') or est_agent_enroleur(dossier_id)));
create policy pieces_ecriture on pieces for insert to authenticated with check (est_agent_enroleur(dossier_id));
create policy pieces_maj on pieces for update to authenticated using (est_agent_enroleur(dossier_id));

-- Référencements : visibles par l'émetteur et le destinataire
create policy refs_lecture on referencements for select to authenticated
  using (mon_role() = 'admin' or emetteur = ma_structure() or destinataire = ma_structure());
create policy refs_creation on referencements for insert to authenticated with check (emetteur = ma_structure() or mon_role() = 'admin');
create policy refs_maj on referencements for update to authenticated using (emetteur = ma_structure() or destinataire = ma_structure() or mon_role() = 'admin');

-- Alertes : visibles par les structures notifiées et par la DGIE
create policy alertes_lecture on alertes for select to authenticated
  using (mon_role() = 'admin' or ma_structure() = 'DGIE' or ma_structure() = any(notifie) or emetteur = ma_structure());
create policy alertes_creation on alertes for insert to authenticated with check (emetteur = ma_structure());
create policy alertes_maj on alertes for update to authenticated using (mon_role() = 'admin' or ma_structure() = 'DGIE' or ma_structure() = any(notifie));

-- Doublons : examinés par la supervision
create policy doublons_lecture on doublons for select to authenticated using (mon_role() in ('admin','superviseur'));
create policy doublons_creation on doublons for insert to authenticated with check (true);
create policy doublons_maj on doublons for update to authenticated using (mon_role() in ('admin','superviseur'));

-- Journal d'audit : chacun écrit ses propres traces ; seule la supervision lit ; personne ne modifie ni ne supprime
create policy audit_ecriture on audit for insert to authenticated with check (user_id = auth.uid());
create policy audit_lecture on audit for select to authenticated using (mon_role() in ('admin','superviseur'));

-- Administration : lecture par tous les comptes ; écriture par l'administrateur (et par le superviseur pour les comptes de sa structure)
create policy cfg_lecture on structures_cfg for select to authenticated using (true);
create policy cfg_ecriture on structures_cfg for all to authenticated using (mon_role() = 'admin') with check (mon_role() = 'admin');
-- Annuaire lisible sans connexion : la page d'accueil de la démonstration liste les profils (données fictives uniquement)
create policy annuaire_lecture on annuaire for select to anon, authenticated using (true);
create policy annuaire_ecriture on annuaire for all to authenticated
  using (mon_role() = 'admin' or (mon_role() = 'superviseur' and structure = ma_structure()))
  with check ((mon_role() = 'admin' or (mon_role() = 'superviseur' and structure = ma_structure() and role in ('agent', 'gestionnaire')))
    -- administration générale réservée à la DGIE ; agent enquêteur seulement dans une structure habilitée à enrôler
    and (role <> 'admin' or structure = 'DGIE')
    and (role <> 'agent' or exists (select 1 from structures_cfg s where s.code = structure and s.enrolement)));
create policy tablettes_lecture on tablettes for select to authenticated using (true);
create policy tablettes_ecriture on tablettes for all to authenticated using (mon_role() = 'admin' or (mon_role() = 'superviseur' and structure = ma_structure())) with check (mon_role() = 'admin' or (mon_role() = 'superviseur' and structure = ma_structure()));

grant execute on function prochain_numero() to authenticated;

-- ---------- Temps réel : le portail se met à jour dès qu'une tablette synchronise ----------
-- Accueil : lecture par tous les comptes ; sites gérés par l'administration et les superviseurs ;
-- manifeste mis à jour par les entités présentes (appel, enregistrement)
alter table sites enable row level security;
alter table arrivees enable row level security;
alter table transferts enable row level security;
alter table approbations enable row level security;
alter table parametres enable row level security;
alter table rapports enable row level security;
alter table annonces enable row level security;
create policy sites_lecture on sites for select to authenticated using (true);
create policy sites_ecriture on sites for all to authenticated using (mon_role() in ('admin','superviseur')) with check (mon_role() in ('admin','superviseur'));
create policy arrivees_lecture on arrivees for select to authenticated using (true);
create policy arrivees_creation on arrivees for insert to authenticated with check (mon_role() in ('admin','superviseur'));
create policy arrivees_maj on arrivees for update to authenticated using (mon_role() in ('admin','superviseur') or ma_structure() = any(structures_presentes) or organisateur = ma_structure());
create policy transferts_lecture on transferts for select to authenticated using (mon_role() = 'admin' or de = ma_structure() or vers = ma_structure());
create policy transferts_creation on transferts for insert to authenticated with check (de = ma_structure() or mon_role() = 'admin');
create policy transferts_maj on transferts for update to authenticated using (mon_role() = 'admin' or vers = ma_structure() or (de = ma_structure() and mon_role() = 'superviseur'));
create policy approbations_lecture on approbations for select to authenticated using (mon_role() = 'admin' or structure = ma_structure());
create policy approbations_creation on approbations for insert to authenticated with check (structure = ma_structure() or mon_role() = 'admin');
create policy approbations_maj on approbations for update to authenticated using (mon_role() = 'admin' or (mon_role() = 'superviseur' and structure = ma_structure()));
create policy parametres_lecture on parametres for select to authenticated using (true);
create policy parametres_ecriture on parametres for all to authenticated using (mon_role() = 'admin') with check (mon_role() = 'admin');
create policy rapports_lecture on rapports for select to authenticated using (mon_role() = 'admin' or ma_structure() = any(destinataires));
create policy rapports_ecriture on rapports for all to authenticated using (mon_role() in ('admin','superviseur')) with check (mon_role() in ('admin','superviseur'));
create policy annonces_lecture on annonces for select to authenticated using (mon_role() = 'admin' or '*' = any(cibles) or ma_structure() = any(cibles) or structure = ma_structure());
create policy annonces_creation on annonces for insert to authenticated with check (structure = ma_structure() and (importance <> 'Urgente' or mon_role() in ('admin','superviseur')));
-- accusé de lecture : tout destinataire peut mettre à jour lu_par ; épingler et archiver restent réservés à l'auteur ou à l'administration (contrôle applicatif dans le POC)
create policy annonces_maj on annonces for update to authenticated using (mon_role() = 'admin' or '*' = any(cibles) or ma_structure() = any(cibles) or structure = ma_structure());

alter table relais enable row level security;
create policy relais_lecture on relais for select to authenticated using (de = ma_structure() or vers = ma_structure() or mon_role() = 'admin');
create policy relais_creation on relais for insert to authenticated with check (de = ma_structure());
create policy relais_maj on relais for update to authenticated using (vers = ma_structure() or de = ma_structure() or mon_role() = 'admin');
-- Profilage national du premier responsable : en production, une fonction SECURITY DEFINER renvoie uniquement des agrégats
-- (effectifs < 5 masqués) ; la liste nominative reste soumise à peut_voir_dossier
alter publication supabase_realtime add table dossiers, dossier_sections, referencements, alertes, doublons, arrivees, transferts, approbations, annonces, relais;
