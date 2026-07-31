import * as React from 'react';
import { Form } from 'react-router';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { FolderIcon, FolderPlusIcon } from 'lucide-react';
import type { DiscoveredFolderObject } from '~/__generated__/graphql';
import { WorkspaceAddFolderCandidate } from '~/routing/settings/components/WorkspaceAddFolderCandidate';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { useWorkspaceAddFolderDialog } from '~/routing/settings/hooks/useWorkspaceAddFolderDialog';

export interface WorkspaceAddFolderDialogProps {
  actionError?: string | null;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
}

export const WorkspaceAddFolderDialog = (
  props: WorkspaceAddFolderDialogProps,
): React.ReactElement => {
  const { actionError, discoveredFolders } = props;

  // Hooks
  const {
    browseEntries,
    browseFetcher,
    browsePath,
    handleBrowse,
    handleBrowseSubmit,
    handleToggleManualPath,
    isAdding,
    open,
    setOpen,
    showManualPath,
  } = useWorkspaceAddFolderDialog();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild={true}>
        <Button data-testid="WorkspaceAddFolderDialogTrigger">
          <FolderPlusIcon aria-hidden={true} className="size-4" />
          {WORKSPACE_FOLDERS_COPY.addFolderButton}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[80vh] overflow-y-auto sm:max-w-xl"
        data-testid="WorkspaceAddFolderDialog"
      >
        <DialogHeader>
          <DialogTitle>{WORKSPACE_FOLDERS_COPY.addFolderTitle}</DialogTitle>
          <DialogDescription>
            {WORKSPACE_FOLDERS_COPY.addFolderDescription}
          </DialogDescription>
        </DialogHeader>

        {discoveredFolders.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {WORKSPACE_FOLDERS_COPY.discoveredEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {discoveredFolders.map((candidate) => (
              <WorkspaceAddFolderCandidate
                candidate={candidate}
                isAdding={isAdding}
                key={candidate.path}
              />
            ))}
          </ul>
        )}

        {browseEntries ? (
          <div className="space-y-2">
            <p className="text-muted-foreground font-mono text-xs">
              {browsePath}
            </p>
            {browseEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {WORKSPACE_FOLDERS_COPY.browseEmpty}
              </p>
            ) : (
              <ul className="space-y-1">
                {browseEntries.map((entry) => (
                  <li
                    className="flex items-center justify-between gap-2"
                    key={entry.path}
                  >
                    <button
                      className="flex min-w-0 items-center gap-2 text-left text-sm hover:underline"
                      onClick={() => handleBrowse(entry.path)}
                      type="button"
                    >
                      <FolderIcon
                        aria-hidden={true}
                        className="size-4 shrink-0"
                      />
                      <span className="truncate">{entry.name}</span>
                    </button>
                    <Form method="post">
                      <input name="intent" type="hidden" value="addFolder" />
                      <input name="path" type="hidden" value={entry.path} />
                      <Button size="sm" type="submit" variant="outline">
                        Add
                      </Button>
                    </Form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {WORKSPACE_FOLDERS_COPY.browseHint}
          </p>
          <browseFetcher.Form
            className="flex items-end gap-2"
            method="post"
            onSubmit={handleBrowseSubmit}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="browse-directory-path">Browse from</Label>
              <Input
                id="browse-directory-path"
                name="path"
                placeholder="/Users/you/Development"
                type="text"
              />
            </div>
            <Button type="submit" variant="outline">
              Browse
            </Button>
          </browseFetcher.Form>
        </div>

        <div className="space-y-2 border-t pt-4">
          <button
            className="text-muted-foreground text-sm hover:underline"
            onClick={handleToggleManualPath}
            type="button"
          >
            {WORKSPACE_FOLDERS_COPY.advancedPathToggle}
          </button>
          {showManualPath ? (
            <Form className="space-y-2" method="post">
              <input name="intent" type="hidden" value="addFolder" />
              <p className="text-muted-foreground text-xs">
                {WORKSPACE_FOLDERS_COPY.advancedPathHint}
              </p>
              <div className="space-y-1">
                <Label htmlFor="manual-folder-path">Server path</Label>
                <Input
                  id="manual-folder-path"
                  name="path"
                  placeholder="/Users/you/Development/my-repo"
                  required={true}
                  type="text"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="manual-folder-display-name">
                  Display name (optional)
                </Label>
                <Input
                  id="manual-folder-display-name"
                  name="displayName"
                  type="text"
                />
              </div>
              <Button disabled={isAdding} type="submit" variant="outline">
                {isAdding ? 'Adding…' : WORKSPACE_FOLDERS_COPY.addFolderButton}
              </Button>
            </Form>
          ) : null}
        </div>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
