const MAX_SIDE = 3000;
const JPEG_QUALITY = 0.92;

/**
 * @param {HTMLImageElement} image   the image currently shown (sample or user photo)
 * @param {number[][]} matrix         4×5 color matrix from duotoneMatrix()
 * @param {{ grain: number, vignette: number }} effects  0–100 each
 * @returns {Promise<Blob>}
 */
export async function renderFilteredImage(image, matrix, { grain, vignette }) {
  await image.decode();

  const scale = Math.min(
    1,
    MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height);
  applyMatrix(pixels.data, matrix, grain / 100);
  context.putImageData(pixels, 0, 0);

  if (vignette > 0) drawVignette(context, width, height, vignette / 100);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas export failed")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Applies the color matrix to RGBA bytes, plus random grain.
 * Same math as feColorMatrix: channel' = row · [r, g, b, a, 1]
 */
function applyMatrix(data, matrix, grainAmount) {
  const [r0, g0, b0] = matrix;
  const grainRange = grainAmount * 0.35;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const a = data[i + 3] / 255;
    const noise = grainRange ? (Math.random() - 0.5) * 2 * grainRange : 0;

    data[i] = toByte(
      r0[0] * r + r0[1] * g + r0[2] * b + r0[3] * a + r0[4] + noise,
    );
    data[i + 1] = toByte(
      g0[0] * r + g0[1] * g + g0[2] * b + g0[3] * a + g0[4] + noise,
    );
    data[i + 2] = toByte(
      b0[0] * r + b0[1] * g + b0[2] * b + b0[3] * a + b0[4] + noise,
    );
  }
}

const toByte = (value) => Math.round(Math.min(1, Math.max(0, value)) * 255);

function drawVignette(context, width, height, strength) {
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(width / 2, height / 2);
  const outer = Math.SQRT2;
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, outer);
  gradient.addColorStop(0.45, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${strength * 0.85})`);
  context.fillStyle = gradient;
  context.fillRect(-1, -1, 2, 2);
  context.restore();
}

/**
 * Turns a recipe name into a safe file name: "Sol de migdia" → "sol-de-migdia.jpg"
 * @param {string} name
 */
export function fileNameFor(name) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "recepta-sense-nom"}.jpg`;
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
