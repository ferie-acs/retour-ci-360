"""Génère assets/data/dictionnaire.js à partir du dictionnaire pré-rempli."""
import openpyxl, json, re, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/outputs/files/Dictionnaire_de_Donnees_Formulaire_V1_DGIE_prerempli.xlsx'
OUT = '/home/claude/poc/web/assets/data/dictionnaire.js'
ws = openpyxl.load_workbook(SRC)['Dictionnaire']
Q = []
for r in range(5, 248):
    v = [ws.cell(r, c).value for c in range(1, 22)]
    Q.append(dict(code=v[0], sect=v[1], sectLabel=v[2], sous=v[3], label=v[4], typeV1=v[5] or '', mod=v[6] or '', groupe=v[7], point=v[8],
                  car=v[9], cond=v[10], fmt=v[11] or '', ctrl=v[12] or '', liste=v[13] or '', moment=v[14], collecte=v[15] or '', sens=v[16], obs=v[17] or ''))
codes = {q['code'] for q in Q}

def mods(q):
    m = q['mod']
    if not m or m.startswith('Liste') or m in ('Réponse ouverte', 'JJ/MM/AAAA', 'MM/AAAA', 'Numéro de téléphone', 'Nombre', "Nombre d'années"): return []
    return [x.strip() for x in re.split(r'\s*/\s*', m) if x.strip()]

AUTO = {'ENT-001', 'ENT-002', 'ENT-003', 'ENT-004', 'ENT-005', 'ENT-008', 'IDT-007', 'RES-002', 'RES-006', 'PAR-004', 'VUL-006', 'VUL-009', 'SUI-005'}
HIDDEN = {'ENT-014', 'ENT-015', 'PAR-021'}  # PAR-021 alimenté par le module d'itinéraire
def widget(q):
    c, f, l, t = q['code'], q['fmt'], q['liste'], q['typeV1']
    if c in AUTO: return 'auto'
    if c in HIDDEN: return 'hidden'
    if c == 'PAR-003': return 'itinerary'
    if c == 'ENT-012': return 'capture'
    if c == 'SUI-004': return 'signature'
    if c == 'RES-004': return 'provenance'
    if c in ('FAM-006',): return 'children'
    if c in ('PAR-027', 'PAR-031'): return 'persons'
    if c in ('PAR-028', 'PAR-032'): return 'hidden'
    if c.startswith('BIO-'): return 'bio'
    if c in ('ORI-005',): return 'structures'
    if f.startswith('Téléphone'): return 'phone'
    if 'Montant' in f or 'XOF' in f: return 'money'
    if l.startswith('Liste des pays'): return 'country'
    if l.startswith('Liste des nationalités'): return 'nationality'
    if l.startswith('Liste des localités') or f.startswith('Identifiant du référentiel'): return 'locality'
    if l.startswith('Liste des régions') or f.startswith('Code région'): return 'region'
    if f.startswith('Booléen'): return 'yesno'
    if t == 'Date' or f.startswith('Date'): return 'date'
    if t == 'Mois/année': return 'month'
    if t.startswith('Numérique') or f.startswith('Entier') or f.startswith('Décimal'): return 'number'
    m = mods(q)
    if t == 'Choix multiple' or f.startswith('Choix multiple'): return 'multi' if m else 'text'
    if m and m != ['Réponse ouverte'] and ('Choix unique' in t or 'Choix unique' in f or t.startswith('[')):
        return 'yesno' if m == ['Oui', 'Non'] else 'single'
    if f.startswith('Texte long'): return 'textarea'
    return 'text'

def val(s): return s.strip().strip('«»" ').strip()
def atom(code, op, v=None): return {'q': code, 'op': op, 'v': v}
def parse_values(s):
    s = re.sub(r'\s*\(.*?\)\s*$', '', s).strip()
    parts = re.split(r',\s*|\s+ou\s+', s)
    return [val(p) for p in parts if val(p)]

MANUAL = {
 'IDT-004': {'all': [atom('IDT-005', 'in', ['Femme']), atom('FAM-001', 'nin', ['Célibataire', None])]},
 'ENT-012': None, 'ENT-013': {'all': [atom('ENT-008', 'in', ['Mineur (0-17 ans)'])]},
 'VUL-004': {'all': [atom('IDT-005', 'in', ['Femme']), atom('_age', 'ge', 12)]},
 'VUL-005': {'all': [atom('IDT-005', 'in', ['Femme']), atom('_age', 'ge', 12)]},
 'EDU-009': {'all': [atom('_age', 'ge', 6)]}, 'EDU-010': {'all': [atom('_age', 'ge', 6)]}, 'EDU-011': {'all': [atom('_age', 'ge', 6)]},
 'EDU-003': {'all': [atom('EDU-001', 'nin', ['Aucun', 'Préscolaire', None])]},
 'EDU-004': {'all': [atom('EDU-001', 'in', ['Secondaire 2nd cycle', 'Supérieur'])]},
 'VUL-027': {'all': [atom('ENT-008', 'in', ['Mineur (0-17 ans)'])]}, 'VUL-028': {'all': [atom('ENT-008', 'in', ['Mineur (0-17 ans)'])]},
 'RES-009': None, 'RES-010': None,
 'ORI-002': {'any': [atom('VUL-026', 'in', ['Oui', 'Suspecté', 'À confirmer']), atom('PAR-024', 'in', ['Oui'])]},
 'PAR-036': {'all': [atom('PAR-035', 'ne_q', 'PAR-034')]},
 'BIO-001': {'all': [atom('ENT-010', 'in', ['Oui'])]},
}
def parse_cond(q):
    c = q['code']
    if c in MANUAL: return MANUAL[c]
    if c.startswith('BIO-'): return MANUAL['BIO-001']
    s = (q['cond'] or '').strip()
    if not s or s == '—' or s.startswith('Obligatoire si') or s.startswith('Non affiché'): return None
    m = re.match(r'^Si ([A-Z]{3}-\d{3}) = (.+?)(?: ou ([A-Z]{3}-\d{3}) = (.+))?$', s)
    if m:
        a = atom(m.group(1), 'in', parse_values(m.group(2)))
        if m.group(3): return {'any': [a, atom(m.group(3), 'in', parse_values(m.group(4)))]}
        return {'all': [a]}
    m = re.match(r'^Si ([A-Z]{3}-\d{3}) différent de (.+)$', s)
    if m: return {'all': [atom(m.group(1), 'nin', parse_values(m.group(2)) + [None])]}
    m = re.match(r'^Si ([A-Z]{3}-\d{3}) > (\d+)$', s)
    if m: return {'all': [atom(m.group(1), 'gt', int(m.group(2)))]}
    m = re.match(r'^Si ([A-Z]{3}-\d{3}) contient (.+)$', s)
    if m: return {'all': [atom(m.group(1), 'contains', val(m.group(2)))]}
    print('NON ANALYSÉE', c, s, file=sys.stderr)
    return None

out = []
for q in Q:
    w = widget(q)
    d = dict(code=q['code'], sect=q['sect'], sectLabel=q['sectLabel'], sous=q['sous'], label=q['label'].split(' — Note V1')[0], widget=w,
             options=mods(q), car=q['car'], condText=q['cond'], cond=parse_cond(q), sens=q['sens'], moment=q['moment'],
             collecte=q['collecte'], groupe=q['groupe'], point=q['point'], fmt=q['fmt'], ctrl=q['ctrl'])
    out.append(d)
# vérification des valeurs de conditions
for d in out:
    c = d['cond']
    if not c: continue
    for a in c.get('all', []) + c.get('any', []):
        if a['q'].startswith('_') or a['op'] in ('gt', 'ne_q', 'contains', 'ge'): continue
        ref = next((x for x in out if x['code'] == a['q']), None)
        if ref is None: print('CODE INCONNU', d['code'], a, file=sys.stderr); continue
        for v in a['v'] or []:
            if v is not None and ref['options'] and v not in ref['options'] and not (ref['widget'] in ('yesno',) and v in ('Oui', 'Non')):
                print('VALEUR ?', d['code'], a['q'], repr(v), ref['options'][:8], file=sys.stderr)
open(OUT, 'w').write('/* Généré depuis le dictionnaire pré-rempli — ne pas modifier à la main */\nwindow.DICO = ' + json.dumps(out, ensure_ascii=False) + ';\n')
from collections import Counter
print(Counter(d['widget'] for d in out))
