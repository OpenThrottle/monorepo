import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import type { NestjsAuthOptions } from './auth.options';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { NestjsAuthService } from './nestjs-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

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
      exports: [JwtAuthGuard, JwtStrategy, NestjsAuthService],
      global: false,
      imports: [
        ConfigModule,
        LoggerModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      module: NestjsAuthModule,
      providers: [
        NestjsAuthService,
        JwtAuthGuard,
        {
          provide: 'NESTJS_AUTH_OPTIONS',
          useValue: options ?? null,
        },
        {
          inject: [ConfigService, 'NESTJS_AUTH_OPTIONS'],
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
   */
  static forRootAsync(options: {
    inject?: Array<string | symbol | import('@nestjs/common').Type>;
    useFactory: (
      ...args: NestjsAuthOptions[]
    ) => NestjsAuthOptions | Promise<NestjsAuthOptions>;
  }): DynamicModule {
    return {
      exports: [JwtAuthGuard, JwtStrategy, NestjsAuthService],
      global: false,
      imports: [
        ConfigModule,
        LoggerModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      module: NestjsAuthModule,
      providers: [
        NestjsAuthService,
        {
          inject: options.inject ?? [],
          provide: 'NESTJS_AUTH_OPTIONS',
          useFactory: options.useFactory,
        },
        {
          inject: [ConfigService, 'NESTJS_AUTH_OPTIONS'],
          provide: JwtStrategy,
          useFactory: (configService: ConfigService, opts: NestjsAuthOptions) =>
            new JwtStrategy(configService, opts),
        },
      ],
    };
  }
}
