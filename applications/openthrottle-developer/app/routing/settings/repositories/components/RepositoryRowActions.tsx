import * as React from 'react';
import clsx from 'clsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { Form, useNavigation } from 'react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { REPOSITORIES_ROW_ACTIONS_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface RepositoryRowActionsProps {
  className?: string;
  row: RepositoryCheckoutRow;
}

/**
 * @description Per-row actions menu for a registered checkout: refresh, apply
 * editor config, and remove. Each item posts the same intent and hidden fields
 * the inline card buttons posted, so the route action is untouched — note that
 * `applyEditorConfig` deliberately still sends the CHECKOUT id under the name
 * `repositoryId`, matching the existing contract. Remove sits behind a
 * confirmation because it is destructive and now a click deeper in a menu.
 */
export const RepositoryRowActions = (
  props: RepositoryRowActionsProps,
): React.ReactElement => {
  const { className, row } = props;
  const { checkout } = row;

  // Hooks
  const navigation = useNavigation();
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false);

  // Setup
  const isRefreshing =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'refreshCheckout' &&
    navigation.formData.get('id') === checkout.id;

  // Handlers
  const handleRemoveSelect = React.useCallback((event: Event) => {
    event.preventDefault();
    setIsRemoveOpen(true);
  }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex justify-end', className)}
      data-testid={`RepositoryRowActions-${checkout.id}`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button
            aria-label={`${REPOSITORIES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${checkout.displayName}`}
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreHorizontalIcon aria-hidden={true} className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Form method="post">
            <input name="intent" type="hidden" value="refreshCheckout" />
            <input name="id" type="hidden" value={checkout.id} />
            <DropdownMenuItem asChild={true} disabled={isRefreshing}>
              <button className="w-full" disabled={isRefreshing} type="submit">
                {isRefreshing
                  ? REPOSITORIES_ROW_ACTIONS_COPY.refreshingLabel
                  : WORKSPACE_FOLDERS_COPY.refreshButton}
              </button>
            </DropdownMenuItem>
          </Form>
          <Form method="post">
            <input name="intent" type="hidden" value="applyEditorConfig" />
            <input name="repositoryId" type="hidden" value={checkout.id} />
            <DropdownMenuItem asChild={true}>
              <button className="w-full" type="submit">
                {WORKSPACE_FOLDERS_COPY.applyEditorConfigButton}
              </button>
            </DropdownMenuItem>
          </Form>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={handleRemoveSelect}
          >
            {WORKSPACE_FOLDERS_COPY.removeButton}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsRemoveOpen} open={isRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {REPOSITORIES_ROW_ACTIONS_COPY.removeTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {REPOSITORIES_ROW_ACTIONS_COPY.removeDescriptionPrefix}{' '}
              <span className="font-medium">{checkout.displayName}</span>{' '}
              {REPOSITORIES_ROW_ACTIONS_COPY.removeDescriptionSuffix}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {REPOSITORIES_ROW_ACTIONS_COPY.cancelButton}
            </AlertDialogCancel>
            <Form method="post">
              <input name="intent" type="hidden" value="deleteRepo" />
              <input name="id" type="hidden" value={checkout.id} />
              <AlertDialogAction type="submit">
                {REPOSITORIES_ROW_ACTIONS_COPY.removeConfirmButton}
              </AlertDialogAction>
            </Form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
