/** Pixels between the scroller's viewport bottom and the end of its content. */
export const distanceFromBottom = (scroller: HTMLElement): number => {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
};
