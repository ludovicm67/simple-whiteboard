import * as icons from "lucide-static";

export type IconName = keyof typeof icons;
export type IconNameExtended = IconName | (string & {});
export const iconNames = Object.keys(icons) as IconName[];

export type IconOptions = Partial<{
  width: number;
  height: number;
}>;

/**
 * Get the Lucide icon.
 *
 * @param name Name of the Lucide icon.
 * @returns The Lucide icon.
 */
export const getIcon = (name: IconNameExtended): string => {
  if (!(iconNames as string[]).includes(name)) {
    throw new Error(`Icon "${name}" not found.`);
  }
  return `${icons[name as IconName]}`; // Type assertion
};

export const defaultSvgIconOptions: IconOptions = {
  width: 16,
  height: 16,
};

const createElementFromString = (htmlString: string): Element => {
  const template = document.createElement("template");
  template.innerHTML = htmlString.trim();
  const element = template.content.firstElementChild;
  if (!element) {
    throw new Error("Invalid HTML string.");
  }
  return element;
};

/**
 * Get the SVG string of the Lucide icon.
 *
 * @param name Name of the Lucide icon.
 * @param options Lucide options.
 * @returns The SVG string of the Lucide icon.
 */
export const getIconSvg = (
  name: IconNameExtended,
  options?: IconOptions
): string => {
  const icon = getIcon(name);
  const svgElement = createElementFromString(icon);
  const iconOptions = { ...defaultSvgIconOptions, ...(options || {}) };
  Object.entries(iconOptions).forEach(([key, value]) => {
    svgElement.setAttribute(key, value.toString());
  });
  return svgElement.outerHTML;
};
