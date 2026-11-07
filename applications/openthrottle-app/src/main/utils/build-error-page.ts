const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
};

/**
 * @description A `data:` URL for the page the window shows when the embedded
 * developer server could not start or kept crashing. No file or network
 * dependency, so it renders even when everything else is broken.
 */
export const buildErrorPageUrl = (reason: string): string => {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'" />
    <title>OpenThrottle</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; }
      main { max-width: 40rem; padding: 2rem; }
      code { display: block; white-space: pre-wrap; margin-top: 1rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>The OpenThrottle server failed to start</h1>
      <p>The embedded Developer server stopped and could not be restarted. Quit and reopen the app to try again.</p>
      <code>${escapeHtml(reason)}</code>
    </main>
  </body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};
