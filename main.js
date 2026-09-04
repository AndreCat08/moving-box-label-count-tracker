import { addBox, deleteBox, summarize, ROOMS } from "./logic.js";
import { readBoxes, saveBoxes } from "./storage.js";

let boxes = [];
let error = null;
let confirmId = null;
let confirmForId = null;
let els = null;

const $ = (sel) => document.querySelector(sel);

/**
 * @typedef {Object} ActionResult
 * @property {"ok"|"validation"|"storage"|"idle"} kind
 * @property {BoxEntry[]} state
 * @property {string|null} error
 * @property {BoxEntry|null} box
 */

/**
 * Add + persist. Never leaves memory ahead of disk: rollback on save failure.
 * @returns {ActionResult}
 */
export function addAndSave(state, label, room, save = saveBoxes) {
  const added = addBox(state, label, room);
  if (!added.ok) return { kind: "validation", state, error: added.error, box: null };
  const write = save(added.state);
  return write.ok
    ? { kind: "ok", state: added.state, error: null, box: added.box }
    : { kind: "storage", state, error: write.error, box: null };
}

function deleteAndSave(state, id, save = saveBoxes) {
  const next = deleteBox(state, id);
  const write = save(next);
  return write.ok
    ? { kind: "ok", state: next, error: null }
    : { kind: "storage", state, error: write.error };
}

/**
 * Inline-confirm gate: only action "accept" with a pending id deletes.
 * @returns {ActionResult}
 */
export function deleteIfConfirmed(state, confirm, action, save = saveBoxes) {
  if (action !== "accept" || confirm == null) return { kind: "idle", state, error: null };
  return deleteAndSave(state, confirm, save);
}

export function summaryModel(state) {
  const counts = summarize(state);
  return {
    total: state.length,
    empty: state.length === 0,
    rows: ROOMS.filter((room) => counts[room] > 0).map((room) => ({ room, count: counts[room] })),
  };
}

function initApp() {
  els = {
    form: $("form#box-form"),
    label: $("input#box-label"),
    room: $("select#box-room"),
    formError: $("p#form-error"),
    summaryList: $("ul#summary-list"),
    boxList: $("ul#box-list"),
    empty: $("div#box-empty"),
    emptyCta: $("button#empty-cta"),
    banner: $("section#error-banner"),
    bannerMessage: $("p#error-message"),
    retry: $("button#retry-error"),
    boxesTitle: $("h2#boxes-title"),
  };

  const saved = readBoxes();
  error = saved.error;
  boxes = saved.state;

  els.form.addEventListener("submit", onSubmit);
  els.label.addEventListener("input", onLabelInput);
  els.room.addEventListener("change", hideFormError);
  els.emptyCta.addEventListener("click", focusLabelInput);
  els.retry.addEventListener("click", onRetry);
  document.addEventListener("keydown", onKeydown);

  render();
}

function onSubmit(event) {
  event.preventDefault();
  const res = addAndSave(boxes, els.label.value, els.room.value);
  if (res.kind === "validation") return showFormError(res.error);
  if (res.kind === "storage") return surfaceError(res.error);

  boxes = res.state;
  confirmId = null;
  confirmForId = null;
  hideFormError();
  render();
  els.label.value = "";
  focusLabelInput();
}

function onLabelInput() {
  hideFormError();
}

function showFormError(message) {
  els.formError.textContent = message;
  els.formError.hidden = false;
  els.label.focus();
}

function hideFormError() {
  els.formError.hidden = true;
  els.formError.textContent = "";
}

function surfaceError(message) {
  error = message;
  render();
}

function onRetry() {
  const saved = readBoxes();
  if (!saved.error) boxes = saved.state;
  error = saved.error;
  render();
  if (!error) focusLabelInput();
}

function onRequestDelete(id) {
  confirmId = id;
  confirmForId = id;
  render();
  focusConfirmButton(id);
}

function onConfirmYes(id) {
  const res = deleteIfConfirmed(boxes, confirmId, "accept");
  commitDelete(res);
}

function onKeepDelete() {
  const id = confirmForId;
  confirmId = null;
  confirmForId = null;
  render();
  if (id != null) focusRemoveButton(id);
}

function commitDelete(res) {
  confirmId = null;
  confirmForId = null;
  if (res.kind === "storage") {
    boxes = res.state;
    surfaceError(res.error);
    return;
  }
  boxes = res.state;
  error = null;
  hideFormError();
  render();
  if (boxes.length === 0) els.emptyCta.focus();
  else focusFirstRemoveButton();
}

function onKeydown(event) {
  if (event.key === "Escape" && confirmId != null) onKeepDelete();
}

function focusLabelInput() {
  els.label.focus();
}

function focusRemoveButton(id) {
  const btn = els.boxList.querySelector(`[data-id="${CSS.escape(id)}"] .remove-btn`);
  btn?.focus();
}

function focusFirstRemoveButton() {
  const btn = els.boxList.querySelector(".box-card .remove-btn");
  btn?.focus();
}

function focusConfirmButton(id) {
  const btn = els.boxList.querySelector(`[data-id="${CSS.escape(id)}"] .confirm-yes`);
  btn?.focus();
}

function render() {
  renderBanner();
  renderSummary(summaryModel(boxes));
  renderList();
  els.empty.hidden = boxes.length > 0;
}

function renderBanner() {
  if (error) {
    els.bannerMessage.textContent = error;
    els.banner.hidden = false;
  } else {
    els.banner.hidden = true;
    els.bannerMessage.textContent = "";
  }
}

function renderSummary(model) {
  els.summaryList.textContent = "";
  for (const row of model.rows) {
    const li = document.createElement("li");
    li.className = "summary-chip";
    const name = document.createElement("span");
    name.className = "room-name";
    name.textContent = row.room;
    const count = document.createElement("strong");
    count.textContent = String(row.count);
    count.setAttribute("aria-label", `${row.count} ${row.count === 1 ? "box" : "boxes"}`);
    li.append(name, count);
    els.summaryList.append(li);
  }
  if (!model.empty) {
    const li = document.createElement("li");
    li.className = "summary-chip summary-total";
    const name = document.createElement("span");
    name.textContent = "Total";
    const count = document.createElement("strong");
    count.textContent = String(model.total);
    count.setAttribute("aria-label", `${model.total} ${model.total === 1 ? "box" : "boxes"}`);
    li.append(name, count);
    els.summaryList.append(li);
  }
}

function renderList() {
  els.boxList.textContent = "";
  for (const box of boxes) {
    const card = buildCard(box);
    els.boxList.append(card);
    card.addEventListener("animationend", () => card.classList.remove("box-in"), { once: true });
  }
}

function buildCard(box) {
  const li = document.createElement("li");
  li.className = "box-card box-in";
  li.dataset.id = box.id;

  const header = document.createElement("header");
  header.className = "card-head";

  const no = document.createElement("strong");
  no.className = "box-no";
  no.textContent = `Box #${box.boxNumber}`;

  const chip = document.createElement("span");
  chip.className = "room-chip";
  chip.dataset.room = box.room;
  chip.textContent = box.room;

  header.append(no, chip);

  const label = document.createElement("p");
  label.className = "box-label";
  label.textContent = box.label;

  const actions = document.createElement("div");
  actions.className = "box-actions";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-btn";
  removeBtn.textContent = "Remove";
  removeBtn.setAttribute("aria-label", `Remove ${box.label}`);
  removeBtn.addEventListener("click", () => onRequestDelete(box.id));

  actions.append(removeBtn);
  li.append(header, label, actions);

  if (confirmId === box.id) {
    const note = document.createElement("p");
    note.className = "confirm-note";
    note.textContent = `Remove ${box.label}? This can't be undone.`;

    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "confirm-yes";
    yes.textContent = "Yes, remove";
    yes.setAttribute("aria-label", `Yes, remove ${box.label}`);
    yes.addEventListener("click", () => onConfirmYes(box.id));

    const keep = document.createElement("button");
    keep.type = "button";
    keep.className = "confirm-keep";
    keep.textContent = "Keep";
    keep.addEventListener("click", onKeepDelete);

    actions.textContent = "";
    actions.append(note, yes, keep);
  }

  return li;
}

if (typeof document !== "undefined") initApp();
