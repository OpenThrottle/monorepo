import { Module } from '@nestjs/common';
import { POLICY_FACTORY } from '@openthrottle/nestjs-common';
import { LoggerModule } from '@nestjs/common';
import { CertsRepositoryModule } from '@openthrottle/nestjs-core/src/repositories/certs/certs.module';
import { <%= namePascal %>Service } from './<%= name %>.service';
import { <%= namePascal %>Resolver } from './<%= name %>.resolver';
import { <%= namePascal %>Policy } from '~/services/<%= name %>/<%= name %>.policy';

@Module({
  controllers: [],
  exports: [<%= namePascal %>Service],
  imports: [CertsRepositoryModule, LoggerModule],
  providers: [
    <%= namePascal %>Resolver,
    <%= namePascal %>Service,
    {
      provide: POLICY_FACTORY,
      useClass: <%= namePascal %>Policy,
    },
  ],
})
export class <%= namePascal %>Module {}
