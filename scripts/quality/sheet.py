"""Contact sheet per case: the three Mapbox views and five independent-viewer views.
usage: python scripts/quality/sheet.py <out dir> [case id ...]   ->  <out dir>/<case>/sheet.jpg"""
import os
import sys

from PIL import Image, ImageDraw

OUT = sys.argv[1]
cases = sys.argv[2:] or sorted(d for d in os.listdir(OUT) if os.path.isdir(os.path.join(OUT, d)))
ORDER = ['map-street', 'map-oblique', 'map-roof', 'glb-entrance', 'glb-street', 'glb-facade', 'glb-oblique', 'glb-roof']
CW, CH = 640, 440
for case in cases:
    tiles = [(n, os.path.join(OUT, case, n + '.jpg')) for n in ORDER]
    tiles = [(n, p) for n, p in tiles if os.path.exists(p)]
    if not tiles:
        continue
    cols = 4
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * CW, rows * CH), '#ffffff')
    for i, (name, path) in enumerate(tiles):
        im = Image.open(path).convert('RGB')
        scale = max(CW / im.width, CH / im.height)
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        left, top = (im.width - CW) // 2, (im.height - CH) // 2
        im = im.crop((left, top, left + CW, top + CH))
        sheet.paste(im, ((i % cols) * CW, (i // cols) * CH))
        ImageDraw.Draw(sheet).text(((i % cols) * CW + 8, (i // cols) * CH + 6), name, fill='#111111')
    sheet.save(os.path.join(OUT, case, 'sheet.jpg'), quality=88)
    print(os.path.join(OUT, case, 'sheet.jpg'))
