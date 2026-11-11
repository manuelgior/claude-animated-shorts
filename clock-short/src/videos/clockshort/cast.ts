// Cast of "The City With Two Minute Hands": townsfolk, porters, drummers, a horse. Reuses the bridge short's drawing
// kit (toon.ts bodyFront / bodySide) and clock/state tables driven by the voice timing.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, townsfolk, Outfit, Expr, FrontOpts, SideOpts, INK, fxDrum, fxContact, fxShadow } from "../clock/toon";
import { SQUARE, STATION, ROAD, FPS, shotAt } from "./story";

export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; yaw?: number };
export type Stage = { places: Place[]; fx: FxPlace[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 60) => Math.round(v * n) / n;
const lerp = (a: number, b: number, u: number) => a + (b - a) * Math.max(0, Math.min(1, u));
const ease = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };

// ---------------- state tables driven by time (s) ----------------
export const SYNC = { stH: 30.8, stA: 31.5, stB: 32.3 };
export const clockTimes = (t: number) => {
  const drift = t * 0.04;
  const stl = { h: 9, m: 0 + drift };
  const train = trainState(t);
  return {
    bristol: { h: 11, m: 50 + drift, m2: t > 41.2 ? 0 + drift : (null as number | null) },
    london: { h: 12, m: 0 + drift },
    stL: stl,
    stH: t < SYNC.stH ? { h: 8, m: 50 + drift } : stl,
    stA: t < SYNC.stA ? { h: 8, m: 35 + drift } : stl,
    stB: t < SYNC.stB ? { h: 9, m: 20 + drift } : stl,
    trainX: train.x, trainRoll: train.x / 0.55, trainMoving: train.moving,
  };
};
/** train x relative to the station (nose at +5.7); hidden (-1000) when not in play */
export const trainState = (t: number) => {
  if (t >= 15.4 && t < 18.4) { const u = ease((t - 15.4) / 3.0); return { x: lerp(-95, -2, 1 - (1 - u) ** 1.6), moving: u < 1 }; }
  if (t >= 18.4 && t < 25.6) return { x: -2, moving: false };
  if (t >= 25.6 && t < 28.6) { const u = (t - 25.6) / 3.0; return { x: -2 + 110 * u * u, moving: true }; }
  if (t >= 34.6 && t < 39.4) { const u = (t - 34.6) / 4.8; return { x: lerp(-120, 150, u), moving: true }; }
  return { x: -1000, moving: false };
};
export const cartX = (t: number) => -12 + (t - 12.3) * 1.15;

// ---------------- people ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const tier = (d: number): [number, number, number] => (d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4]);
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};

const FOLK = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => townsfolk(v));
const MASTER: Outfit = { jacket: "#2f4a8a", pants: "#2a2a33", boots: INK, hat: "cap", cap: "#1e3a6e", buttons: "#e8c45a", moustache: "#4a3020", build: "stout", skin: "#f5c9a0" };
const PORTER: Outfit = { jacket: "#8a6a3c", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#5a4a3a", skin: "#ecd0b6" };
const DRIVER: Outfit = { jacket: "#6a7a3a", pants: "#4a3a2a", boots: "#4a3426", hat: "tophat", skin: "#f5c9a0", moustache: "#8a5a3c" };
const DRUM = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ ...townsfolk(i), hat: i % 2 ? "tophat" : "tophat", skin: ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"][i % 4] } as Outfit));

type Opts = Partial<FrontOpts> & { side?: boolean; dir?: number; stride?: number };
const person = (out: Stage, cam: CamInfo, i: number, o: Outfit, x: number, y: number, z: number, t: number, op: Opts = {}, scale = 1, blob = true) => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  // view: side if walking mostly across the lens axis
  const dx = op.dir ?? 0, tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = dx === 0 ? 1 : (tx * dx) / tl;
  const side = !!op.side || (dx !== 0 && Math.abs(c) < 0.6);
  const mirror = side && dx * cam.right.x < 0;
  const light = light2D(cam, mirror), seed = ((i * 5 + 3) % 7) + 1, blink = lidAt(t, i);
  const { side: _s, dir: _d, stride, ...fo } = op;
  const f2: FrontOpts = { ...fo, light, seed, blink };
  const s2: SideOpts = { phase: fo.phase, expr: fo.expr, mode: fo.mode === "stand" ? "stand" : "march", light, seed, blink, stride: stride ?? 0.8, stomp: 1 };
  const key = side ? `S|${fkey(o)}|${fkey(s2)}` : `F|${fkey(o)}|${fkey(f2)}`;
  out.places.push({ key, x, y, z, scale, mirror, size: [w, h, k], draw: (p) => (side ? bodySide(p, o, s2) : bodyFront(p, o, f2)) });
  if (blob) {
    const cc = LNAME === "golden" ? "#a89ac8" : "#8e90b8";
    out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w: 0.55 * scale, h: 0.42 * scale, flat: true });
  }
};
const stroll = (t: number, spd: number, off = 0) => ((t * spd + off) % 1 + 1) % 1;

// horse in side view on a 700 x 520 canvas, facing +x
const horseDraw = (phase: number) => (p: Pen) => {
  const BR = "#8a5a3a", DK = "#5a3a24";
  const leg = (x: number, a: number) => p.line([[x, 300], [x + 18 * Math.sin(a), 400], [x + 30 * Math.sin(a) - 4, 470]], BR, 20);
  leg(210, phase * 6.28 + 3.1); leg(470, phase * 6.28 + 0.2);
  p.ell(330, 250, 180, 88, BR, 12);
  p.poly([[470, 200], [560, 110], [610, 140], [520, 270]], BR, 12);                  // neck
  p.poly([[560, 112], [640, 170], [655, 205], [600, 215], [545, 150]], BR, 12);       // head
  p.poly([[552, 120], [562, 70], [588, 118]], DK, 8);                                 // ear
  p.dot(588, 150, 8, INK);
  p.poly([[500, 160], [535, 100], [560, 128], [540, 215]], DK, 8);                    // mane
  p.line([[155, 215], [100, 290], [112, 360]], DK, 16);                                // tail
  leg(250, phase * 6.28); leg(430, phase * 6.28 + 3.3);
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  LNAME = light; SUN.copy(cam.sun).normalize();
  const [qx, , qz] = SQUARE, sx = STATION[0];
  const S = (i: number, x: number, z: number, e: Expr, tt = t) => person(out, cam, i, FOLK[i % 8], qx + x, 0, qz + z, tt, { mode: "stand", expr: e, look: 0 });
  const W = (i: number, x0: number, z0: number, x1: number, z1: number, spd: number, e: Expr, period = 8) => {
    const u = (((t + i * 1.7) % period) / period), x = lerp(x0, x1, u), z = lerp(z0, z1, u);
    person(out, cam, i, FOLK[i % 8], qx + x, 0, qz + z, t, { mode: "stroll", expr: e, phase: stroll(t, spd, i * 0.3), dir: Math.sign(x1 - x0) || 1, side: Math.abs(x1 - x0) > Math.abs(z1 - z0) }, 1);
  };
  const P = (i: number, o: Outfit, x: number, z: number, e: Expr, y = 1.0, op: Opts = {}) => person(out, cam, i, o, sx + x, y, z, t, { mode: "stand", expr: e, ...op });

  if (id === 1) {
    for (let i = 0; i < 9; i++) S(i, -9 + (i % 5) * 4.2 + hh(i) * 1.4, 4 + Math.floor(i / 5) * 5 + hh(i, 2) * 3, (["nervous", "shock", "dazed", "nervous", "grin"] as Expr[])[i % 5]);
    W(2, -12, 12, 12, 11, 1.3, "neutral", 9); W(5, 12, 7, -12, 8, 1.2, "nervous", 10);
  }
  if (id === 2) {
    S(3, -0.3, 1.9, "grin"); S(1, 2.2, 3.2, "smile"); S(6, -2.4, 3.6, "nervous");
    W(4, -14, 8, 14, 9, 1.2, "neutral", 12); W(7, 14, 14, -14, 12, 1.1, "neutral", 13);
  }
  if (id === 3) { S(2, -3, 6, "nervous"); S(5, 1.5, 7.5, "dazed"); }
  if (id === 4) { S(1, -3.5, 4, "nervous"); S(4, 0, 6, "shock"); S(7, 3.2, 3.5, "dazed"); S(2, -1.5, 9, "nervous"); W(5, -12, 12, 12, 10, 1.2, "neutral", 11); }
  if (id === 5) {
    const x = ROAD[0] + cartX(t), z = ROAD[2] + 0.2, ph = (t * 0.9) % 1;
    out.fx.push({ key: `horse${q(ph, 24)}`, cw: 700, ch: 520, draw: horseDraw(q(ph, 24)), x: x + 2.7, y: 1.28, z, w: 2.7, h: 2.0, yaw: Math.PI });
    person(out, cam, 3, DRIVER, x - 1.2, 0.62, z, t, { mode: "stand", expr: "relief" }, 1, false);
  }
  if (id === 6) {
    for (let i = 0; i < 6; i++) P(i, FOLK[i % 8], -8 + i * 3.2 + hh(i), 2.5 + (i % 3) * 1.4, (["shock", "smile", "laugh", "shock", "grin", "smile"] as Expr[])[i]);
    P(2, PORTER, 7.5, 3.2, "grin");
  }
  if (id === 7) {
    P(1, MASTER, 1.2, 3.0, "nervous"); P(3, FOLK[3], -3.4, 3.4, "dazed"); P(5, FOLK[5], -1.6, 2.4, "nervous"); P(6, FOLK[6], 4.0, 3.0, "shock");
    P(0, PORTER, 7.2, 5, "stern");
  }
  if (id === 8) {
    for (let i = 0; i < 6; i++) {
      const u = ((t - 24.4) * 0.45 + i * 0.13) % 1.4, x = lerp(-14, 22, u / 1.4);
      person(out, cam, i, FOLK[i % 8], sx + x, 1.0, 3 + (i % 3) * 1.3, t, { mode: "march", expr: i % 2 ? "shock" : "nervous", phase: stroll(t, 2.2, i * 0.37), dir: 1, side: true, stride: 1.4 }, 1);
    }
    P(4, FOLK[4], -2, 5.2, "dazed"); P(7, FOLK[7], 1, 5.6, "dazed");
  }
  if (id === 9) {
    P(1, MASTER, 0, 3.4, t > 30.8 ? "grin" : "stern"); P(3, FOLK[3], -3.6, 3, "relief"); P(5, FOLK[5], 3.5, 3.8, "smile"); P(0, PORTER, 6.6, 2.4, "grin");
  }
  if (id === 10) for (let i = 0; i < 10; i++) P(i, FOLK[i % 8], -22 + i * 4.6, 2.4 + (i % 3) * 1.5, "smile");
  if (id === 11) { S(1, -2.4, 7, "smile_closed"); S(4, 2.0, 8.5, "smile_closed"); S(6, -5, 10.5, "smile"); S(2, 5.4, 11.5, "smile_closed"); }
  if (id === 13 || id === 14) {
    const sync = id === 14;
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5), col = i % 5, x = -3.4 + col * 1.7, z = 1.0 + row * 2.4 - (sync ? (t - 47.3) * 0.5 : 0);
      const ph = sync ? stroll(t, 1.0) : stroll(t, 0.7 + 1.1 * hh(i, 4), hh(i, 5));
      person(out, cam, i, DRUM[i], qx + x, 0, qz + z, t, { mode: "march", expr: sync ? "grin" : (["nervous", "shock", "dazed", "stern", "nervous"] as Expr[])[i % 5], phase: ph, lift: 40 }, 1);
      out.fx.push({ key: "drum", cw: 260, ch: 240, draw: fxDrum, x: qx + x, y: 0.95 + 0.05 * Math.abs(Math.sin(ph * 6.28)), z: qz + z + 0.12, w: 0.62, h: 0.57 });
    }
  }
  if (id === 15) {
    S(1, -4, 6.5, "smile_closed"); S(4, -2, 8, "smile"); S(6, 2.2, 6.6, "smile_closed"); S(3, 4, 8.4, "smile");
    person(out, cam, 2, MASTER, qx - 0.5, 0, qz + 5.2, t, { mode: "stand", expr: "grin" });
  }
  if (id === 16) {
    // a phone, held up: unlit card (screen shows the time)
    out.fx.push({ key: "phone", cw: 560, ch: 1000, draw: (p) => phoneDraw(p.g), x: qx, y: 1.62, z: qz + 6, w: 0.62, h: 1.1, yaw: 0 });
  }
  if (id === 17) { S(1, -4, 14, "smile"); S(4, -1.5, 15.5, "smile_closed"); S(6, 2, 14.4, "smile"); S(3, 4.5, 15.8, "smile"); S(5, -7, 16.6, "relief"); }
  return out;
};

const phoneDraw = (g: CanvasRenderingContext2D) => {
  const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = "#1d1b26"; rr(10, 10, 540, 980, 70); g.fill(); g.strokeStyle = INK; g.lineWidth = 14; g.stroke();
  g.fillStyle = "#16365e"; rr(40, 50, 480, 900, 44); g.fill();
  g.fillStyle = "#f4f1ea"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 170px sans-serif"; g.fillText("12:00", 280, 400);
  g.font = "bold 44px sans-serif"; g.fillStyle = "#9fc4ee"; g.fillText("Greenwich Mean Time", 280, 560);
  g.font = "38px sans-serif"; g.fillText("same as everyone's", 280, 640);
};
