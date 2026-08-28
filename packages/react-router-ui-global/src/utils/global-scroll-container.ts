/**
 * Marks the app's single page-level scroll container ({@link GlobalLayout}'s
 * content wrapper). Exposed as an attribute rather than a ref so a descendant
 * that needs to observe or drive page scroll — a chat thread following its
 * newest message, for instance — can reach it without threading a ref through
 * every layer between.
 *
 * @public
 */
export const GLOBAL_SCROLL_CONTAINER_ATTRIBUTE = 'data-global-scroll-container';

/**
 * The element that owns page scroll, or null before the layout has mounted (or
 * on a surface that renders outside it, such as a dialog). Callers should treat
 * null as "this surface scrolls itself".
 *
 * @public
 */
export const getGlobalScrollElement = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[${GLOBAL_SCROLL_CONTAINER_ATTRIBUTE}]`);
