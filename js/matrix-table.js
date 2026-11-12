const COLUMN_LABELS = ["R", "G", "B", "A", "+"];
const ROW_LABELS = ["R'", "G'", "B'", "A'"];

const formatNumber = new Intl.NumberFormat("ca", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/**
 * Writes the matrix into the table, keeping its caption.
 * @param {HTMLTableElement} table
 * @param {number[][]} matrix
 */
export function renderMatrix(table, matrix) {
  const caption = table.querySelector("caption");
  const head = document.createElement("thead");
  const headRow = head.insertRow();
  headRow.append(document.createElement("td"));
  for (const label of COLUMN_LABELS) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.append(th);
  }

  const body = document.createElement("tbody");
  matrix.forEach((values, i) => {
    const row = body.insertRow();
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = ROW_LABELS[i];
    row.append(th);
    for (const value of values) {
      row.insertCell().textContent = formatNumber.format(value);
    }
  });

  table.replaceChildren(...(caption ? [caption] : []), head, body);
}
