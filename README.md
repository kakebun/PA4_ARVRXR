# PA4 — A-Frame VR Scene with Custom Component

**Student:** Sultan Mykhtybayev  **ID:** 241280  **Prefix:** `x1280-`

## Variant

| Digit (from the right) | Rule | Result |
|---|---|---|
| last = **0** | theme | **Space station** |
| 2nd-to-last = **8** | 8 mod 3 = 2 | motion: **pulse** (scale up and down) |
| 3rd-to-last = **2** | 2 mod 2 = 0 | interaction: **gaze** — fuse cursor on the camera, 1.5 s |
| 4th-to-last = **1** | 1 mod 2 = 1 | layout: **corridor** — two rows of 3, rows 3 m apart (x = −1.5 / +1.5), along 10 m (z = −2, −7, −12) |

## Files

| File | Content |
|---|---|
| `index.html` | A-Frame 1.8.0, `components.js`, `<a-assets>`, the scene |
| `components.js` | system `x1280-gallery`; components `x1280-motion`, `x1280-texture`, `x1280-exhibit`; console helpers |
| `textures/` | `deck.jpg`, `deck_normal.png`, `panel.jpg`, `stars.jpg` (all ≤ 1024 px) |
| `tools/make_textures.py` | script that generated the textures |

## How to run

Serve from a local web server (not `file://`):

- **VS Code:** Live Server extension → right-click `index.html` → **Open with Live Server**.
- **or Python:** `python -m http.server 8000` → open http://localhost:8000

VR check: Meta Quest browser, or Chrome + **Immersive Web Emulator** → **Enter VR**.

## Controls

| Input | Action |
|---|---|
| Mouse drag | look around |
| W A S D | move |
| Gaze at an exhibit | highlight (blue) |
| Keep gazing 1.5 s | select / deselect (gold), info panel, pulse ×2 amplitude and speed |
| **M** | pause / resume motion of all exhibits |
| **X** | remove the selected exhibit, counter updates |

Only one exhibit can be selected at a time.
The board in front of the user shows the ID, the variant and `Selected: <name> (<n> of <total>)`.

## Console helpers (write-up)

```js
// E1 — #ex1 has log: true
const el = document.querySelector('#ex1');
el.setAttribute('x1280-motion', 'amplitude', 0.3);
el.pause(); el.play();
el.removeAttribute('x1280-motion');
el.parentNode.removeChild(el);

// E3
x1280SetFilters('default');
x1280SetFilters('mine');

// E4
const s = document.querySelector('a-scene'); s.renderer; s.object3D; s.camera;

// E5
x1280Spawn(60);
x1280ClearSpawned();
x1280SpawnInstanced(60);
```

## Texture credits and licences

All textures were generated procedurally by the author with `tools/make_textures.py` (Python, NumPy, Pillow). No third-party images.

| File | Used for | Author | Licence |
|---|---|---|---|
| `textures/deck.jpg` | ground (repeat 12 × 12) | Sultan Mykhtybayev (procedural) | CC0 1.0 |
| `textures/deck_normal.png` | ground normal map | Sultan Mykhtybayev (procedural) | CC0 1.0 |
| `textures/panel.jpg` | corridor walls | Sultan Mykhtybayev (procedural) | CC0 1.0 |
| `textures/stars.jpg` | sky | Sultan Mykhtybayev (procedural) | CC0 1.0 |

## Constraints

Core A-Frame 1.8.0 only; no community components, no model files.
Exhibit motion uses `x1280-motion`, not `animation` (built-in `animation` is used only for the cursor ring).