import type {
  GlobalPopoverAction,
  GlobalPopoverConfirm,
} from '../components/GlobalPopover';

/**
 * @description Submit action that declared a confirm gate. Used by
 * {@link GlobalPopover} to open {@link GlobalPopoverConfirmDialog}.
 */
export type GlobalPopoverConfirmSubmitAction = Extract<
  GlobalPopoverAction,
  { readonly kind: 'submit' }
> & {
  readonly confirm: GlobalPopoverConfirm;
};

/**
 * @description Narrows a {@link GlobalPopoverAction} to a confirm-gated submit.
 */
export const isGlobalPopoverConfirmSubmitAction = (
  action: GlobalPopoverAction | undefined,
): action is GlobalPopoverConfirmSubmitAction => {
  return (
    action !== undefined &&
    action.kind === 'submit' &&
    action.confirm !== undefined
  );
};
