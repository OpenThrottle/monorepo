/**
 * @public
 */
export interface ReorderHoverRect {
  readonly bottom: number;
  readonly top: number;
}

/**
 * @public
 */
export interface ShouldReorderOnHoverOptions {
  readonly clientY: number | undefined;
  readonly dragIndex: number;
  readonly hoverIndex: number;
  readonly hoverRect: ReorderHoverRect;
}

/**
 * @description Whether a dragged row has crossed the middle of the row it hovers, so the two should
 * swap. Moving down swaps once the pointer is below the middle, moving up once it is above — which
 * stops rows flickering back and forth at the boundary. `clientY` is `undefined` when react-dnd has
 * no pointer offset yet, and then nothing moves.
 * @public
 */
export const shouldReorderOnHover = (
  options: ShouldReorderOnHoverOptions,
): boolean => {
  const { clientY, dragIndex, hoverIndex, hoverRect } = options;

  if (clientY === undefined || dragIndex === hoverIndex) {
    return false;
  }

  const middle = (hoverRect.bottom - hoverRect.top) / 2;
  const offset = clientY - hoverRect.top;
  const isMovingDown = dragIndex < hoverIndex;

  return isMovingDown ? offset >= middle : offset <= middle;
};
