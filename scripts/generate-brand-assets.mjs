import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android/app/src/main/res');
const LOGO_ICON = path.join(ROOT, 'src/assets/logo-icon.png');
const LOGO_WHITE = path.join(ROOT, 'src/assets/logo-white.png');
const BRAND_PURPLE = '#8746FF';
const BRAND_DARK = '#141A32';

const SPLASHES = [
  ['drawable/splash.png', 480, 800],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
];

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

async function solidBg(width, height, hex) {
  const { r, g, b } = hexToRgb(hex);
  return sharp({
    create: { width, height, channels: 3, background: { r, g, b } },
  }).png();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

async function composeCentered(bg, logoPath, canvasW, canvasH, logoScale = 0.55) {
  const logoW = Math.max(1, Math.round(Math.min(canvasW, canvasH) * logoScale));
  const logo = await sharp(logoPath).resize({ width: logoW, withoutEnlargement: false }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((canvasW - meta.width) / 2);
  const top = Math.round((canvasH - meta.height) / 2);
  return bg.composite([{ input: logo, left, top }]);
}

async function makeSplash(width, height, outPath) {
  const bg = await solidBg(width, height, BRAND_DARK);
  const img = await composeCentered(bg, LOGO_WHITE, width, height, 0.38);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await img.png().toFile(outPath);
}

async function makeLauncher(size, outPath) {
  const bg = await solidBg(size, size, BRAND_PURPLE);
  const img = await composeCentered(bg, LOGO_ICON, size, size, 0.72);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await img.png().toFile(outPath);
}

async function makeForeground(size, outPath) {
  const logoW = Math.round(size * 0.62);
  const logo = await sharp(LOGO_ICON).resize({ width: logoW }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const canvas = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png().toBuffer();
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(canvas)
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(outPath);
}

async function makeWebIcon(size, outPath) {
  const bg = await solidBg(size, size, BRAND_PURPLE);
  const img = await composeCentered(bg, LOGO_ICON, size, size, 0.68);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await img.png().toFile(outPath);
}

async function main() {
  for (const [rel, w, h] of SPLASHES) {
    await makeSplash(w, h, path.join(RES, rel));
    console.log('splash', rel);
  }

  for (const [density, size] of Object.entries(LAUNCHER)) {
    const dir = path.join(RES, `mipmap-${density}`);
    await makeLauncher(size, path.join(dir, 'ic_launcher.png'));
    await makeLauncher(size, path.join(dir, 'ic_launcher_round.png'));
    console.log('launcher', density, size);
  }

  for (const [density, size] of Object.entries(FOREGROUND)) {
    const dir = path.join(RES, `mipmap-${density}`);
    await makeForeground(size, path.join(dir, 'ic_launcher_foreground.png'));
    console.log('foreground', density, size);
  }

  await makeWebIcon(512, path.join(ROOT, 'public/assets/icon/icon.png'));
  await makeWebIcon(192, path.join(ROOT, 'public/assets/icon/icon-192.png'));
  await makeWebIcon(64, path.join(ROOT, 'public/favicon.png'));
  await makeWebIcon(64, path.join(ROOT, 'public/assets/icon/favicon.png'));
  console.log('web icons ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
