/* Configuration du POC. Renseigner l'adresse du projet Supabase et sa clé publique (anon) pour activer la base partagée.
   Laisser vide pour fonctionner en mode local (démonstration hors connexion, données dans le navigateur).
   Ne jamais placer ici la clé de service (service_role). */
window.R360_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  domaineComptes: 'demo.retour360.ci', // comptes de démonstration : <profil>@demo.retour360.ci
  motDePasseDemo: '',                  // mot de passe commun des comptes de démonstration (fourni hors dépôt)
};
