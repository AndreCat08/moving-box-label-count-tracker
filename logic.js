export const ROOMS = ["Kitchen", "Bedroom", "Bathroom", "Living Room", "Other"];
export const MAX_LABEL_LENGTH = 120;

export function normalizeLabel(label) {
  return String(label ?? "").replace(/\s+/g, " ").trim();
}

export function isKnownRoom(room) {
  return ROOMS.includes(room);
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "box-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function nextBoxNumber(boxes) {
  return boxes.reduce((max, box) => Math.max(max, Number(box?.boxNumber) || 0), 0) + 1;
}

/**
 * @typedef {Object} BoxEntry
 * @property {string} id
 * @property {string} label
 * @property {string} room
 * @property {number} boxNumber
 */

/**
 * Add a box. Returns { ok, state, error, box }.
 * state is a new frozen array on success; unchanged reference on failure.
 */
export function addBox(boxes, rawLabel, rawRoom) {
  const label = normalizeLabel(rawLabel);
  const room = String(rawRoom ?? "");
  if (!label) return { ok: false, state: boxes, error: "Enter a label for the box.", box: null };
  if (label.length > MAX_LABEL_LENGTH)
    return { ok: false, state: boxes, error: `Label must be ${MAX_LABEL_LENGTH} characters or fewer.`, box: null };
  if (!isKnownRoom(room)) return { ok: false, state: boxes, error: "Choose a valid room.", box: null };

  /** @type {BoxEntry} */
  const box = Object.freeze({ id: makeId(), label, room, boxNumber: nextBoxNumber(boxes) });
  return { ok: true, state: Object.freeze([box, ...boxes]), error: null, box };
}

export function deleteBox(boxes, id) {
  return Object.freeze(boxes.filter(box => box.id !== id));
}

/**
 * Count boxes per room; every known room is always present.
 * @returns {Record<string, number>}
 */
export function summarize(boxes) {
  const counts = Object.fromEntries(ROOMS.map(room => [room, 0]));
  for (const box of boxes) if (counts[box.room] != null) counts[box.room] += 1;
  return counts;
}
