/**
 * @description GraphQL enum for workspace editor preferences. Values align with
 * {@link WORKSPACE_EDITOR_IDS} in @openthrottle/nestjs-repositories.
 */

import { registerEnumType } from '@nestjs/graphql';
import { WORKSPACE_EDITOR_IDS } from '@openthrottle/nestjs-repositories';

export const WorkspaceEditorIdEnum = {
  CLAUDE: 'claude',
  CURSOR: 'cursor',
  VSCODE: 'vscode',
} as const;

export type WorkspaceEditorIdEnum =
  (typeof WorkspaceEditorIdEnum)[keyof typeof WorkspaceEditorIdEnum];

registerEnumType(WorkspaceEditorIdEnum, {
  description: `Editor OpenThrottle may configure in linked local repositories (MCP, skills, rules). Supported values: ${WORKSPACE_EDITOR_IDS.join(', ')}.`,
  name: 'WorkspaceEditorId',
  valuesMap: {
    CLAUDE: { description: 'Claude Code' },
    CURSOR: { description: 'Cursor IDE' },
    VSCODE: { description: 'Visual Studio Code' },
  },
});
