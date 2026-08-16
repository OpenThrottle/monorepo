import * as React from 'react';
import { useNavigation } from 'react-router';

export interface CloneRepoDialogOptions {
  /**
   * The latest route action error, threaded from the route. Used to keep the
   * dialog open on a failed clone while auto-closing it on success.
   */
  actionError?: string | null;
}

export interface UseCloneRepoDialogResult {
  isCloning: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * @description Controller for the clone-repo dialog: open state, the in-flight
 * `cloneRepo` submission flag, and the close-on-success effect. Sibling to
 * useAddFolderDialog and presentation-free per component-primitive-shape R6/R7 —
 * the dialog component renders from this.
 */
export const useCloneRepoDialog = (
  options: CloneRepoDialogOptions,
): UseCloneRepoDialogResult => {
  const { actionError } = options;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const wasCloningRef = React.useRef(false);
  const navigation = useNavigation();

  // Setup
  const isCloning =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'cloneRepo';

  // Handlers

  // Life Cycle
  // Close the dialog on the cloneRepo submit's true→false edge, but only on a
  // successful clone — a failed clone (actionError present) stays open so the
  // error and the typed gitUrl remain visible. The route derives actionError
  // from the settled submission's own actionData, so a stale add-folder failure
  // can never be the error observed on this edge; no intent scoping is needed.
  React.useEffect(() => {
    if (wasCloningRef.current && !isCloning && actionError == null) {
      setOpen(false);
    }
    wasCloningRef.current = isCloning;
  }, [actionError, isCloning]);

  // 🔌 Short Circuit

  return {
    isCloning,
    open,
    setOpen,
  };
};
