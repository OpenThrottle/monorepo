/**
 * @description GraphQL module for auth: login mutation (public). Uses JwtModule to sign tokens compatible with NestjsAuthModule JWT strategy. LocalStrategy validates email/password against OpenThrottle users.
 */

import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { GqlLocalCredentialsGuard } from './guards/gql-local-credentials.guard';
import { GqlLocalAuthGuard } from './guards/gql-local-auth.guard';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { SubscriptionTokenResolver } from './subscription-token.resolver';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const issuer = config.get<string>('JWT_ISSUER');
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: '24h',
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
