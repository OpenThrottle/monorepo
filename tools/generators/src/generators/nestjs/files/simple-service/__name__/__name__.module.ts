import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-common';
import { CertsRepositoryModule } from '@openthrottle/nestjs-core/src/repositories/certs/certs.module';
import { <%= namePascal %>Service } from './<%= name %>.service';

@Module({
  controllers: [],
  exports: [<%= namePascal %>Service],
  imports: [CertsRepositoryModule, LoggerModule],
  providers: [
    <%= namePascal %>Service,
  ],
})
export class <%= namePascal %>Module {}
