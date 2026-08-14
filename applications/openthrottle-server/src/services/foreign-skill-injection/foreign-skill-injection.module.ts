import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { ForeignSkillInjectionLifecycleService } from './foreign-skill-injection-lifecycle.service';
import { ForeignSkillMaterializationService } from './foreign-skill-materialization.service';

/**
 * @description Foreign-skill injection wiring: the server-scoped lifecycle
 * ({@link ForeignSkillInjectionLifecycleService} — graceful-shutdown teardown of every ledgered
 * foreign repo, plus boot crash-recovery) and the on-demand apply-now materializer
 * ({@link ForeignSkillMaterializationService}) that the per-checkout toggle drives. Imported by the
 * module owning foreign-run execution (so shutdown hooks fire in that process) and by workspace
 * settings (so the toggle can apply to disk immediately).
 */
@Module({
  exports: [
    ForeignSkillInjectionLifecycleService,
    ForeignSkillMaterializationService,
  ],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [
    ForeignSkillInjectionLifecycleService,
    ForeignSkillMaterializationService,
  ],
})
export class ForeignSkillInjectionModule {}
