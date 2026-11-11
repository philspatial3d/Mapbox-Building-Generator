from glbio import *
from PIL import Image, ImageDraw
j, binb = load()
ms = meshes(j, binb)
S = 2048
names = {'0': 'skin', 'Sweatshirt_MikeAlger_Material.2_0': 'jacket', 'Pants_MikeAlger_Material.3_0': 'trousers', 'Hair_MikeAlger_Material.4_0': 'hair', 'Shirt_MikeAlger_Material.5_0': 'shirt', 'Shoes_MikeAlger_Material.6_0': 'shoes', 'Bracelet_MikeAlger_Material.1_0': 'bracelet'}
colors = {'skin': (255, 160, 120), 'jacket': (60, 60, 200), 'trousers': (60, 200, 60), 'hair': (200, 200, 60), 'shirt': (200, 60, 200), 'shoes': (60, 200, 200), 'bracelet': (255, 255, 255)}
vis = Image.new('RGB', (S, S))
d = ImageDraw.Draw(vis)
for k, m in ms.items():
    nm = names[k]; uv = m['uv'] * S
    mask = Image.new('L', (S, S)); dm = ImageDraw.Draw(mask)
    for t in m['idx']:
        pts = [tuple(uv[i]) for i in t]
        dm.polygon(pts, fill=255); d.polygon(pts, fill=colors[nm])
    mask.save(f'mask_{nm}.png')
    print(nm, 'uv range', m['uv'].min(0), m['uv'].max(0))
vis.resize((1024, 1024)).save('masks_vis.png')
