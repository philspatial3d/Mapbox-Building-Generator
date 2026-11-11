/* The figure. One rigged, photo-textured human (Mike Alger, CC BY 4.0) re-posed from
   T-pose to a dead-still stance, scaled to 1.93 m, with a neck 3 cm too long, a face
   whose features sit slightly wrong, and a few morph targets built here because the
   published GLB carries none: lip, jaw and the rarely seen muzzle beneath the face. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = new URL('./assets/uncounted.glb', import.meta.url).href;
const HEIGHT_SCALE = 1.93 / 1.79;
const NECK_EXTRA_CM = 3;

const PARTS = {
  Object_7: 'skin', Object_9: 'bracelet', Object_11: 'jacket', Object_13: 'trousers',
  Object_15: 'hair', Object_17: 'shirt', Object_19: 'shoes'
};

/* The coat, trousers and shoes are baked into the texture (see CREDITS.md); these
   tints are the small shifts the mind supplies for the place. The posture never changes. */
const APPEARANCES = [
  { jacket: [1, 1, 1], trousers: [1, 1, 1], shirt: [1, 1, 1], shoes: [1, 1, 1], hair: [1, 1, 1] },
  { jacket: [0.86, 0.9, 1.06], trousers: [1.18, 1.14, 1.08], shirt: [1.3, 1.26, 1.12], shoes: [0.8, 0.8, 0.82], hair: [1.45, 1.42, 1.38] },
  { jacket: [1.12, 1.02, 0.88], trousers: [0.9, 0.9, 0.96], shirt: [0.82, 0.86, 0.92], shoes: [1.15, 1.06, 0.95], hair: [0.85, 0.85, 0.85] }
];

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const tv1 = new THREE.Vector3();
const tv2 = new THREE.Vector3();
const tv3 = new THREE.Vector3();
const tq1 = new THREE.Quaternion();
const tq2 = new THREE.Quaternion();
const tq3 = new THREE.Quaternion();

/* Smooth window: 1 inside [a, b], easing to 0 over `f` outside it. */
function win(v, a, b, f) {
  if (v < a - f || v > b + f) return 0;
  if (v < a) return THREE.MathUtils.smootherstep(v, a - f, a);
  if (v > b) return 1 - THREE.MathUtils.smootherstep(v, b, b + f);
  return 1;
}

/* Face edits in bind-pose model space (cm; y up, +z out of the face, +x the figure's
   left). Landmarks measured from the mesh: chin ~155, mouth ~159.5, nose tip ~163,
   eyes ~167, crown ~179. */
/* The long coat: a skirt from the jacket hem to mid-calf, fitted ring by ring to the
   trousers' own cross-section, flaring a little, skinned to the hips and thighs and
   cut from the same wool as the jacket (a mirrored patch of its texture). */
function buildCoatSkirt(jacket, trousers, bones) {
  const tp = trousers.geometry.attributes.position;
  const yTop = 93;
  const yBot = 34;
  const rings = 18;
  const seg = 44;
  const pos = [];
  const uv = [];
  const skinIndex = [];
  const skinWeight = [];
  const index = [];
  const bonesList = jacket.skeleton.bones;
  const hips = bonesList.indexOf(bones.Hips);
  const lThigh = bonesList.indexOf(bones.LeftUpLeg);
  const rThigh = bonesList.indexOf(bones.RightUpLeg);
  const U0 = 0.135, U1 = 0.275, V0 = 0.135, V1 = 0.3;
  for (let r = 0; r <= rings; r++) {
    const f = r / rings;
    const y = yTop - (yTop - yBot) * f;
    let cx = 0, cz = 0, n = 0;
    const band = [];
    for (let i = 0; i < tp.count; i++) {
      const vy = tp.getY(i);
      if (Math.abs(vy - y) < 2.5) { band.push([tp.getX(i), tp.getZ(i)]); cx += tp.getX(i); cz += tp.getZ(i); n++; }
    }
    if (n) { cx /= n; cz /= n; }
    const margin = 1.4 + 4.2 * f * f + 1.2 * f;
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      let support = 12;
      band.forEach(([bx, bz]) => { support = Math.max(support, (bx - cx) * dx + (bz - cz) * dz); });
      /* Wool hangs straighter at the back than over the knees. */
      const rr = support + margin * (dz > 0 ? 1 : 0.8);
      const x = cx + dx * rr;
      pos.push(x, y, cz + dz * rr);
      const t = (k / seg) * 4;
      uv.push(U0 + Math.abs((t % 2) - 1) * (U1 - U0), V0 + f * (V1 - V0));
      const leg = Math.min(0.7, f * 0.9);
      skinIndex.push(hips, x > 0 ? lThigh : rThigh, 0, 0);
      skinWeight.push(1 - leg, leg, 0, 0);
    }
  }
  /* Hangs open at the front, like the jacket above it, widening toward the hem. */
  for (let r = 0; r < rings; r++) {
    const open = 0.42 + 0.22 * (r / rings);
    for (let k = 0; k < seg; k++) {
      const mid = ((k + 0.5) / seg) * Math.PI * 2;
      if (Math.min(mid, Math.PI * 2 - mid) < open) continue;
      const a = r * (seg + 1) + k;
      const b = a + seg + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(g, jacket.material);
  mesh.name = 'coat_skirt';
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  jacket.parent.add(mesh);
  mesh.bind(jacket.skeleton, jacket.bindMatrix);
  return mesh;
}

function buildFaceTargets(geometry) {
  const pos = geometry.attributes.position;
  const n = pos.count;
  const wrong = new Float32Array(n * 3);
  const lip = new Float32Array(n * 3);
  const jaw = new Float32Array(n * 3);
  const muzzle = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < 150 || Math.abs(x) > 11) continue;
    const ax = Math.abs(x);
    const sx = Math.sign(x) || 1;
    const o = i * 3;
    /* Eyes a little too far apart. */
    const eye = win(y, 165.2, 168.8, 1.6) * win(ax, 1.9, 6.4, 1.4) * win(z, 7, 20, 2.5);
    wrong[o] += sx * 0.32 * eye;
    /* The nose begins too low. */
    const nose = win(y, 161.2, 166.4, 1.2) * win(ax, 0, 2.2, 1.2) * win(z, 10, 20, 1.5);
    wrong[o + 1] -= 0.38 * nose;
    /* The mouth sits where the jaw's tension belongs. */
    const mouth = win(y, 157.4, 160.6, 1.2) * win(ax, 0, 4.6, 1.4) * win(z, 7.5, 20, 2);
    wrong[o + 1] -= 0.42 * mouth;
    /* Cheekbones that do not support the skin. */
    const cheek = win(y, 161.2, 164.6, 1.4) * win(ax, 3.8, 7.0, 1.2) * win(z, 5, 20, 2);
    wrong[o + 2] -= 0.3 * cheek;
    /* The left ear set back. */
    const ear = win(y, 159.5, 168.5, 1.5) * win(x, 7.3, 11, 0.8);
    wrong[o + 2] -= 0.5 * ear;

    /* A different man: long chin, narrow jaw, gaunt cheeks, heavy brow, thin lips,
       a pinched nose bridge and eyes set deep. */
    const chin = (1 - THREE.MathUtils.smootherstep(y, 153.5, 157.5)) * win(z, 2, 20, 2) * win(y, 148, 170, 2);
    wrong[o + 1] -= 1.3 * chin;
    wrong[o + 2] += 0.35 * chin;
    const jawSide = win(y, 150.5, 158.5, 1.5) * THREE.MathUtils.smootherstep(ax, 3.5, 6.5);
    wrong[o] -= x * 0.11 * jawSide;
    const gaunt = win(y, 157.5, 163.5, 1.2) * win(ax, 4, 7, 1) * win(z, 3, 20, 2);
    wrong[o] -= sx * 0.4 * gaunt;
    wrong[o + 2] -= 0.85 * gaunt;
    const brow = win(y, 168.2, 170.6, 0.9) * win(ax, 0, 6, 1.2) * win(z, 9, 20, 1.5);
    wrong[o + 2] += 0.55 * brow;
    wrong[o + 1] -= 0.2 * brow;
    const lips = win(y, 158.4, 160.6, 0.5) * win(ax, 0, 3.2, 0.8) * win(z, 10.5, 20, 1);
    wrong[o + 1] += (159.5 - y) * 0.25 * lips;
    wrong[o + 2] -= 0.3 * lips;
    const bridge = win(y, 163, 167, 1) * win(ax, 0.8, 2.5, 0.6) * win(z, 10, 20, 1);
    wrong[o] -= sx * 0.22 * bridge;
    wrong[o + 2] -= 0.6 * eye;
    /* A longer, narrower nose with a slight hook. */
    const tip = win(y, 161.3, 164.2, 0.9) * win(ax, 0, 2.6, 0.8) * win(z, 11.5, 20, 1);
    wrong[o + 1] -= 0.45 * tip;
    wrong[o + 2] += 0.35 * tip;
    wrong[o] -= x * 0.18 * nose;
    /* Hollow temples. */
    const hollow = win(y, 165, 171, 1.5) * win(ax, 5.6, 8.2, 1) * win(z, -1, 7, 2);
    wrong[o] -= sx * 0.35 * hollow;

    /* Lower lip first, then the jaw follows. */
    const front = win(z, 9.5, 20, 1.5);
    lip[o + 1] -= 0.5 * win(y, 158.2, 159.4, 0.5) * win(ax, 0, 2.8, 1.2) * front;
    const below = 1 - THREE.MathUtils.smootherstep(y, 157.6, 159.7);
    const jw = below * win(ax, 0, 6.2, 2.2) * win(z, -1, 20, 3) * win(y, 151, 170, 2);
    jaw[o + 1] -= 1.25 * jw;
    jaw[o + 2] -= 0.4 * jw;

    /* An older anatomy under the skin: the lower face and nose drawn forward. */
    const snout = win(y, 154.5, 163.5, 1.5) * win(ax, 0, 5.5, 2) * win(z, 4, 20, 2);
    muzzle[o + 2] += 2.4 * snout;
    muzzle[o + 1] -= 0.9 * snout;
    muzzle[o + 2] += 1.2 * nose;
    muzzle[o + 2] -= 0.8 * eye;
  }
  geometry.morphAttributes.position = [wrong, lip, jaw, muzzle].map(a => new THREE.Float32BufferAttribute(a, 3));
  geometry.morphTargetsRelative = true;
  return { wrong: 0, lip: 1, jaw: 2, muzzle: 3 };
}

export class Uncounted {
  constructor() {
    this.root = new THREE.Group();
    this.root.visible = false;
    this.ready = false;
    this.params = {
      headYaw: 0, headPitch: 0.07, headRoll: 0, jaw: 0, lip: 0, muzzle: 0,
      suspended: 0, breath: 0, transform: 0, count: [0, 0, 0], eyeTarget: null
    };
    this.dirty = true;
  }

  async load() {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    const model = gltf.scene;
    this.model = model;
    this.meshes = {};
    model.traverse(obj => {
      if (!obj.isSkinnedMesh) return;
      const part = PARTS[obj.name] || 'other';
      this.meshes[part] = obj;
      const src = obj.material;
      const mat = new THREE.MeshStandardMaterial({
        map: src.map,
        roughness: { skin: 0.58, shoes: 0.72, hair: 0.86 }[part] || 0.93,
        metalness: 0
      });
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      obj.material = mat;
      obj.castShadow = true;
      obj.frustumCulled = false;
      if (part === 'bracelet') obj.visible = false;
    });

    const skin = this.meshes.skin;
    this.morph = buildFaceTargets(skin.geometry);
    skin.updateMorphTargets();
    skin.morphTargetInfluences[this.morph.wrong] = 1;

    this.bones = {};
    model.traverse(obj => {
      if (!obj.isBone) return;
      const m = /^mixamorig_([A-Za-z0-9]+?)_\d+$/.exec(obj.name);
      if (m && !this.bones[m[1]]) this.bones[m[1]] = obj;
    });

    this.meshes.jacket.material.side = THREE.DoubleSide;
    this.coat = buildCoatSkirt(this.meshes.jacket, this.meshes.trousers, this.bones);

    model.scale.multiplyScalar(HEIGHT_SCALE);
    this.root.add(model);
    model.updateMatrixWorld(true);
    this.buildRestPose();
    this.ready = true;
    return this;
  }

  /* T-pose -> standing: arms hang beside the thighs, palms in, fingers loose. */
  buildRestPose() {
    const b = this.bones;
    const aim = (bone, child, dir) => {
      bone.updateWorldMatrix(true, false);
      const from = child.getWorldPosition(tv1).sub(bone.getWorldPosition(tv2)).normalize();
      const delta = tq1.setFromUnitVectors(from, tv3.copy(dir).normalize());
      const parentQ = bone.parent.getWorldQuaternion(tq2);
      bone.quaternion.premultiply(parentQ).premultiply(delta).premultiply(tq3.copy(parentQ).invert());
      bone.updateMatrixWorld(true);
    };
    [['Left', 1], ['Right', -1]].forEach(([s, side]) => {
      aim(b[`${s}Arm`], b[`${s}ForeArm`], new THREE.Vector3(side * 0.13, -1, 0.02));
      aim(b[`${s}ForeArm`], b[`${s}Hand`], new THREE.Vector3(side * 0.07, -1, 0.09));
      aim(b[`${s}Hand`], b[`${s}HandMiddle1`], new THREE.Vector3(side * 0.03, -1, 0.05));
    });

    this.rest = new Map();
    this.localAxes = new Map();
    this.root.updateMatrixWorld(true);
    Object.values(b).forEach(bone => {
      this.rest.set(bone, { q: bone.quaternion.clone(), p: bone.position.clone(), s: bone.scale.clone() });
      const inv = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
      this.localAxes.set(bone, {
        x: X.clone().applyQuaternion(inv), y: Y.clone().applyQuaternion(inv), z: Z.clone().applyQuaternion(inv)
      });
    });

    /* Finger curl axes: the axis that turns each finger toward its palm. */
    this.curl = new Map();
    [['Left', 1], ['Right', -1]].forEach(([s, side]) => {
      const palm = new THREE.Vector3(-side, 0, 0.15).normalize();
      ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'].forEach(f => [1, 2, 3].forEach(k => {
        const bone = b[`${s}Hand${f}${k}`];
        const next = b[`${s}Hand${f}${k + 1}`];
        if (!bone || !next) return;
        const dir = next.getWorldPosition(tv1).sub(bone.getWorldPosition(tv2)).normalize();
        const axisWorld = new THREE.Vector3().crossVectors(dir, palm).normalize();
        const inv = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
        this.curl.set(bone, axisWorld.applyQuaternion(inv));
      }));
    });
    /* Eye forward vectors in each eye bone's own frame. */
    this.eyeForward = new Map();
    ['LeftEye', 'RightEye'].forEach(name => {
      const bone = b[name];
      if (!bone) return;
      const inv = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
      this.eyeForward.set(bone, Z.clone().applyQuaternion(inv));
    });
    this.dirty = true;
  }

  setAppearance(index) {
    const look = APPEARANCES[((index % APPEARANCES.length) + APPEARANCES.length) % APPEARANCES.length];
    Object.entries(look).forEach(([part, rgb]) => {
      const mesh = this.meshes[part];
      if (mesh) mesh.material.color.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
    });
  }

  /* Place feet at local ground point (x, z) with the body facing compass bearing `deg`. */
  place(x, z, bodyBearingDeg) {
    this.root.position.set(x, 0, z);
    this.root.rotation.set(0, Math.PI - THREE.MathUtils.degToRad(bodyBearingDeg), 0);
    this.bodyBearing = bodyBearingDeg;
    this.root.updateMatrixWorld(true);
    this.dirty = true;
  }

  set(changes) {
    Object.assign(this.params, changes);
    this.dirty = true;
  }

  rotLocal(bone, axisName, angle) {
    if (!bone || !angle) return;
    bone.quaternion.multiply(tq1.setFromAxisAngle(this.localAxes.get(bone)[axisName], angle));
  }

  applyPose() {
    if (!this.ready || !this.dirty) return;
    this.dirty = false;
    const p = this.params;
    const b = this.bones;
    this.rest.forEach((r, bone) => {
      bone.quaternion.copy(r.q);
      bone.position.copy(r.p);
      bone.scale.copy(r.s);
    });

    const t = p.transform;
    /* Suspended from a point above the head: shoulders hang, neck drawn up. */
    const hang = 0.07 + p.suspended * 0.1 + t * 0.32;
    this.rotLocal(b.LeftShoulder, 'z', -hang);
    this.rotLocal(b.RightShoulder, 'z', hang);
    const neckLen = this.rest.get(b.Head).p.length();
    b.Head.position.multiplyScalar((neckLen + NECK_EXTRA_CM + p.suspended * 1.5 + t * 5) / neckLen);

    if (t > 0) {
      ['Spine', 'Spine1', 'Spine2'].forEach(n => b[n] && b[n].scale.set(1, 1 + 0.07 * t, 1));
      [['Left', 1], ['Right', -1]].forEach(([s]) => this.rotLocal(b[`${s}Leg`], 'x', -0.3 * t));
    }
    if (p.breath > 0 && b.Spine2) b.Spine2.scale.set(1 + 0.07 * p.breath, 1 + 0.02 * p.breath, 1 + 0.11 * p.breath);

    this.rotLocal(b.Neck, 'y', p.headYaw * 0.35);
    this.rotLocal(b.Head, 'y', p.headYaw * 0.65);
    this.rotLocal(b.Neck, 'x', p.headPitch * 0.3);
    this.rotLocal(b.Head, 'x', p.headPitch * 0.7);
    this.rotLocal(b.Head, 'z', p.headRoll);

    /* Fingers rest loose; the counting curls one finger at a time. Talons when transformed. */
    [['Left', 1], ['Right', -1]].forEach(([s, side]) => {
      ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'].forEach((f, fi) => [1, 2, 3].forEach(k => {
        const bone = b[`${s}Hand${f}${k}`];
        const axis = bone && this.curl.get(bone);
        if (!axis) return;
        let a = f === 'Thumb' ? 0.08 : 0.16 + fi * 0.03;
        if (side === -1 && fi < 3) a += (p.count[fi] || 0) * 0.55;
        a += t * (f === 'Thumb' ? 0.3 : 0.75);
        bone.quaternion.multiply(tq1.setFromAxisAngle(axis, a * (k === 1 ? 0.8 : 1)));
      }));
    });

    const skin = this.meshes.skin;
    skin.morphTargetInfluences[this.morph.lip] = Math.min(1, p.lip + p.jaw * 0.6 + t * 0.4);
    skin.morphTargetInfluences[this.morph.jaw] = Math.min(1.2, p.jaw + t * 0.7);
    skin.morphTargetInfluences[this.morph.muzzle] = Math.min(1, p.muzzle + t);

    this.root.updateMatrixWorld(true);
    if (p.eyeTarget) this.aimEyes(p.eyeTarget);
  }

  aimEyes(target) {
    this.eyeForward.forEach((fLocal, bone) => {
      bone.updateWorldMatrix(true, false);
      const worldQ = bone.getWorldQuaternion(tq2);
      const current = tv1.copy(fLocal).applyQuaternion(worldQ);
      const wanted = tv2.copy(target).sub(bone.getWorldPosition(tv3)).normalize();
      const delta = tq1.setFromUnitVectors(current, wanted);
      const limited = tq3.identity().slerp(delta, Math.min(1, 0.5 / Math.max(0.01, 2 * Math.acos(Math.min(1, Math.abs(delta.w))))));
      const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.premultiply(parentQ).premultiply(limited).premultiply(parentQ.invert());
      bone.updateMatrixWorld(true);
    });
  }

  /* Head yaw (relative to the body) that turns the face to a world point, capped
     beyond what a neck should allow. */
  yawToward(x, z, limitRad = 2.3) {
    const head = this.bones.Head.getWorldPosition(tv1);
    const want = Math.atan2(x - head.x, z - head.z);
    const body = this.root.rotation.y;
    let d = want - body;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return THREE.MathUtils.clamp(d, -limitRad, limitRad);
  }

  headWorld(target = new THREE.Vector3()) {
    return this.bones.Head.getWorldPosition(target);
  }
}
