import { PROCESSES, duotoneMatrix } from "./filters.js";
import { renderFilteredImage } from "./export-image.js";

const ORIGINAL = "img/original-2009.jpg";

const RECIPES = {
  cyanotype: {
    ...PROCESSES.cyanotype,
    contrast: 1.25,
    grain: 35,
    vignette: 15,
  },
  vandyke: { ...PROCESSES.vandyke, contrast: 1.45, grain: 35, vignette: 40 },
};

const SAMPLES = [
  {
    kind: "digital",
    recipe: "cyanotype",
    focus: "30% 50%",
    why: "El filtre de cianotípia amb gra afegit. El blau és uniforme i el gra és igual a tot arreu.",
  },
  {
    kind: "chemical",
    src: "img/vandyke-2009.jpg",
    focus: "65% 55%",
    why: "El Van Dyke de 2009. Les ombres es tanquen sense detall: la còpia es va sobreexposar al sol de migdia.",
  },
  {
    kind: "chemical",
    src: "img/cyanotype-2009.jpg",
    focus: "30% 50%",
    why: "La cianotípia de 2009. A les ombres es veu la textura del paper d'aquarel·la.",
  },
  {
    kind: "digital",
    recipe: "vandyke",
    focus: "65% 55%",
    why: "El filtre Van Dyke amb gra i vinyeta. Les ombres conserven detall: el filtre no es pot sobreexposar.",
  },
  {
    kind: "chemical",
    src: "img/cyanotype-2009.jpg",
    focus: "80% 40%",
    zoom: 2,
    why: "Un detall de la cianotípia. Les fibres del paper i el blau desigual vénen de la sal de ferro.",
  },
  {
    kind: "digital",
    recipe: "cyanotype",
    focus: "80% 40%",
    zoom: 2,
    why: "Un detall del filtre de cianotípia. El gra és soroll matemàtic: no segueix cap paper.",
  },
];

const LABELS = { chemical: "Química", digital: "Programari" };

export async function initQuizStation() {
  const root = document.querySelector('[data-station="quiz"]');
  if (!root) return;

  const grid = root.querySelector(".js-quiz-grid");
  const score = root.querySelector(".js-quiz-score");
  const reset = root.querySelector(".js-quiz-reset");
  const answers = new Map();

  const digitalSources = await renderDigitalSamples();

  grid.replaceChildren(
    ...SAMPLES.map((sample, index) =>
      createTile(
        sample,
        index,
        sample.kind === "digital" ? digitalSources[sample.recipe] : sample.src,
      ),
    ),
  );

  const updateScore = () => {
    if (answers.size < SAMPLES.length) {
      score.textContent = `Has respost ${answers.size} de ${SAMPLES.length} mostres.`;
      reset.hidden = answers.size === 0;
      return;
    }
    const hits = [...answers.values()].filter(Boolean).length;
    score.textContent = `Has encertat ${hits} de ${SAMPLES.length}.`;
    reset.hidden = false;
  };

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer]");
    if (!button) return;
    const tile = button.closest(".quiz-tile");
    const index = Number(tile.dataset.index);
    if (answers.has(index)) return;

    const sample = SAMPLES[index];
    const correct = button.dataset.answer === sample.kind;
    answers.set(index, correct);

    button.setAttribute("aria-pressed", "true");
    for (const option of tile.querySelectorAll("[data-answer]"))
      option.disabled = true;
    tile.classList.add(correct ? "is-correct" : "is-wrong");
    tile.querySelector(".quiz-verdict").textContent =
      `${correct ? "Correcte" : "No"}: és ${LABELS[
        sample.kind
      ].toLowerCase()}.`;
    tile.querySelector(".quiz-why").textContent = sample.why;
    updateScore();
  });

  reset.addEventListener("click", () => {
    answers.clear();
    for (const tile of grid.querySelectorAll(".quiz-tile")) {
      tile.classList.remove("is-correct", "is-wrong");
      tile.querySelector(".quiz-verdict").textContent = "";
      tile.querySelector(".quiz-why").textContent = "";
      for (const option of tile.querySelectorAll("[data-answer]")) {
        option.disabled = false;
        option.setAttribute("aria-pressed", "false");
      }
    }
    updateScore();
    grid.querySelector("[data-answer]")?.focus();
  });

  updateScore();
}

async function renderDigitalSamples() {
  const image = new Image();
  image.src = ORIGINAL;
  const entries = await Promise.all(
    Object.entries(RECIPES).map(async ([id, recipe]) => {
      const matrix = duotoneMatrix(recipe.dark, recipe.light, recipe.contrast);
      const blob = await renderFilteredImage(image, matrix, recipe);
      return [id, URL.createObjectURL(blob)];
    }),
  );
  return Object.fromEntries(entries);
}

function createTile(sample, index, src) {
  const tile = document.createElement("li");
  tile.className = "quiz-tile";
  tile.dataset.index = String(index);

  const number = index + 1;
  tile.innerHTML = `
    <figure class="quiz-figure">
      <div class="quiz-frame">
        <img alt="Mostra ${number}" width="600" height="450">
      </div>
      <figcaption class="label-number">Mostra ${number}</figcaption>
    </figure>
    <div class="quiz-options" role="group" aria-label="Mostra ${number}: química o programari?">
      <button type="button" class="button button--small" data-answer="chemical" aria-pressed="false">Química</button>
      <button type="button" class="button button--small" data-answer="digital" aria-pressed="false">Programari</button>
    </div>
    <p class="quiz-verdict" aria-live="polite"></p>
    <p class="quiz-why note"></p>
  `;
  const image = tile.querySelector("img");
  image.src = src;
  image.style.setProperty("--focus", sample.focus);
  image.style.setProperty("--zoom", String(sample.zoom ?? 1.08));
  return tile;
}
