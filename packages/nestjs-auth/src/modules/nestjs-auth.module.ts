import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import type { NestjsAuthOptions } from '../config/nestjs-auth.options';

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
      exports: [JwtAuthGuard, JwtStrategy],
      global: false,
      imports: [
        ConfigModule,
        LoggerModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      module: NestjsAuthModule,
      providers: [
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
