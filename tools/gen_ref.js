// Génère assets/data/referentiels.js (pays, villes, localités CI) — données GeoNames (CC BY 4.0) via all-the-cities, pays via world-countries
const W = require('/tmp/claude-0/np/node_modules/world-countries');
const C = require('/tmp/claude-0/np/node_modules/all-the-cities');
const fs = require('fs');
const CONT = { Africa: 'Afrique', Europe: 'Europe', Asia: 'Asie', Americas: 'Amériques', Oceania: 'Océanie', Antarctic: 'Antarctique' };
const ORDER = ['Afrique', 'Europe', 'Asie', 'Amériques', 'Océanie', 'Antarctique'];
const pays = W.filter((w) => w.cca2 !== 'AQ').map((w) => {
  const dial = w.idd && w.idd.root ? (w.idd.suffixes && w.idd.suffixes.length === 1 ? w.idd.root + w.idd.suffixes[0] : w.idd.root) : '';
  const cap = C.filter((c) => c.country === w.cca2 && c.featureCode === 'PPLC').sort((a, b) => b.population - a.population)[0];
  return { c: w.cca2, n: w.translations.fra ? w.translations.fra.common : w.name.common, ct: CONT[w.region] || w.region, d: dial, f: w.flag,
    nat: w.demonyms && w.demonyms.fra ? w.demonyms.fra.m : '', ll: w.latlng,
    cap: cap ? { n: cap.name, ll: [cap.loc.coordinates[1], cap.loc.coordinates[0]] } : null };
}).sort((a, b) => ORDER.indexOf(a.ct) - ORDER.indexOf(b.ct) || a.n.localeCompare(b.n, 'fr'));
const reg = {}; W.forEach((w) => (reg[w.cca2] = w.region));
const villes = {};
for (const c of C) {
  const r = reg[c.country];
  const keep = r === 'Africa' || r === 'Europe' ? c.population >= 10000 : c.population >= 100000;
  if (!keep && c.featureCode !== 'PPLC') continue;
  (villes[c.country] = villes[c.country] || []).push([c.name, +c.loc.coordinates[1].toFixed(3), +c.loc.coordinates[0].toFixed(3), c.population]);
}
for (const k in villes) villes[k].sort((a, b) => b[3] - a[3]);
/* Noms français des villes les plus citées sur les routes migratoires */
const FR = { Beirut: 'Beyrouth', Tangier: 'Tanger', Algiers: 'Alger', 'Sabhā': 'Sebha', 'Oujda-Angad': 'Oujda', Cairo: 'Le Caire', Alexandria: 'Alexandrie', Marrakesh: 'Marrakech', Fes: 'Fès', Misratah: 'Misrata' };
for (const k in villes) villes[k].forEach((v) => { if (FR[v[0]]) v[0] = FR[v[0]]; });
// Localités de Côte d'Ivoire : région de rattachement (liste de démonstration, à remplacer par le découpage officiel)
const LOC = [
 ['Abidjan', "District autonome d'Abidjan"], ['Anyama', "District autonome d'Abidjan"], ['Bingerville', "District autonome d'Abidjan"], ['Songon', "District autonome d'Abidjan"],
 ['Yamoussoukro', 'District autonome de Yamoussoukro'], ['Agboville', 'Agnéby-Tiassa'], ['Tiassalé', 'Agnéby-Tiassa'], ['Touba', 'Bafing'], ['Boundiali', 'Bagoué'], ['Tengréla', 'Bagoué'],
 ['Toumodi', 'Bélier'], ['Mankono', 'Béré'], ['Bouna', 'Bounkani'], ['Guiglo', 'Cavally'], ['Minignan', 'Folon'], ['Bouaké', 'Gbêkê'], ['Béoumi', 'Gbêkê'], ['Sakassou', 'Gbêkê'],
 ['Sassandra', 'Gbôklé'], ['Gagnoa', 'Gôh'], ['Oumé', 'Gôh'], ['Bondoukou', 'Gontougo'], ['Tanda', 'Gontougo'], ['Dabou', 'Grands-Ponts'], ['Grand-Lahou', 'Grands-Ponts'], ['Jacqueville', 'Grands-Ponts'],
 ['Duékoué', 'Guémon'], ['Bangolo', 'Guémon'], ['Katiola', 'Hambol'], ['Dabakala', 'Hambol'], ['Daloa', 'Haut-Sassandra'], ['Issia', 'Haut-Sassandra'], ['Vavoua', 'Haut-Sassandra'],
 ['Daoukro', 'Iffou'], ['Abengourou', 'Indénié-Djuablin'], ['Agnibilékrou', 'Indénié-Djuablin'], ['Odienné', 'Kabadougou'], ['Adzopé', 'La Mé'], ['Akoupé', 'La Mé'], ['Divo', 'Lôh-Djiboua'], ['Lakota', 'Lôh-Djiboua'],
 ['Bouaflé', 'Marahoué'], ['Sinfra', 'Marahoué'], ['Zuénoula', 'Marahoué'], ['Bongouanou', 'Moronou'], ['Soubré', 'Nawa'], ['Méagui', 'Nawa'], ['Dimbokro', "N'Zi"], ['Bocanda', "N'Zi"],
 ['Korhogo', 'Poro'], ['San-Pédro', 'San-Pédro'], ['Tabou', 'San-Pédro'], ['Aboisso', 'Sud-Comoé'], ['Grand-Bassam', 'Sud-Comoé'], ['Adiaké', 'Sud-Comoé'],
 ['Ferkessédougou', 'Tchologo'], ['Ouangolodougou', 'Tchologo'], ['Man', 'Tonkpi'], ['Danané', 'Tonkpi'], ['Biankouma', 'Tonkpi'], ['Séguéla', 'Worodougou'],
];
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const ci = (villes.CI || []);
const loc = LOC.map(([n, r]) => { const m = C.find((c) => c.country === 'CI' && norm(c.name) === norm(n)); return { n, r, ll: m ? [+m.loc.coordinates[1].toFixed(3), +m.loc.coordinates[0].toFixed(3)] : null }; });
const missing = loc.filter((l) => !l.ll).map((l) => l.n); if (missing.length) console.error('Sans coordonnées :', missing.join(', '));
const regions = [...new Set(LOC.map((x) => x[1]))].sort((a, b) => a.localeCompare(b, 'fr'));
const devises = [['XOF', 'Franc CFA (UEMOA)'], ['EUR', 'Euro'], ['USD', 'Dollar des États-Unis'], ['GBP', 'Livre sterling'], ['MAD', 'Dirham marocain'], ['DZD', 'Dinar algérien'], ['TND', 'Dinar tunisien'], ['LYD', 'Dinar libyen'], ['EGP', 'Livre égyptienne'], ['XAF', 'Franc CFA (CEMAC)'], ['GHS', 'Cedi ghanéen'], ['NGN', 'Naira nigérian'], ['GNF', 'Franc guinéen'], ['MRU', 'Ouguiya mauritanien'], ['LBP', 'Livre libanaise'], ['SAR', 'Riyal saoudien'], ['AED', 'Dirham des Émirats arabes unis'], ['KWD', 'Dinar koweïtien'], ['QAR', 'Riyal qatarien'], ['TRY', 'Livre turque'], ['CAD', 'Dollar canadien'], ['CHF', 'Franc suisse']];
fs.writeFileSync('/home/claude/poc/web/assets/data/referentiels.js',
  '/* Référentiels de démonstration. Pays : world-countries (ODbL). Villes : GeoNames (CC BY 4.0). */\n' +
  'window.REF = ' + JSON.stringify({ pays, villes, localitesCI: loc, regionsCI: regions, devises }) + ';\n');
console.log('pays', pays.length, 'villes', Object.values(villes).reduce((a, b) => a + b.length, 0), 'loc', loc.length, 'regions', regions.length);
