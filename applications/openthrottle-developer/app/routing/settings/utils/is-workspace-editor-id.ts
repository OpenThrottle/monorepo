/**
 * @description Type guard narrowing an arbitrary MultiSelect value to a known
 * workspace editor id. Hoisted out of WorkspaceEditorMultiSelect per
 * component-primitive-shape R4.
 */

import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';

export const isWorkspaceEditorId = (
  value: string,
): value is WorkspaceEditorId =>
  WORKSPACE_EDITOR_OPTIONS.some((opt) => opt.value === value);
