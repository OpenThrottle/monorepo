import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  createProfileExecutionFileWriter,
  setProfileExecutionReporter,
} from '@openthrottle/nestjs-profiling';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { getCorsOptions } from '@openthrottle/nestjs-rbac';
import { IoAdapter } from '@openthrottle/nestjs-websockets';
import { AppModule } from './app.module';

/**
 * @description Bootstrap our NestJS + GraphQL + Websockets backend for
 * the OpenThrottle platform.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // required for Stripe webhook signature verification (req.rawBody)
    snapshot: true,
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

  /** Use Socket.IO adapter so @openthrottle/nestjs-websockets gateway. */
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global middleware to set response headers
  // app.use(setHeadersMiddleware);

  /** @external https://github.com/meabed/graphql-upload-ts */
  // app.use(
  //   graphqlUploadExpress({
  //     maxFileSize: 10_000_000,
  //     maxFiles: 10,
  //   }),
  // );

  // 🚧 We only want this when we're using a REST API, not for GraphQL
  // /** @external https://docs.nestjs.com/pipes#global-scoped-pipes */
  // app.useGlobalPipes(
  //   // Used to validate incoming requests
  //   new ValidationPipe({
  //     // Strip any properties that don't decorators (aren't correctly set)
  //     whitelist: true,
  //   }),
  // );

  await app.listen(port);

  logger.info(`\n\n\n  🚀 Application is running on: ${url} \n\n`);
}

// /**
//  * @description Middleware to set response headers
//  */
// const setHeadersMiddleware = (
//   _req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   res.headers.set('X-App-Name', process.env.APP_NAME!);
//   res.headers.set('X-App-Version', process.env.APP_VERSION!);
//
//   next();
// };

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

bootstrap();
