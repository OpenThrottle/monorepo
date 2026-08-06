/**
 * By default, React Router will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `react-router reveal` ✨
 * For more information, see https://reactrouter.com/explanation/special-files#entryservertsx
 */

import * as React from 'react';
import { PassThrough } from 'node:stream';
import type { EntryContext, RouterContextProvider } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import {
  DEFAULT_STREAM_TIMEOUT,
  NonceContext,
  buildCsp,
  generateCspNonce,
  getOfflineModeTemplate,
  logger,
} from '@openthrottle/react-router-utils';
import { getCspOptions } from '~/global/config/csp';
import { SITE_TITLE } from '~/global/config/settings';

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  /**
   * This is ignored so we can keep it in the template for visibility.
   * Feel free to delete this parameter in your app if you're not using it!
   */
  _loadContext: RouterContextProvider,
) {
  if (process.env.OFFLINE_MODE === 'true') {
    const template = getOfflineModeTemplate(SITE_TITLE);
    return new Response(template, {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }

  /**
   * Mint a per-request CSP nonce and emit the (report-only) policy via a
   * response header. The same nonce is threaded into the React tree so the
   * inline bootstrap scripts in `root.tsx` carry a matching `nonce` attribute.
   * This replaces the former static CSP header in vercel.json — do NOT add a
   * static header back; two CSP headers are enforced as their intersection.
   */
  const nonce = generateCspNonce();
  const csp = buildCsp(nonce, getCspOptions());

  responseHeaders.set(csp.headerName, csp.value);
  if (csp.reportingEndpoints) {
    responseHeaders.set('Reporting-Endpoints', csp.reportingEndpoints);
  }

  return isbot(request.headers.get('user-agent') || '')
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        reactRouterContext,
        nonce,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        reactRouterContext,
        nonce,
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  nonce: string,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceContext.Provider value={nonce}>
        <ServerRouter
          context={reactRouterContext}
          nonce={nonce}
          url={request.url}
        />
      </NonceContext.Provider>,
      {
        nonce,
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            logger.error(error);
          }
        },
        onShellError(error: unknown) {
          reject(error);
        },
      },
    );

    setTimeout(abort, DEFAULT_STREAM_TIMEOUT + 1_000);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  nonce: string,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceContext.Provider value={nonce}>
        <ServerRouter
          context={reactRouterContext}
          nonce={nonce}
          url={request.url}
        />
      </NonceContext.Provider>,
      {
        nonce,
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            logger.error(error);
          }
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
      },
    );

    setTimeout(abort, DEFAULT_STREAM_TIMEOUT + 1_000);
  });
}
