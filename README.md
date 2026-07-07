# Simple Whiteboard

[![NPM](https://badge.fury.io/js/@ludovicm67%2Fsimple-whiteboard.svg)](https://npm.im/@ludovicm67/simple-whiteboard)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fludovicm67%2Fsimple-whiteboard.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fludovicm67%2Fsimple-whiteboard?ref=badge_shield)

Simple Whiteboard is a simple web-based whiteboard application that allows users to draw on a canvas.

The application is built as a Web Component using [LitElement](https://lit.dev/).
This allows the whiteboard to be easily embedded in any web application regardless of the framework used.

## Features

- Different drawing tools:
  - Rectangle
  - Circle
  - Line
  - Pen
  - Text
  - Picture
- Move the canvas using the Move tool, the middle mouse button, or scrolling
- Clear the canvas
- Undo / redo (`Ctrl`/`Cmd`+`Z`, `Ctrl`/`Cmd`+`Shift`+`Z`)
- Support mouse and touch input
- Optional dotted grid background
- Pan & pinch-to-zoom (zoom follows the cursor / pinch center)
- Export the current view as a PNG image

## Usage

Add the `<simple-whiteboard>` element to your page and drop the default tools in
its `tools` slot:

```html
<simple-whiteboard locale="en">
  <simple-whiteboard--tool-defaults slot="tools"></simple-whiteboard--tool-defaults>
</simple-whiteboard>
```

### Attributes

| Attribute            | Type      | Default | Description                                                       |
| -------------------- | --------- | ------- | ---------------------------------------------------------------- |
| `locale`             | `string`  | `en`    | The UI language.                                                 |
| `dotted-background`  | `boolean` | `true`  | Render a dotted grid behind the content. Use `="false"` to hide. |
| `hide-locale-picker` | `boolean` | `false` | Hide the language picker from the menu.                          |
| `debug`              | `boolean` | `false` | Log debug information and show the pointer coordinates.          |

### Undo / redo

Every drawing, edit, move, resize, deletion and clear can be undone and redone,
either with the toolbar buttons, the keyboard (`Ctrl`/`Cmd`+`Z` to undo,
`Ctrl`/`Cmd`+`Shift`+`Z` or `Ctrl`+`Y` to redo), or programmatically:

```js
whiteboard.undo();
whiteboard.redo();
whiteboard.canUndo(); // boolean
whiteboard.canRedo(); // boolean
```

A `history-changed` event (`detail: { canUndo, canRedo }`) is emitted whenever
availability changes, so a host application can keep its own controls in sync.

### Theming

The look can be tweaked with CSS custom properties, for example:

```css
simple-whiteboard {
  --sw-accent: #7c3aed;
}
```

## Performance

The whiteboard is designed to stay light on the CPU:

- redraws are coalesced with `requestAnimationFrame`, so many updates in the
  same frame only trigger a single render;
- items that are outside the visible viewport are skipped (viewport culling);
- the dotted background only computes and draws the dots that are visible.

## Development

```sh
npm install   # install the dependencies
npm run dev   # start the dev server
npm test      # run the unit tests (Node's built-in test runner)
npm run build # type-check and build the library
```

## Used Technologies

- [LitElement](https://lit.dev/) - A simple base class for creating fast, lightweight web components.
- [TypeScript](https://www.typescriptlang.org/) - A typed superset of JavaScript that compiles to plain JavaScript.
- [Rough.js](https://roughjs.com/) - A small graphics library that lets you draw in a sketchy, hand-drawn-like, style.
- [Perfect Freehand](https://github.com/steveruizok/perfect-freehand) - A tiny library for rendering perfect freehand lines.
- [Lucide Icons](https://lucide.dev/) - Beautiful & consistent icons.

## License

Simple Whiteboard is licensed under the [MIT License](./LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fludovicm67%2Fsimple-whiteboard.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fludovicm67%2Fsimple-whiteboard?ref=badge_large)
