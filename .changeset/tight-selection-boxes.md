---
"@ludovicm67/simple-whiteboard": patch
---

Fix selection and hover boxes that some items were overflowing: arrowheads now
count towards the arrow bounding box (they used to fall entirely outside it on a
horizontal or vertical arrow), thick lines account for their stroke width, and
text boxes are derived from the real glyph metrics so tall accents and
descenders stay inside them at any font size. The boxes are also drawn with a
small padding, which covers the few pixels by which the sketchy (Rough.js)
strokes wobble around the shapes they are drawn from.
