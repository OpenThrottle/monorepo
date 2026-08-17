import type { CommanderGroup } from '@openthrottle/react-router-ui';
import {
  FEATURE_BETA_PREVIEW,
  FEATURE_CHARLIE_PREVIEW,
} from '@openthrottle/react-router-utils';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { NavigationRecord } from '~/global/utils/navigation-to-commander-groups';
import { buildCommanderGroupsFromNavigation } from '~/global/utils/navigation-to-commander-groups';

/**
 * @description Commander groups for the developer app, derived from the same
 * navigation record that drives the global sidebar (`dataNavigationV2` /
 * `dataNavigationGuest`) — so a link added in `data.navigation.ts` shows up in
 * ⌘K with no second list to maintain. Beta/disabled links follow the sidebar's
 * feature-flag rules; items navigate via `useNavigate`.
 */
export function useCommanderOptions(
  navigation: NavigationRecord,
): CommanderGroup[] {
  // Hooks
  const navigate = useNavigate();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return useMemo(
    () =>
      buildCommanderGroupsFromNavigation(navigation, {
        isBetaEnabled: FEATURE_BETA_PREVIEW,
        isCharlieEnabled: FEATURE_CHARLIE_PREVIEW,
        navigate: (path: string) => {
          navigate(path);
        },
      }),
    [navigate, navigation],
  );
}
