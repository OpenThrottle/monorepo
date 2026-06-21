import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { NESTJS_AUTH_OPTIONS } from '../config/nestjs-auth.tokens';
import type { NestjsAuthOptions } from '../config/nestjs-auth.options';

/**
 * @description Asserts that an async factory returned a usable {@link NestjsAuthOptions}.
 * `forRootAsync` factories are typed `(...args: unknown[]) => ...`, so the returned
 * value is validated at runtime before it reaches the strategy constructor — a
 * malformed object (e.g. missing `jwtSecret`) fails loudly here instead of producing
 * a confusing downstream error.
 */
const assertNestjsAuthOptions = (value: unknown): NestjsAuthOptions => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(
      'NestjsAuthModule.forRootAsync: useFactory must return a NestjsAuthOptions object',
    );
  }

  const jwtSecret = Reflect.get(value, 'jwtSecret');

  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new Error(
      'NestjsAuthModule.forRootAsync: returned options.jwtSecret must be a non-empty string',
    );
  }

  return value as NestjsAuthOptions;
};

/**
 * @description Registers auth with optional config. Use forRoot when you have a static secret,
 * forRootAsync when loading from ConfigService or other async source.
 */
@Module({})
export class NestjsAuthModule {
  /**
   * @description Register using JWT_SECRET from env. Simplest setup.
   */
  static forRoot(): DynamicModule;

  /**
   * @description Register with static options. JWT secret from options or JWT_SECRET env.
   */
  static forRoot(options: NestjsAuthOptions): DynamicModule;

  static forRoot(options?: NestjsAuthOptions): DynamicModule {
    return {
      exports: [JwtAuthGuard, JwtStrategy],
      global: false,
      imports: [
        ConfigModule,
        LoggerModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      module: NestjsAuthModule,
      providers: [
        JwtAuthGuard,
        {
          provide: NESTJS_AUTH_OPTIONS,
          useValue: options ?? null,
        },
        {
          inject: [ConfigService, NESTJS_AUTH_OPTIONS],
          provide: JwtStrategy,
          useFactory: (
            configService: ConfigService,
            opts: NestjsAuthOptions | null,
          ) => new JwtStrategy(configService, opts ?? undefined),
        },
      ],
    };
  }

  /**
   * @description Register with async options. Use when JWT_SECRET comes
   * from ConfigService.
   *
   * `useFactory` is typed `(...args: unknown[]) => ...` because its injected deps
   * (e.g. `ConfigService`) are not `NestjsAuthOptions` — only its return value is.
   * The returned value is validated at runtime ({@link assertNestjsAuthOptions})
   * before the strategy is constructed.
   */
  static forRootAsync(options: {
    inject?: Array<string | symbol | import('@nestjs/common').Type>;
    useFactory: (
      ...args: unknown[]
    ) => NestjsAuthOptions | Promise<NestjsAuthOptions>;
  }): DynamicModule {
    return {
      exports: [JwtAuthGuard, JwtStrategy],
      global: false,
      imports: [
        ConfigModule,
        LoggerModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      module: NestjsAuthModule,
      providers: [
        JwtAuthGuard,
        {
          inject: options.inject ?? [],
          provide: NESTJS_AUTH_OPTIONS,
          useFactory: async (...args: unknown[]): Promise<NestjsAuthOptions> =>
            assertNestjsAuthOptions(await options.useFactory(...args)),
        },
        {
          inject: [ConfigService, NESTJS_AUTH_OPTIONS],
          provide: JwtStrategy,
          useFactory: (configService: ConfigService, opts: NestjsAuthOptions) =>
            new JwtStrategy(configService, opts),
        },
      ],
    };
  }
}
