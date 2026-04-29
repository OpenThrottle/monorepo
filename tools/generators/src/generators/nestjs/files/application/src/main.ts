import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AppModule } from './app.module';
// import { NextFunction, Request, Response } from 'express';

/**
 * 🚨 This is not a production server yet! 🚨
 * This is only a minimal backend to get started.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });

  const globalPrefix = '';
  const logger = new LoggerService();
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/${globalPrefix}`;

  app.setGlobalPrefix(globalPrefix);

  /** @external https://docs.nestjs.com/security/cors */
  // app.enableCors({ origin: getCorsConfiguration });

  /** @external https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown */
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);

  /** @external https://docs.nestjs.com/techniques/logger#dependency-injection */
  app.useLogger(logger);

  // // Global middleware to set response headers
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

  // logger.info(`\n\n\n  🚀 Application is running on: ${url} \n\n`);
  console.info(`\n\n\n  🚀 Application is running on: ${url} \n\n`);

  // logger.info('📦 nestjs-tester 📦', { ANOTHER_VALUE, NESTJS_TESTER_UTILS });
}

// const setHeadersMiddleware = (
//   _req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   res.set({
//     'X-App-Name': process.env.APP_NAME,
//     'X-App-Version': process.env.APP_VERSION,
//   });

//   next();
// };

/**
 * Use a basic "console.error" below to ensure its not swallowed by NestJS
 * failing to startup correctly.
 */

process.on('uncaughtException', (error) => {
  console.error(`🚨 There was an "uncaughtException", process exiting`, error);

  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`🚨 There was an "unhandledRejection", process exiting`, error);

  process.exit(1);
});

bootstrap();
