import { HydratedRouter } from 'react-router/dom';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { installClientLogSink } from '~/routing/settings/client-log-sink';

installClientLogSink();

/**
 * By default, React Router will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `react-router reveal` ✨
 * For more information, see https://reactrouter.com/explanation/special-files#entryclienttsx
 */
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/worker.js');
  });

  /**
   * Prevents the default mini-infobar or install dialog from appearing on
   * mobile, storing the original event so we can use it later in the users
   * journey.
   */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();

    // global.deferredPrompt = e;
  });
}
