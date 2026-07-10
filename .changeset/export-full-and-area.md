---
"@ludovicm67/simple-whiteboard": patch
---

Add two more PNG export options next to "current view": "full view" (frames
every item on the board, regardless of pan/zoom) and "selected area" (drag a
rectangle on the canvas to export just that region). Exposed programmatically as
`downloadFullViewAsPng()`, `startAreaExport()` and `downloadRegionAsPng()`.
