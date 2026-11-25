/**
 * @description True when an event started on a link, button or menu item (or inside one), so a
 * row-level click handler can leave it to that control. React bubbles portal events through the
 * tree, so a click in a row's open actions menu reaches the row too.
 */
export const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest('a, button, input, [role="menuitem"], [role="menu"]') !==
    null
  );
};
