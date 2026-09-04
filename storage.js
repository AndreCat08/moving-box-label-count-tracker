import { ROOMS, isKnownRoom, normalizeLabel, makeId, MAX_LABEL_LENGTH } from "./logic.js";

const STORAGE_KEY = "moving-box-label-count-tracker:v1";

function readRaw(storage) {
  try {
    if (!storage || typeof storage.getItem !== "function") throw new Error("storage unavailable");
    return { raw: storage.getItem(STORAGE_KEY), error: null };
  } catch (e) {
    return { raw: null, error: "Could not load saved boxes." };
  }
}

/**
 * Load boxes. Per-entry defensive parse: one bad row is dropped, never wipes the rest.
 * @returns {{ state: BoxEntry[], error: (string|null) }}
 */
export function readBoxes(storage = globalThis.localStorage) {
  const { raw, error: readError } = readRaw(storage);
  if (readError) return { state: [], error: readError };
  if (raw == null) return { state: [], error: null };

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { state: [], error: "Saved boxes were corrupted and could not be read." }; }
  if (!Array.isArray(parsed)) return { state: [], error: "Saved data had an unexpected shape." };

  const seen = new Set();
  const boxes = [];
  let next = 1;
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const id = typeof row.id === "string" && row.id && row.id.length <= 80 ? row.id : makeId();
    if (seen.has(id)) continue;
    seen.add(id);
    const label = normalizeLabel(row.label);
    if (!label || label.length > MAX_LABEL_LENGTH) continue;
    if (!isKnownRoom(row.room)) continue;
    let boxNumber = Number(row.boxNumber);
    if (!Number.isInteger(boxNumber) || boxNumber < 1) boxNumber = next;
    next = Math.max(next, boxNumber + 1);
    boxes.push(Object.freeze({ id, label, room: row.room, boxNumber }));
  }
  return { state: Object.freeze(boxes), error: null };
}

/**
 * Save boxes. Returns { ok, error }.
 */
export function saveBoxes(boxes, storage = globalThis.localStorage) {
  try {
    if (!storage || typeof storage.setItem !== "function") throw new Error("storage unavailable");
    const clean = boxes.map(box => ({
      id: box.id, label: box.label, room: box.room, boxNumber: box.boxNumber,
    }));
    storage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: "Could not save boxes. Your changes may not persist." };
  }
}

export { STORAGE_KEY };
