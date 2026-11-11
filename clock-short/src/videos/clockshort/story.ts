// "The City With Two Minute Hands": shots timed to voice/words.json (line starts), camera grammar of the bridge short
// (smootherstep glides, every hold creeps in, cuts on big jumps).
export const FPS = 30;
export const TOTAL = 1920;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---- places (far apart so fog hides the others) ----
export const SQUARE: V3 = [0, 0, 0];       // Bristol: plaza + clock tower at z = -16
export const LONDON: V3 = [200, 0, 0];     // London clock tower
export const STATION: V3 = [400, 0, 0];    // platform z 0..7, track z -4..-1.6, building z 9..17
export const ROAD: V3 = [0, 0, -400];

export type ShotDef = { id: number; a: number; b: number; light: Light; place: "square" | "london" | "station" | "road" };
const S = (id: number, a: number, b: number, place: ShotDef["place"], light: Light = "day"): ShotDef => ({ id, a, b, light, place });
export const SHOTS: ShotDef[] = [
  S(1, 0, 122, "square"), S(2, 122, 256, "square"), S(3, 256, 306, "london"), S(4, 306, 369, "square"), S(5, 369, 471, "road"),
  S(6, 471, 573, "station"), S(7, 573, 732, "station"), S(8, 732, 844, "station"), S(9, 844, 1025, "station"), S(10, 1025, 1145, "station"),
  S(11, 1145, 1207, "square"), S(12, 1207, 1343, "square"), S(13, 1343, 1420, "square"), S(14, 1420, 1506, "square"),
  S(15, 1506, 1623, "square"), S(16, 1623, 1750, "square", "golden"), S(17, 1750, TOTAL, "square", "golden"),
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---- camera ----
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; dur?: number; pos: V3; look: V3; fov?: number; roll?: number; push?: number };
const key = (k: Key): Cam & { push: number; f: number; dur: number } => ({ pos: k.pos, look: k.look, fov: k.fov ?? 40, roll: k.roll ?? 0, push: k.push ?? 0.0022, f: k.f, dur: k.dur ?? 28 });
const at = (k: ReturnType<typeof key>, f: number): Cam => {
  const x = Math.max(0, f - k.f), s = Math.exp(-k.push * x);
  return { pos: k.pos.map((v, i) => k.look[i] + (v - k.look[i]) * s) as V3, look: k.look, fov: k.fov, roll: k.roll };
};
const mixC = (a: Cam, b: Cam, u: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * u) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * u) as V3,
  fov: a.fov + (b.fov - a.fov) * u, roll: a.roll + (b.roll - a.roll) * u,
});
const L = (o: V3, d: V3): V3 => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];

const q = SQUARE, st = STATION, ld = LONDON, rd = ROAD;
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, pos: [0, 4, 42], look: [0, 7, -4], fov: 50 }, { f: 62, dur: 40, pos: [-4, 1.8, 17], look: [0, 2.4, 4], fov: 42, roll: 0.07 }],
  2: [{ f: 122, pos: [3, 1.6, 9], look: [0, 1.4, 0], fov: 40 }, { f: 195, dur: 30, pos: [0, 1.0, 7], look: [3, 11, -4], fov: 46, roll: -0.07 }],
  3: [{ f: 256, pos: L(ld, [0, 6, 42]), look: L(ld, [0, 14, 0]), fov: 46 }, { f: 281, dur: 1, pos: L(q, [0, 5, 16]), look: L(q, [0, 16, -16]), fov: 46, roll: 0.05 }],
  4: [{ f: 306, pos: L(q, [-9, 1.6, 15]), look: L(q, [0, 3, 3]), fov: 46 }],
  5: [{ f: 369, pos: L(rd, [-7, 1.7, 15]), look: L(rd, [-8, 1.7, 0.2]), fov: 46 }],
  6: [{ f: 471, pos: L(st, [-14, 2.0, 6.5]), look: L(st, [-2, 2.4, -3]), fov: 48 }, { f: 525, dur: 30, pos: L(st, [-4, 1.8, 6.4]), look: L(st, [2, 2.6, -3]), fov: 46, roll: 0.06 }],
  7: [{ f: 573, pos: L(st, [-5.4, 2.2, 3.2]), look: L(st, [-5.4, 2.9, 9.5]), fov: 44 }, { f: 650, dur: 32, pos: L(st, [0, 2.4, 3.0]), look: L(st, [0, 4.0, 9.5]), fov: 46, roll: -0.05 }],
  8: [{ f: 732, pos: L(st, [-14, 1.7, 6.3]), look: L(st, [6, 1.9, 4.5]), fov: 50 }, { f: 790, dur: 24, pos: L(st, [-8, 1.5, 6.3]), look: L(st, [12, 2.0, 4.5]), fov: 50, roll: 0.05 }],
  9: [{ f: 844, pos: L(st, [-1.5, 2.6, -6]), look: L(st, [-1.5, 3.6, 9.5]), fov: 50 }, { f: 930, dur: 30, pos: L(st, [-0.5, 2.4, -3]), look: L(st, [0, 4.0, 9.5]), fov: 42, roll: -0.06 }],
  10: [{ f: 1025, pos: L(st, [-4, 34, -48]), look: L(st, [4, 0, 4]), fov: 42 }, { f: 1085, dur: 36, pos: L(st, [24, 9, -14]), look: L(st, [4, 2, 0]), fov: 42 }],
  11: [{ f: 1145, pos: L(q, [-12, 3, 34]), look: L(q, [0, 9, -2]), fov: 48 }],
  12: [{ f: 1207, pos: L(q, [0.8, 18.8, -3.6]), look: L(q, [0, 19.2, -12.8]), fov: 40, push: 0.003 }],
  13: [{ f: 1343, pos: L(q, [0, 2.0, 14]), look: L(q, [0, 1.5, 1]), fov: 54 }],
  14: [{ f: 1420, pos: L(q, [-2, 1.4, 14]), look: L(q, [0, 1.5, 3]), fov: 54, roll: 0.05 }],
  15: [{ f: 1506, pos: L(q, [0, 2.4, 13]), look: L(q, [0, 2.6, 3]), fov: 50 }],
  16: [{ f: 1623, pos: L(q, [0, 1.65, 8.1]), look: L(q, [0, 1.62, 6]), fov: 30, push: 0.0015 }],
  17: [{ f: 1750, pos: L(q, [0, 2.2, 16]), look: L(q, [0, 7, -8]), fov: 50 }, { f: 1810, dur: 60, pos: L(q, [0, 10, 48]), look: L(q, [0, 11, -16]), fov: 46 }],
};
export const camAt = (id: number, f: number): Cam => {
  const keys = CAMS[id].map(key);
  let cur = at(keys[0], f);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f - k.dur / 2) break;
    cur = mixC(cur, at(k, f), glide((f - (k.f - k.dur / 2)) / k.dur));
  }
  return cur;
};
export const camsOf = (id: number) => { const s = SHOTS[id - 1]; return [s.a, (s.a + s.b) >> 1, s.b - 1].map((f) => camAt(id, f)); };

// ---- lens blur per shot (px at 1080 wide); focus = look point ----
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  const t: Record<number, number> = { 1: 0, 2: 6, 3: 0, 4: 5, 5: 4, 6: 5, 7: 6, 8: 5, 9: 5, 10: 0, 11: 0, 12: 6, 13: 5, 14: 5, 15: 5, 16: 9, 17: 0 };
  return { cInf: t[id] ?? 0 };
};

// ---- world time (seconds) ----
export const T = (f: number) => f / FPS;
