"""Writes the test footprints for cases.json. One site: an open lot on Harbour Esplanade,
Docklands, Melbourne (clear of mapped buildings, so the cameras are unobstructed). Plans are
drawn in metres with the street front at -y, then turned so the front faces the Esplanade
(bearing 252), which also keeps every case off the north-south axis.
usage: python scripts/quality/make_footprints.py"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = json.load(open(os.path.join(HERE, 'cases.json')))['site']
LNG, LAT, FRONT = SITE['lng'], SITE['lat'], SITE['frontBearing']
KX, KY = 111320 * math.cos(math.radians(LAT)), 110540
fy = (math.sin(math.radians(FRONT + 180)), math.cos(math.radians(FRONT + 180)))   # local +y (rear), east/north
fx = (fy[1], -fy[0])                                                              # local +x


def write(name, rings, props=None):
    def world(x, y):
        e, n = x * fx[0] + y * fy[0], x * fx[1] + y * fy[1]
        return [round(LNG + e / KX, 8), round(LAT + n / KY, 8)]
    geo = {'type': 'Polygon', 'coordinates': [[world(x, y) for x, y in ring + [ring[0]]] for ring in rings]}
    p = {'source': name}
    p.update(props or {})
    json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': p, 'geometry': geo}]},
              open(os.path.join(HERE, 'footprints', name + '.geojson'), 'w'))


def rect(w, d):
    return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]


write('rect-40x28', [rect(40, 28)])
write('rect-36x30', [rect(36, 30)])
write('rect-34x26', [rect(34, 26)])
# office lot with one skewed side
write('trapezoid-46x32', [[[-23, -16], [23, -16], [21, 16], [-23, 13]]])
write('rect-56x40', [rect(56, 40)])
# irregular: concave L with a chamfered corner, a skewed edge, a short return and a light well (hole)
write('irregular-L', [
    [[-26, -20], [18, -20], [26, -12], [26, 2], [6, 2], [6, 8], [2, 8], [2, 21], [-24, 23]],
    [[-17, -11], [-7, -11], [-7, -3], [-17, -3]]
], {'height': 52, 'building:levels': 15})
