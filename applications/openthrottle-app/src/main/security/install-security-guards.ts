import type { App, Session, WebContents } from 'electron';

import { decideNavigation } from './decide-navigation.ts';
import { decideWindowOpen } from './decide-window-open.ts';
import { isPermissionAllowed } from './is-permission-allowed.ts';

export interface SecurityGuardsOptions {
  readonly app: Pick<App, 'on'>;
  /** The current app origin(s); read on every event because the embedded origin changes after a restart. */
  readonly getAllowedOrigins: () => readonly string[];
  readonly openExternal: (url: string) => void;
}

const readMediaTypes = (details: object): readonly string[] => {
  if ('mediaTypes' in details && Array.isArray(details.mediaTypes)) {
    return details.mediaTypes.filter((type) => typeof type === 'string');
  }

  return [];
};

const guardWebContents = (
  contents: WebContents,
  options: SecurityGuardsOptions,
): void => {
  const { getAllowedOrigins, openExternal } = options;

  // will-navigate is not emitted for webContents.loadURL (how the error page is
  // shown), only for page-initiated navigations; will-redirect covers
  // server-side redirects of any navigation.
  contents.on('will-navigate', (event) => {
    const decision = decideNavigation(event.url, getAllowedOrigins());

    if (decision.kind === 'allow') {
      return;
    }

    event.preventDefault();

    if (decision.kind === 'external') {
      openExternal(decision.url);
    }
  });

  contents.on('will-redirect', (event) => {
    if (!event.isMainFrame) {
      return;
    }

    if (decideNavigation(event.url, getAllowedOrigins()).kind !== 'allow') {
      event.preventDefault();
    }
  });

  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  contents.setWindowOpenHandler((details) => {
    const decision = decideWindowOpen(details.url);

    if (decision.kind === 'external') {
      openExternal(decision.url);
    }

    return { action: 'deny' };
  });
};

/**
 * @description Applies the navigation, new-window and webview guards to every
 * `webContents` the app ever creates (all sessions and partitions). Call once,
 * before any window exists.
 */
export const installWebContentsGuards = (
  options: SecurityGuardsOptions,
): void => {
  options.app.on('web-contents-created', (_event, contents) => {
    guardWebContents(contents, options);
  });
};

/**
 * @description Applies the deny-by-default permission handlers to ONE session.
 * Permission handlers are per session, so every session the app creates (the
 * default one and each per-server partition) must be passed through here;
 * `createGuardedSessionProvider` does that for partitions.
 */
export const installSessionGuards = (
  session: Pick<
    Session,
    'setPermissionCheckHandler' | 'setPermissionRequestHandler'
  >,
  options: Pick<SecurityGuardsOptions, 'getAllowedOrigins'>,
): void => {
  const { getAllowedOrigins } = options;

  session.setPermissionRequestHandler(
    (_contents, permission, callback, details) => {
      const origin = URL.parse(details.requestingUrl)?.origin ?? '';

      callback(
        isPermissionAllowed({
          allowedOrigins: getAllowedOrigins(),
          mediaTypes: readMediaTypes(details),
          permission,
          requestingOrigin: origin,
        }),
      );
    },
  );

  session.setPermissionCheckHandler(
    (_contents, permission, requestingOrigin, details) => {
      const { mediaType } = details;
      const mediaTypes = mediaType === undefined ? [] : [mediaType];

      return isPermissionAllowed({
        allowedOrigins: getAllowedOrigins(),
        mediaTypes,
        permission,
        requestingOrigin,
      });
    },
  );
};
