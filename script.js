const tabs = document.querySelectorAll(".tab");
const input = document.querySelector("#idea-input");
const form = document.querySelector("#capture-form");
const groupInput = document.querySelector("#group-input");
const priorityInput = document.querySelector("#priority-input");
const boardColumns = document.querySelectorAll(".board-column");

const placeholders = {
  text: "Drop a thought, call note, client quote, or rough next step...",
  image: "Paste an image note or describe the screenshot/reference you are uploading...",
  link: "Paste a reference URL and add why it matters for this project...",
  sketch: "Describe the sketch, then draw directly in the sketch card below..."
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    input.placeholder = placeholders[tab.dataset.type];
    input.focus();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();

  if (!value) {
    input.focus();
    return;
  }

  const column = [...boardColumns].find((item) => {
    const title = item.querySelector("h2").textContent.trim();
    return title === groupInput.value;
  }) || boardColumns[0];

  const card = document.createElement("article");
  card.className = "idea-card text-card";
  card.draggable = true;
  card.innerHTML = `
    <div class="card-kicker">
      <span>${priorityInput.value} priority</span>
      <button type="button" aria-label="Connect idea">↔</button>
    </div>
    <h3>${escapeHtml(value)}</h3>
    <p>Captured just now. Drag this card into a cluster, connect it to another idea, or turn it into a task.</p>
    <footer>
      <span class="tag">${groupInput.value}</span>
      <span>New</span>
    </footer>
  `;

  column.append(card);
  attachDrag(card);
  input.value = "";
  updateColumnCounts();
});

function updateColumnCounts() {
  boardColumns.forEach((column) => {
    const count = column.querySelectorAll(".idea-card").length;
    const countLabel = column.querySelector(".column-header span");
    countLabel.textContent = `${count} ${count === 1 ? "idea" : "ideas"}`;
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

let draggedCard = null;

function attachDrag(card) {
  card.addEventListener("dragstart", () => {
    draggedCard = card;
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    draggedCard = null;
    document.querySelectorAll(".drop-target").forEach((target) => {
      target.classList.remove("drop-target");
    });
    updateColumnCounts();
  });
}

document.querySelectorAll(".idea-card").forEach(attachDrag);

boardColumns.forEach((column) => {
  column.addEventListener("dragover", (event) => {
    event.preventDefault();
    column.classList.add("drop-target");
  });

  column.addEventListener("dragleave", () => {
    column.classList.remove("drop-target");
  });

  column.addEventListener("drop", () => {
    if (draggedCard && !column.contains(draggedCard)) {
      column.append(draggedCard);
    }
    column.classList.remove("drop-target");
  });
});

const canvas = document.querySelector("#sketch-pad");
const clearSketch = document.querySelector("#clear-sketch");
const ctx = canvas.getContext("2d");
let isDrawing = false;

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  return {
    x: ((source.clientX - rect.left) / rect.width) * canvas.width,
    y: ((source.clientY - rect.top) / rect.height) * canvas.height
  };
}

function startDrawing(event) {
  event.preventDefault();
  isDrawing = true;
  const point = getPoint(event);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
}

function draw(event) {
  if (!isDrawing) return;
  event.preventDefault();
  const point = getPoint(event);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#17211f";
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
window.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
window.addEventListener("touchend", stopDrawing);

clearSketch.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

updateColumnCounts();
