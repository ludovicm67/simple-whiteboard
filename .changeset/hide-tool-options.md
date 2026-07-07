---
"@ludovicm67/simple-whiteboard": patch
---

Add a `hide-tool-options` attribute to hide the floating tool-options panel.
This is useful for a compact or embedded board where the panel would otherwise
cover the canvas. The tools themselves keep working; only the per-tool controls
(color, size, …) are hidden.
