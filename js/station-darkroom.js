import { PROCESSES, duotoneMatrix } from "./filters.js";
import { renderFilteredImage } from "./export-image.js";

const ORIGINAL = "img/original-2009-crop.jpg";
const EXPOSURE_MINUTES = 4;
const SECONDS_PER_MINUTE = 1;

const HOURS = { 11: 1, 12: 1.25, 13: 1.5 };

export const PAPERS = {
  arches: {
    name: "Arches aquarel·la gra fi, 640 g",
    ref: "Nº 25",
    speed: 1,
    group2009: "Grup dels bons",
  },
  guarroCoarse: {
    name: "Guarro aquarel·la gra gruixut, 240 g",
    ref: "Nº 55",
    speed: 1.05,
    group2009: "Mitjans: bons",
  },
  hahnemuhle: {
    name: "Hahnemühle Cézanne mat, 300 g",
    ref: "Nº 13",
    speed: 0.7,
    group2009: "Mitjans: li falta exposició",
  },
  guarroFine: {
    name: "Guarro aquarel·la gra fi, 240 g",
    ref: "Nº 53",
    speed: 0.55,
    stains: true,
    group2009: "Molt dolents: subexposat i amb taques",
  },
};

const PREPARATIONS = {
  rabbitGlue: "cola de conill",
  gelatin: "gelatina",
  none: "sense tractar",
};

const GOOD = { min: 0.85, max: 1.3 };

const STEPS = ["sensitize", "negative", "expose", "wash"];

export function initDarkroomStation() {
  const root = document.querySelector('[data-station="darkroom"]');
  if (!root) return;

  const form = root.querySelector(".js-darkroom-form");
  const stepButtons = Object.fromEntries(
    STEPS.map((step) => [step, root.querySelector(`[data-step="${step}"]`)]),
  );
  const timer = root.querySelector(".js-timer");
  const sheet = root.querySelector(".js-sheet");
  const printList = root.querySelector(".js-print-list");
  const sheetsUsed = root.querySelector(".js-sheets-used");
  const newPrint = root.querySelector(".js-new-print");

  const original = new Image();
  original.src = ORIGINAL;

  let used = 0;
  let current = null;

  const setStep = (active) => {
    STEPS.forEach((step) => {
      stepButtons[step].disabled = step !== active;
      stepButtons[step]
        .closest("li")
        .classList.toggle(
          "is-done",
          STEPS.indexOf(step) < STEPS.indexOf(active),
        );
    });
    for (const field of form.elements) field.disabled = active !== "sensitize";
  };

  const finishAll = () => {
    STEPS.forEach((step) => {
      stepButtons[step].disabled = true;
      stepButtons[step].closest("li").classList.add("is-done");
    });
    for (const field of form.elements) field.disabled = true;
    newPrint.hidden = false;
  };

  stepButtons.sensitize.addEventListener("click", () => {
    current = {
      paper: form.elements.paper.value,
      preparation: form.elements.preparation.value,
      hour: Number(form.elements.hour.value),
    };
    used += 1;
    sheetsUsed.textContent = String(used);
    sheet.dataset.state = "sensitized";
    setStep("negative");
  });

  stepButtons.negative.addEventListener("click", () => {
    sheet.dataset.state = "negative";
    setStep("expose");
  });

  stepButtons.expose.addEventListener("click", async () => {
    stepButtons.expose.disabled = true;
    sheet.dataset.state = "exposing";
    await countdown(timer, EXPOSURE_MINUTES, SECONDS_PER_MINUTE);
    sheet.dataset.state = "exposed";
    setStep("wash");
  });

  stepButtons.wash.addEventListener("click", async () => {
    stepButtons.wash.disabled = true;
    sheet.dataset.state = "washed";
    const result = develop(current);
    const print = await createPrint(original, current, result);
    printList.prepend(print);
    finishAll();
  });

  newPrint.addEventListener("click", () => {
    current = null;
    newPrint.hidden = true;
    sheet.dataset.state = "blank";
    timer.textContent = formatTime(EXPOSURE_MINUTES * 60);
    setStep("sensitize");
    stepButtons.sensitize.focus();
  });

  timer.textContent = formatTime(EXPOSURE_MINUTES * 60);
  setStep("sensitize");
}

function develop({ paper, hour }) {
  const exposure = HOURS[hour] * PAPERS[paper].speed;
  let verdict = "good";
  if (exposure < GOOD.min) verdict = "under";
  if (exposure > GOOD.max) verdict = "over";
  return {
    exposure,
    verdict,
    stains: Boolean(PAPERS[paper].stains),
    rescued: false,
  };
}

function printMatrix({ exposure }) {
  const { dark, light } = PROCESSES.cyanotype;
  if (exposure < GOOD.min) {
    const pale = Math.min(0.7, (GOOD.min - exposure) / 0.45);
    return duotoneMatrix(mix(dark, light, pale), light, 1);
  }
  if (exposure > GOOD.max) {
    const dense = Math.min(0.75, (exposure - GOOD.max) / 0.3);
    return duotoneMatrix(dark, mix(light, dark, dense * 0.55), 1 + dense * 0.6);
  }
  return duotoneMatrix(dark, light, 1.15);
}

const VERDICTS = {
  good: "Bona còpia.",
  under: "Subexposada: massa pàl·lida.",
  over: "Sobreexposada: les ombres es tanquen.",
};

async function createPrint(original, choice, result) {
  const paper = PAPERS[choice.paper];
  const item = document.createElement("li");
  item.className = "print-card";
  item.innerHTML = `
    <figure>
      <img alt="" width="640" height="310">
      <figcaption>
        <strong class="js-verdict"></strong>
        <span>${paper.ref} · ${paper.name}</span>
        <span>${PREPARATIONS[choice.preparation]} · ${choice.hour} h · ${EXPOSURE_MINUTES}′</span>
        <span class="note">El 2009: ${paper.group2009.toLowerCase()}.</span>
      </figcaption>
    </figure>
  `;
  const image = item.querySelector("img");
  const verdict = item.querySelector(".js-verdict");

  const paint = async () => {
    const matrix = printMatrix(result);
    const blob = await renderFilteredImage(original, matrix, {
      grain: result.stains ? 70 : 30,
      vignette: result.stains ? 35 : 10,
    });
    if (image.src.startsWith("blob:")) URL.revokeObjectURL(image.src);
    image.src = URL.createObjectURL(blob);
    verdict.textContent =
      VERDICTS[result.verdict] +
      (result.stains ? " Amb taques." : "") +
      (result.rescued ? " Vernissada amb goma aràbiga." : "");
    image.alt = `Còpia: ${verdict.textContent}`;
  };

  await paint();

  if (result.verdict === "over") {
    const rescue = document.createElement("button");
    rescue.type = "button";
    rescue.className = "button button--small";
    rescue.textContent = "Vernissa amb goma aràbiga";
    rescue.addEventListener("click", async () => {
      rescue.remove();
      const help = choice.preparation === "gelatin" ? 0.6 : 0.35;
      result.exposure = GOOD.max + (result.exposure - GOOD.max) * (1 - help);
      result.rescued = true;
      await paint();
    });
    item.querySelector("figcaption").append(rescue);
  }

  return item;
}

function countdown(output, minutes, secondsPerMinute) {
  const total = minutes * 60;
  const duration = minutes * secondsPerMinute * 1000;
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      output.textContent = formatTime(Math.round(total * (1 - progress)));
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function mix(a, b, t) {
  const ca = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const cb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `#${ca
    .map((v, i) =>
      Math.round(v + (cb[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
