import { ROOMS, isKnownRoom, normalizeLabel, makeId, MAX_LABEL_LENGTH } from "./logic.js";
const STORAGE_KEY = "moving-box-label-count-tracker:v1";
function readRaw(s) {
  try {
    if (!s || typeof s.getItem !== "function") throw 1;
    return { raw: s.getItem(STORAGE_KEY), error: null };
  } catch { return { raw: null, error: "Could not load saved boxes." }; }
}
export function readBoxes(s = globalThis.localStorage) {
  const { raw, error: e } = readRaw(s);
  if (e) return { state: [], error: e };
  if (raw == null) return { state: [], error: null };
  let p; try { p = JSON.parse(raw); } catch { return { state: [], error: "Saved boxes were corrupted and could not be read." }; }
  if (!Array.isArray(p)) return { state: [], error: "Saved data had an unexpected shape." };
  const seen = new Set(), boxes = []; let next = 1;
  for (const r of p) {
    if (!r || typeof r !== "object") continue;
    const id = typeof r.id === "string" && r.id && r.id.length <= 80 ? r.id : makeId();
    if (seen.has(id)) continue;
    seen.add(id);
    const label = normalizeLabel(r.label);
    if (!label || label.length > MAX_LABEL_LENGTH || !isKnownRoom(r.room)) continue;
    let boxNumber = Number(r.boxNumber);
    if (!Number.isInteger(boxNumber) || boxNumber < 1) boxNumber = next;
    next = Math.max(next, boxNumber + 1);
    boxes.push(Object.freeze({ id, label, room: r.room, boxNumber }));
  }
  return { state: Object.freeze(boxes), error: null };
}
export function saveBoxes(boxes, s = globalThis.localStorage) {
  try {
    if (!s || typeof s.setItem !== "function") throw 1;
    s.setItem(STORAGE_KEY, JSON.stringify(boxes.map(b => ({ id: b.id, label: b.label, room: b.room, boxNumber: b.boxNumber }))));
    return { ok: true, error: null };
  } catch { return { ok: false, error: "Could not save boxes. Your changes may not persist." }; }
}
export { STORAGE_KEY };