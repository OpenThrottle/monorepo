import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkArtifact } from './work-artifact.entity.ts';
import { WorkArtifactsRepository } from './work-artifacts.repository.ts';

/**
 * @description Registers {@link WorkArtifact} on the default connection and provides
 * {@link WorkArtifactsRepository}.
 * @public
 */
@Module({
  exports: [WorkArtifactsRepository],
  imports: [TypeOrmModule.forFeature([WorkArtifact])],
  providers: [WorkArtifactsRepository],
})
export class WorkArtifactsModule {}
