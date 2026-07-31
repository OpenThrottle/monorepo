/**
 * DOM helper — whether an event target is a text-editing element that should
 * keep its native keyboard behavior instead of triggering editor shortcuts.
 */

/**
 * True when `target` is an editable element (input, select, textarea, or
 * contenteditable) that owns keyboard input.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA'
  );
}
