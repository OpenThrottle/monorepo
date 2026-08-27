import * as React from 'react';
import {
  ClaudeIcon,
  CursorIcon,
  VscodeIcon,
} from '@openthrottle/react-router-chat-state';
import { WorkspaceEditorId } from '~/__generated__/graphql';

/** Brand glyph for an editor. Draws with `currentColor` and is `aria-hidden`. */
export type WorkspaceEditorIcon = (props: {
  className?: string;
}) => React.ReactElement;

/**
 * @description Presentation metadata for one supported editor: the label every
 * surface shows, the brand glyph, and a one-line statement of what an apply run
 * actually writes for it. `description` mirrors
 * `WORKSPACE_EDITOR_CONFIG_PATHS` in `@openthrottle/nestjs-repositories` — if
 * the write targets move, this copy moves with them.
 */
export interface WorkspaceEditorOption {
  readonly description: string;
  readonly icon: WorkspaceEditorIcon;
  readonly label: string;
  readonly value: WorkspaceEditorId;
}

/**
 * Editor catalog keyed by id. Exhaustive over `WorkspaceEditorId` on purpose,
 * the way `WORKSPACE_EDITOR_DEEP_LINKS` is: adding an editor to the schema
 * fails typecheck here until its presentation is declared, rather than
 * silently rendering a blank card.
 *
 * Affiliate URLs deliberately stay out of this record — they live in
 * `workspace-editor-affiliate-links.ts` and are read through
 * `getWorkspaceEditorAffiliateUrl`.
 */
export const WORKSPACE_EDITOR_CATALOG: Readonly<
  Record<WorkspaceEditorId, WorkspaceEditorOption>
> = {
  [WorkspaceEditorId.Claude]: {
    description: `Writes .mcp.json and a .claude directory at the repository root.`,
    icon: ClaudeIcon,
    label: 'Claude Code',
    value: WorkspaceEditorId.Claude,
  },
  [WorkspaceEditorId.Cursor]: {
    description: `Writes .cursor/mcp.json and rules into .cursor/rules.`,
    icon: CursorIcon,
    label: 'Cursor',
    value: WorkspaceEditorId.Cursor,
  },
  [WorkspaceEditorId.Vscode]: {
    description: `Writes .vscode/mcp.json and configuration into .vscode.`,
    icon: VscodeIcon,
    label: 'Visual Studio Code',
    value: WorkspaceEditorId.Vscode,
  },
};

/**
 * Display order for every editor surface, derived from the catalog so a new
 * entry cannot be added to one and forgotten in the other.
 */
export const WORKSPACE_EDITOR_OPTIONS: readonly WorkspaceEditorOption[] = [
  WORKSPACE_EDITOR_CATALOG[WorkspaceEditorId.Claude],
  WORKSPACE_EDITOR_CATALOG[WorkspaceEditorId.Cursor],
  WORKSPACE_EDITOR_CATALOG[WorkspaceEditorId.Vscode],
];

/**
 * Resolve an editor's presentation, tolerating ids the server knows but this
 * client's generated enum does not yet.
 */
export const getWorkspaceEditorOption = (
  editor: WorkspaceEditorId,
): WorkspaceEditorOption | null => WORKSPACE_EDITOR_CATALOG[editor] ?? null;
