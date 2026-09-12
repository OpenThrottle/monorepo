/**
 * @description GraphQL module for auth: login mutation (public). Uses JwtModule to sign tokens compatible with NestjsAuthModule JWT strategy. LocalStrategy validates email/password against OpenThrottle users.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GqlLocalAuthGuard } from './guards/gql-local-auth.guard';
import { GqlLocalCredentialsGuard } from './guards/gql-local-credentials.guard';
import { LocalStrategy } from './strategies/local.strategy';
import { SubscriptionTokenResolver } from './subscription-token.resolver';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const audience = config.get<string>('JWT_AUDIENCE');
        const issuer = config.get<string>('JWT_ISSUER');
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: '24h',
            // Opt-in: stamp `aud` so audience-bound verifiers accept the token.
            // Omitted when JWT_AUDIENCE is unset to preserve existing tokens.
            ...(audience ? { audience } : {}),
            ...(issuer ? { issuer } : {}),
          },
        };
      },
    }),
    LoggerModule,
    NestjsRepositoriesModule,
    PassportModule,
  ],
  providers: [
    AuthResolver,
    AuthService,
    GqlLocalAuthGuard,
    GqlLocalCredentialsGuard,
    LocalStrategy,
    SubscriptionTokenResolver,
  ],
})
export class AuthGraphqlModule {}
