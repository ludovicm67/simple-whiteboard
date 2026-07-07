import type { SimpleWhiteboard } from "../simple-whiteboard";

/**
 * Walk up the DOM tree from a given node — crossing shadow-root boundaries — to
 * find the nearest `<simple-whiteboard>` host element.
 *
 * This is used by items that manage their own DOM overlay (e.g. the text editor
 * of the text and sticky-note tools) and need a reference to the whiteboard.
 *
 * @param element The node to start from.
 * @returns The nearest `SimpleWhiteboard` element, or `null` if there is none.
 */
export const findParentWhiteboard = (
  element: Node | null
): SimpleWhiteboard | null => {
  let current: Node | null = element;

  while (current) {
    if (
      current instanceof HTMLElement &&
      current.tagName?.toLowerCase() === "simple-whiteboard"
    ) {
      return current as unknown as SimpleWhiteboard;
    }

    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : current.parentNode;
  }

  return null;
};
