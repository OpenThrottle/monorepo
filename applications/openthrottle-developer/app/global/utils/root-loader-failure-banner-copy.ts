import { ROOT_LOADER_FAILURE_SNIPPET_MAX } from '~/global/config/root-loader-failure-banner';

import type { RootLoaderFailure } from './root-loader-diagnostics';
import {
  rootLoaderFailureKindLabel,
  rootLoaderStepLabel,
  truncateForBanner,
} from './root-loader-diagnostics';

export interface RootLoaderFailureBannerCopy {
  readonly detail: string;
  readonly failureKey: string | null;
  readonly stepLine: string | null;
  readonly title: string;
}

const AMBIGUOUS_SESSION_TITLE = 'Session could not be verified';
const AMBIGUOUS_SESSION_DETAIL = `The request to load your account failed. You may be offline or the API may be unreachable. Retry after checking the network and server.`;

/**
 * @description Derives the banner title, detail, step line and reset key from
 * the root loader failure; `null` means only the user session was ambiguous.
 */
export const buildRootLoaderFailureBannerCopy = (
  failure: RootLoaderFailure | null,
): RootLoaderFailureBannerCopy => {
  if (failure === null) {
    return {
      detail: AMBIGUOUS_SESSION_DETAIL,
      failureKey: null,
      stepLine: null,
      title: AMBIGUOUS_SESSION_TITLE,
    };
  }

  return {
    detail: truncateForBanner(failure.message, ROOT_LOADER_FAILURE_SNIPPET_MAX),
    failureKey: `${failure.step}:${failure.kind}:${failure.message}`,
    stepLine: `Failed while loading: ${rootLoaderStepLabel(failure.step)}.`,
    title: rootLoaderFailureKindLabel(failure.kind),
  };
};
