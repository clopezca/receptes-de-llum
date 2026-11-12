import { PROCESSES, duotoneMatrix, matrixToValues } from "./filters.js";
import { renderMatrix } from "./matrix-table.js";
import { DEFAULT_RECIPE, recipeFromParams, recipeToParams } from "./recipe.js";
import {
  renderFilteredImage,
  fileNameFor,
  downloadBlob,
} from "./export-image.js";

const SAMPLE_IMAGE = "img/original-2009-crop.jpg";
const UNTITLED = "Recepta sense nom";

const PRESETS = {
  cyanotype: {
    shadows: PROCESSES.cyanotype.dark,
    paper: PROCESSES.cyanotype.light,
  },
  vandyke: { shadows: PROCESSES.vandyke.dark, paper: PROCESSES.vandyke.light },
  neutral: { shadows: "#161616", paper: "#f5f5f3" },
};

const formatContrast = new Intl.NumberFormat("ca", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function initWorkshopStation() {
  const root = document.querySelector('[data-station="workshop"]');
  if (!root) return;

  const form = root.querySelector(".js-workshop-form");
  const colorMatrix = document.querySelector(".js-workshop-color-matrix");
  const image = root.querySelector(".js-workshop-image");
  const grain = root.querySelector(".js-grain");
  const vignette = root.querySelector(".js-vignette");
  const recipeTitle = root.querySelector(".js-recipe-title");
  const imageSource = root.querySelector(".js-image-source");
  const labelName = root.querySelector(".js-label-name");
  const values = root.querySelector(".js-recipe-values");
  const matrixTable = root.querySelector(".js-workshop-matrix");
  const linkField = root.querySelector(".js-recipe-link");
  const copyButton = root.querySelector(".js-copy-link");
  const copyStatus = root.querySelector(".js-copy-status");
  const photoInput = root.querySelector(".js-photo-input");
  const photoReset = root.querySelector(".js-photo-reset");
  const photoNote = root.querySelector(".js-photo-note");
  const downloadButton = root.querySelector(".js-download");
  const downloadStatus = root.querySelector(".js-download-status");

  let photoUrl = null;

  const readForm = () => ({
    name: form.elements.name.value.trim(),
    shadows: form.elements.shadows.value,
    paper: form.elements.paper.value,
    contrast: Number(form.elements.contrast.value),
    grain: Number(form.elements.grain.value),
    vignette: Number(form.elements.vignette.value),
  });

  const writeForm = (recipe) => {
    form.elements.name.value = recipe.name;
    form.elements.shadows.value = recipe.shadows;
    form.elements.paper.value = recipe.paper;
    form.elements.contrast.value = String(recipe.contrast);
    form.elements.grain.value = String(recipe.grain);
    form.elements.vignette.value = String(recipe.vignette);
  };

  const render = () => {
    const recipe = readForm();
    const matrix = duotoneMatrix(recipe.shadows, recipe.paper, recipe.contrast);
    const title = recipe.name || UNTITLED;

    colorMatrix.setAttribute("values", matrixToValues(matrix));
    grain.style.opacity = String(recipe.grain / 100);
    vignette.style.setProperty("--vignette", String(recipe.vignette / 100));

    recipeTitle.textContent = title;
    labelName.textContent = title;
    renderValues(values, recipe);
    renderMatrix(matrixTable, matrix);

    form.querySelector('[for="recipe-contrast"] output').textContent =
      formatContrast.format(recipe.contrast);
    form.querySelector('[for="recipe-grain"] output').textContent =
      `${recipe.grain} %`;
    form.querySelector('[for="recipe-vignette"] output').textContent =
      `${recipe.vignette} %`;

    const url = new URL(window.location.href);
    url.search = recipeToParams(recipe).toString();
    url.hash = "taller";
    linkField.value = url.toString();
    copyStatus.textContent = "";
  };

  const setPhoto = (file) => {
    if (!file.type.startsWith("image/")) {
      photoNote.textContent =
        "Aquest fitxer no és una imatge. Prova amb un JPG o un PNG.";
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(file);
    image.src = photoUrl;
    image.alt = "La teva foto amb el teu filtre aplicat.";
    imageSource.textContent = "La teva foto · ara";
    photoReset.hidden = false;
    photoNote.textContent = "La teva foto no surt del navegador.";
  };

  const resetPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = null;
    image.src = SAMPLE_IMAGE;
    image.alt = "La imatge de mostra amb el teu filtre aplicat.";
    imageSource.textContent = "Imatge de mostra · 2009";
    photoReset.hidden = true;
    photoInput.value = "";
  };

  form.addEventListener("input", render);
  form.addEventListener("submit", (event) => event.preventDefault());

  root.addEventListener("click", (event) => {
    const preset = event.target.closest("[data-preset]");
    if (!preset) return;
    writeForm({ ...readForm(), ...PRESETS[preset.dataset.preset] });
    render();
  });

  photoInput.addEventListener("change", () => {
    const [file] = photoInput.files;
    if (file) setPhoto(file);
  });
  photoReset.addEventListener("click", resetPhoto);

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(linkField.value);
      copyStatus.textContent = "Enllaç copiat.";
    } catch {
      linkField.select();
      copyStatus.textContent =
        "No s'ha pogut copiar automàticament. L'enllaç està seleccionat: copia'l amb Ctrl+C o Cmd+C.";
    }
  });

  downloadButton.addEventListener("click", async () => {
    const recipe = readForm();
    const matrix = duotoneMatrix(recipe.shadows, recipe.paper, recipe.contrast);
    downloadButton.disabled = true;
    downloadStatus.textContent = "Preparant la imatge…";
    try {
      const blob = await renderFilteredImage(image, matrix, recipe);
      downloadBlob(blob, fileNameFor(recipe.name));
      downloadStatus.textContent = "";
    } catch {
      downloadStatus.textContent =
        "No s'ha pogut generar la imatge. Torna-ho a provar.";
    } finally {
      downloadButton.disabled = false;
    }
  });

  const { recipe, found } = recipeFromParams(
    new URLSearchParams(window.location.search),
  );
  writeForm(found ? recipe : DEFAULT_RECIPE);
  render();
}

function renderValues(list, recipe) {
  const lines = [
    ["Ombres", recipe.shadows.toUpperCase()],
    ["Paper", recipe.paper.toUpperCase()],
    ["Contrast", formatContrast.format(recipe.contrast)],
    ["Gra", `${recipe.grain} %`],
    ["Vinyeta", `${recipe.vignette} %`],
  ];
  list.replaceChildren(
    ...lines.map(([term, value]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      row.append(dt, dd);
      return row;
    }),
  );
}
