// Render video/index.html frame-by-frame with Playwright and encode with ffmpeg.
// Usage: node tools/render.mjs [out.mp4]   |   node tools/render.mjs --stills 0.5,3,7
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FPS = 30;
const args = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto("file://" + path.join(root, "video/index.html"));
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);

if (args[0] === "--stills") {
  const dir = args[2] || path.join(root, "out/stills");
  fs.mkdirSync(dir, { recursive: true });
  for (const t of args[1].split(",").map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const out = args[0] || path.join(root, "out/pet_line_sticker_tiktok.mp4");
fs.mkdirSync(path.dirname(out), { recursive: true });
const silent = out.replace(/\.mp4$/, ".silent.mp4");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "18", "-r", String(FPS), silent], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(duration * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate(t => window.render(t), f / FPS);
  const buf = await page.screenshot({ type: "png" });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
  if (f % 60 === 0) console.log(`frame ${f}/${frames}`);
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));

// sound effects: soft "pop" for received, higher "pop" for sent, click for taps, chime for the end card
const sfx = await page.evaluate(() => window.SFX);
await browser.close();
const tone = { them: "880", me: "1320", tap: "2400", end: "1046" };
const inputs = [], filters = [];
sfx.forEach((s, i) => {
  const dur = s.kind === "end" ? 0.6 : s.kind === "tap" ? 0.04 : 0.12;
  const f = tone[s.kind];
  const expr = s.kind === "end"
    ? `0.35*(sin(2*PI*1046*t)+0.6*sin(2*PI*1568*t))*exp(-5*t)`
    : `0.5*sin(2*PI*${f}*t*(1+2*t))*exp(-${s.kind === "tap" ? 90 : 30}*t)`;
  inputs.push("-f", "lavfi", "-t", String(dur), "-i", `aevalsrc=${expr}:s=44100`);
  filters.push(`[${i + 1}:a]adelay=${Math.round(s.t * 1000)}:all=1[a${i}]`);
});
const mix = filters.join(";") + ";" + sfx.map((_, i) => `[a${i}]`).join("") +
  `amix=inputs=${sfx.length}:normalize=0,apad=whole_dur=${duration}[aout]`;
await new Promise((res, rej) => {
  const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, ...inputs, "-filter_complex", mix,
    "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
  p.on("close", c => c === 0 ? res() : rej(new Error("ffmpeg audio mix failed")));
});
fs.unlinkSync(silent);
console.log("wrote", out);
