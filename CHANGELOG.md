# @ludovicm67/whiteboard

## 0.3.10

### Patch Changes

- 58f67d5: Add tooltips for tools

## 0.3.9

### Patch Changes

- 09aeae3: The fill is not dependent of the stroke width anymore
- 2a80426: Fix location of pictures
- 8db1866: Automatically ask for the picture when selecting the tool

## 0.3.8

### Patch Changes

- 5f47338: Improve bounding boxes of some kind of items

## 0.3.7

### Patch Changes

- 4c33018: Dynamically update the cursor style

## 0.3.6

### Patch Changes

- 3166a7c: Rectangle: autoselect once item is added
- 55c3e7b: Reduce bundle size
- a999abb: The text tool feels more interactive, as some little bugs have been fixed.
- ccc1c02: Line: autoselect once item is added
- a23646b: Circle: autoselect once item is added

## 0.3.5

### Patch Changes

- 17a92d3: Improve text tool to allow users to edit text content directly from the canvas.

## 0.3.4

### Patch Changes

- 484dfbe: Fix an edge case where picture items could not be selected anymore
- 3fc3d2d: Make sure that rectangle items can be selected in all cases

## 0.3.3

### Patch Changes

- 99cb3a6: It is possible to configure the max size of a picture
- 3c2f651: Cancel hover effect if the user is not selecting an item

## 0.3.2

### Patch Changes

- df245ba: Inline locales files instead of having them generated as modules
- f574cb6: Handle wheel events for zooming and moving on the canvas.

## 0.3.1

### Patch Changes

- 08b4cd5: Add "tool-registered" event
- bc6b3b2: Most of the items can be resized
- ce7589a: Add "ready" event

## 0.3.0

### Minor Changes

- 0cd2603: Rewrite some of the logic to have a separation between elements, tools and items.

## 0.2.16

### Patch Changes

- e0ab727: Delete the selected item by using the backspace key.
- 6c1b81c: Show the whiteboard item that gets hovered

## 0.2.15

### Patch Changes

- 2ecd651: Set the date and time in the generated name file for the export
- e41627f: Custom style for delete buttons
- 7c28353: Switch to Lucide Icons

## 0.2.14

### Patch Changes

- f51017a: Remove language picker from the bottom, as it is already available in the menu.
- ff76981: Add more languages

## 0.2.13

### Patch Changes

- 27fbf55: Export Text tool

## 0.2.12

### Patch Changes

- faaefbf: Pinch to zoom support

## 0.2.11

### Patch Changes

- 262577e: Add top menu

## 0.2.10

### Patch Changes

- 3eeb721: Add i18n support

## 0.2.9

### Patch Changes

- b9d049b: Pictures are by default at max 80% of the canvas size
- b1662ab: Add basic save button
- 870a968: It is possible to set a custom size for a picture

## 0.2.8

### Patch Changes

- f2d10aa: Some minor styles tweaks

## 0.2.7

### Patch Changes

- fc99c50: Add basic eraser tool
- 2a71cc4: Add basic zoom controls

## 0.2.6

### Patch Changes

- f9f4415: Create Text tool

## 0.2.5

### Patch Changes

- 162bdec: Improve color selection for the different tools

## 0.2.4

### Patch Changes

- 1a92683: Improve tools options:

  - more logical order
  - full width
  - use ranges (with defined steps) for the stroke width

## 0.2.3

### Patch Changes

- 3017bb9: The user can now move items by using the Pointer tool.

  Just click on an item to select it, click again on it and drag it to move it around.

## 0.2.2

### Patch Changes

- e84af68: Add `debug` property
- aa8124b: Fix an issue where the picture add event had a null value

## 0.2.1

### Patch Changes

- cc8c5eb: Export tools and types

## 0.2.0

### Minor Changes

- b08bfbb: **Refactoring:** tools should be added as child of the `simple-whiteboard` element.

  This change is helpful for the future, as it will allow to add more tools easily.
  The main goal is to make the code more readable and maintainable.

### Patch Changes

- 357d000: Change tool colors
- 118aee5: Create Picture Tool

## 0.1.1

### Patch Changes

- fda1a5d: Improve exports.

## 0.1.0

### Minor Changes

- 9881c49: Initial release

## 0.1.0

### Minor Changes

- 8627a4a: Initial release
