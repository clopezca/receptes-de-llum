import { PROCESSES, duotoneMatrix, matrixToValues } from "./filters.js";
import { renderMatrix } from "./matrix-table.js";

export function initFilterStation() {
  const root = document.querySelector('[data-station="filter"]');
  if (!root) return;

  const colorMatrix = document.querySelector(".js-color-matrix");
  const print = root.querySelector(".js-print");
  const printName = root.querySelector(".js-print-name");
  const filterName = root.querySelector(".js-filter-name");
  const cultureList = root.querySelector(".js-culture");
  const matrixTable = root.querySelector(".js-matrix");
  const flip = root.querySelector(".js-flip");
  const flipToggle = root.querySelector(".js-flip-toggle");
  const layerSwitch = root.querySelector(".js-layer-switch");
  const layers = {
    culture: root.querySelector(".js-layer-culture"),
    code: root.querySelector(".js-layer-code"),
  };

  const setProcess = (id) => {
    const process = PROCESSES[id];
    const matrix = duotoneMatrix(process.dark, process.light);

    colorMatrix.setAttribute("values", matrixToValues(matrix));
    print.src = process.print;
    print.alt = process.printAlt;
    printName.textContent = process.name;
    filterName.textContent = process.name;
    cultureList.replaceChildren(
      ...process.culture.map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
      }),
    );
    renderMatrix(matrixTable, matrix);
  };

  const setOpen = (open) => {
    flip.classList.toggle("is-open", open);
    flipToggle.setAttribute("aria-pressed", String(open));
    flipToggle.textContent = open ? "Tanca el filtre" : "Obre el filtre";
    layerSwitch.hidden = !open;
  };

  const setLayer = (name) => {
    for (const [key, element] of Object.entries(layers)) {
      element.hidden = key !== name;
    }
    for (const button of layerSwitch.querySelectorAll("[data-layer]")) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.layer === name),
      );
    }
  };

  root.addEventListener("change", (event) => {
    if (event.target.name === "process") setProcess(event.target.value);
  });

  flipToggle.addEventListener("click", () => {
    setOpen(flipToggle.getAttribute("aria-pressed") !== "true");
  });

  layerSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layer]");
    if (button) setLayer(button.dataset.layer);
  });

  setProcess(root.querySelector('input[name="process"]:checked').value);
}
