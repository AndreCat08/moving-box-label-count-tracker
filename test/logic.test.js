import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addBox,
  deleteBox,
  summarize,
  normalizeLabel,
  isKnownRoom,
  nextBoxNumber,
  ROOMS,
  MAX_LABEL_LENGTH,
} from "../logic.js";

test("normalizeLabel collapses whitespace and trims", () => {
  assert.equal(normalizeLabel("  Kitchen  –  Fragile  "), "Kitchen – Fragile");
  assert.equal(normalizeLabel("\n\tBedroom\t"), "Bedroom");
  assert.equal(normalizeLabel(null), "");
  assert.equal(normalizeLabel(undefined), "");
});

test("isKnownRoom checks against ROOMS list", () => {
  assert.equal(isKnownRoom("Kitchen"), true);
  assert.equal(isKnownRoom("Garage"), false);
});

test("addBox validates empty and overly-long labels", () => {
  const empty = addBox([], "", "Kitchen");
  assert.equal(empty.ok, false);
  assert.match(empty.error, /Enter a label/);

  const longLabel = "a".repeat(MAX_LABEL_LENGTH + 1);
  const tooLong = addBox([], longLabel, "Kitchen");
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /characters or fewer/);

  const badRoom = addBox([], "Dishes", "Garage");
  assert.equal(badRoom.ok, false);
  assert.match(badRoom.error, /valid room/);
});

test("addBox adds box at start with sequential boxNumber", () => {
  const first = addBox([], "Glasses", "Kitchen");
  assert.equal(first.ok, true);
  assert.equal(first.state.length, 1);
  assert.equal(first.box.boxNumber, 1);
  assert.equal(first.box.label, "Glasses");
  assert.equal(first.box.room, "Kitchen");

  const second = addBox(first.state, "Books", "Bedroom");
  assert.equal(second.ok, true);
  assert.equal(second.state.length, 2);
  assert.equal(second.box.boxNumber, 2);
  // newest prepended
  assert.equal(second.state[0].id, second.box.id);
});

test("boxNumber sequence stays monotonically increasing after deletion", () => {
  const b1 = addBox([], "Box 1", "Kitchen").state;
  const b2 = addBox(b1, "Box 2", "Kitchen").state;
  const b3 = addBox(b2, "Box 3", "Kitchen").state;

  // b3 has boxNumbers [3, 2, 1]
  assert.equal(nextBoxNumber(b3), 4);

  // delete box #2
  const targetId = b3.find((b) => b.boxNumber === 2).id;
  const deleted = deleteBox(b3, targetId);
  assert.equal(deleted.length, 2);

  // next box is still #4
  const b4 = addBox(deleted, "Box 4", "Kitchen");
  assert.equal(b4.box.boxNumber, 4);
});

test("deleteBox removes matching id and keeps array frozen", () => {
  const b1 = addBox([], "Box 1", "Kitchen").state;
  const b2 = addBox(b1, "Box 2", "Bedroom").state;

  const targetId = b2[0].id;
  const remaining = deleteBox(b2, targetId);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, b2[1].id);
  assert.equal(Object.isFrozen(remaining), true);
});

test("summarize returns counts for all rooms even when empty", () => {
  const emptySum = summarize([]);
  for (const room of ROOMS) {
    assert.equal(emptySum[room], 0);
  }

  const boxes = [
    { id: "1", label: "A", room: "Kitchen", boxNumber: 1 },
    { id: "2", label: "B", room: "Kitchen", boxNumber: 2 },
    { id: "3", label: "C", room: "Bathroom", boxNumber: 3 },
  ];
  const sum = summarize(boxes);
  assert.equal(sum["Kitchen"], 2);
  assert.equal(sum["Bathroom"], 1);
  assert.equal(sum["Bedroom"], 0);
});
