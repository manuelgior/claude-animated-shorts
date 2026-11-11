// usage: node scripts/render.mjs <out.mp4> <from> <to> [scale] [concurrency]   (video only; mux audio afterwards)
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, from, to, scale = "0.5", conc = "4"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "ClockShort", browserExecutable, chromiumOptions, inputProps: JSON.parse(process.env.PROPS || "{}") });
const t0 = Date.now();
const inputProps = JSON.parse(process.env.PROPS || "{}");
await renderMedia({ composition, serveUrl, inputProps, codec: "h264", crf: 18, outputLocation: out, frameRange: [Number(from), Number(to)], scale: Number(scale),
  concurrency: Number(conc), browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000, muted: true,
  onProgress: (p) => { if (p.renderedFrames % 10 === 0) console.log("frames", p.renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
