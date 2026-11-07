export interface Rectangle {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/**
 * @description Whether `bounds` overlaps some display's work area by at least
 * `minVisible` pixels in both directions, i.e. the user could still grab it.
 * Used to drop restored bounds that now sit on a display that was unplugged.
 */
export const isBoundsVisible = (
  bounds: Rectangle,
  workAreas: readonly Rectangle[],
  minVisible: number,
): boolean => {
  return workAreas.some((area) => {
    const overlapX =
      Math.min(bounds.x + bounds.width, area.x + area.width) -
      Math.max(bounds.x, area.x);
    const overlapY =
      Math.min(bounds.y + bounds.height, area.y + area.height) -
      Math.max(bounds.y, area.y);

    return overlapX >= minVisible && overlapY >= minVisible;
  });
};
