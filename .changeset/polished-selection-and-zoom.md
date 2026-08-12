---
"@ludovicm67/simple-whiteboard": patch
---

Replace the native `<select>` of the zoom picker with a dropdown built like the
rest of the app (frosted panel, accent highlight, check mark on the active
level, closes on Escape or on an outside click). It also displays the exact
zoom level, including the in-between values that wheel and pinch zooming
produce, which a fixed list of options could not.

Polish the selection: boxes and resize handles are now rounded, sit slightly
away from the item, and follow the `--sw-accent` token, so theming the
whiteboard also themes what is drawn on the canvas. Hovering an item shows a
quieter version of the same box, and resize handles light up under the pointer
with a cursor showing which way they resize. Their grab area is sized in screen
pixels too, so handles stay easy to catch when zoomed out — previously it was
measured in world units and shrank with the zoom level.
