/* Génère web/assets/img/drapeaux.png : planche des drapeaux des pays du référentiel, dans l'ordre de REF.pays.
   Source : bibliothèque flag-icons (licence MIT), format 4:3. Chaque drapeau occupe une case de 40 × 30 pixels
   (affichée à 20 × 15, nette sur les écrans haute densité). Seize drapeaux par ligne.

   Usage : npm install flag-icons@7.2.3 playwright   (dans un dossier de travail)
           node tools/gen_drapeaux.js <dossier contenant node_modules>
   À relancer si la liste des pays de web/assets/data/referentiels.js change d'ordre ou de contenu. */
const fs = require('fs');
const path = require('path');
const racine = path.resolve(__dirname, '..');
const modules = path.resolve(process.argv[2] || '.', 'node_modules');
const { chromium } = require(require.resolve('playwright', { paths: [modules, process.cwd()] }));

global.window = {};
require(path.join(racine, 'web/assets/data/referentiels.js'));
const pays = window.REF.pays;
const COL = 16, W = 40, H = 30;

(async () => {
  const svgs = pays.map((p) => {
    const f = path.join(modules, 'flag-icons/flags/4x3', p.c.toLowerCase() + '.svg');
    if (!fs.existsSync(f)) throw new Error('Drapeau absent : ' + p.c);
    return 'data:image/svg+xml;base64,' + fs.readFileSync(f).toString('base64');
  });
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  const png = await page.evaluate(async ({ svgs, COL, W, H }) => {
    const lignes = Math.ceil(svgs.length / COL);
    const c = document.createElement('canvas'); c.width = COL * W; c.height = lignes * H;
    const g = c.getContext('2d');
    for (let i = 0; i < svgs.length; i++) {
      const im = new Image(); im.src = svgs[i]; await im.decode();
      g.drawImage(im, (i % COL) * W, Math.floor(i / COL) * H, W, H);
    }
    return c.toDataURL('image/png');
  }, { svgs, COL, W, H });
  await navigateur.close();
  const sortie = path.join(racine, 'web/assets/img/drapeaux.png');
  fs.writeFileSync(sortie, Buffer.from(png.split(',')[1], 'base64'));
  console.log(pays.length + ' drapeaux → ' + sortie + ' (' + fs.statSync(sortie).size + ' octets)');
})();
