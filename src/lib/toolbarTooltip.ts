/**
 * Small helper that manages the toolbar tooltip: the little label shown under a
 * tool button while it is hovered.
 *
 * It is kept out of the main component so the render code stays readable. The
 * tooltip DOM element (`#tools-tooltip`) lives in the component's shadow root
 * and is resolved lazily the first time it is needed.
 */
export class ToolbarTooltip {
  private getRoot: () => ShadowRoot | null;
  private element: HTMLElement | null = null;
  private currentTarget: HTMLElement | null = null;

  /**
   * @param getRoot A getter returning the shadow root that contains the
   * `#tools-tooltip` element.
   */
  constructor(getRoot: () => ShadowRoot | null) {
    this.getRoot = getRoot;
  }

  /**
   * Lazily resolve (and cache) the tooltip element.
   */
  private getElement(): HTMLElement | null {
    if (!this.element) {
      this.element =
        this.getRoot()?.querySelector<HTMLElement>("#tools-tooltip") ?? null;
    }
    return this.element;
  }

  /**
   * Resolve the closest button element for a given event target.
   *
   * @param eventTarget The target of the triggering event.
   * @returns The related button element, or `null` if there is none.
   */
  private resolveButton(eventTarget: EventTarget | null): HTMLElement | null {
    let target = eventTarget as Element | null;
    if (
      target &&
      !(target instanceof HTMLButtonElement) &&
      typeof target.closest === "function"
    ) {
      target = target.closest("button");
    }
    return target instanceof HTMLElement ? target : null;
  }

  /**
   * Show the tooltip for the button related to the given event target.
   *
   * @param eventTarget The target of the `mouseover` event.
   * @param text The text to display in the tooltip.
   */
  public show(eventTarget: EventTarget | null, text: string): void {
    const tooltip = this.getElement();
    if (!tooltip) {
      return;
    }

    const target = this.resolveButton(eventTarget);
    if (!target) {
      this.hide();
      return;
    }

    // Nothing to do if we are already showing the tooltip for this button.
    if (this.currentTarget === target) {
      return;
    }
    this.currentTarget = target;

    tooltip.textContent = text;

    // Center the tooltip horizontally below the hovered button.
    const rect = target.getBoundingClientRect();
    tooltip.style.display = "block";
    const width = tooltip.offsetWidth;
    tooltip.style.left = `${
      rect.left + window.scrollX - width / 2 + rect.width / 2
    }px`;
  }

  /**
   * Hide the tooltip.
   */
  public hide(): void {
    this.currentTarget = null;
    if (this.element) {
      this.element.textContent = "";
      this.element.style.display = "none";
    }
  }
}
