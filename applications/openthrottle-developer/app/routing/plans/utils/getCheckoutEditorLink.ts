import { editorHref } from '@openthrottle/react-router-ide';

export interface CheckoutEditorLinkSource {
  readonly filesystemPath: string;
}

/**
 * @description Editor deep-link for a run's checkout. Null when there is no
 * checkout, so callers only build a link when a filesystem path is present.
 */
export const getCheckoutEditorLink = (
  checkout: CheckoutEditorLinkSource | null | undefined,
): string | null => {
  if (checkout == null) {
    return null;
  }

  return editorHref({ absolutePath: checkout.filesystemPath });
};
