"""Repaint the figure's atlas into a different man and different clothes, then repack the GLB.
Regions are chosen in model space (cm) through the per-texel position maps."""
import io, json, struct
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
from glbio import load, SRC

OUT = '/Users/mercator/Documents/Spatial/Mapbox Building Generator/haunted_ar/assets/uncounted.glb'
rng = np.random.default_rng(1913)
j, binb = load()
bv = j['bufferViews'][j['images'][0]['bufferView']]
atlas = Image.open(io.BytesIO(binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
img = np.asarray(atlas, np.float32) / 255
S = img.shape[0]
PM = np.load('posmaps.npz')

def lum(a): return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
def sm(m, s): return np.clip(gaussian_filter(m.astype(np.float32), s), 0, 1)
def noise(s, aniso=None):
    n = gaussian_filter(rng.standard_normal((S, S)).astype(np.float32), aniso or s)
    return n / (n.std() + 1e-6)
def ncblur(a, w, s):
    """Blur `a` using only pixels where w > 0 (normalised convolution)."""
    num = np.stack([gaussian_filter(a[..., c] * w, s) for c in range(3)], -1)
    den = gaussian_filter(w, s)
    return num / np.maximum(den, 1e-4)[..., None], den
def mix(a, b, t): return a + (b - a) * t[..., None]
def shading(mask, s=28):
    """Fold and crease shading of the original cloth, independent of its colour."""
    L = lum(img)
    w = mask.astype(np.float32)
    avg = gaussian_filter(L * w, s) / np.maximum(gaussian_filter(w, s), 1e-4)
    return np.clip(L / np.maximum(avg, 1e-3), 0.45, 1.18)

out = img.copy()

# ---------------- skin: a different man ----------------
P = PM['skin']
ok = np.isfinite(P[..., 0])
X, Y, Z = (np.nan_to_num(P[..., i], nan=-999) for i in range(3))
AX = np.abs(X)
L = lum(img)
redness = img[..., 0] - img[..., 1]
lips = ok & (Y > 158.0) & (Y < 160.7) & (AX < 3.1) & (Z > 10) & (redness > 0.16)
nostril = ok & (Y > 161.7) & (AX < 2.0) & (Z > 10.5)
beard_zone = ok & (Y > 146) & ((Y < 162.6) | ((AX > 5.2) & (AX < 7.1) & (Y < 169.5) & (Z > -1) & (Z < 7.5))) & ~lips & ~nostril & ~((AX > 7.1) & (Y > 158))
clean = ok & ~beard_zone & (Y > 158) & (Y < 171) & (Z > 2)
skinref, den30 = ncblur(img, clean.astype(np.float32), 30)
# where clean skin is far away (under the jaw), borrow from a wider neighbourhood
fill, den90 = ncblur(img, clean.astype(np.float32), 90)
base = np.where((den30 > 0.04)[..., None], skinref, fill)
dark = np.clip((lum(base) - L) / (0.3 * lum(base) + 1e-4), 0, 1)
core = sm(beard_zone & (Y < 162.5) & (AX < 6.8), 5)
hair_t = np.clip(sm(beard_zone, 3) * np.clip(dark * 3, 0, 1) + core * 0.85, 0, 1)
out = mix(out, base * (1 + 0.015 * noise(2.0))[..., None], hair_t)
soft = np.stack([gaussian_filter(out[..., c], 1.6) for c in range(3)], -1)
out = mix(out, soft, sm(beard_zone, 3) * 0.7)
# barely there stubble on jaw and upper lip
stub = sm(ok & (Y > 151) & (Y < 161.8) & (Z > 3) & ~lips & ~nostril, 4) * np.clip(noise(0.7) - 1.0, 0, 1) * 0.05
out *= (1 - stub)[..., None]
# scalp hair to match the new, darker hair
scalp = ok & (Y > 160) & ((Z < 3.5) | (Y > 173.5)) & ~((AX > 7.1) & (Y < 169) & (Z > -2))
hairy = np.clip((lum(base) - L) / (0.4 * lum(base) + 1e-4), 0, 1) * sm(scalp, 2)
hs = np.clip(L / max(float(L[scalp].mean()), 1e-3), 0.55, 1.5)
hair_rgb = np.array([0.22, 0.2, 0.18], np.float32) * hs[..., None] * (1 + 0.12 * noise(None, (0.5, 2.5)))[..., None]
out = mix(out, hair_rgb, np.clip(hairy * 1.5, 0, 0.92))
# thinner, fainter brows
brow = ok & (Y > 167.8) & (Y < 170.8) & (AX > 0.8) & (AX < 6.6) & (Z > 6)
out = mix(out, base, sm(brow, 2) * 0.45)
# a forehead that is almost perfectly smooth
fore = ok & (Y > 170.5) & (AX < 5.5) & (Z > 4)
blurred = np.stack([gaussian_filter(out[..., c], 2.5) for c in range(3)], -1)
out = mix(out, blurred, sm(fore, 4) * 0.7)
# temples like old parchment
temple = ok & (AX > 5.0) & (AX < 8.8) & (Y > 164.5) & (Y < 172.5) & (Z > -2.5) & (Z < 8.5)
tw = sm(temple, 5)
out *= (1 + tw * (0.07 * noise(0.6) + 0.04 * noise(6)))[..., None]
out = mix(out, out * np.array([1.02, 0.99, 0.9]), tw * 0.6)
# veins: faint branching lines at the temples, throat and the backs of the hands
vein = Image.new('L', (S, S))
dv = ImageDraw.Draw(vein)
for region, count in [(temple, 26), (ok & (Y > 137) & (Y < 151) & (Z > -2), 22), (ok & (AX > 62) & (AX < 76) & (Y > 142), 30)]:
    ys, xs = np.nonzero(region)
    if not len(xs): continue
    for _ in range(count):
        k = rng.integers(len(xs))
        x, y = float(xs[k]), float(ys[k])
        ang = rng.uniform(0, 2 * np.pi)
        pts = [(x, y)]
        for _ in range(rng.integers(8, 22)):
            ang += rng.normal(0, 0.35)
            x += np.cos(ang) * 3.2
            y += np.sin(ang) * 3.2
            pts.append((x, y))
        dv.line(pts, fill=int(rng.uniform(120, 220)), width=2)
vl = gaussian_filter(np.asarray(vein, np.float32) / 255, 1.1) * ok
out = mix(out, out * np.array([0.86, 0.88, 0.97]), vl * 0.45)
# small fractures at the corners of the mouth, running into the lips
lines = Image.new('L', (S, S))
dl = ImageDraw.Draw(lines)
for side in (-1, 1):
    corner = ok & (X * side > 2.0) & (X * side < 3.0) & (Y > 158.6) & (Y < 160.1) & (Z > 8.5)
    ys, xs = np.nonzero(corner)
    if not len(xs): continue
    cx, cy = xs.mean(), ys.mean()
    for _ in range(4):
        ang = rng.uniform(0, 2 * np.pi)
        x, y = cx + rng.normal(0, 2), cy + rng.normal(0, 2)
        pts = [(x, y)]
        for _ in range(rng.integers(3, 7)):
            ang += rng.normal(0, 0.5)
            x += np.cos(ang) * 2.2
            y += np.sin(ang) * 2.2
            pts.append((x, y))
        dl.line(pts, fill=255, width=1)
fl = gaussian_filter(np.asarray(lines, np.float32) / 255, 0.5) * ok
out = mix(out, out * np.array([0.62, 0.5, 0.5]), np.clip(fl * 1.4, 0, 0.8))
# fingertips: dull, darker nails
tips = ok & (AX > 79) & (Y > 136)
out = mix(out, out * np.array([0.74, 0.7, 0.62]), sm(tips, 2) * 0.55)
# eyes: dark, but not unnaturally black; sclera faintly yellow-grey
u = np.arange(S)[None, :] / S
v = np.arange(S)[:, None] / S
eyeball = ok & (u > 0.49) & (u < 0.62) & (v > 0.7) & (Y > 163) & (Y < 171)
iris = eyeball & (img[..., 0] - img[..., 2] > 0.08) & (L < 0.55)
out = mix(out, out * np.array([0.5, 0.46, 0.44]), sm(iris, 1) * 0.9)
out = mix(out, out * np.array([0.93, 0.91, 0.84]), (eyeball & ~iris) * 0.6)
# teeth: dull and uneven
teeth = ok & (u > 0.6) & (v > 0.89) & (lum(img) > 0.55)
out = mix(out, np.broadcast_to(np.array([0.74, 0.7, 0.58], np.float32), out.shape), teeth * 0.4)
# pallor of someone long indoors, baked here instead of in the shader
pl = lum(out)
pale = mix(out, np.stack([pl] * 3, -1), np.full(pl.shape, 0.33, np.float32)) * np.array([1.0, 0.975, 0.965]) + 0.1
out = np.where(ok[..., None], pale, out)

# ---------------- clothes ----------------
def cloth(name, rgb, weave=0.06, aniso=(0.6, 2.2), gamma=1.15):
    Pm = PM[name]
    m = np.isfinite(Pm[..., 0])
    sh = shading(m) ** gamma
    wv = 1 + weave * noise(None, aniso) + 0.03 * noise(5)
    col = np.array(rgb, np.float32) * (sh * wv)[..., None]
    return m, sh, col, np.nan_to_num(Pm, nan=-999)

m, sh, col, Pj = cloth('jacket', [0.27, 0.255, 0.235])
crease = np.clip((0.88 - sh) * 3, 0, 1) * np.clip(0.6 + 0.4 * noise(3), 0, 1)
col = col + np.array([0.07, 0.065, 0.055]) * crease[..., None]
out = np.where(m[..., None], col, out)

m, sh, col, Pt = cloth('trousers', [0.235, 0.225, 0.21], weave=0.05)
Yt = Pt[..., 1]
mud = np.clip((18 - Yt) / 11, 0, 1) * np.clip(0.55 + 0.45 * noise(4), 0, 1)
dust = np.clip((48 - Yt) / 30, 0, 1) * 0.25
col = mix(col, np.broadcast_to(np.array([0.34, 0.28, 0.21], np.float32), col.shape), np.clip(mud * 0.7 + dust * 0.4, 0, 0.8))
out = np.where(m[..., None], col, out)

m, sh, col, Ps = cloth('shoes', [0.21, 0.155, 0.115], weave=0.02, gamma=1.0)
Ls = lum(img)
shoe_sh = np.clip(Ls / max(Ls[m].mean(), 1e-3), 0.5, 1.4) ** 0.45
col = np.array([0.21, 0.155, 0.115], np.float32) * shoe_sh[..., None] * (0.85 + 0.15 * sh[..., None])
sole = Ps[..., 1] < 4.6
col = np.where(sole[..., None], np.array([0.11, 0.1, 0.095]) * sh[..., None], col)
scuff = np.clip(noise(1.5) - 1.4, 0, 1) * 0.35
col = col + scuff[..., None] * np.array([0.25, 0.22, 0.18])
out = np.where(m[..., None], col, out)

m, sh, col, _ = cloth('shirt', [0.4, 0.42, 0.44], weave=0.03)
out = np.where(m[..., None], col, out)

m, sh, col, _ = cloth('hair', [0.21, 0.19, 0.17], weave=0.22, aniso=(0.5, 3.5), gamma=1.6)
grey = np.clip(noise(0.6) - 0.9, 0, 1) * 0.6
col = col + grey[..., None] * np.array([0.25, 0.25, 0.24])
out = np.where(m[..., None], col, out)

out = np.clip(out, 0, 1)
res = Image.fromarray((out * 255 + 0.5).astype(np.uint8))
res.save('atlas_new.png')
buf = io.BytesIO()
res.save(buf, 'JPEG', quality=90, optimize=True)
newimg = buf.getvalue()

# ---------------- repack the GLB ----------------
img_bv = j['images'][0]['bufferView']
chunks = []
offset = 0
for i, view in enumerate(j['bufferViews']):
    data = newimg if i == img_bv else binb[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    pad = (-offset) % 4
    chunks.append(b'\x00' * pad)
    offset += pad
    view['byteOffset'] = offset
    view['byteLength'] = len(data)
    chunks.append(data)
    offset += len(data)
newbin = b''.join(chunks)
newbin += b'\x00' * ((-len(newbin)) % 4)
j['buffers'][0]['byteLength'] = len(newbin)
j['asset']['extras']['modifications'] = 'Texture repainted (new face, skin and clothing) for Tapestry; geometry unchanged.'
js = json.dumps(j, separators=(',', ':')).encode()
js += b' ' * ((-len(js)) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(newbin))
glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(newbin), 0x004E4942) + newbin
open(OUT, 'wb').write(glb)
print('wrote', OUT, len(glb), 'bytes; texture', len(newimg))
