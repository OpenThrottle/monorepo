import * as React from 'react';
import { Form } from 'react-router';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon } from 'lucide-react';
import type { DiscoveredFolderObject } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface WorkspaceAddFolderCandidateProps {
  candidate: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >;
  isAdding: boolean;
}

/**
 * @description One discovered-folder row in the add-folder dialog: name, path,
 * and either an "Already added" badge or an Add submit. Split out of
 * WorkspaceAddFolderDialog (component-primitive-shape R6).
 */
export const WorkspaceAddFolderCandidate = (
  props: WorkspaceAddFolderCandidateProps,
): React.ReactElement => {
  const { candidate, isAdding } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
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
};
