import * as React from 'react';

import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description The signed-in user's default editor (`userPreferences.defaultEditor`),
 * loaded once by the root loader and provided by `App`. `null` means "system
 * default" — editor links then fall back to VS Code, as they did before the
 * preference existed. A context rather than `useRouteLoaderData('root')` so
 * presentational components (and their tests) do not need a data router.
 */
export const DefaultEditorContext =
  React.createContext<WorkspaceEditorId | null>(null);

/**
 * @description Path of the route whose action writes `userPreferences`. The root
 * loader never revalidates otherwise, so a save there must opt it back in or
 * links keep the old editor until a full reload.
 */
export const USER_PREFERENCES_ROUTE_PATH = '/settings/preferences';
