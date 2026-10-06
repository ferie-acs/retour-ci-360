# Retour CI 360 — POC (démonstration du parcours)

Données entièrement fictives. Règles affichées = propositions soumises à l'atelier.

## Contenu

| Dossier | Rôle |
|---|---|
| `web/` | Application web (HTML, CSS, JavaScript) : espace agent (tablette) et portail des structures |
| `web/assets/data/` | Dictionnaire de données (243 questions), référentiels (pays, villes GeoNames, localités et régions de Côte d'Ivoire, devises), matrice d'habilitations, alertes |
| `supabase/schema.sql` | Base partagée : tables, numérotation nationale, recherche de doublons, règles d'accès par structure et par section, temps réel |
| `supabase/initialisation.html` | Crée les comptes de démonstration et charge les dossiers fictifs (clé de service saisie à l'écran, jamais enregistrée) |
| `tools/` | Scripts qui régénèrent les fichiers de données (dictionnaire Excel, référentiels, contours de la carte d'Afrique issus de Natural Earth, domaine public) |

## Charte graphique

Couleurs relevées sur le logo officiel : bleu #014A96, vert #4EA738, orange #FE7701. Logo et emblème dans `web/assets/img/`. Police Nunito (licence SIL OFL) embarquée dans `web/assets/vendor/fonts/` pour fonctionner sans internet. Mise en page de type tableau de bord d'administration (barre latérale, en-tête avec recherche, indicateurs, cartes), écrite pour le projet sans reprise de code d'un modèle commercial.

## Exportation et logos

Les statistiques, les graphiques, la liste des migrants, les référencements, le journal d'audit et la liste des utilisateurs s'exportent en PDF, Excel (.xlsx), CSV ou image PNG (bibliothèques embarquées : jsPDF et jsPDF-AutoTable sous licence MIT, SheetJS sous licence Apache 2.0, html-to-image sous licence MIT). Chaque structure peut recevoir son logo depuis Administration > Structures ; il apparaît dans les listes, les fiches, les référencements, l'en-tête et les exports PDF. Aucun logo officiel n'est fourni dans la démonstration : à charger par l'administrateur.

## Accueil des migrants, outils de suivi et documents

- **Sites** : carte de la Côte d'Ivoire ; un clic sur la carte crée un site d'accueil (aéroport, poste frontière, centre d'accueil, antenne régionale).
- **Arrivées** : vol affrété, vol commercial ou convoi terrestre, sur un site. Le manifeste des passagers s'importe en Excel ou CSV (modèle téléchargeable). La file d'attente se suit en direct : arrivée sur site avec un ticket, appel en entretien, enregistrement. Les statistiques sont ventilées par entité présente et par site.
- **Rattachement** : tout nouvel entretien sur tablette commence par le choix de l'arrivée et, de préférence, d'un passager appelé depuis la file. L'identité est alors pré-remplie, et le manifeste est mis à jour à la synchronisation.
- **Mes tâches** (gestionnaire de cas) regroupe :
  - les référencements reçus ;
  - les alertes ;
  - les transferts de dossier entre structures, distincts du référencement, qui changent la structure responsable ;
  - les validations du superviseur, paramétrables dans Administration > Validations ;
  - les suivis à échéance.
- **Documents PDF avec code QR** :
  - la fiche unique du migrant : photo, identifiant et QR au recto, parcours dessiné au verso, plus une carte de suivi à découper ;
  - l'attestation de retour ;
  - la fiche de référencement.
  
  La page publique `#/verifier` contrôle l'authenticité d'un document.
- **Supervision** : tableau de bord de la qualité des données (complétude, incohérences, délais) et rapports programmés (bouton « Programmer ce rapport » dans Statistiques).
- **Canal de diffusion** : annonces adressées à toutes les structures ou à certaines (arrivée d'un contingent, consigne, réunion). Elles sont visibles sur le portail et sur les tablettes, avec accusé de lecture.
- **Dossiers** : la carte affiche le trajet du migrant sélectionné dans la liste.
- **Prise de relais** (entretien à plusieurs mains). Exemple : l'OIM commence l'entretien, la DGIE le termine.
  1. L'agent OIM renseigne les premières sections, puis clique sur « Passer le relais » et choisit la DGIE. Le réseau est requis.
  2. Le migrant apparaît dans la file d'attente de l'arrivée avec le statut « Relais », en tête de la colonne « En attente ».
  3. Un agent DGIE ouvre « Nouvel entretien » et clique sur « Prendre la main ». Le même dossier arrive sur sa tablette, sans ressaisie, et reprend à la première section non faite.
  4. Chaque section garde la trace de la structure et de l'agent qui l'ont renseignée. Le dossier final affiche « Entretien à plusieurs mains ». L'identifiant national est attribué à la synchronisation par la structure qui termine.
- **Vue du premier responsable** (rôle « Premier responsable », un compte par entité) :
  - activité de la structure : dossiers concernés, référencements reçus et délais, suivis en retard, équipe ;
  - profilage : n'importe quelle question du formulaire, croisée avec une autre et filtrée (sexe, âge, région, provenance, structure, moyen de retour) ;
  - sur la base nationale, agrégats anonymes uniquement (effectifs inférieurs à 5 masqués hors DGIE) ;
  - liste nominative limitée aux dossiers de la structure ;
  - sections sensibles N3 exploitables seulement si la matrice d'habilitations les ouvre à la structure.
- **Doublons** : dix cas fictifs (règles R1 à R5, homonymes, cas déjà confirmé, cas déjà écarté), comparés champ par champ. La décision est motivée et le dossier est rattaché, jamais fusionné automatiquement.
- **Données ouvertes** (`#/donnees-ouvertes`, sans connexion) : agrégats, effectifs inférieurs à 5 masqués, téléchargement CSV et Excel.

## Lancer la démonstration en mode local (sans internet)

1. Ouvrir un terminal dans `web/` et lancer `python3 -m http.server 8080` (ou tout serveur web statique).
2. Ouvrir `http://localhost:8080` dans Chrome ou Edge.
3. Choisir un profil. Les données sont conservées dans le navigateur ; « Réinitialiser la démonstration » recharge le jeu fictif.

Seul le fond de carte (OpenStreetMap, rendu OSM France, libre et sans clé) nécessite internet ; sans connexion, les contours des pays, les routes et les statistiques s'affichent quand même.

## Brancher la base partagée Supabase (à faire ensemble)

1. Créer le projet Supabase, puis exécuter `supabase/schema.sql` dans l'éditeur SQL.
2. Ouvrir `supabase/initialisation.html` (via le même serveur, depuis le dossier parent de `web/` et `supabase/`), saisir l'adresse du projet, la clé de service et un mot de passe commun : les 12 comptes `<profil>@demo.retour360.ci` et les dossiers fictifs sont créés.
3. Renseigner `web/assets/js/config.js` : `supabaseUrl`, `supabaseAnonKey` (clé publique « anon ») et `motDePasseDemo`.
4. Recharger l'application : le badge indique « Base partagée ». Le portail se met à jour en temps réel quand une tablette synchronise. Le mode local reste accessible depuis l'accueil.

## Scénario de démonstration conseillé (15 minutes)

1. **Agent DGIE (Awa Koné)** : nouvel entretien. Consentement refusé → sections verrouillées ; consentement donné → poursuite.
2. Section II : saisir « NGUESSAN Akissi Marie », née le 19/07/1996 → à la sortie de la section, doublon possible avec le dossier OIM (cas C5).
3. Section VIII : itinéraire Bouaké → Mali → Niger, carte numérotée, distance.
4. Section X : « Pensées suicidaires = Oui » → alerte critique et conduite à tenir.
5. Section XIV : référencement vers le PNSM. Section XV : signature à l'écran.
6. Simuler une coupure réseau, clôturer : l'entretien reste sur la tablette. Rétablir le réseau, synchroniser : identifiant national `RCI-AAAA-NNNNNN-C` attribué.
7. **PNSM (Dr N'Guessan)** : le dossier apparaît (alerte et référencement), seules les sections autorisées sont lisibles, la section X (N3) est masquée jusqu'à saisie d'un motif tracé dans le journal.
8. **Superviseure DGIE** : examen du doublon, comptes de sa structure, journal d'audit.
9. **Arrivée en direct** : ouvrir deux onglets. Dans le premier, Mariam Touré suit Arrivées > le vol affrété en cours. Dans le second, Awa Koné lance « Nouvel entretien » et appelle un passager de la file. La file se met à jour dans le premier onglet. À la synchronisation, le passager passe en « Enregistré ».
10. **Relais** : Awa Koné, « Nouvel entretien », puis « Prendre la main » sur le relais commencé par l'OIM.
11. **Premier responsable AGEFOP (Didier Gbané)** : Vue du responsable, puis profilage.
12. **Gestionnaire EJ (Koffi Brou)** : Mes tâches, puis accepter le transfert reçu de l'OIM.
13. **Fiche dossier** : Imprimer > fiche unique du migrant (recto et verso) ou attestation de retour, puis scanner le code QR pour vérifier.
14. **Administration générale** : utilisateurs (création d'un enquêteur et affectation d'une tablette), structures, parc de tablettes, matrice d'habilitations modifiable, statistiques (recherche multicritère et catalogue d'indicateurs OIM, DTM, ODD, Pacte mondial).

Autres cas fictifs chargés : C1 (adulte avec CNI, EJ), C2 (mineur non accompagné, DPE et DELC), C3 (traite présumée, CNLTP), C4 (santé mentale, PNSM et DMHP), C5 (enrôlée par l'OIM), C6 (AGEFOP absente à l'enrôlement).

## Limites assumées du POC

- Les restrictions partielles (XIV « orientation seulement », IV « documents seulement ») sont appliquées par l'interface ; dans la base, le contrôle se fait par section entière. Même chose pour le résumé du dossier (nom, région), lisible par toute structure concernée.
- Le suivi en direct entre onglets repose, en mode local, sur l'événement de stockage du navigateur ; avec Supabase, sur le temps réel. L'envoi automatique des rapports programmés et l'hébergement du portail de vérification relèvent du serveur définitif [adresse à confirmer].
- En mode Supabase, le profilage national du premier responsable passera par une fonction serveur ne renvoyant que des agrégats. Dans la démonstration locale, le calcul se fait dans le navigateur.
- Biométrie simulée (aucun lecteur raccordé). Photos et signature stockées en base64 dans la base ; stockage objet chiffré dans la version définitive.
- Un projet Supabase hébergé est hors de Côte d'Ivoire : aucune donnée réelle ne doit y entrer. L'hébergement définitif se fera sur le serveur fourni par Expertise France.
