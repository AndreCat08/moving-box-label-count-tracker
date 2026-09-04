import { test } from "node:test";
import assert from "node:assert/strict";
import { addAndSave, deleteIfConfirmed, summaryModel } from "../main.js";
import { ROOMS } from "../logic.js";

function okSave(_boxes) {
  return { ok: true, error: null };
}

function failSave() {
  return { ok: false, error: "Could not save boxes. Your changes may not persist." };
}

test("addAndSave returns validation error and leaves state unchanged", () => {
  const base = [{ id: "1", label: "A", room: "Kitchen", boxNumber: 1 }];
  const res = addAndSave(base, "", "Kitchen", okSave);
  assert.equal(res.kind, "validation");
  assert.equal(res.state, base);
  assert.match(res.error, /Enter a label/);
  assert.equal(res.box, null);
});

test("addAndSave returns ok with new state on successful save", () => {
  const res = addAndSave([], "Dishes", "Kitchen", okSave);
  assert.equal(res.kind, "ok");
  assert.equal(res.state.length, 1);
  assert.equal(res.box.boxNumber, 1);
  assert.equal(res.error, null);
});

test("addAndSave rolls back to previous state on save failure (error surfaced, not silent)", () => {
  const base = [{ id: "1", label: "A", room: "Kitchen", boxNumber: 1 }];
  const res = addAndSave(base, "New", "Bedroom", failSave);
  assert.equal(res.kind, "storage");
  assert.equal(res.state, base); // memory rolled back to what's on disk
  assert.match(res.error, /Could not save/);
  assert.equal(res.box, null);
});

test("deleteIfConfirmed is a no-op without a pending confirm", () => {
  const base = [{ id: "1", label: "A", room: "Kitchen", boxNumber: 1 }];
  assert.equal(deleteIfConfirmed(base, null, "accept").kind, "idle");
  assert.equal(deleteIfConfirmed(base, "1", "keep").kind, "idle");
});

test("deleteIfConfirmed only deletes after user confirms with 'accept'", () => {
  const base = [
    { id: "1", label: "A", room: "Kitchen", boxNumber: 1 },
    { id: "2", label: "B", room: "Bedroom", boxNumber: 2 },
  ];
  const res = deleteIfConfirmed(base, "1", "accept", okSave);
  assert.equal(res.kind, "ok");
  assert.equal(res.state.length, 1);
  assert.equal(res.state[0].id, "2");
});

test("deleteIfConfirmed keeps memory intact and surfaces error on save failure", () => {
  const base = [{ id: "1", label: "A", room: "Kitchen", boxNumber: 1 }];
  const res = deleteIfConfirmed(base, "1", "accept", failSave);
  assert.equal(res.kind, "storage");
  assert.equal(res.state, base); // rolled back
  assert.match(res.error, /Could not save/);
});

test("summaryModel reports empty state when no boxes", () => {
  const model = summaryModel([]);
  assert.equal(model.total, 0);
  assert.equal(model.empty, true);
  assert.deepEqual(model.rows, []);
});

test("summaryModel lists only rooms with boxes and reports total", () => {
  const boxes = [
    { id: "1", label: "A", room: "Kitchen", boxNumber: 1 },
    { id: "2", label: "B", room: "Kitchen", boxNumber: 2 },
    { id: "3", label: "C", room: "Bathroom", boxNumber: 3 },
  ];
  const model = summaryModel(boxes);
  assert.equal(model.empty, false);
  assert.equal(model.total, 3);
  assert.deepEqual(model.rows, [
    { room: "Kitchen", count: 2 },
    { room: "Bathroom", count: 1 },
  ]);
  // row order follows ROOMS order
  assert.ok(ROOMS.indexOf("Kitchen") < ROOMS.indexOf("Bathroom"));
});
