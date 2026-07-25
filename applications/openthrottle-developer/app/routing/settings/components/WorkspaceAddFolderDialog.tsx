import * as React from 'react';
import { Form, useFetcher, useNavigation } from 'react-router';
import {
  Badge,
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
import { FolderGit2Icon, FolderIcon, FolderPlusIcon } from 'lucide-react';
import type { DiscoveredFolderObject } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface WorkspaceAddFolderDialogProps {
  actionError?: string | null;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
}

interface BrowseEntry {
  name: string;
  path: string;
}

export const WorkspaceAddFolderDialog = (
  props: WorkspaceAddFolderDialogProps,
): React.ReactElement => {
  const { actionError, discoveredFolders } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const [showManualPath, setShowManualPath] = React.useState(false);
  const browseFetcher = useFetcher<{
    browse?: { entries: BrowseEntry[]; path: string };
  }>();
  const navigation = useNavigation();

  // Setup
  const isAdding =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'addFolder';
  const browseEntries = browseFetcher.data?.browse?.entries ?? null;
  const browsePath = browseFetcher.data?.browse?.path ?? null;

  // Handlers
  const handleBrowse = (path: string): void => {
    browseFetcher.submit(
      { intent: 'browseDirectory', path },
      { method: 'post' },
    );
  };

  // Markup
  const renderCandidate = (
    candidate: WorkspaceAddFolderDialogProps['discoveredFolders'][number],
  ): React.ReactElement => (
    <li
      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
      key={candidate.path}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FolderGit2Icon aria-hidden={true} className="size-4 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{candidate.name}</p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {candidate.path}
          </p>
        </div>
      </div>
      {candidate.alreadyRegistered ? (
        <Badge variant="secondary">
          {WORKSPACE_FOLDERS_COPY.alreadyRegisteredBadge}
        </Badge>
      ) : (
        <Form method="post">
          <input name="intent" type="hidden" value="addFolder" />
          <input name="path" type="hidden" value={candidate.path} />
          <Button disabled={isAdding} size="sm" type="submit">
            {isAdding ? 'Adding…' : 'Add'}
          </Button>
        </Form>
      )}
    </li>
  );

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
            {discoveredFolders.map(renderCandidate)}
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
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get('path');
              if (typeof value === 'string' && value.trim() !== '') {
                handleBrowse(value.trim());
              }
            }}
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
            onClick={() => setShowManualPath((current) => !current)}
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
