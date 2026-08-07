/**
 * Generates all app icon assets from JVN_LOGO + leather texture.
 * Run: node scripts/generate-icons.js
 */
const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "..", "assets", "images", "JVN_LOGO.png");
const TEXTURE = path.join(__dirname, "..", "assets", "images", "leather-texture.png");
const OUT = path.join(__dirname, "..", "assets", "images");
const BEIGE = "#F5EBD6";

async function leatherBackground(size) {
  if (size <= 512) {
    return sharp(TEXTURE).resize(size, size, { fit: "cover" }).png().toBuffer();
  }
  const tile = await sharp(TEXTURE).resize(512, 512).toBuffer();
  const tiles = [];
  for (let y = 0; y < size; y += 512) {
    for (let x = 0; x < size; x += 512) {
      tiles.push({ input: tile, left: x, top: y });
    }
  }
  return sharp({
    create: { width: size, height: size, channels: 3, background: BEIGE },
  })
    .composite(tiles)
    .png()
    .toBuffer();
}

async function main() {
  const img = sharp(SRC);
  const { width, height } = await img.metadata();
  const size = Math.min(width, height);

  const square = sharp(SRC).extract({
    left: Math.floor((width - size) / 2),
    top: Math.floor((height - size) / 2),
    width: size,
    height: size,
  });

  const bg1024 = await leatherBackground(1024);
  const logo1024 = await square.clone().resize(820, 820).png().toBuffer();
  const logo660 = await square.clone().resize(660, 660).png().toBuffer();

  // 1. Main icon - logo on leather
  await sharp(bg1024)
    .composite([{ input: logo1024, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, "icon.png"));

  // 2. Adaptive background - full leather texture
  await sharp(bg1024).toFile(path.join(OUT, "android-icon-background.png"));

  // 3. Adaptive foreground - logo on transparent (shows leather background through)
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo660, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, "android-icon-foreground.png"));

  // 4. Monochrome - white logo silhouette for Android themed icons
  const maskBuf = await square
    .clone()
    .resize(1024, 1024)
    .greyscale()
    .normalize()
    .threshold(40)
    .negate()
    .raw()
    .toBuffer();
  const maskOpts = { raw: { width: 1024, height: 1024, channels: 1 } };

  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: "#ffffff" },
  })
    .joinChannel(maskBuf, maskOpts)
    .png()
    .toFile(path.join(OUT, "android-icon-monochrome.png"));

  // 5. Splash icon - logo only (splash-full.png is the primary splash asset)
  await square.clone().resize(480, 480).png().toFile(path.join(OUT, "splash-icon.png"));

  // 6. Favicon (web)
  const bg48 = await leatherBackground(48);
  const faviconLogo = await square.clone().resize(36, 36).png().toBuffer();
  await sharp(bg48)
    .composite([{ input: faviconLogo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, "favicon.png"));

  console.log("All assets written to assets/images. Use", BEIGE, "in app.json.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
