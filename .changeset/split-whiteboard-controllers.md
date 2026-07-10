---
"@ludovicm67/simple-whiteboard": patch
---

Internal refactor: split the large `SimpleWhiteboard` element into focused
pieces — `HistoryController`, `ExportController`, `CanvasRenderer`,
`PointerInputController` and `ItemStore` controllers, plus footer/tool-options
render helpers. The public API and behavior are unchanged; the element now just
coordinates these collaborators, which are each far easier to read and test.
