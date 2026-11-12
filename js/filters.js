// Rec. 709 luminance weights: how much red, green and blue count as "light".
const LUMA = [0.2126, 0.7152, 0.0722];

/**
 * Parses a #rrggbb color into [r, g, b] in the 0–1 range.
 * @param {string} hex
 * @returns {number[]}
 */
export function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
}

/**
 * Builds a 4×5 color matrix that maps each pixel's luminance onto a
 * gradient between `dark` and `light`, with optional contrast around mid-gray:
 *   out = dark + (light − dark) · (0.5 + contrast · (L − 0.5))
 * Contrast stays inside the matrix, so the 20 numbers are the whole filter.
 * @param {string} dark      shadow color (#rrggbb)
 * @param {string} light     highlight color (#rrggbb)
 * @param {number} [contrast=1] 1 leaves the tones as they are
 * @returns {number[][]} rows R', G', B', A' — columns R, G, B, A, offset
 */
export function duotoneMatrix(dark, light, contrast = 1) {
  const d = hexToRgb(dark);
  const l = hexToRgb(light);
  const rows = d.map((dc, c) => {
    const range = l[c] - dc;
    const offset = dc + range * 0.5 * (1 - contrast);
    return [...LUMA.map((w) => range * contrast * w), 0, offset];
  });
  rows.push([0, 0, 0, 1, 0]);
  return rows;
}

export function matrixToValues(matrix) {
  return matrix
    .flat()
    .map((n) => Number(n.toFixed(4)))
    .join(" ");
}

export const PROCESSES = {
  cyanotype: {
    id: "cyanotype",
    name: "Cianotípia",
    dark: "#094a72",
    light: "#f4f6f2",
    print: "img/cyanotype-2009.jpg",
    printAlt:
      "Cianotípia de 2009: la roba estesa en blau de Prússia sobre paper d'aquarel·la.",
    culture: [
      "Blau de Prússia",
      "Inventada per John Herschel el 1842",
      "Anna Atkins, el primer llibre il·lustrat amb fotografies (1843)",
      "Botànic · artesanal · nostàlgic",
    ],
  },
  vandyke: {
    id: "vandyke",
    name: "Van Dyke",
    dark: "#513d38",
    light: "#f3ede2",
    print: "img/vandyke-2009.jpg",
    printAlt:
      "Còpia Van Dyke de 2009: la mateixa imatge en marró, amb les ombres molt denses.",
    culture: [
      "Marró Van Dyke",
      "El nom remet al pintor Anthony Van Dyck i als marrons de les seves obres",
      "Ferro i plata: cal fixar la còpia",
      "Antic · càlid · d'àlbum familiar",
    ],
  },
};
