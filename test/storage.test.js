import { test } from "node:test";
import assert from "node:assert/strict";
import { readBoxes, saveBoxes, STORAGE_KEY } from "../storage.js";

function makeMemStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    _store: store,
  };
}

test("readBoxes returns empty array when storage empty", () => {
  const mem = makeMemStorage();
  const res = readBoxes(mem);
  assert.equal(res.error, null);
  assert.deepEqual(res.state, []);
});

test("readBoxes handles storage getItem throwing", () => {
  const broken = {
    getItem() {
      throw new Error("Denied");
    },
  };
  const res = readBoxes(broken);
  assert.equal(res.state.length, 0);
  assert.match(res.error, /Could not load/);
});

test("readBoxes handles malformed JSON string gracefully", () => {
  const mem = makeMemStorage({ [STORAGE_KEY]: "{bad json" });
  const res = readBoxes(mem);
  assert.equal(res.state.length, 0);
  assert.match(res.error, /corrupted/);
});

test("readBoxes handles non-array stored values", () => {
  const mem = makeMemStorage({ [STORAGE_KEY]: JSON.stringify({ not: "an array" }) });
  assert.match(readBoxes(mem).error, /unexpected shape/);
});

test("readBoxes drops corrupted individual rows without wiping rest", () => {
  const raw = [
    { id: "1", label: "Good", room: "Kitchen", boxNumber: 1 },
    "junk row",
    { id: "2", label: "", room: "Kitchen", boxNumber: 2 }, // invalid empty label
    { id: "3", label: "Also Good", room: "Bedroom", boxNumber: 3 },
  ];
  const mem = makeMemStorage({ [STORAGE_KEY]: JSON.stringify(raw) });
  const res = readBoxes(mem);
  assert.equal(res.error, null);
  assert.equal(res.state.length, 2);
  assert.equal(res.state[0].label, "Good");
  assert.equal(res.state[1].label, "Also Good");
});

test("readBoxes dedupes ids and repairs boxNumber sequence", () => {
  const raw = [
    { id: "dup", label: "First", room: "Kitchen", boxNumber: "bad" },
    { id: "dup", label: "Second", room: "Kitchen", boxNumber: 2 },
  ];
  const mem = makeMemStorage({ [STORAGE_KEY]: JSON.stringify(raw) });
  const res = readBoxes(mem);
  assert.equal(res.state.length, 1);
  assert.equal(res.state[0].label, "First");
  assert.equal(res.state[0].boxNumber, 1); // repaired
});

test("prototype pollution resistance: extra __proto__ key is ignored", () => {
  const jsonWithProto = `[{"id":"1","label":"Safe","room":"Kitchen","boxNumber":1,"__proto__":{"polluted":true}}]`;
  const mem = makeMemStorage({ [STORAGE_KEY]: jsonWithProto });
  const res = readBoxes(mem);
  assert.equal(res.state.length, 1);
  assert.equal(res.state[0].label, "Safe");
  // @ts-ignore
  assert.equal(({}).polluted, undefined);
});

test("saveBoxes handles storage failure and returns error", () => {
  const broken = {
    setItem() {
      throw new Error("QuotaExceeded");
    },
  };
  const res = saveBoxes([{ id: "1", label: "A", room: "Kitchen", boxNumber: 1 }], broken);
  assert.equal(res.ok, false);
  assert.match(res.error, /Could not save/);
});

test("saveBoxes writes clean objects to storage", () => {
  const mem = makeMemStorage();
  const boxes = [{ id: "1", label: "Plates", room: "Kitchen", boxNumber: 1, extraField: "strip me" }];
  const res = saveBoxes(boxes, mem);
  assert.equal(res.ok, true);

  const savedRaw = JSON.parse(mem._store.get(STORAGE_KEY));
  assert.equal(savedRaw.length, 1);
  assert.equal(savedRaw[0].extraField, undefined);
  assert.equal(savedRaw[0].label, "Plates");
});
