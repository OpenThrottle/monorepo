import './load-env';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  createProfileExecutionFileWriter,
  setProfileExecutionReporter,
} from '@openthrottle/nestjs-profiling';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { getCorsOptions } from '@openthrottle/nestjs-rbac';
import { resolveQueuePrefix } from '@openthrottle/nestjs-bullmq';
import { buildAppModule } from './app.module';
import { PROCESS_ROLES, resolveProcessRole } from './config/process-role';

/**
 * @description Worker-only bootstrap: an application context with BullMQ
 * WorkerHost processors and no HTTP listener, so editing API code (which
 * restarts the api process) never kills an in-flight job or detaches a
 * debugger attached here.
 */
async function bootstrapWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    buildAppModule({ role: PROCESS_ROLES.worker }),
  );

  const logger = new LoggerService();

  /** @external https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown */
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  app.useLogger(logger);

  logger.info(
    `\n\n\n  ⚙️ Worker is running (PROCESS_ROLE=worker, queue prefix "${resolveQueuePrefix()}") \n\n`,
  );
}

/**
 * @description Bootstrap our NestJS + GraphQL backend for
 * the OpenThrottle platform.
 */
async function bootstrap(role: 'all' | 'api'): Promise<void> {
  const app = await NestFactory.create(buildAppModule({ role }), {
    rawBody: true, // required for Stripe webhook signature verification (req.rawBody)
    snapshot: true,
  });

  /**
   * Browsers deliver CSP violation reports with non-JSON content types the
   * default body parser skips: `application/csp-report` (legacy report-uri)
   * and `application/reports+json` (Reports API). Parse both as JSON so the
   * public /csp-reports endpoint receives a body.
   *
   * `application/json` must stay in this list: registering any custom json
   * parser makes Nest skip its default one (both are named `jsonParser`, and
   * registerParserMiddleware dedupes by middleware function name), so this
   * parser becomes the ONLY json parser — omitting `application/json` leaves
   * /graphql POST bodies unparsed and Apollo rejects them with 400.
   */
  (app as NestExpressApplication).useBodyParser('json', {
    type: [
      'application/csp-report',
      'application/json',
      'application/reports+json',
    ],
  });

  const config = app.get(ConfigService);
  const globalPrefix = '';
  const logger = new LoggerService();
  const port = Number(config.get<string>('PORT', '3000'));
  const url = `http://localhost:${port}/${globalPrefix}`;

  const profileOutputPath = config.get<string>('PROFILE_EXECUTION_OUTPUT_PATH');
  if (profileOutputPath) {
    setProfileExecutionReporter(
      createProfileExecutionFileWriter({ outputPath: profileOutputPath }),
    );
  }

  app.setGlobalPrefix(globalPrefix);

  /** CORS: allowed origins, credentials, methods from env (CORS_ORIGINS, CORS_CREDENTIALS, CORS_ALLOWED_METHODS). See docs/nestjs/wiring-auth-rbac.md. */
  app.enableCors(getCorsOptions());

  /** @external https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown */
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);

  /** @external https://docs.nestjs.com/techniques/logger#dependency-injection */
  app.useLogger(logger);

  await app.listen(port);

  logger.info(
    `\n\n\n  🚀 Application is running on: ${url} (PROCESS_ROLE=${role}) \n\n`,
  );
}

/**
 * Use a basic "console.error" below to ensure its not swallowed by NestJS
 * failing to startup correctly.
 */

process.on('uncaughtException', (error) => {
  console.error(`🚨 There was an "uncaughtException" exiting`, error);

  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`🚨 There was an "unhandledRejection" exiting`, error);

  process.exit(1);
});

const role = resolveProcessRole();

if (role === PROCESS_ROLES.worker) {
  bootstrapWorker();
} else {
  bootstrap(role);
}
