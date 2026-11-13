import * as React from 'react';

import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { DefaultEditorContext } from '~/global/config/DefaultEditorContext';

/**
 * @description The user's default editor, or `null` for the system default.
 * Read once by the root loader and provided by `App` — nothing refetches per
 * component. Outside the provider (isolated component tests) it is `null`.
 */
export const useDefaultEditor = (): WorkspaceEditorId | null => {
  // Hooks
  const defaultEditor = React.useContext(DefaultEditorContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return defaultEditor;
};
