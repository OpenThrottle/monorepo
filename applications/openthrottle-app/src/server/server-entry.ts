// Entry of the utility process that hosts the developer production server.
//
// Order is load-bearing: @openthrottle/react-router-utils snapshots APP_URL & co
// at module import, so this binds a port FIRST, writes the dynamic origin into
// process.env, and only THEN dynamically imports the developer build.
import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createRequestHandler } from '@react-router/express';
import compression from 'compression';
import express from 'express';

import { SHELL_HEALTH_PATH } from '../main/data/data.server-env.ts';
import {
  dropUndefined,
  withLocalOrigin,
} from '../main/utils/buildServerEnv.ts';
import { createOtProxy } from './utils/createOtProxy.ts';

const buildDir = process.env['OPENTHROTTLE_DEVELOPER_BUILD_DIR'];
const serverUrl = process.env['API_URL_INTERNAL'];

const reportAndExit = (message: string): never => {
  process.stderr.write(`[openthrottle-server] ${message}\n`);
  process.exit(1);
};

const run = async (): Promise<void> => {
  if (buildDir === undefined || serverUrl === undefined) {
    return reportAndExit(
      'OPENTHROTTLE_DEVELOPER_BUILD_DIR and API_URL_INTERNAL are required',
    );
  }

  const app = express();
  const proxy = createOtProxy(serverUrl);
  const server = createServer(app);
  let ready = false;

  proxy.attachUpgrade(server);

  app.disable('x-powered-by');
  app.get(SHELL_HEALTH_PATH, (_request, response) => {
    response
      .status(ready ? 200 : 503)
      .type('text/plain')
      .send(ready ? 'ok' : 'starting');
  });
  app.use((request, response, next) => {
    if (!proxy.handleRequest(request, response)) {
      next();
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (address === null || typeof address === 'string') {
    return reportAndExit('could not read the bound port');
  }

  const origin = `http://127.0.0.1:${address.port}`;
  Object.assign(
    process.env,
    withLocalOrigin(dropUndefined(process.env), origin),
  );

  process.stderr.write(`[openthrottle-server] listening on ${origin}\n`);
  process.parentPort.postMessage({ port: address.port });

  const build = await import(
    pathToFileURL(join(buildDir, 'server/index.js')).href
  );

  app.use(compression());
  app.use(
    '/assets',
    express.static(join(buildDir, 'client/assets'), {
      immutable: true,
      maxAge: '1y',
    }),
  );
  app.use(express.static(join(buildDir, 'client'), { maxAge: '1h' }));
  app.all('*splat', createRequestHandler({ build, mode: 'production' }));
  ready = true;
  process.stderr.write('[openthrottle-server] ready\n');
};

run().catch((error: unknown) => {
  reportAndExit(
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
});
