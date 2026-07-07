import {
  Check,
  ChevronRight,
  Circle,
  createElement,
  Download,
  Edit2,
  Eraser,
  IconNode,
  Image,
  ImageDown,
  Languages,
  Menu,
  Minus,
  MousePointer,
  Move,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide";

const icons = {
  Menu,

  // Menu
  Download,
  ImageDown,
  Languages,
  ChevronRight,
  Check,

  // History
  Undo2,
  Redo2,

  // Tools
  Move,
  MousePointer,
  Square,
  Circle,
  Minus,
  Edit2,
  Type,
  Image,
  Eraser,
  Trash2,
};

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
export const getIcon = (name: IconNameExtended): IconNode => {
  if (!(iconNames as string[]).includes(name)) {
    throw new Error(`Icon "${name}" not found.`);
  }
  return icons[name as IconName];
};

export const defaultSvgIconOptions: IconOptions = {
  width: 16,
  height: 16,
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
  const svgElement = createElement(icon, {
    ...defaultSvgIconOptions,
    ...(options || {}),
  });
  return svgElement.outerHTML;
};
