/**
 * Visibility classes for the per-row rename/delete controls in
 * {@link ChatConversationRow}. On hover-capable devices the controls are hidden
 * until the row is hovered or the control is keyboard-focused, and while hidden
 * they must not take pointer events (no invisible tap targets). On devices with
 * no hover (touch) they are always visible and tappable.
 * @public
 */
export const ACTION_VISIBILITY_CLASSES =
  'pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100';

/**
 * Grows the rename/delete hit area to at least 44x44px on touch (coarse
 * pointer or no hover) without changing the desktop visual size.
 * @public
 */
export const ACTION_TOUCH_CLASSES =
  'pointer-coarse:size-11 [@media(hover:none)]:size-11';
