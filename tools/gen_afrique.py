"""Génère web/assets/data/afrique_geo.js : contours simplifiés des pays (Afrique, Méditerranée, Proche-Orient)
en GeoJSON (longitude, latitude), utilisés comme couche de la carte et comme fond de secours hors connexion.
Source : Natural Earth 1:50m (domaine public) via le paquet world-atlas."""
import json
from shapely.geometry import shape, box, mapping
LON0, LON1, LAT0, LAT1 = -26.0, 60.0, -38.0, 56.0
fc = json.load(open('/tmp/claude-0/c50.geojson'))
wc = {c['n']: c['a2'] for c in json.load(open('/tmp/claude-0/wc.json')) if c['n']}
clip = box(LON0, LAT0, LON1, LAT1)
feats = []
def arrondi(o):
    if isinstance(o, float): return round(o, 2)
    if isinstance(o, (list, tuple)): return [arrondi(x) for x in o]
    return o
for f in fc['features']:
    if not f.get('geometry'): continue
    g = shape(f['geometry']).buffer(0)
    if not g.intersects(clip): continue
    g = g.intersection(clip).simplify(0.05, preserve_topology=True)
    if g.is_empty or g.geom_type not in ('Polygon', 'MultiPolygon'): continue
    a2 = wc.get(str(f.get('id')).zfill(3)) or ''
    m = mapping(g)
    feats.append({'type': 'Feature', 'properties': {'c': a2, 'n': f['properties']['name']}, 'geometry': {'type': m['type'], 'coordinates': arrondi(m['coordinates'])}})
js = 'window.AFRIQUE_GEO = ' + json.dumps({'type': 'FeatureCollection', 'features': feats}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open('../web/assets/data/afrique_geo.js', 'w').write('/* Contours : Natural Earth 1:50m (domaine public), simplifiés */\n' + js)
print(len(feats), round(len(js) / 1024), 'Ko')
