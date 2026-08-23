import * as React from 'react';
import { editorHref } from '@openthrottle/react-router-ide';
import { Button } from '@openthrottle/react-router-shadcn';
import { FolderOpen } from 'lucide-react';
import { getWorkspaceEditorDeepLink } from '~/global/config/workspace-editor-deep-links';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/** The subset of a registered local checkout this component links to. */
export interface PlanCreateEditorLinksRepository {
  readonly displayName: string;
  /** Server-validated absolute path on the host; the deep-link target. */
  readonly filesystemPath: string;
  readonly id: string;
}

export interface PlanCreateEditorLinksProps {
  /** Editors the user enabled in workspace settings. */
  readonly editors: readonly WorkspaceEditorId[];
  /** The user's registered local checkouts. */
  readonly repositories: readonly PlanCreateEditorLinksRepository[];
}

/**
 * @description "Open in editor" deep-links for the plan-create page, one row per
 * registered local checkout. Every path comes from the user's own workspace
 * settings (never a literal), and the row renders nothing when no checkout or no
 * enabled editor resolves — a missing link beats a dead one. Reuses the shared
 * {@link editorHref} builder so scheme handling stays in the IDE package.
 */
export const PlanCreateEditorLinks = (
  props: PlanCreateEditorLinksProps,
): React.ReactElement | null => {
  const { editors, repositories } = props;

  // Hooks

  // Setup
  const targets = editors
    .map((editor) => getWorkspaceEditorDeepLink(editor))
    .filter((target) => target !== null);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (repositories.length === 0 || targets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-8">
      {repositories.map((repository) => (
        <div className="flex flex-col items-start gap-2" key={repository.id}>
          <div
            className="text-muted-foreground flex items-center gap-1"
            title={repository.filesystemPath}
          >
            <FolderOpen aria-hidden={true} className="size-3 shrink-0" />
            <span className="font-mono">{repository.displayName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {targets.map((target) => (
              <Button
                asChild={true}
                key={target.scheme}
                size="sm"
                variant="outline"
              >
                <a
                  href={editorHref({
                    absolutePath: repository.filesystemPath,
                    scheme: target.scheme,
                  })}
                >
                  Open in {target.label}
                </a>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
