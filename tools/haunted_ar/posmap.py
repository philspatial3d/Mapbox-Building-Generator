"""Per-texel model-space position (cm) for each garment, by barycentric rasterisation."""
import numpy as np
from glbio import *
S = 2048
NAMES = {'0': 'skin', 'Sweatshirt_MikeAlger_Material.2_0': 'jacket', 'Pants_MikeAlger_Material.3_0': 'trousers', 'Hair_MikeAlger_Material.4_0': 'hair', 'Shirt_MikeAlger_Material.5_0': 'shirt', 'Shoes_MikeAlger_Material.6_0': 'shoes'}
def raster(m):
    P = np.full((S, S, 3), np.nan, np.float32)
    uv = m['uv'] * S - 0.5
    pos = m['pos']
    for t in m['idx']:
        a, b, c = uv[t]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, S - 1), min(y1, S - 1)
        if x1 < x0 or y1 < y0: continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9: continue
        w0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
        w1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not inside.any(): continue
        p = w0[..., None] * pos[t[0]] + w1[..., None] * pos[t[1]] + w2[..., None] * pos[t[2]]
        P[ys[inside], xs[inside]] = p[inside]
    return P
if __name__ == '__main__':
    j, binb = load()
    ms = meshes(j, binb)
    out = {}
    for k, nm in NAMES.items():
        out[nm] = raster(ms[k])
        print(nm, np.isfinite(out[nm][..., 0]).sum())
    np.savez_compressed('posmaps.npz', **out)
