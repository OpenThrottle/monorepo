/**
 * Visibility classes for the per-row rename/delete controls in
 * {@link ChatConversationRow}. On hover-capable devices the controls are hidden
 * until the row is hovered or the control is keyboard-focused, and while hidden
 * they must not take pointer events (no invisible tap targets). On devices with
 * no hover (touch) they are always visible and tappable.
 * @public
 */
export const ACTION_VISIBILITY_CLASSES = `pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100`;

/**
 * Grows the rename/delete hit area to at least 44x44px on touch (coarse
 * pointer or no hover) without changing the desktop visual size.
 * @public
 */
export const ACTION_TOUCH_CLASSES = `pointer-coarse:size-11 [@media(hover:none)]:size-11`;

/**
 * Visibility of a row's `⋯` menu trigger: like {@link ACTION_VISIBILITY_CLASSES},
 * and also shown while its menu is open.
 * @public
 */
export const MENU_TRIGGER_VISIBILITY_CLASSES = `${ACTION_VISIBILITY_CLASSES} data-[state=open]:pointer-events-auto data-[state=open]:opacity-100`;

/** Spacing and icon size for the sidebar's menu items. @public */
export const MENU_ITEM_CLASSES = 'gap-2 [&_svg]:size-4 [&_svg]:shrink-0';

/** A destructive menu item (Delete, Delete group). @public */
export const MENU_ITEM_DESTRUCTIVE_CLASSES = `text-destructive focus:text-destructive`;

/** Highlight on a section while a dragged row hovers it ({@link ChatConversationDropSection}). @public */
export const DROP_TARGET_CLASSES = `bg-accent/40 ring-ring/50 rounded-md ring-2`;

/** The row being dragged, left behind while its overlay follows the pointer. @public */
export const DRAGGING_ROW_CLASSES = 'opacity-40';

/** The floating copy of the dragged row. @public */
export const DRAG_OVERLAY_CLASSES = `bg-popover text-popover-foreground border-border pointer-events-none max-w-56 truncate rounded-md border px-3 py-1.5 text-sm shadow-md`;
