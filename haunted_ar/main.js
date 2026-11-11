/* A camera. The live feed fills the screen; a transparent WebGL layer above it holds
   one figure, anchored to the street by compass, gyroscope and GPS. Everything else
   lives in director.js (when), uncounted.js (what) and place.js (where). */
import * as THREE from 'three';
import { Uncounted } from './uncounted.js';
import { Director } from './director.js';
import { loadSurroundings, Surroundings, toLocal, sunPosition, bearingOf } from './place.js';
import * as sound from './sound.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const STILL = DEBUG ? params.get('still') : null;
const EXIT_URL = '/';
const EYE_HEIGHT = 1.45;
const LONG_SIDE_FOV = 66;
const MEMORY_KEY = 'camera.v1';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap360 = d => ((d % 360) + 360) % 360;

/* ---------- memory: what has already happened on this device ---------- */
let memory = {};
try { memory = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}') || {}; } catch (e) { memory = {}; }
memory.visits = (memory.visits || 0) + 1;
const saveMemory = () => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); } catch (e) { /* private mode */ } };
saveMemory();

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(Number(params.get('seed')) || (Date.now() ^ (memory.visits * 2654435761)));

/* ---------- renderer ---------- */
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9aa0a6, 0.006);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
camera.position.set(0, EYE_HEIGHT, 0);

const hemi = new THREE.HemisphereLight(0xbfc6cc, 0x4a4844, 1.2);
const sun = new THREE.DirectionalLight(0xfff4e5, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 1, far: 50 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(hemi, sun, sun.target);

const figure = new Uncounted();
scene.add(figure.root);

/* Ground contact: real shadow from the sun, plus soft occlusion right under the shoes. */
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.3 }));
catcher.receiveShadow = true;
catcher.renderOrder = -1;
scene.add(catcher);
const contact = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.62).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55, fog: false })
  );
  mesh.position.y = 0.012;
  return mesh;
})();
figure.root.add(contact);

/* ---------- camera feed ---------- */
let feed = $('feed');
let feedSize = { w: 16, h: 9 };

function showNotice(text, retry) {
  $('noticeText').textContent = text;
  $('notice').hidden = false;
  $('retry').onclick = () => { $('notice').hidden = true; retry(); };
}

async function startCamera() {
  if (STILL) {
    const img = document.createElement('img');
    img.id = 'feed';
    img.src = STILL;
    feed.replaceWith(img);
    feed = img;
    await img.decode();
    feedSize = { w: img.naturalWidth, h: img.naturalHeight };
    onResize();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showNotice('This browser cannot open the camera.', startCamera);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    feed.srcObject = stream;
    await feed.play();
    const sync = () => {
      if (feed.videoWidth) feedSize = { w: feed.videoWidth, h: feed.videoHeight };
      onResize();
    };
    feed.addEventListener('loadedmetadata', sync);
    feed.addEventListener('resize', sync);
    sync();
  } catch (e) {
    showNotice('Allow camera access to use the camera.', startCamera);
  }
}

/* Match the overlay's field of view to the visible part of the camera image
   (object-fit: cover). Phone main cameras see ~66° across the long side. */
function onResize() {
  const W = window.innerWidth;
  const H = Math.max(1, window.innerHeight);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  let vfov;
  if (STILL) {
    vfov = Number(params.get('fov')) || 52;
    const va = feedSize.w / feedSize.h;
    if (W / H > va) vfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(vfov) / 2) * (va / (W / H))) * 180 / Math.PI;
  } else {
    const half = THREE.MathUtils.degToRad(LONG_SIDE_FOV / 2);
    const portrait = feedSize.h >= feedSize.w;
    const vfovVideo = portrait ? half * 2 : 2 * Math.atan(Math.tan(half) * feedSize.h / feedSize.w);
    const hfovVideo = portrait ? 2 * Math.atan(Math.tan(half) * feedSize.w / feedSize.h) : half * 2;
    vfov = (W / H > feedSize.w / feedSize.h)
      ? 2 * Math.atan(Math.tan(hfovVideo / 2) * H / W)
      : vfovVideo;
    vfov = THREE.MathUtils.radToDeg(vfov);
  }
  camera.fov = clamp(vfov, 30, 100);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

/* ---------- orientation: gyro for smoothness, compass for north ---------- */
const orient = { target: new THREE.Quaternion(), have: false, lastEvent: 0, absolute: false, offset: null, aligned: false };
const euler = new THREE.Euler();
const qScreen = new THREE.Quaternion();
const qCam = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const zee = new THREE.Vector3(0, 0, 1);

function screenAngle() {
  const a = screen.orientation && Number.isFinite(screen.orientation.angle) ? screen.orientation.angle : (window.orientation || 0);
  return THREE.MathUtils.degToRad(a);
}

function onOrientation(event, fromAbsolute) {
  if (event.alpha === null || event.alpha === undefined) return;
  const absolute = fromAbsolute || event.absolute === true;
  if (absolute) orient.absolute = true;
  else if (orient.absolute) return; /* relative events would fight the compass-referenced ones */
  let alpha = event.alpha;
  if (Number.isFinite(event.webkitCompassHeading)) {
    /* iOS: alpha is a smooth gyro reading with an arbitrary zero; ease its offset toward
       the noisy compass so north is right without the image swimming. */
    const acc = event.webkitCompassAccuracy;
    const desired = wrap360(360 - event.webkitCompassHeading - event.alpha);
    if (!(acc < 0) && !(acc > 35)) {
      if (orient.offset === null) orient.offset = desired;
      else {
        const diff = ((desired - orient.offset + 540) % 360) - 180;
        orient.offset = wrap360(orient.offset + diff * 0.02);
      }
    }
  }
  if (orient.offset !== null) alpha = event.alpha + orient.offset;
  orient.aligned = orient.absolute || orient.offset !== null;
  euler.set(
    THREE.MathUtils.degToRad(event.beta || 0),
    THREE.MathUtils.degToRad(alpha),
    -THREE.MathUtils.degToRad(event.gamma || 0),
    'YXZ'
  );
  orient.target.setFromEuler(euler).multiply(qCam).multiply(qScreen.setFromAxisAngle(zee, -screenAngle()));
  if (!orient.have) camera.quaternion.copy(orient.target);
  orient.have = true;
  orient.lastEvent = performance.now();
}

let orientationListening = false;
function listenOrientation() {
  if (orientationListening) return;
  orientationListening = true;
  window.addEventListener('deviceorientationabsolute', e => onOrientation(e, true), true);
  window.addEventListener('deviceorientation', e => onOrientation(e, false), true);
}

/* iOS asks for motion permission only from a user gesture. */
async function requestMotion() {
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return;
  if (typeof DOE.requestPermission === 'function') {
    try {
      if ((await DOE.requestPermission()) === 'granted') listenOrientation();
    } catch (e) { /* dismissed: the camera keeps working */ }
  } else listenOrientation();
}

/* ---------- location ---------- */
const geo = { origin: null, data: null, requested: false, fix: null };
let director = null;

function attachSurroundings() {
  if (!director || !geo.origin) return;
  director.surroundings = orient.aligned ? new Surroundings(geo.data, geo.origin) : null;
}

function requestLocation() {
  if (geo.requested || !navigator.geolocation || STILL) return;
  geo.requested = true;
  navigator.geolocation.watchPosition(pos => {
    const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
    geo.fix = fix;
    if (!geo.origin) {
      if (fix.acc > 80) return;
      geo.origin = fix;
      loadSurroundings(fix.lat, fix.lng).then(data => { geo.data = data; attachSurroundings(); });
      attachSurroundings();
      return;
    }
    /* Only follow a real walk, and only while the figure is out of frame, so GPS
       noise never slides it across the street. */
    const d = toLocal(geo.origin, fix.lat, fix.lng);
    if (fix.acc < 25 && Math.hypot(d.x, d.z) > 15 && !(figure.root.visible && lastView.sees(figure.root))) {
      if (director) director.shiftOrigin(d.x, d.z);
      geo.origin = fix;
      loadSurroundings(fix.lat, fix.lng).then(data => { geo.data = data; attachSurroundings(); });
    }
  }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}

/* ---------- the view each frame ---------- */
const fwd = new THREE.Vector3();
const tmp = new THREE.Vector3();
const lastView = {
  oriented: false, heading: 0, pitch: 0, yawRate: 0, angularSpeed: 0, hfov: 60,
  personPoint: new THREE.Vector3(),
  sees(obj) {
    if (!obj.visible) return false;
    for (const h of [0.3, 1.0, 1.75]) {
      tmp.set(obj.position.x, h, obj.position.z).project(camera);
      if (tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 0.96 && Math.abs(tmp.y) < 0.98) return true;
    }
    return false;
  }
};

function updateView(dt) {
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const heading = bearingOf(fwd.x, fwd.z);
  const pitch = THREE.MathUtils.radToDeg(Math.asin(clamp(fwd.y, -1, 1)));
  const dh = ((heading - lastView.heading + 540) % 360) - 180;
  const rate = dt > 0 ? dh / dt : 0;
  lastView.yawRate = THREE.MathUtils.lerp(lastView.yawRate, rate, 0.3);
  lastView.angularSpeed = Math.abs(lastView.yawRate);
  lastView.heading = heading;
  lastView.pitch = pitch;
  lastView.hfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect));
  lastView.oriented = DEBUG || (orient.have && performance.now() - orient.lastEvent < 1500);
  /* Where the person holding the phone is: a little above and behind the lens. */
  lastView.personPoint.copy(camera.position).addScaledVector(fwd, -0.3).add(tmp.set(0, 0.22, 0));
}

/* ---------- light: read from the camera image, sun from the clock ---------- */
const sample = document.createElement('canvas');
sample.width = sample.height = 24;
const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
const light = { luma: 0.45, contrast: 0.15, top: new THREE.Color(0xbfc6cc), bottom: new THREE.Color(0x55524c), mean: new THREE.Color(0x9aa0a6) };
let nextLightSample = 0;

function sampleLight(now) {
  if (now < nextLightSample) return;
  nextLightSample = now + 500;
  const w = feed.videoWidth || feed.naturalWidth;
  if (!w) return;
  try {
    sampleCtx.drawImage(feed, 0, 0, 24, 24);
    const px = sampleCtx.getImageData(0, 0, 24, 24).data;
    const acc = [[0, 0, 0, 0], [0, 0, 0, 0]];
    let sum = 0;
    let gSum = 0;
    let gSum2 = 0;
    for (let i = 0; i < px.length; i += 4) {
      const half = i / 4 < 288 ? 0 : 1;
      acc[half][0] += px[i]; acc[half][1] += px[i + 1]; acc[half][2] += px[i + 2]; acc[half][3] += 1;
      const l = (px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722) / 255;
      sum += l;
      if (half) { gSum += l; gSum2 += l * l; }
    }
    const n = px.length / 4;
    const gMean = gSum / (n / 2);
    light.luma = THREE.MathUtils.lerp(light.luma, sum / n, 0.3);
    /* Sun shows up as hard light-and-shadow on the ground half, not sky-versus-road. */
    light.contrast = THREE.MathUtils.lerp(light.contrast, Math.sqrt(Math.max(0, gSum2 / (n / 2) - gMean * gMean)), 0.3);
    const top = acc[0];
    light.blueSky = THREE.MathUtils.lerp(light.blueSky || 0, clamp((top[2] - top[0]) / top[3] / 255 / 0.18, 0, 1), 0.3);
    const set = (c, a) => c.setRGB(a[0] / a[3] / 255, a[1] / a[3] / 255, a[2] / a[3] / 255, THREE.SRGBColorSpace);
    light.top.lerp(set(new THREE.Color(), acc[0]), 0.3);
    light.bottom.lerp(set(new THREE.Color(), acc[1]), 0.3);
    light.mean.copy(light.top).lerp(light.bottom, 0.5);
  } catch (e) {
    nextLightSample = Infinity;
  }
}

function applyLight() {
  const L = light.luma;
  hemi.color.copy(light.top).lerp(new THREE.Color(1, 1, 1), 0.25);
  hemi.groundColor.copy(light.bottom);
  hemi.intensity = 0.6 + 2.7 * L;
  scene.fog.color.copy(light.mean);

  /* Direct sun only when the image looks sunlit (bright and contrasty) and the sun is up. */
  let az = wrap360(lastView.heading + 150);
  let el = 45;
  if (geo.origin && orient.aligned) {
    const s = sunPosition(new Date(), geo.origin.lat, geo.origin.lng);
    az = s.azimuth;
    el = s.elevation;
  }
  const sunny = clamp(clamp((light.contrast - 0.11) / 0.08, 0, 1) * 0.7 + (light.blueSky || 0) * 0.5, 0, 1)
    * clamp((L - 0.22) / 0.2, 0, 1) * (el > 2 ? 1 : 0);
  sun.intensity = 3.2 * sunny;
  catcher.material.opacity = 0.42 * sunny;
  const elR = THREE.MathUtils.degToRad(Math.max(el, 8));
  const azR = THREE.MathUtils.degToRad(az);
  const p = figure.root.position;
  sun.position.set(p.x + Math.sin(azR) * Math.cos(elR) * 30, Math.sin(elR) * 30, p.z - Math.cos(azR) * Math.cos(elR) * 30);
  sun.target.position.set(p.x, 1, p.z);
  catcher.position.set(p.x, 0.005, p.z);
  contact.material.opacity = 0.35 + 0.25 * (1 - sunny);
  renderer.toneMappingExposure = 0.75 + 0.5 * L;
}

/* ---------- gestures: tap to focus (and to grant motion and sound) ---------- */
let focusTimer = 0;
document.addEventListener('pointerdown', event => {
  if (event.target.closest('button, #sheet, #notice')) return;
  const f = $('focus');
  f.style.left = `${event.clientX}px`;
  f.style.top = `${event.clientY}px`;
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => f.classList.remove('on'), 900);
  requestMotion();
  sound.unlockAudio();
  requestLocation();
}, { passive: true });

/* ---------- shutter ---------- */
$('shutter').addEventListener('click', async () => {
  requestMotion();
  sound.unlockAudio();
  const blink = $('blink');
  blink.classList.add('on');
  setTimeout(() => blink.classList.remove('on'), 90);
  const W = canvas.width;
  const H = canvas.height;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');
  const fw = feed.videoWidth || feed.naturalWidth;
  const fh = feed.videoHeight || feed.naturalHeight;
  if (fw) {
    const scale = Math.max(W / fw, H / fh);
    g.drawImage(feed, (W - fw * scale) / 2, (H - fh * scale) / 2, fw * scale, fh * scale);
  }
  if (figure.root.visible) {
    renderer.render(scene, camera);
    g.drawImage(canvas, 0, 0);
  }
  const blob = await new Promise(resolve => out.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) return;
  const name = `IMG_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (e) { /* cancelled */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

/* ---------- exit ---------- */
$('exit').addEventListener('click', () => { $('sheet').hidden = false; $('stay').focus(); });
$('stay').addEventListener('click', () => { $('sheet').hidden = true; });
$('leave').addEventListener('click', () => {
  const stream = feed.srcObject;
  if (stream) stream.getTracks().forEach(t => t.stop());
  location.href = EXIT_URL;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('sheet').hidden = true; });

/* ---------- debug harness (?debug=1): still image, keyboard look, forced events ---------- */
let debugEl = null;
const debugLook = { heading: Number(params.get('heading')) || 0, pitch: Number(params.get('pitch')) || 0 };
function debugOrientation() {
  euler.set(THREE.MathUtils.degToRad(debugLook.pitch), THREE.MathUtils.degToRad(-debugLook.heading), 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  orient.target.copy(camera.quaternion);
  orient.aligned = true;
}
if (DEBUG) {
  debugEl = document.createElement('div');
  debugEl.id = 'debug';
  document.body.appendChild(debugEl);
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') debugLook.heading -= 3;
    if (e.key === 'ArrowRight') debugLook.heading += 3;
    if (e.key === 'ArrowUp') debugLook.pitch += 2;
    if (e.key === 'ArrowDown') debugLook.pitch -= 2;
  });
  debugOrientation();
}

/* ---------- loop ---------- */
let last = performance.now();
let rendered = false;
let frames = 0;
let fpsT = last;
let fps = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (document.hidden) return;
  if (DEBUG) debugOrientation();
  else if (orient.have) camera.quaternion.slerp(orient.target, 0.45);
  camera.updateMatrixWorld();
  updateView(dt);
  if (director) {
    if (!director.surroundings && geo.origin && orient.aligned) attachSurroundings();
    director.update(dt, lastView);
  }
  figure.applyPose();
  sampleLight(now);
  if (figure.root.visible) {
    applyLight();
    renderer.render(scene, camera);
    rendered = true;
    if (sound.audioReady()) sound.setListener(camera.position, fwd, tmp.set(0, 1, 0).applyQuaternion(camera.quaternion));
  } else if (rendered) {
    renderer.clear();
    rendered = false;
  }
  frames += 1;
  if (now - fpsT > 1000) { fps = frames; frames = 0; fpsT = now; }
  if (debugEl) {
    const p = figure.root.position;
    debugEl.textContent = `t ${director ? director.t.toFixed(0) : '-'}s  mode ${director ? director.mode : 'loading'}  fps ${fps}\n`
      + `heading ${lastView.heading.toFixed(0)}  pitch ${lastView.pitch.toFixed(0)}  fov ${camera.fov.toFixed(1)}\n`
      + `figure ${figure.root.visible ? `${Math.hypot(p.x, p.z).toFixed(1)}m @${bearingOf(p.x, p.z).toFixed(0)}` : 'hidden'}  seen ${lastView.sees(figure.root)}\n`
      + `luma ${light.luma.toFixed(2)}  ground contrast ${light.contrast.toFixed(2)}  blue ${(light.blueSky || 0).toFixed(2)}  sun ${sun.intensity.toFixed(2)}`;
  }
}

/* ---------- start ---------- */
onResize();
requestAnimationFrame(loop);
startCamera().then(() => {
  if (!DEBUG) {
    requestLocation();
    if (!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) listenOrientation();
  }
});
figure.load().then(() => {
  director = new Director({ figure, rand, memory, saveMemory, speed: DEBUG ? Number(params.get('speed')) || 1 : 1 });
  if (DEBUG) {
    window.__haunt = { director, figure, camera, view: lastView, light, sun, look: debugLook };
    const force = params.get('force');
    const dist = Number(params.get('dist')) || 25;
    const offset = Number(params.get('offset')) || 0;
    if (force === 'far') director.debugPlace(lastView, { dist, offset });
    if (force === 'turned') director.debugPlace(lastView, { dist, offset, turned: true });
    if (force === 'near') director.debugPlace(lastView, { dist, offset, facingViewer: true, pose: { headRoll: 0.32, headPitch: 0.12, lip: 0.3, jaw: 0.14 } });
    if (force === 'final') director.debugPlace(lastView, { dist, offset, facingViewer: true, pose: { suspended: 1, headPitch: 0.31, headRoll: 0.14, lip: 0.2, jaw: 0.12, eyeTarget: lastView.personPoint } });
    if (force === 'transform') director.debugPlace(lastView, { dist, offset, facingViewer: true, pose: { transform: 1 } });
    if (force === 'face') director.debugPlace(lastView, { dist, offset, facingViewer: true, pose: { headPitch: 0 } });
  }
}).catch(() => { /* without the figure it is simply a camera */ });
