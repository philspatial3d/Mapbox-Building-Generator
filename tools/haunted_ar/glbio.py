import json, struct, io
import numpy as np
SRC = '/Users/mercator/Downloads/rigged_t-pose_human_male_w_50_face_blendshapes.glb'
CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def load(path=SRC):
    b = open(path, 'rb').read()
    L = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + L])
    bs = 20 + L + 8
    blen = struct.unpack('<I', b[20 + L:24 + L])[0]
    return j, b[bs:bs + blen]
def acc(j, binb, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', n * dt.itemsize)
    raw = np.frombuffer(binb, dtype=np.uint8, count=stride * (a['count'] - 1) + n * dt.itemsize, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], n * dt.itemsize), strides=(stride, 1))
    return np.ascontiguousarray(out).view(dt).reshape(a['count'], n)
def meshes(j, binb):
    res = {}
    for m in j['meshes']:
        p = m['primitives'][0]
        res[m['name']] = dict(pos=acc(j, binb, p['attributes']['POSITION']), uv=acc(j, binb, p['attributes']['TEXCOORD_0']), idx=acc(j, binb, p['indices']).reshape(-1, 3))
    return res
