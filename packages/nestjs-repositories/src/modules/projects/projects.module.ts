import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [],
  exports: [ProjectsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([Project])],
  providers: [ProjectsService],
})
export class ProjectsModule {}
