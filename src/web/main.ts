import Scene from "../core/scene";

const canvas = document.querySelector<HTMLCanvasElement>("#world");
if (!canvas) throw new Error("The world canvas is missing.");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D is unavailable.");

const columns = Scene.columns();
const rows = Scene.rows();
const cellWidth = 20;
const cellHeight = 24;
const width = columns * cellWidth;
const height = rows * cellHeight;

function draw(): void {
  if (!canvas || !context) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = "#111714";
  context.fillRect(0, 0, width, height);
  context.font = '15px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const cell = Scene.cell(column, row);
      context.fillStyle = cell.$ === "Wall" ? "#9caa87" : "#35483c";
      context.fillText(Scene.glyph(cell), column * cellWidth + cellWidth / 2, row * cellHeight + cellHeight / 2);
    }
  }

  canvas.dataset.ready = "true";
}

draw();
window.addEventListener("resize", draw);
