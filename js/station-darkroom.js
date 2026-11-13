import { PROCESSES, duotoneMatrix } from "./filters.js";
import { renderFilteredImage } from "./export-image.js";

const ORIGINAL = "img/original-2009.jpg";
const EXPOSURE_MINUTES = 4;
const SECONDS_PER_MINUTE = 1;

const HOURS = { 11: 1, 12: 1.25, 13: 1.5 };

const PREPARATIONS = {
  rabbitGlue: "cola de conill",
  gelatin: "gelatina",
  none: "sense tractar",
};

const GOOD = { min: 0.85, max: 1.3 };

const STEP_LABELS = {
  sensitize: "Sensibilitza el paper",
  negative: "Col·loca el negatiu",
  expose: "Exposa al sol",
  wash: "Renta amb aigua",
  fix: "Fixa i torna a rentar",
};

const DARKROOMS = {
  cyanotype: {
    process: PROCESSES.cyanotype,
    steps: ["sensitize", "negative", "expose", "wash"],
    defaultPaper: "guarroCoarse",
    papers: {
      arches: {
        ref: "Nº 25",
        name: "Arches aquarel·la gra fi, 640 g",
        speed: 1,
        group2009: "grup dels bons",
      },
      guarroCoarse: {
        ref: "Nº 55",
        name: "Guarro aquarel·la gra gruixut, 240 g",
        speed: 1.05,
        group2009: "mitjà, va sortir bé",
      },
      hahnemuhle: {
        ref: "Nº 13",
        name: "Hahnemühle Cézanne mat, 300 g",
        speed: 0.7,
        group2009: "mitjà, li va faltar exposició",
      },
      guarroFine: {
        ref: "Nº 53",
        name: "Guarro aquarel·la gra fi, 240 g",
        speed: 0.55,
        stains: true,
        group2009: "molt dolent, subexposat i amb taques",
      },
    },
  },
  vandyke: {
    process: PROCESSES.vandyke,
    steps: ["sensitize", "negative", "expose", "wash", "fix"],
    defaultPaper: "arches",
    papers: {
      arches: {
        ref: "Nº 25",
        name: "Arches aquarel·la gra fi, 640 g",
        speed: 1,
        group2009: "grup dels bons",
      },
      hahnemuhle: {
        ref: "Nº 8",
        name: "Hahnemühle Cézanne rugós, 300 g",
        speed: 1.35,
        group2009: "mitjà, es va sobreexposar i va millorar amb goma aràbiga",
      },
      fabriano: {
        ref: "Nº 1",
        name: "Fabriano CP 100 % cotó, 640 g",
        speed: 1.3,
        group2009: "mitjà, li sobrava exposició",
      },
      guarroFine: {
        ref: "Nº 53",
        name: "Guarro aquarel·la gra fi, 240 g",
        speed: 0.7,
        group2009: "mitjà, li va faltar exposició",
      },
      guarroCoarse: {
        ref: "Nº 55",
        name: "Guarro aquarel·la gra gruixut, 240 g",
        speed: 1,
        stains: true,
        poor: true,
        group2009: "dolent",
      },
    },
  },
};

const VERDICTS = {
  good: "Bona còpia.",
  under: "Subexposada: massa pàl·lida.",
  over: "Sobreexposada: les ombres es tanquen.",
  poor: "Dolenta: la imatge no es defineix.",
};

export function initDarkroomStations() {
  const original = new Image();
  original.src = ORIGINAL;
  for (const root of document.querySelectorAll('[data-station="darkroom"]')) {
    const config = DARKROOMS[root.dataset.process];
    if (config) initDarkroom(root, config, original);
  }
}

function initDarkroom(root, config, original) {
  const form = root.querySelector(".js-darkroom-form");
  const paperSelect = form.elements.paper;
  const stepList = root.querySelector(".js-steps");
  const sheet = root.querySelector(".js-sheet");
  const sheetPrint = root.querySelector(".js-sheet-print");
  const printList = root.querySelector(".js-print-list");
  const sheetsUsed = root.querySelector(".js-sheets-used");
  const newPrint = root.querySelector(".js-new-print");

  paperSelect.replaceChildren(
    ...Object.entries(config.papers).map(([id, paper]) => {
      const option = new Option(`${paper.ref} · ${paper.name}`, id);
      option.selected = id === config.defaultPaper;
      return option;
    }),
  );
  const stepButtons = renderSteps(stepList, config.steps);
  const timer = stepList.querySelector(".js-timer");

  let used = 0;
  let current = null;

  const setStep = (active) => {
    const activeIndex = config.steps.indexOf(active);
    config.steps.forEach((step, index) => {
      stepButtons[step].disabled = step !== active;
      stepButtons[step]
        .closest("li")
        .classList.toggle("is-done", activeIndex === -1 || index < activeIndex);
    });
    for (const field of form.elements) field.disabled = active !== "sensitize";
  };

  const next = (step) => config.steps[config.steps.indexOf(step) + 1];

  const finish = async () => {
    setStep(null);
    sheet.dataset.state = "done";
    const result = develop(current, config);
    const printNumber = used;
    const showOnBench = (src, alt) => {
      if (printNumber !== used || sheet.dataset.state !== "done") return;
      sheetPrint.src = src;
      sheetPrint.alt = alt;
      sheetPrint.hidden = false;
    };
    printList.prepend(
      await createPrint(original, current, result, config, showOnBench),
    );
    newPrint.hidden = false;
  };

  const actions = {
    sensitize: () => {
      current = {
        paper: form.elements.paper.value,
        preparation: form.elements.preparation.value,
        hour: Number(form.elements.hour.value),
      };
      used += 1;
      sheetsUsed.textContent = String(used);
      sheet.dataset.state = "sensitized";
    },
    negative: () => {
      sheet.dataset.state = "negative";
    },
    expose: async () => {
      sheet.dataset.state = "exposing";
      await countdown(timer, EXPOSURE_MINUTES, SECONDS_PER_MINUTE);
      sheet.dataset.state = "exposed";
    },
    wash: () => {
      sheet.dataset.state = "washed";
    },
    fix: () => {
      sheet.dataset.state = "fixed";
    },
  };

  stepList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const step = button.dataset.step;
    button.disabled = true;
    await actions[step]();
    const following = next(step);
    if (following) setStep(following);
    else await finish();
  });

  newPrint.addEventListener("click", () => {
    current = null;
    newPrint.hidden = true;
    sheet.dataset.state = "blank";
    sheetPrint.hidden = true;
    sheetPrint.removeAttribute("src");
    timer.textContent = formatTime(EXPOSURE_MINUTES * 60);
    setStep("sensitize");
    stepButtons.sensitize.focus();
  });

  timer.textContent = formatTime(EXPOSURE_MINUTES * 60);
  setStep("sensitize");
}

function renderSteps(list, steps) {
  const buttons = {};
  list.replaceChildren(
    ...steps.map((step) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--small";
      button.dataset.step = step;
      const label = document.createElement("span");
      label.textContent = STEP_LABELS[step];
      button.append(label);
      if (step === "expose") {
        const timer = document.createElement("output");
        timer.className = "timer js-timer";
        button.append(timer);
      }
      item.append(button);
      buttons[step] = button;
      return item;
    }),
  );
  return buttons;
}

function develop({ paper, hour }, config) {
  const exposure = HOURS[hour] * config.papers[paper].speed;
  let verdict = "good";
  if (exposure < GOOD.min) verdict = "under";
  if (exposure > GOOD.max) verdict = "over";
  if (config.papers[paper].poor) verdict = "poor";
  return {
    exposure,
    verdict,
    stains: Boolean(config.papers[paper].stains),
    rescued: false,
  };
}

function printMatrix({ exposure, verdict }, { dark, light }) {
  if (verdict === "poor")
    return duotoneMatrix(mix(dark, light, 0.35), mix(light, dark, 0.15), 0.7);
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

async function createPrint(original, choice, result, config, onPainted) {
  const paper = config.papers[choice.paper];
  const item = document.createElement("li");
  item.className = "print-card";
  item.innerHTML = `
    <figure>
      <img alt="" width="640" height="310">
      <figcaption>
        <strong class="js-verdict"></strong>
        <span>${paper.ref} · ${paper.name}</span>
        <span>${PREPARATIONS[choice.preparation]} · ${choice.hour} h · ${EXPOSURE_MINUTES}′</span>
        <span class="note">A les proves de 2009: ${paper.group2009}.</span>
      </figcaption>
    </figure>
  `;
  const image = item.querySelector("img");
  const verdict = item.querySelector(".js-verdict");

  const paint = async () => {
    const matrix = printMatrix(result, config.process);
    const effects = {
      grain: result.stains ? 70 : 30,
      vignette: result.stains ? 35 : 10,
    };
    const blob = await renderFilteredImage(original, matrix, effects);
    const previous = image.src;
    image.src = URL.createObjectURL(blob);
    if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
    verdict.textContent =
      VERDICTS[result.verdict] +
      (result.stains ? " Amb taques." : "") +
      (result.rescued ? " Vernissada amb goma aràbiga." : "");
    image.alt = `Còpia: ${verdict.textContent}`;
    onPainted(image.src, image.alt);
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
