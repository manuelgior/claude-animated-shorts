// The world of "The City With Two Minute Hands": Bristol square + clock tower, London tower, a station with a
// steam train, a country road. Sky / light rig / fog / cast pooling are the bridge short's (../clock/world.ts).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house, prop, Kit, kitClone } from "../clock/build";
import { ctex, stoneHD, cobbleHD, grassHD, cloudHD, rep } from "../clock/paint";
import { Pen } from "../clock/toon";
import { LIGHTS, LOOK } from "../clock/lights";
import { TONE, CHAR, twoTone, untone } from "../clock/shade";
import { NOINK } from "../clock/ink";
import { Pool, Actor, Fx } from "../clock/cast";
import { FPS, SHOTS, ShotDef, camAt, camsOf, SQUARE, LONDON, STATION, ROAD } from "./story";
import { stage, clockTimes, cartX } from "./cast";
export { loadKit } from "../clock/world";

const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};
const solid = (key: string, col: string) => lam(key, () => ({ color: col }));
const matte = (col: string) => solid("m" + col, col);

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- painted signs / dials ----------------
const dialTex = () => ctex("dial", 512, 512, (g) => {
  g.fillStyle = "#f7f1e1"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 238, 0, 7); g.stroke();
  g.lineCap = "round";
  for (let i = 0; i < 60; i += 5) { const a = (i * Math.PI) / 30, big = true; g.lineWidth = big ? 16 : 5; g.beginPath();
    g.moveTo(256 + (big ? 190 : 208) * Math.cos(a), 256 + (big ? 190 : 208) * Math.sin(a)); g.lineTo(256 + 224 * Math.cos(a), 256 + 224 * Math.sin(a)); g.stroke(); }
  g.fillStyle = "#241726"; g.font = "bold 62px serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 1; i <= 12; i++) { const a = (i * Math.PI) / 6 - Math.PI / 2; g.fillText(String(i), 256 + 150 * Math.cos(a), 262 + 150 * Math.sin(a)); }
});
const signTex = (key: string, w: number, h: number, lines: string[], bg = "#2f4f3a", fg = "#f6ecc8", size = 88) => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 12; g.strokeRect(16, 16, w - 32, h - 32);
  g.fillStyle = fg; g.font = `bold ${size}px serif`; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
});

/** analogue clock: dial disc + hour hand + 1-2 minute hands, faces +z of its group */
export class Clock {
  g = new THREE.Group(); hour: THREE.Mesh; min: THREE.Mesh; min2: THREE.Mesh;
  constructor(r: number, parent: THREE.Object3D, x: number, y: number, z: number, yaw = 0) {
    const dt = dialTex(); dt.anisotropy = 16; const dm = new THREE.MeshLambertMaterial({ map: dt, alphaTest: 0.5, side: THREE.DoubleSide });
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), twoTone(dm)); dial.position.z = 0.1;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.12, 40).rotateX(Math.PI / 2), matte("#3b2f2a"));
    const hand = (len: number, w: number, col: string, zz: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.04).translate(0, len / 2 - len * 0.12, 0), matte(col)); m.position.z = zz; return m;
    };
    this.hour = hand(r * 0.55, r * 0.09, "#241726", 0.12);
    this.min = hand(r * 0.85, r * 0.06, "#241726", 0.16);
    this.min2 = hand(r * 0.85, r * 0.06, "#c0353a", 0.2);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, 0.1, 12).rotateX(Math.PI / 2), matte("#241726")); cap.position.z = 0.22;
    this.g.add(rim, dial, this.hour, this.min, this.min2, cap);
    for (const o of [rim, dial, this.hour, this.min, this.min2, cap]) { o.castShadow = false; o.receiveShadow = false; }
    this.g.position.set(x, y, z); this.g.rotation.y = yaw; parent.add(this.g);
  }
  set(h: number, m: number, m2: number | null = null) {
    this.hour.rotation.z = -((h % 12) + m / 60) * (Math.PI / 6);
    this.min.rotation.z = -(m / 60) * Math.PI * 2;
    this.min2.visible = m2 !== null;
    if (m2 !== null) this.min2.rotation.z = -(m2 / 60) * Math.PI * 2;
  }
}

export class ClockWorld {
  root = new THREE.Group();
  private pool = new Pool(); private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = []; private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  clocks: Record<string, Clock> = {};
  private train = new THREE.Group(); private steam: THREE.Mesh[] = [];
  private wheels: THREE.Mesh[] = []; private cart: THREE.Object3D | null = null;
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false }));
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() })), cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const stone = lam("towerHD", () => ({ map: stoneHD("towerHD") })), cope = lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    const iron = matte("#2c2f38"), dirt = matte("#b99567"), wood = matte("#8a5a3c"), red = matte("#b8432f"), slate = matte("#4d5566");
    b.add(flat(-1500, 1500, -1500, 1500, -0.02, 750, 750), grass);

    // ---------------- Bristol: plaza, houses, tower ----------------
    b.add(flat(-17, 17, -14, 26, 0.02, 8.5, 20), cobble);
    const tow = (x: number, z: number, w: number, h: number) => {
      b.add(boxGeo(V(x - w, 0, z - w), V(x + w, h, z + w), 2), stone);
      b.add(boxGeo(V(x - w - 0.5, 0, z - w - 0.5), V(x + w + 0.5, 1.4, z + w + 0.5), 2), stone);
      b.add(boxGeo(V(x - w - 0.4, h, z - w - 0.4), V(x + w + 0.4, h + 0.7, z + w + 0.4), 2), cope);
      b.add(boxGeo(V(x - w - 0.9, h + 5.2, z - w - 0.9), V(x + w + 0.9, h + 6.0, z + w + 0.9), 2), cope);
      b.add(boxGeo(V(x - w, h + 0.7, z - w), V(x + w, h + 5.2, z + w), 2), stone);
      const roof = new THREE.ConeGeometry((w + 1.3) * 1.42, 5.5, 4); roof.rotateY(Math.PI / 4);
      b.add(roof, slate, new THREE.Matrix4().makeTranslation(x, h + 6.0 + 2.75, z));
    };
    tow(SQUARE[0], SQUARE[2] - 16, 3.2, 16);
    for (let k = 0; k < 6; k++) {
      const z = -10 + k * 6.4, yv = 0.3 * (k % 2) - 0.15;
      house(b, -19.5, z, Math.PI / 2 + yv * 0.2, 6.2, 6, 7 + (k % 3) * 1.4, k, 0);
      house(b, 19.5, z + 2, -Math.PI / 2, 6.2, 6, 7.6 + ((k + 1) % 3) * 1.4, k + 3, 0);
    }
    // sundial pedestal + lanterns, stalls, trees
    b.add(boxGeo(V(-0.55, 0, -0.55), V(0.55, 1.0, 0.55), 2), cope);
    b.add(boxGeo(V(-0.8, 1.0, -0.8), V(0.8, 1.12, 0.8), 2), cope);
    b.add(new THREE.ConeGeometry(0.45, 0.9, 3).rotateX(0.0), iron, new THREE.Matrix4().makeTranslation(0, 1.57, 0));
    for (const [x, z] of [[-9, 14], [9, 14], [-9, -9], [9, -9], [-11, 3], [11, 3]]) prop(b, kit, "lantern", x, 0, z, 3.4);
    for (const [x, z, y] of [[-12.5, 20, 2.6], [12.5, 19, -2.6]]) prop(b, kit, y > 0 ? "stall-red" : "stall-green", x, 0, z, 2.6, y > 0 ? 0.6 : -0.6);
    for (const [x, z] of [[-15, -12], [15, -13], [-14, 24], [15, 25], [-26, 8], [27, 6]]) prop(b, kit, "tree_oak", x, 0, z, 7.5);
    for (const [x, z] of [[-10, -12.2], [10, -12.2]]) prop(b, kit, "hedge", x, 0, z, 1.0);
    // 1880 law board (shot 15) + phone stand lives as a card in cast.ts
    this.addSign(R, "law", SQUARE[0], 2.4, SQUARE[2] + 2.2, 4.4, 3.2, ["BY LAW", "1880", "GREENWICH", "TIME"], "#b0453a", "#fff4d2", 64);

    // ---------------- London ----------------
    b.add(flat(LONDON[0] - 30, LONDON[0] + 30, -20, 40, 0.02, 15, 30), cobble);
    tow(LONDON[0], LONDON[2] - 2, 3.4, 17);
    for (let k = 0; k < 3; k++) { house(b, LONDON[0] - 18, 8 + k * 7, Math.PI / 2, 6, 6, 8.4, k + 1, 0); house(b, LONDON[0] + 18, 8 + k * 7, -Math.PI / 2, 6, 6, 9.8, k + 2, 0); }
    this.addSign(R, "ldn", LONDON[0], 3.2, LONDON[2] + 1.6, 4.6, 1.5, ["LONDON"], "#243a5e", "#f6ecc8", 120);
    this.addSign(R, "brs", SQUARE[0], 3.2, SQUARE[2] - 12.2, 4.6, 1.5, ["BRISTOL"], "#243a5e", "#f6ecc8", 120);

    // ---------------- station ----------------
    const sx = STATION[0];
    b.add(flat(sx - 90, sx + 90, -9, 30, 0.03, 40, 18), cobble);
    b.add(boxGeo(V(sx - 50, 0, 0), V(sx + 50, 1.0, 7.2), 2), cope);                       // platform
    b.add(boxGeo(V(sx - 50, 0.98, 6.9), V(sx + 50, 1.12, 7.2), 2), stone);
    for (let i = -62; i <= 62; i++) b.add(boxGeo(V(sx + i * 0.8 - 0.14, 0.02, -4.2), V(sx + i * 0.8 + 0.14, 0.16, -1.1), 0), wood);   // sleepers
    for (const z of [-3.6, -1.75]) b.add(boxGeo(V(sx - 52, 0.16, z - 0.05), V(sx + 52, 0.3, z + 0.05), 0), iron);                       // rails
    house(b, sx, 13.5, Math.PI, 30, 8, 7.4, 3, 0);
    house(b, sx - 36, 13.5, Math.PI, 12, 7, 7, 1, 0); house(b, sx + 36, 13.5, Math.PI, 12, 7, 8, 6, 0);
    for (const x of [-24, -8, 10, 28]) prop(b, kit, "lantern", sx + x, 1.0, 5.4, 3.0);
    for (const x of [-30, -12, 20, 34]) prop(b, kit, "tree_default", sx + x, 0, 24, 7);
    b.add(boxGeo(V(sx - 8.5, 1.0, 2.6), V(sx - 6.7, 1.9, 3.8), 0), wood);                                    // luggage + bench
    b.add(boxGeo(V(sx + 6.2, 1.0, 6.2), V(sx + 9.2, 1.45, 6.8), 0), wood);
    // ---------------- road ----------------
    const rx = ROAD[0], rz = ROAD[2];
    b.add(flat(rx - 90, rx + 90, rz - 3.6, rz + 3.6, 0.03, 30, 1.6), dirt);
    for (let i = -8; i <= 8; i++) { prop(b, kit, "hedge", rx + i * 8, 0, rz - 9, 1.3); prop(b, kit, "hedge", rx + i * 8 + 4, 0, rz + 12, 1.3); }
    for (const x of [-30, -14, 10, 26]) prop(b, kit, "tree_oak", rx + x, 0, rz - 14, 8);
    prop(b, kit, "windmill", rx + 28, 0, rz - 34, 10);
    b.build(R);

    // ---------------- clocks ----------------
    this.clocks.bristol = new Clock(2.3, R, SQUARE[0], 19.2, SQUARE[2] - 12.76);
    this.clocks.london = new Clock(2.4, R, LONDON[0], 20.2, LONDON[2] - 2 + 3.42);
    this.clocks.stationL = new Clock(0.95, R, sx - 1.5, 5.5, 9.5, Math.PI);     // London time
    this.clocks.stationH = new Clock(0.95, R, sx + 1.5, 5.5, 9.5, Math.PI);     // local time
    this.clocks.stationA = new Clock(0.95, R, sx - 9, 5.5, 9.5, Math.PI);
    this.clocks.stationB = new Clock(0.95, R, sx + 5.4, 5.5, 9.5, Math.PI);
    this.addSign(R, "tt", sx - 5.4, 2.8, 9.55, 3.0, 2.0, ["TRAIN", "9:00"], "#1f3a2e", "#f6ecc8", 76, Math.PI);
    this.addSign(R, "tl", sx - 1.5, 4.0, 9.55, 1.9, 0.5, ["LONDON"], "#243a5e", "#f6ecc8", 64, Math.PI);
    this.addSign(R, "th", sx + 1.5, 4.0, 9.55, 1.9, 0.5, ["LOCAL"], "#7a2f2a", "#f6ecc8", 64, Math.PI);

    // ---------------- train (nose toward +x) ----------------
    const T = this.train; R.add(T);
    const mk = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; T.add(o); return o; };
    const black = matte("#26262e"), green = matte("#2e6a4a"), brass = matte("#d1a43c");
    mk(new THREE.CylinderGeometry(0.95, 0.95, 5.2, 20).rotateZ(Math.PI / 2), green, 2.8, 1.95, -2.7);
    mk(new THREE.CylinderGeometry(0.98, 0.98, 0.35, 20).rotateZ(Math.PI / 2), brass, 5.5, 1.95, -2.7);
    mk(new THREE.CylinderGeometry(0.4, 0.55, 1.2, 14), black, 4.4, 3.35, -2.7);
    mk(new THREE.CylinderGeometry(0.55, 0.36, 0.35, 14), black, 4.4, 4.05, -2.7);
    mk(new THREE.SphereGeometry(0.5, 14, 10), brass, 2.9, 2.95, -2.7);
    mk(new THREE.BoxGeometry(2.2, 2.7, 2.2), red, -1.3, 2.05, -2.7);
    mk(new THREE.BoxGeometry(2.5, 0.2, 2.5), black, -1.3, 3.5, -2.7);
    mk(new THREE.BoxGeometry(2.7, 1.5, 2.1), black, -4.4, 1.35, -2.7);
    for (const [wx, wr] of [[0.2, 0.62], [1.6, 0.62], [3.3, 0.45], [4.4, 0.45]]) for (const z of [-3.6, -1.75]) {
      const w = mk(new THREE.CylinderGeometry(wr, wr, 0.14, 18).rotateX(Math.PI / 2), black, wx, wr + 0.3, z); this.wheels.push(w);
    }
    for (let k = 0; k < 3; k++) {
      const x = -9.6 - k * 7.6;
      mk(new THREE.BoxGeometry(6.8, 2.5, 2.3), [red, green, red][k], x, 2.0, -2.7);
      mk(new THREE.BoxGeometry(7.0, 0.25, 2.5), black, x, 3.35, -2.7);
      for (const wx of [-2.3, 2.3]) for (const z of [-3.6, -1.75]) mk(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14).rotateX(Math.PI / 2), black, x + wx, 0.72, z);
      for (let w = -2; w <= 2; w++) { const win = mk(new THREE.BoxGeometry(0.8, 0.8, 0.06), matte("#f4e6b8"), x + w * 1.2, 2.35, -1.5); win.castShadow = false; }
    }
    T.visible = false;
    this.cart = kitClone(kit, "cart", 1.7);
    if (this.cart) {
      this.cart.rotation.y = Math.PI / 2; R.add(this.cart);
      this.cart.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mm = (m.material as THREE.MeshLambertMaterial).clone(); mm.map = null; mm.color.set(/wheel|tire/i.test(m.name) ? "#4a3426" : "#b07a4a"); m.material = twoTone(mm); } });
    }
    const puffT = ctex("puff", 128, 128, (g) => { const p = new Pen(g); p.ell(64, 64, 52, 44, "#f4f4f6", 0); });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puffT, transparent: true, depthWrite: false, opacity: 0.85 }));
      m.layers.set(NOINK); this.steam.push(m); R.add(m);
    }
  }

  private law = new THREE.Group();
  private addSign(R: THREE.Object3D, key: string, x: number, y: number, z: number, w: number, h: number, lines: string[], bg: string, fg: string, size: number, yaw = 0) {
    const tex = signTex("sign_" + key, Math.round(w * 160), Math.round(h * 160), lines, bg, fg, size);
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [matte("#3b2f2a"), matte("#3b2f2a"), matte("#3b2f2a"), matte("#3b2f2a"),
      twoTone(new THREE.MeshLambertMaterial({ map: tex })), matte("#3b2f2a")]);
    board.position.set(x, y, z); board.rotation.y = yaw; board.castShadow = true; board.receiveShadow = true;
    if (key === "law") { this.law.add(board); R.add(this.law); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, y + h / 2, 0.14), matte("#8a5a3c")); p.position.set(x + s * (w / 2 - 0.3), (y + h / 2) / 2 - 0.05, z - 0.08); p.castShadow = true; this.law.add(p); } } else R.add(board);
  }

  private shotSun(id: number, s: ShotDef, L: typeof LIGHTS.day) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (const c of camsOf(id)) { const x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    this.clouds.forEach((m, i) => { m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; });

    this.law.visible = id === 15;
    // ---- clocks + train ----
    const ct = clockTimes(t);
    this.clocks.bristol.set(ct.bristol.h, ct.bristol.m, ct.bristol.m2);
    this.clocks.london.set(ct.london.h, ct.london.m);
    this.clocks.stationL.set(ct.stL.h, ct.stL.m); this.clocks.stationH.set(ct.stH.h, ct.stH.m);
    this.clocks.stationA.set(ct.stA.h, ct.stA.m); this.clocks.stationB.set(ct.stB.h, ct.stB.m);
    if (this.cart) this.cart.position.set(ROAD[0] + cartX(t), 0.05, ROAD[2] + 0.2);
    const tx = ct.trainX;
    this.train.visible = tx > -900;
    this.train.position.set(STATION[0] + tx, 0, 0);
    for (const w of this.wheels) w.rotation.z = -ct.trainRoll;
    this.steam.forEach((m, i) => {
      const on = this.train.visible, u = ((t * 0.7 + i / this.steam.length) % 1), sz = 1.2 + u * 3.4;
      m.visible = on;
      m.position.set(STATION[0] + tx + 4.4 - u * 3 * (ct.trainMoving ? 1.4 : 0.3), 4.4 + u * 4.5, -2.7 + u * 0.8);
      m.scale.set(sz, sz, 1); m.quaternion.copy(cam.quaternion); (m.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - u) ** 1.3;
    });

    // ---- cast ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir }, s.light);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw); e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else if (p.yaw !== undefined) e2.mesh.rotation.set(0, p.yaw, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1); fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
