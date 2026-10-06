# Retour CI 360 — POC

**Démonstration en ligne : https://ferie-acs.github.io/retour-ci-360/**

Prototype du parcours de prise en charge des migrants ivoiriens de retour.
Données entièrement fictives ; les règles affichées sont des propositions soumises à l'atelier.

La documentation complète du projet est dans [LISEZMOI.md](LISEZMOI.md) :
contenu des dossiers, charte graphique, exports, parcours agent et portail des structures,
base Supabase et scripts de génération des données.

## Lancer en local

```sh
cd web && python3 -m http.server 8080
# puis http://localhost:8080
```

Sans configuration, l'application tourne en mode local (données dans le navigateur).
Pour la base partagée, renseigner `web/assets/js/config.js` (adresse du projet Supabase et clé *anon* ;
jamais la clé `service_role`).

## Publication

Chaque poussée sur `main` déploie le contenu de `web/` sur GitHub Pages
via `.github/workflows/pages.yml`.
