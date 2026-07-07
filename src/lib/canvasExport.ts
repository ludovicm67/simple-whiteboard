/**
 * Options for exporting a canvas as a PNG image.
 */
export interface CanvasPngExportOptions {
  /** The file name of the downloaded image. */
  fileName?: string;
  /** The background color painted behind the canvas content. */
  backgroundColor?: string;
}

/**
 * Trigger the download of a canvas as a PNG image.
 *
 * The source canvas is composited on top of a solid background color (canvases
 * are transparent by default) using a temporary off-screen canvas, so the
 * original canvas is never mutated.
 *
 * @param canvas The canvas to export.
 * @param options Options for the export.
 */
export const downloadCanvasAsPng = (
  canvas: HTMLCanvasElement,
  options: CanvasPngExportOptions = {}
): void => {
  const fileName = options.fileName ?? "whiteboard.png";
  const backgroundColor = options.backgroundColor ?? "#ffffff";

  // Create a temporary canvas so we can paint a background without altering the
  // original one.
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  const tempContext = tempCanvas.getContext("2d");
  if (!tempContext) {
    tempCanvas.remove();
    return;
  }

  // Draw the background, then the whiteboard content on top.
  tempContext.fillStyle = backgroundColor;
  tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempContext.drawImage(canvas, 0, 0);

  // Create a link and trigger the download.
  const link = document.createElement("a");
  link.download = fileName;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();

  // Clean up.
  URL.revokeObjectURL(link.href);
  tempCanvas.remove();
  link.remove();
};
