import type { GlobalBackgroundActivity } from '@openthrottle/react-router-ui-global';

/**
 * @description Polling for the sidebar footer's background-activity bar (OT plan
 * 5767e798). The resource route serves the list; the hook re-loads it at this
 * interval only while something is running and the tab is visible.
 */
export const BACKGROUND_ACTIVITIES_RESOURCE_PATH = `/resources/background-activities`;

export const BACKGROUND_ACTIVITIES_POLL_INTERVAL_MS = 5000;

/**
 * @description The idle list. One shared instance, so a component that falls
 * back to it hands the polling hook the same array on every render.
 */
export const NO_BACKGROUND_ACTIVITIES: readonly GlobalBackgroundActivity[] = [];
