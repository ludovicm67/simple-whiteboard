import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Check,
  ChevronRight,
  Circle,
  createElement,
  Crop,
  Download,
  Edit2,
  Eraser,
  IconNode,
  Image,
  ImageDown,
  Languages,
  Maximize,
  Menu,
  Minus,
  MousePointer,
  Move,
  MoveUpRight,
  Redo2,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
} from "lucide";

const icons = {
  Menu,

  // Menu
  Download,
  ImageDown,
  Maximize,
  Crop,
  Languages,
  ChevronRight,
  Check,

  // History
  Undo2,
  Redo2,

  // Layer / z-order
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,

  // Tools
  Move,
  MousePointer,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Edit2,
  Type,
  StickyNote,
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
