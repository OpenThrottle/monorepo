import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@openthrottle/react-router-shadcn';
import { Eraser } from 'lucide-react';
import * as React from 'react';
import { useNavigation, useSubmit } from 'react-router';

import { MISSING_WORKTREES_COPY } from '~/routing/settings/repositories/data/data.copy';
import { PRUNE_WORKTREE_CHECKOUTS_INTENT } from '~/routing/settings/repositories/utils/missing-rows';

export interface PruneMissingWorktreesButtonProps {
  /** Every registered worktree checkout the last scan reported missing, shown or not. */
  checkoutIds: readonly string[];
  className?: string;
}

/**
 * @description Bulk "Prune missing" for the toolbar. Confirms, then posts every missing
 * checkout id to the route action in one `pruneWorktreeCheckouts` call; the server re-checks
 * each id and the outcome notice reports what it kept. Submits imperatively rather than through
 * a form inside the dialog, because confirming closes — and so unmounts — the dialog in the same
 * click, and a detached form never submits. Renders nothing when nothing is missing.
 */
export const PruneMissingWorktreesButton = (
  props: PruneMissingWorktreesButtonProps,
): React.ReactElement | null => {
  const { checkoutIds, className } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const navigation = useNavigation();
  const submit = useSubmit();

  // Setup
  const count = checkoutIds.length;
  const isPruning =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === PRUNE_WORKTREE_CHECKOUTS_INTENT;

  // Handlers
  const handleConfirm = React.useCallback(() => {
    const formData = new FormData();
    formData.append('checkoutIds', checkoutIds.join(','));
    formData.append('intent', PRUNE_WORKTREE_CHECKOUTS_INTENT);

    void submit(formData, { method: 'post' });
    setOpen(false);
  }, [checkoutIds, submit]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (count === 0) return null;

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild={true}>
        <Button
          className={className}
          data-testid="PruneMissingWorktreesButton"
          disabled={isPruning}
          size="sm"
          title={MISSING_WORKTREES_COPY.pruneTitle}
          type="button"
          variant="outline"
        >
          <Eraser aria-hidden={true} className="size-3.5 shrink-0" />
          {isPruning
            ? MISSING_WORKTREES_COPY.prunePending
            : MISSING_WORKTREES_COPY.pruneLabel(count)}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {MISSING_WORKTREES_COPY.pruneDialogTitle(count)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {MISSING_WORKTREES_COPY.pruneDialogBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">
            {MISSING_WORKTREES_COPY.pruneCancel}
          </AlertDialogCancel>
          <Button onClick={handleConfirm} type="button" variant="destructive">
            {MISSING_WORKTREES_COPY.pruneConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
