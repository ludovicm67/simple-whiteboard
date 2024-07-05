import { FeatherAttributes, FeatherIconNames, icons } from "feather-icons";

export type IconOptions = Partial<FeatherAttributes>;

/**
 * Get the FeatherIcon icon.
 *
 * @param name Name of the FeatherIcon icon.
 * @returns The FeatherIcon icon.
 */
export const getIcon = (name: FeatherIconNames) => {
  if (!icons[name]) {
    throw new Error(`Icon "${name}" not found.`);
  }
  return icons[name];
};

export const defaultSvgIconOptions: IconOptions = {
  width: 16,
  height: 16,
};

/**
 * Get the SVG string of the FeatherIcon icon.
 *
 * @param name Name of the FeatherIcon icon.
 * @param options FeatherIcon options.
 * @returns The SVG string of the FeatherIcon icon.
 */
export const getIconSvg = (
  name: FeatherIconNames,
  options?: IconOptions
): string => {
  const iconOptions = { ...defaultSvgIconOptions, ...(options || {}) };
  return getIcon(name).toSvg(iconOptions);
};
