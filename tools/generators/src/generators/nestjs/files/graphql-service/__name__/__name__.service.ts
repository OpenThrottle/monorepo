import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { RolesRepository } from '@openthrottle/nestjs-core/src/repositories/certs/roles.repository';
// import { Get<%= namePascal %>Args } from '~/services/<%= name %>/dto/get-<%= name %>.args';

@Injectable()
export class <%= namePascal %>Service {
  constructor(
    private readonly logger: LoggerService,
    private readonly repository: RolesRepository,
  ) {}

  getRoleById(roleId: string) {
    return this.repository.findByUUID(roleId);
  }
}
