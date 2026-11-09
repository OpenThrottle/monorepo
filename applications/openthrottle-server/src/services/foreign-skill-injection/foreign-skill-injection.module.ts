import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { ForeignSkillInjectionLifecycleService } from './lifecycle/lifecycle.service.ts';
import { ForeignSkillMaterializationService } from './materialization/materialization.service.ts';
import { WorktreeSkillOverlayService } from './worktree-skill-overlay/worktree-skill-overlay.service.ts';

/**
 * @description Foreign-skill injection wiring: the server-scoped lifecycle
 * ({@link ForeignSkillInjectionLifecycleService} — graceful-shutdown teardown of every ledgered
 * foreign repo, plus boot crash-recovery) and the on-demand apply-now materializer
 * ({@link ForeignSkillMaterializationService}) that the per-checkout toggle drives, and the default-on
 * `ot-worktree` overlay ({@link WorktreeSkillOverlayService}) applied before plan-run provisioning. Imported by the
 * module owning foreign-run execution (so shutdown hooks fire in that process) and by workspace
 * settings (so the toggle can apply to disk immediately).
 */
@Module({
  exports: [
    ForeignSkillInjectionLifecycleService,
    ForeignSkillMaterializationService,
    WorktreeSkillOverlayService,
  ],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [
    ForeignSkillInjectionLifecycleService,
    ForeignSkillMaterializationService,
    WorktreeSkillOverlayService,
  ],
})
export class ForeignSkillInjectionModule {}
