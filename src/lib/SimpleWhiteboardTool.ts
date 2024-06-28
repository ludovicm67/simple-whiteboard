import { LitElement, TemplateResult } from "lit";

interface SimpleWhiteboardToolInterface {
  getToolIcon: () => TemplateResult | null;
}

abstract class SimpleWhiteboardTool
  extends LitElement
  implements SimpleWhiteboardToolInterface
{
  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public getToolIcon(): TemplateResult | null {
    return null;
  }
}

export default SimpleWhiteboardTool;
export type { SimpleWhiteboardTool };
