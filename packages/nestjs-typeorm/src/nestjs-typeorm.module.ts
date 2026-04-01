import { ConfigModule } from '@nestjs/config'; // If using @nestjs/config
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { Module } from '@nestjs/common';
import { getTypeormConfig, schema } from './nestjs-typeorm.config';
import { NestjsTypeormService } from './nestjs-typeorm.service';
import { databaseProviders } from './modules/database/database.providers';

@Module({
  controllers: [],
  exports: [...databaseProviders, NestjsTypeormService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      load: [getTypeormConfig],
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
        cache: true,
      },
      validationSchema: schema,
    }),
    LoggerModule,
  ],
  providers: [...databaseProviders, NestjsTypeormService],
})
export class NestjsTypeormModule {}
