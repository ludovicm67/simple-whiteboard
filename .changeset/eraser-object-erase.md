---
"@ludovicm67/simple-whiteboard": minor
---

Rework the eraser into a proper object eraser. Instead of painting
background-colored strokes (which only worked when the color matched the
background and left phantom items behind), it now removes the items it touches
as you drag over them. Thin shapes (lines, arrows, pen strokes) use precise
hit-testing so you only erase what you actually touch, a dashed circle shows the
eraser size, the whole stroke is a single undo step, and removals are propagated
through the `items-updated` events so they stay in sync with other clients.
