import './load-env.ts';

import { existsSync } from 'node:fs';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ensureUserEnvEntries } from '@openthrottle/agentic-hooks';
import { resolveQueuePrefix } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  createProfileExecutionFileWriter,
  setProfileExecutionReporter,
} from '@openthrottle/nestjs-profiling';
import { getCorsOptions } from '@openthrottle/nestjs-rbac';

import { ApiAppModule } from './api-app/api-app.module.ts';
import { AppModule } from './app.module.ts';
import { configureBodyParsers } from './body-parsers/body-parsers.utils.ts';
import { PROCESS_ROLES } from './config/config.constants.ts';
import type { ProcessRole } from './config/config.types.ts';
import { resolveProcessRole } from './config/config.utils.ts';
import { UserEnvFileService } from './services/user-env-file/user-env-file.service.ts';
import { ensureUserEnvFile } from './services/user-env-file/user-env-file.utils.ts';
import { WorkerAppModule } from './worker-app/worker-app.module.ts';

/**
 * @description One boot warning when `~/.openthrottle/.env` is missing or stale, so a
 * broken credential path for agents in other checkouts shows up without running the
 * hooks doctor. Only roles that load `UserEnvFileService` check; never fails boot.
 */
const logUserEnvFileHealth = async (
  app: NestExpressApplication,
): Promise<void> => {
  let service: UserEnvFileService;
  try {
    service = app.get(UserEnvFileService, { strict: false });
  } catch {
    return;
  }
  await service.logBootHealth();
};

/**
 * @description Role-gated composition root consumed by the single `main.ts`
 * bootstrap (no duplicate worker entrypoint). Returns a STATIC module class —
 * see {@link buildImports} for why a DynamicModule would reorder the schema.
 */
const buildAppModule = ({
  role,
}: {
  role: ProcessRole;
}): typeof AppModule | typeof ApiAppModule | typeof WorkerAppModule => {
  if (role === PROCESS_ROLES.api) {
    return ApiAppModule;
  }

  if (role === PROCESS_ROLES.worker) {
    return WorkerAppModule;
  }

  return AppModule;
};

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
  const app = await NestFactory.create<NestExpressApplication>(
    buildAppModule({ role }),
    {
      rawBody: true, // required for Stripe webhook signature verification (req.rawBody)
      snapshot: true,
    },
  );

  configureBodyParsers(app);

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

  /**
   * Fill in `~/.openthrottle/.env` so hooks in every checkout on this machine can
   * reach this server. Primary, non-container servers only; fail-open.
   */
  ensureUserEnvFile({
    ensure: ensureUserEnvEntries,
    env: process.env,
    fileExists: existsSync,
    logger,
    port,
    tokenOverride: undefined,
  });
  void logUserEnvFileHealth(app);

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
