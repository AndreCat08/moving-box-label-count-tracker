# Moving Box Label & Count Tracker

A single-page app to label moving boxes and keep a running tally of how many boxes belong to each room. No auth, no backend — just a clean, usable packing assistant for moving day.

## Run

Open `index.html` in a browser. No build step, no dependencies.

## Test

```
npm test
```

Tests use Node's built-in test runner (Node 18+) and jsdom is not required — logic, storage, and error-surfacing are exercised through the pure modules.

## Architecture

| File | Responsibility |
|---|---|
| `index.html` | Layout, visible labels, aria-live regions for summary & errors, empty state CTA |
| `styles.css` | "Moving-day label/tag" theme, responsive mobile-first, card-in animation, prefers-reduced-motion |
| `logic.js` | Pure functions: addBox, deleteBox, summary, validate, normalization |
| `storage.js` | localStorage adapter with defensive parsing; returns `{state, error}` / `{ok, error}` |
| `main.js` | Render + named event handlers; no inline handlers; textContent only |
| `test/logic.test.js` | Core logic: add, delete, summary, sequential numbering, validation |
| `test/storage.test.js` | localStorage failure, malformed JSON, corrupted row, non-array, prototype pollution |
| `test/main.test.js` | Error surfacing on save/load failure, inline confirm flow, empty state |

State is immutable; rendering uses `textContent` (never string-built HTML) to structurally prevent XSS.
