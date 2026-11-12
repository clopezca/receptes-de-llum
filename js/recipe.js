export const DEFAULT_RECIPE = {
  name: "",
  shadows: "#094a72",
  paper: "#f4f6f2",
  contrast: 1,
  grain: 0,
  vignette: 0,
};

export const LIMITS = {
  contrast: { min: 0.5, max: 2 },
  grain: { min: 0, max: 100 },
  vignette: { min: 0, max: 100 },
  name: { maxLength: 40 },
};

const KEYS = {
  name: "nom",
  shadows: "ombres",
  paper: "paper",
  contrast: "contrast",
  grain: "gra",
  vignette: "vinyeta",
};

const HEX = /^[0-9a-f]{6}$/i;

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

/**
 * Reads a recipe from URL search params. Missing or invalid values fall back
 * to the default, so a hand-edited link never breaks the page.
 * @param {URLSearchParams} params
 * @returns {{ recipe: typeof DEFAULT_RECIPE, found: boolean }}
 */
export function recipeFromParams(params) {
  const recipe = { ...DEFAULT_RECIPE };
  let found = false;

  const name = params.get(KEYS.name);
  if (name !== null) {
    recipe.name = name.trim().slice(0, LIMITS.name.maxLength);
    found = true;
  }

  for (const key of ["shadows", "paper"]) {
    const value = params.get(KEYS[key]);
    if (value && HEX.test(value)) {
      recipe[key] = `#${value.toLowerCase()}`;
      found = true;
    }
  }

  for (const key of ["contrast", "grain", "vignette"]) {
    const value = Number.parseFloat(params.get(KEYS[key]));
    if (Number.isFinite(value)) {
      recipe[key] = clamp(value, LIMITS[key]);
      found = true;
    }
  }

  return { recipe, found };
}

/**
 * Writes a recipe as URL search params.
 * @param {typeof DEFAULT_RECIPE} recipe
 * @returns {URLSearchParams}
 */
export function recipeToParams(recipe) {
  const params = new URLSearchParams();
  if (recipe.name) params.set(KEYS.name, recipe.name);
  params.set(KEYS.shadows, recipe.shadows.replace("#", ""));
  params.set(KEYS.paper, recipe.paper.replace("#", ""));
  params.set(KEYS.contrast, String(Number(recipe.contrast.toFixed(2))));
  params.set(KEYS.grain, String(Math.round(recipe.grain)));
  params.set(KEYS.vignette, String(Math.round(recipe.vignette)));
  return params;
}
