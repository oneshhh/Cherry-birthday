"use strict";

const BIRTHDAY = new Date("2026-10-17T00:00:00+05:30");
const SHEET_URL = "assets/kawaii-doodles.png";
const MAX_HISTORY = 60;

// Coordinates are measured from the 1024 × 1536 doodle sheet supplied with the page.
// Each region is extracted to its own transparent in-memory image when the page loads.
const STICKER_DEFS = [
  { id: "bow-top", name: "Pink bow", x: 15, y: 75, w: 235, h: 235 },
  { id: "bunny", name: "Bunny", x: 270, y: 30, w: 235, h: 315 },
  { id: "heart-top", name: "Tiny heart", x: 505, y: 80, w: 100, h: 105 },
  { id: "purple-flower", name: "Purple flower", x: 600, y: 60, w: 220, h: 285 },
  { id: "star", name: "Smiling star", x: 810, y: 80, w: 205, h: 220 },
  { id: "bear", name: "Bear", x: 15, y: 350, w: 280, h: 235 },
  { id: "heart-left-one", name: "Pink heart", x: 300, y: 385, w: 100, h: 100 },
  { id: "heart-left-two", name: "Little heart", x: 305, y: 480, w: 105, h: 105 },
  { id: "strawberry", name: "Strawberry", x: 415, y: 340, w: 205, h: 250 },
  { id: "cloud-wide", name: "Happy cloud", x: 615, y: 350, w: 315, h: 230 },
  { id: "sparkle-right", name: "Golden sparkle", x: 915, y: 345, w: 90, h: 115 },
  { id: "tulip", name: "Pink tulip", x: 20, y: 600, w: 210, h: 295 },
  { id: "envelope", name: "Love letter", x: 240, y: 610, w: 250, h: 230 },
  { id: "sparkle-left", name: "Tiny sparkle", x: 205, y: 800, w: 105, h: 115 },
  { id: "bee", name: "Happy bee", x: 495, y: 600, w: 270, h: 260 },
  { id: "heart-middle", name: "Floating heart", x: 725, y: 605, w: 110, h: 110 },
  { id: "lollipop", name: "Lollipop", x: 805, y: 575, w: 215, h: 325 },
  { id: "heart-right-middle", name: "Sweet heart", x: 710, y: 835, w: 125, h: 125 },
  { id: "sun", name: "Smiling sun", x: 15, y: 885, w: 245, h: 285 },
  { id: "cloud-small", name: "Little cloud", x: 280, y: 890, w: 280, h: 230 },
  { id: "paw", name: "Pink paw", x: 550, y: 890, w: 220, h: 240 },
  { id: "pudding", name: "Cherry pudding", x: 780, y: 880, w: 235, h: 260 },
  { id: "heart-bottom-left", name: "Pocket heart", x: 260, y: 1155, w: 105, h: 105 },
  { id: "butterfly", name: "Purple butterfly", x: 15, y: 1190, w: 270, h: 270 },
  { id: "bow-bottom", name: "Ribbon bow", x: 295, y: 1200, w: 245, h: 255 },
  { id: "daisy", name: "White daisy", x: 535, y: 1140, w: 250, h: 345 },
  { id: "heart-bottom-top", name: "Tiny love", x: 755, y: 1130, w: 120, h: 110 },
  { id: "heart-big", name: "Smiling heart", x: 770, y: 1190, w: 245, h: 260 }
];

const elements = {};
const stickerAssets = new Map();
let nextStickerId = 1;
let interaction = null;
let sliderStart = null;

const state = {
  items: [],
  selectedId: null,
  theme: "blush",
  history: [],
  future: []
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  Object.assign(elements, {
    card: document.getElementById("card-canvas"),
    layer: document.getElementById("sticker-layer"),
    palette: document.getElementById("sticker-palette"),
    stickerCount: document.getElementById("sticker-count"),
    wishInput: document.getElementById("wish-input"),
    wishCount: document.getElementById("wish-count"),
    signatureInput: document.getElementById("signature-input"),
    previewWish: document.getElementById("preview-wish"),
    previewSignature: document.getElementById("preview-signature"),
    inspector: document.getElementById("inspector"),
    selectionName: document.getElementById("selection-name"),
    sizeSlider: document.getElementById("size-slider"),
    rotationSlider: document.getElementById("rotation-slider"),
    undoButton: document.getElementById("undo-button"),
    redoButton: document.getElementById("redo-button"),
    duplicateButton: document.getElementById("duplicate-button"),
    deleteButton: document.getElementById("delete-button"),
    clearButton: document.getElementById("clear-button"),
    backwardButton: document.getElementById("backward-button"),
    forwardButton: document.getElementById("forward-button"),
    saveButton: document.getElementById("save-button"),
    status: document.getElementById("status-message")
  });

  renderPalettePlaceholders();
  bindControls();
  updateCardCopy();
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  loadStickerAssets();
  renderStickers();
}

function bindControls() {
  elements.wishInput.addEventListener("input", updateCardCopy);
  elements.signatureInput.addEventListener("input", updateCardCopy);

  document.getElementById("theme-picker").addEventListener("click", (event) => {
    const swatch = event.target.closest("[data-theme]");
    if (!swatch || swatch.dataset.theme === state.theme) return;
    remember(snapshot());
    state.theme = swatch.dataset.theme;
    applyTheme();
  });

  elements.card.addEventListener("pointerdown", (event) => {
    if (event.target === elements.card || event.target === elements.layer || event.target.classList.contains("paper-noise") || event.target.classList.contains("card-copy")) {
      state.selectedId = null;
      renderStickers();
    }
  });

  elements.undoButton.addEventListener("click", undo);
  elements.redoButton.addEventListener("click", redo);
  elements.deleteButton.addEventListener("click", deleteSelected);
  elements.duplicateButton.addEventListener("click", duplicateSelected);
  elements.clearButton.addEventListener("click", clearStickers);
  elements.backwardButton.addEventListener("click", () => moveLayer(-1));
  elements.forwardButton.addEventListener("click", () => moveLayer(1));
  elements.saveButton.addEventListener("click", saveCard);

  [elements.sizeSlider, elements.rotationSlider].forEach((slider) => {
    slider.addEventListener("focus", () => { sliderStart = snapshot(); });
    slider.addEventListener("pointerdown", () => { sliderStart = snapshot(); });
    slider.addEventListener("change", commitSliderChange);
  });
  elements.sizeSlider.addEventListener("input", () => updateSelectedFromSlider("size", Number(elements.sizeSlider.value)));
  elements.rotationSlider.addEventListener("input", () => updateSelectedFromSlider("rotation", Number(elements.rotationSlider.value)));

  window.addEventListener("keydown", handleKeyboard);
  window.addEventListener("pointermove", continuePointerInteraction, { passive: false });
  window.addEventListener("pointerup", endPointerInteraction);
  window.addEventListener("pointercancel", endPointerInteraction);
}

function updateCardCopy() {
  const wish = elements.wishInput.value.trim();
  const name = elements.signatureInput.value.trim();
  elements.previewWish.textContent = wish || "Write something lovely for Cherry…";
  elements.previewSignature.textContent = `— ${name || "Your name"}`;
  elements.wishCount.textContent = `${elements.wishInput.value.length} / 280`;
}

function updateCountdown() {
  const remaining = Math.max(0, BIRTHDAY.getTime() - Date.now());
  const values = {
    days: Math.floor(remaining / 86400000),
    hours: Math.floor((remaining / 3600000) % 24),
    minutes: Math.floor((remaining / 60000) % 60),
    seconds: Math.floor((remaining / 1000) % 60)
  };
  for (const [key, value] of Object.entries(values)) {
    document.getElementById(key).textContent = String(value).padStart(2, "0");
  }
  if (remaining === 0) document.getElementById("countdown-note").textContent = "Cherry is officially 22 ♡";
}

function renderPalettePlaceholders() {
  elements.palette.innerHTML = "";
  for (let i = 0; i < 15; i += 1) {
    const placeholder = document.createElement("span");
    placeholder.className = "palette-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    elements.palette.appendChild(placeholder);
  }
}

async function loadStickerAssets() {
  try {
    const sheet = await loadImage(SHEET_URL);
    for (const definition of STICKER_DEFS) {
      stickerAssets.set(definition.id, extractSticker(sheet, definition));
    }
    renderPalette();
  } catch (error) {
    console.error(error);
    elements.palette.innerHTML = '<p class="field-help">The doodles could not load. Refresh the page to try again.</p>';
    elements.stickerCount.textContent = "Unavailable";
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function extractSticker(sheet, definition) {
  const canvas = document.createElement("canvas");
  canvas.width = definition.w;
  canvas.height = definition.h;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(
    sheet,
    definition.x, definition.y, definition.w, definition.h,
    0, 0, definition.w, definition.h
  );
  removeConnectedWhite(context, definition.w, definition.h);
  return canvas.toDataURL("image/png");
}

// Flood-fill only near-white pixels connected to a crop edge. This removes the sheet
// background without erasing enclosed white artwork inside the bunny, clouds, or daisy.
function removeConnectedWhite(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackground = (index) => {
    const offset = index * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    return pixels[offset + 3] > 0 && Math.min(r, g, b) > 224 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
  };

  const enqueue = (index) => {
    if (visited[index] || !isBackground(index)) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index]) pixels[index * 4 + 3] = 0;
  }
  context.putImageData(imageData, 0, 0);
}

function renderPalette() {
  elements.palette.innerHTML = "";
  for (const definition of STICKER_DEFS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-sticker";
    button.title = `Add ${definition.name}`;
    button.setAttribute("aria-label", `Add ${definition.name} to the card`);
    button.innerHTML = `<img src="${stickerAssets.get(definition.id)}" alt="">`;
    button.addEventListener("click", () => addSticker(definition.id));
    elements.palette.appendChild(button);
  }
  elements.stickerCount.textContent = `${STICKER_DEFS.length} stickers`;
}

function addSticker(definitionId) {
  const definition = getDefinition(definitionId);
  if (!definition || !stickerAssets.has(definitionId)) return;
  remember(snapshot());
  const offset = (state.items.length % 5) * 3;
  const item = {
    id: `sticker-${nextStickerId++}`,
    definitionId,
    x: 44 + offset,
    y: 42 + offset,
    size: definition.w > 260 ? 27 : 22,
    rotation: ((state.items.length % 5) - 2) * 4,
    z: nextZ()
  };
  state.items.push(item);
  state.selectedId = item.id;
  renderStickers();
}

function renderStickers() {
  elements.layer.innerHTML = "";
  const ordered = [...state.items].sort((a, b) => a.z - b.z);
  for (const item of ordered) {
    const definition = getDefinition(item.definitionId);
    if (!definition) continue;
    const wrapper = document.createElement("div");
    wrapper.className = `placed-sticker${item.id === state.selectedId ? " selected" : ""}`;
    wrapper.dataset.id = item.id;
    wrapper.style.left = `${item.x}%`;
    wrapper.style.top = `${item.y}%`;
    wrapper.style.width = `${item.size}%`;
    wrapper.style.zIndex = String(item.z);
    wrapper.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg)`;
    wrapper.setAttribute("role", "button");
    wrapper.setAttribute("tabindex", item.id === state.selectedId ? "0" : "-1");
    wrapper.setAttribute("aria-label", `${definition.name}, placed on card`);
    wrapper.innerHTML = `
      <img src="${stickerAssets.get(item.definitionId)}" alt="">
      <button class="sticker-handle rotate-handle" type="button" aria-label="Rotate ${definition.name}"></button>
      <button class="sticker-handle resize-handle" type="button" aria-label="Resize ${definition.name}"></button>
    `;
    wrapper.addEventListener("pointerdown", startPointerInteraction);
    wrapper.addEventListener("click", (event) => event.stopPropagation());
    elements.layer.appendChild(wrapper);
  }
  updateInspector();
  updateToolbar();
}

function startPointerInteraction(event) {
  event.preventDefault();
  event.stopPropagation();
  const wrapper = event.currentTarget;
  const item = findItem(wrapper.dataset.id);
  if (!item) return;
  const mode = event.target.classList.contains("resize-handle")
    ? "resize"
    : event.target.classList.contains("rotate-handle") ? "rotate" : "drag";

  state.selectedId = item.id;
  const cardRect = elements.card.getBoundingClientRect();
  const centerX = cardRect.left + (item.x / 100) * cardRect.width;
  const centerY = cardRect.top + (item.y / 100) * cardRect.height;
  interaction = {
    id: item.id,
    mode,
    before: snapshot(),
    startX: event.clientX,
    startY: event.clientY,
    centerX,
    centerY,
    startDistance: Math.hypot(event.clientX - centerX, event.clientY - centerY) || 1,
    startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI,
    startItem: { ...item }
  };
  renderStickers();
}

function continuePointerInteraction(event) {
  if (!interaction) return;
  event.preventDefault();
  const item = findItem(interaction.id);
  if (!item) return;
  const rect = elements.card.getBoundingClientRect();

  if (interaction.mode === "drag") {
    item.x = interaction.startItem.x + ((event.clientX - interaction.startX) / rect.width) * 100;
    item.y = interaction.startItem.y + ((event.clientY - interaction.startY) / rect.height) * 100;
    clampItemToCard(item);
  } else if (interaction.mode === "resize") {
    const distance = Math.hypot(event.clientX - interaction.centerX, event.clientY - interaction.centerY);
    item.size = clamp(interaction.startItem.size * distance / interaction.startDistance, 10, 55);
    clampItemToCard(item);
  } else if (interaction.mode === "rotate") {
    const angle = Math.atan2(event.clientY - interaction.centerY, event.clientX - interaction.centerX) * 180 / Math.PI;
    item.rotation = normalizeAngle(interaction.startItem.rotation + angle - interaction.startAngle);
  }
  updateStickerElement(item);
  updateInspector(false);
}

function endPointerInteraction() {
  if (!interaction) return;
  const changed = JSON.stringify(interaction.before.items) !== JSON.stringify(state.items);
  if (changed) remember(interaction.before);
  interaction = null;
  renderStickers();
}

function updateStickerElement(item) {
  const node = elements.layer.querySelector(`[data-id="${item.id}"]`);
  if (!node) return;
  node.style.left = `${item.x}%`;
  node.style.top = `${item.y}%`;
  node.style.width = `${item.size}%`;
  node.style.zIndex = String(item.z);
  node.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg)`;
}

function clampItemToCard(item) {
  const definition = getDefinition(item.definitionId);
  const halfWidth = item.size / 2;
  const verticalSize = item.size * (definition.h / definition.w) * 0.8;
  const halfHeight = verticalSize / 2;
  item.x = clamp(item.x, Math.min(halfWidth, 48), Math.max(100 - halfWidth, 52));
  item.y = clamp(item.y, Math.min(halfHeight, 48), Math.max(100 - halfHeight, 52));
}

function updateInspector(syncValues = true) {
  const item = selectedItem();
  const controls = [elements.sizeSlider, elements.rotationSlider, elements.backwardButton, elements.forwardButton];
  elements.inspector.setAttribute("aria-disabled", item ? "false" : "true");
  controls.forEach((control) => { control.disabled = !item; });
  if (!item) {
    elements.selectionName.textContent = "None selected";
    return;
  }
  elements.selectionName.textContent = getDefinition(item.definitionId).name;
  if (syncValues) {
    elements.sizeSlider.value = String(Math.round(item.size));
    elements.rotationSlider.value = String(Math.round(item.rotation));
  }
}

function updateToolbar() {
  const hasSelection = Boolean(selectedItem());
  elements.undoButton.disabled = state.history.length === 0;
  elements.redoButton.disabled = state.future.length === 0;
  elements.deleteButton.disabled = !hasSelection;
  elements.duplicateButton.disabled = !hasSelection;
  elements.clearButton.disabled = state.items.length === 0;
}

function updateSelectedFromSlider(property, value) {
  const item = selectedItem();
  if (!item) return;
  item[property] = value;
  if (property === "size") clampItemToCard(item);
  updateStickerElement(item);
}

function commitSliderChange() {
  if (!sliderStart) return;
  if (JSON.stringify(sliderStart.items) !== JSON.stringify(state.items)) remember(sliderStart);
  sliderStart = null;
  renderStickers();
}

function deleteSelected() {
  const item = selectedItem();
  if (!item) return;
  remember(snapshot());
  state.items = state.items.filter((candidate) => candidate.id !== item.id);
  state.selectedId = null;
  renderStickers();
}

function duplicateSelected() {
  const item = selectedItem();
  if (!item) return;
  remember(snapshot());
  const copy = {
    ...item,
    id: `sticker-${nextStickerId++}`,
    x: clamp(item.x + 5, 6, 94),
    y: clamp(item.y + 5, 6, 94),
    z: nextZ()
  };
  state.items.push(copy);
  state.selectedId = copy.id;
  clampItemToCard(copy);
  renderStickers();
}

function clearStickers() {
  if (state.items.length === 0) return;
  remember(snapshot());
  state.items = [];
  state.selectedId = null;
  renderStickers();
}

function moveLayer(direction) {
  const item = selectedItem();
  if (!item) return;
  const ordered = [...state.items].sort((a, b) => a.z - b.z);
  const index = ordered.findIndex((candidate) => candidate.id === item.id);
  const targetIndex = clamp(index + direction, 0, ordered.length - 1);
  if (index === targetIndex) return;
  remember(snapshot());
  const other = ordered[targetIndex];
  [item.z, other.z] = [other.z, item.z];
  renderStickers();
}

function handleKeyboard(event) {
  const tagName = document.activeElement?.tagName;
  const editingText = tagName === "INPUT" || tagName === "TEXTAREA";
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
    return;
  }
  if (editingText) return;
  const item = selectedItem();
  if (!item) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelected();
    return;
  }
  const movement = event.shiftKey ? 2 : .6;
  const deltas = {
    ArrowLeft: [-movement, 0], ArrowRight: [movement, 0],
    ArrowUp: [0, -movement], ArrowDown: [0, movement]
  };
  if (!deltas[event.key]) return;
  event.preventDefault();
  remember(snapshot());
  item.x += deltas[event.key][0];
  item.y += deltas[event.key][1];
  clampItemToCard(item);
  renderStickers();
}

function snapshot() {
  return { items: state.items.map((item) => ({ ...item })), theme: state.theme, selectedId: state.selectedId };
}

function restore(saved) {
  state.items = saved.items.map((item) => ({ ...item }));
  state.theme = saved.theme;
  state.selectedId = saved.selectedId && state.items.some((item) => item.id === saved.selectedId) ? saved.selectedId : null;
  applyTheme();
  renderStickers();
}

function remember(saved) {
  state.history.push(saved);
  if (state.history.length > MAX_HISTORY) state.history.shift();
  state.future = [];
  updateToolbar();
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  state.future.push(snapshot());
  restore(previous);
}

function redo() {
  const next = state.future.pop();
  if (!next) return;
  state.history.push(snapshot());
  restore(next);
}

function applyTheme() {
  for (const className of [...elements.card.classList]) {
    if (className.startsWith("theme-")) elements.card.classList.remove(className);
  }
  elements.card.classList.add(`theme-${state.theme}`);
  document.querySelectorAll("[data-theme]").forEach((swatch) => {
    const active = swatch.dataset.theme === state.theme;
    swatch.classList.toggle("active", active);
    swatch.setAttribute("aria-pressed", String(active));
  });
}

async function saveCard() {
  const wish = elements.wishInput.value.trim();
  const name = elements.signatureInput.value.trim();
  if (!wish) return showStatus("Please write a birthday wish first ♡", "error");
  if (!name) return showStatus("Please add your name so Cherry knows who made the card ♡", "error");
  if (typeof window.html2canvas !== "function") return showStatus("The image maker is still loading. Please try again in a moment.", "error");

  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "Wrapping your wish…";
  showStatus("Turning your card into a keepsake…", "loading");
  state.selectedId = null;
  renderStickers();
  elements.card.classList.add("exporting");

  try {
    await document.fonts.ready;
    const canvas = await window.html2canvas(elements.card, {
      backgroundColor: null,
      scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
      useCORS: true,
      logging: false
    });
    const dataUrl = canvas.toDataURL("image/png", 1);
    const fileName = `${safeFileName(name)}-for-cherry-${Date.now()}.png`;
    const endpoint = String(window.CHERRY_DRIVE_ENDPOINT || "").trim();

    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName,
            mimeType: "image/png",
            imageBase64: dataUrl.split(",")[1],
            senderName: name,
            wish,
            createdAt: new Date().toISOString()
          })
        });
        const result = await response.json().catch(() => ({ ok: response.ok }));
        if (!response.ok || result.ok === false) throw new Error(result.error || `Upload failed with ${response.status}`);
        showStatus("Your card is safely tucked into Cherry's birthday collection! ♡", "success");
      } catch (uploadError) {
        console.error(uploadError);
        downloadDataUrl(dataUrl, fileName);
        showStatus("The private upload did not finish, so a backup copy was downloaded. Please send it to the organizer ♡", "error");
      }
    } else {
      downloadDataUrl(dataUrl, fileName);
      showStatus("Your card is ready and has been downloaded ♡", "success");
    }
  } catch (error) {
    console.error(error);
    showStatus("The card could not be saved yet. Please try once more.", "error");
  } finally {
    elements.card.classList.remove("exporting");
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = "Save my wish for Cherry ♡";
  }
}

function showStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = `status-message show ${type}`;
}

function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function selectedItem() { return state.items.find((item) => item.id === state.selectedId) || null; }
function findItem(id) { return state.items.find((item) => item.id === id) || null; }
function getDefinition(id) { return STICKER_DEFS.find((definition) => definition.id === id) || null; }
function nextZ() { return state.items.reduce((maximum, item) => Math.max(maximum, item.z), 0) + 1; }
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function normalizeAngle(value) { return ((value + 180) % 360 + 360) % 360 - 180; }
function safeFileName(value) {
  const safe = value.normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return safe || "birthday-wish";
}
