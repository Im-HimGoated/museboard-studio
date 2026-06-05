const tabs = document.querySelectorAll(".tab");
const input = document.querySelector("#idea-input");
const form = document.querySelector("#capture-form");
const groupInput = document.querySelector("#group-input");
const sourceInput = document.querySelector("#source-input");
const priorityInput = document.querySelector("#priority-input");
const boardColumns = [...document.querySelectorAll(".board-column")];
const taskPanel = document.querySelector(".task-panel");
const projectList = document.querySelector(".project-list");
const projectEyebrow = document.querySelector("#project-eyebrow");
const newProjectButton = document.querySelector("#new-project");
const searchToggle = document.querySelector("#search-toggle");
const filterToggle = document.querySelector("#filter-toggle");
const toolbarPanel = document.querySelector("#toolbar-panel");
const searchField = document.querySelector("#search-field");
const filterField = document.querySelector("#filter-field");
const searchInput = document.querySelector("#search-input");
const filterInput = document.querySelector("#filter-input");
const shareButton = document.querySelector("#share-board");

const visualOnlyTypes = new Set(["image", "sketch"]);
const projects = {
  "rebrand-sprint": { name: "Rebrand Sprint", items: [], tasks: [] },
  "launch-concepts": { name: "Launch Concepts", items: [], tasks: [] },
  "client-workshop": { name: "Client Workshop", items: [], tasks: [] },
  "motion-explorations": { name: "Motion Explorations", items: [], tasks: [] }
};

let currentProjectId = "rebrand-sprint";
let activeType = "text";
let draggedCard = null;

const placeholders = {
  text: "Drop a thought, call note, client quote, or rough next step...",
  image: "Describe the screenshot or image reference. It will be placed in Visual References.",
  link: "Paste a reference URL, Google file, or source link and add why it matters...",
  sketch: "Describe the sketch. It will be placed in Visual References."
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    activeType = tab.dataset.type;
    input.placeholder = placeholders[activeType];
    syncCaptureRules();
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

  const project = projects[currentProjectId];
  const group = visualOnlyTypes.has(activeType) ? "Visual references" : groupInput.value;
  const item = {
    id: crypto.randomUUID(),
    type: activeType,
    text: value,
    group,
    source: sourceInput.value,
    priority: priorityInput.value
  };

  if (group === "Tasks") {
    project.tasks.push(item);
  } else {
    project.items.push(item);
  }

  input.value = "";
  renderProject();
});

newProjectButton.addEventListener("click", () => {
  const name = window.prompt("Name this Northline Studio project", "Untitled project") || "Untitled project";
  const id = slugify(name);
  projects[id] = { name, items: [], tasks: [] };
  currentProjectId = id;
  addProjectButton(id, name);
  renderProject();
});

projectList.addEventListener("click", (event) => {
  const button = event.target.closest(".project");
  if (!button) return;
  currentProjectId = button.dataset.project;
  renderProject();
});

searchToggle.addEventListener("click", () => {
  toggleToolbar(searchToggle, searchField);
  searchInput.focus();
});

filterToggle.addEventListener("click", () => {
  toggleToolbar(filterToggle, filterField);
  filterInput.focus();
});

searchInput.addEventListener("input", applySearchAndFilter);
filterInput.addEventListener("change", applySearchAndFilter);

shareButton.addEventListener("click", async () => {
  const project = projects[currentProjectId];
  const shareText = `${project.name}: ${project.items.length} captured item${project.items.length === 1 ? "" : "s"}, ${project.tasks.length} task${project.tasks.length === 1 ? "" : "s"}`;

  try {
    await navigator.clipboard.writeText(shareText);
    confirmShare("Copied summary");
  } catch {
    window.prompt("Board summary", shareText);
    confirmShare("Ready to share");
  }
});

function toggleToolbar(toggle, field) {
  const isOpen = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isOpen));
  field.hidden = isOpen;
  toolbarPanel.hidden = searchField.hidden && filterField.hidden;
}

function confirmShare(label) {
  const original = shareButton.textContent;
  shareButton.textContent = label;
  shareButton.classList.add("is-confirmed");
  window.setTimeout(() => {
    shareButton.textContent = original;
    shareButton.classList.remove("is-confirmed");
  }, 1600);
}

function syncCaptureRules() {
  if (visualOnlyTypes.has(activeType)) {
    groupInput.value = "Visual references";
    groupInput.disabled = true;
    sourceInput.value = activeType === "image" ? "Screenshot" : "Post-it note";
    return;
  }

  groupInput.disabled = false;
}

function renderProject() {
  const project = projects[currentProjectId];
  projectEyebrow.textContent = project.name;

  document.querySelectorAll(".project").forEach((button) => {
    button.classList.toggle("active", button.dataset.project === currentProjectId);
  });

  boardColumns.forEach((column) => {
    column.querySelectorAll(".idea-card, .empty-state").forEach((item) => item.remove());
  });
  taskPanel.querySelectorAll(".task-item, .empty-state").forEach((item) => item.remove());

  project.items.forEach((item) => {
    const column = findColumn(item.group);
    column.append(createCard(item));
  });

  project.tasks.forEach((task) => taskPanel.append(createTask(task)));
  updateColumnCounts();
  updateProjectCounts();
  applySearchAndFilter();
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = `idea-card ${item.type}-card`;
  card.draggable = true;
  card.dataset.id = item.id;
  card.dataset.type = item.type;
  card.dataset.search = `${item.text} ${item.source} ${item.priority} ${item.group}`.toLowerCase();

  if (item.type === "image") {
    const preview = document.createElement("div");
    preview.className = "image-preview gradient-a";
    card.append(preview);
  }

  if (item.type === "sketch") {
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 180;
    canvas.setAttribute("aria-label", "Sketch pad");
    card.append(canvas);
    attachSketchPad(canvas);
  }

  const kicker = document.createElement("div");
  kicker.className = "card-kicker";
  kicker.innerHTML = `<span>${escapeHtml(item.source)}</span><button type="button" aria-label="Connect idea">↔</button>`;

  const title = document.createElement("h3");
  title.textContent = item.text;

  const footer = document.createElement("footer");
  footer.innerHTML = `<span class="tag">${escapeHtml(item.group)}</span><span>${escapeHtml(item.priority)}</span>`;

  card.append(kicker, title, footer);
  attachDrag(card);
  return card;
}

function createTask(task) {
  const label = document.createElement("label");
  label.className = "task-item";
  label.dataset.type = "task";
  label.dataset.search = `${task.text} ${task.source} ${task.priority}`.toLowerCase();
  label.innerHTML = `<input type="checkbox" /><span>${escapeHtml(task.text)}</span>`;
  return label;
}

function updateColumnCounts() {
  boardColumns.forEach((column) => {
    const count = column.querySelectorAll(".idea-card").length;
    const countLabel = column.querySelector(".column-header span");
    countLabel.textContent = `${count} ${count === 1 ? "idea" : "ideas"}`;

    if (count === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = emptyMessage(column.dataset.group);
      column.append(empty);
    }
  });

  const taskCount = taskPanel.querySelectorAll(".task-item").length;
  taskPanel.querySelector(".column-header span").textContent = `${taskCount} ${taskCount === 1 ? "task" : "tasks"}`;
  if (taskCount === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Tasks captured from notes will appear here.";
    taskPanel.append(empty);
  }
}

function updateProjectCounts() {
  document.querySelectorAll(".project").forEach((button) => {
    const project = projects[button.dataset.project];
    button.querySelector("strong").textContent = project.items.length + project.tasks.length;
  });
}

function applySearchAndFilter() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = filterInput.value;
  const searchableItems = document.querySelectorAll(".idea-card, .task-item");

  searchableItems.forEach((item) => {
    const matchesQuery = !query || item.dataset.search.includes(query);
    const matchesFilter = filter === "all" || item.dataset.type === filter;
    item.classList.toggle("is-hidden", !matchesQuery || !matchesFilter);
  });
}

function findColumn(group) {
  return boardColumns.find((column) => column.dataset.group === group) || boardColumns[0];
}

function attachDrag(card) {
  card.addEventListener("dragstart", () => {
    draggedCard = card;
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    draggedCard = null;
    document.querySelectorAll(".drop-target, .drop-blocked").forEach((target) => {
      target.classList.remove("drop-target", "drop-blocked");
    });
    persistCardGroups();
    updateColumnCounts();
    updateProjectCounts();
  });
}

boardColumns.forEach((column) => {
  column.addEventListener("dragover", (event) => {
    if (!draggedCard) return;
    event.preventDefault();
    const canDrop = canDropInColumn(draggedCard, column);
    column.classList.toggle("drop-target", canDrop);
    column.classList.toggle("drop-blocked", !canDrop);
  });

  column.addEventListener("dragleave", () => {
    column.classList.remove("drop-target", "drop-blocked");
  });

  column.addEventListener("drop", () => {
    if (draggedCard && canDropInColumn(draggedCard, column) && !column.contains(draggedCard)) {
      column.querySelector(".empty-state")?.remove();
      column.append(draggedCard);
    }
    column.classList.remove("drop-target", "drop-blocked");
  });
});

function canDropInColumn(card, column) {
  return !visualOnlyTypes.has(card.dataset.type) || column.dataset.group === "Visual references";
}

function persistCardGroups() {
  const project = projects[currentProjectId];
  boardColumns.forEach((column) => {
    column.querySelectorAll(".idea-card").forEach((card) => {
      const item = project.items.find((entry) => entry.id === card.dataset.id);
      if (item) {
        item.group = column.dataset.group;
        card.dataset.search = `${item.text} ${item.source} ${item.priority} ${item.group}`.toLowerCase();
        const tag = card.querySelector(".tag");
        if (tag) tag.textContent = item.group;
      }
    });
  });
}

function attachSketchPad(canvas) {
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

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  window.addEventListener("mouseup", () => {
    isDrawing = false;
  });
  canvas.addEventListener("touchstart", startDrawing, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  window.addEventListener("touchend", () => {
    isDrawing = false;
  });
}

function addProjectButton(id, name) {
  const button = document.createElement("button");
  button.className = "project";
  button.type = "button";
  button.dataset.project = id;
  button.innerHTML = `<span class="project-dot plum"></span>${escapeHtml(name)}<strong>0</strong>`;
  projectList.append(button);
}

function emptyMessage(group) {
  const messages = {
    Positioning: "Capture call notes, client quotes, email snippets, and strategy thoughts here.",
    "Visual references": "Images and sketches are kept here so art direction stays easy to scan.",
    "Client feedback": "Place client comments, Google file links, and review notes here."
  };
  return messages[group] || "Captured items will appear here.";
}

function slugify(value) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled-project";
  let id = base;
  let index = 2;

  while (projects[id]) {
    id = `${base}-${index}`;
    index += 1;
  }

  return id;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

syncCaptureRules();
renderProject();
