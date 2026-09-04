import { addBox, deleteBox, summarize, ROOMS } from "./logic.js";
import { readBoxes, saveBoxes } from "./storage.js";

let boxes = [], error = null, confirmId = null, els = null;

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
  return write.ok ? { kind: "ok", state: next, error: null } : { kind: "storage", state, error: write.error };
}

export function deleteIfConfirmed(state, confirm, action, save = saveBoxes) {
  if (action !== "accept" || confirm == null) return { kind: "idle", state, error: null };
  return deleteAndSave(state, confirm, save);
}

export function summaryModel(state) {
  const counts = summarize(state);
  return { total: state.length, empty: state.length === 0, rows: ROOMS.filter(r => counts[r] > 0).map(r => ({ room: r, count: counts[r] })) };
}

function initApp() {
  els = { form: g("form#box-form"), label: g("input#box-label"), room: g("select#box-room"), formError: g("p#form-error"), summaryList: g("ul#summary-list"), boxList: g("ul#box-list"), empty: g("div#box-empty"), emptyCta: g("button#empty-cta"), banner: g("section#error-banner"), bannerMessage: g("p#error-message"), retry: g("button#retry-error") };
  const saved = readBoxes(); error = saved.error; boxes = saved.state;
  els.form.addEventListener("submit", onSubmit);
  els.label.addEventListener("input", () => { els.formError.hidden = true; els.formError.textContent = ""; });
  els.room.addEventListener("change", () => { els.formError.hidden = true; els.formError.textContent = ""; });
  els.emptyCta.addEventListener("click", () => els.label.focus());
  els.retry.addEventListener("click", onRetry);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && confirmId != null) onKeepDelete(); });
  render();
}

function g(s) { return document.querySelector(s); }

function onSubmit(e) {
  e.preventDefault();
  const res = addAndSave(boxes, els.label.value, els.room.value);
  if (res.kind === "validation") { els.formError.textContent = res.error; els.formError.hidden = false; els.label.focus(); return; }
  if (res.kind === "storage") { error = res.error; render(); return; }
  boxes = res.state; confirmId = null; els.formError.hidden = true; els.formError.textContent = "";
  render(); els.label.value = ""; els.label.focus();
}

function onRetry() {
  const saved = readBoxes();
  if (!saved.error) boxes = saved.state;
  error = saved.error; render();
  if (!error) els.label.focus();
}

function onRequestDelete(id) { confirmId = id; render(); focusC(id); }

function onConfirmYes(id) { commitDelete(deleteIfConfirmed(boxes, confirmId, "accept")); }

function onKeepDelete() {
  const id = confirmId; confirmId = null; render();
  if (id != null) { const b = els.boxList.querySelector(`[data-id="${CSS.escape(id)}"] .remove-btn`); b?.focus(); }
}

function commitDelete(res) {
  confirmId = null;
  if (res.kind === "storage") { boxes = res.state; error = res.error; render(); return; }
  boxes = res.state; error = null; render();
  if (boxes.length === 0) els.emptyCta.focus(); else { const b = els.boxList.querySelector(".box-card .remove-btn"); b?.focus(); }
}

function focusC(id) { const b = els.boxList.querySelector(`[data-id="${CSS.escape(id)}"] .confirm-yes`); b?.focus(); }

function render() {
  if (error) { els.bannerMessage.textContent = error; els.banner.hidden = false; } else { els.banner.hidden = true; els.bannerMessage.textContent = ""; }
  renderSummary(summaryModel(boxes));
  els.boxList.textContent = "";
  for (const box of boxes) {
    const li = document.createElement("li"); li.className = "box-card box-in"; li.dataset.id = box.id;
    const h = document.createElement("header"); h.className = "card-head";
    const n = document.createElement("strong"); n.className = "box-no"; n.textContent = `Box #${box.boxNumber}`;
    const c = document.createElement("span"); c.className = "room-chip"; c.dataset.room = box.room; c.textContent = box.room;
    h.append(n, c);
    const l = document.createElement("p"); l.className = "box-label"; l.textContent = box.label;
    const a = document.createElement("div"); a.className = "box-actions";
    const rb = document.createElement("button"); rb.type = "button"; rb.className = "remove-btn"; rb.textContent = "Remove"; rb.addEventListener("click", () => onRequestDelete(box.id));
    a.append(rb); li.append(h, l, a);
    if (confirmId === box.id) {
      a.textContent = "";
      const note = document.createElement("p"); note.className = "confirm-note"; note.textContent = `Remove ${box.label}? This can't be undone.`;
      const y = document.createElement("button"); y.type = "button"; y.className = "confirm-yes"; y.textContent = "Yes, remove"; y.addEventListener("click", () => onConfirmYes(box.id));
      const k = document.createElement("button"); k.type = "button"; k.className = "confirm-keep"; k.textContent = "Keep"; k.addEventListener("click", onKeepDelete);
      a.append(note, y, k);
    }
    els.boxList.append(li);
    li.addEventListener("animationend", () => li.classList.remove("box-in"), { once: true });
  }
  els.empty.hidden = boxes.length > 0;
}

function renderSummary(model) {
  els.summaryList.textContent = "";
  for (const row of model.rows) {
    const li = document.createElement("li"); li.className = "summary-chip";
    const name = document.createElement("span"); name.className = "room-name"; name.textContent = row.room;
    const count = document.createElement("strong"); count.textContent = String(row.count);
    li.append(name, count); els.summaryList.append(li);
  }
  if (!model.empty) {
    const li = document.createElement("li"); li.className = "summary-chip summary-total";
    const name = document.createElement("span"); name.textContent = "Total";
    const count = document.createElement("strong"); count.textContent = String(model.total);
    li.append(name, count); els.summaryList.append(li);
  }
}

if (typeof document !== "undefined") initApp();