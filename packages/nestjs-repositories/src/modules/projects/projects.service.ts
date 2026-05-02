import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm/common/DeepPartial';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    this.logger.debug('🧩 projects 🧩');
  }

  /**
   * @description Returns the TypeORM repository for projects. Use for CRUD and queries.
   */
  getRepository(): Repository<Project> {
    return this.projectRepository;
  }

  /**
   * @description Finds a project by id, or null if not found.
   */
  async findById(id: string): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { id } });
  }

  /**
   * @description Returns all projects, ordered by created_at descending.
   */
  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * @description Creates a new project. Returns the saved entity.
   */
  async create(data: DeepPartial<Project>): Promise<Project> {
    const entity = this.projectRepository.create(data);
    return this.projectRepository.save(entity);
  }

  /**
   * @description Updates an existing project by id. Returns the saved entity or null if not found.
   */
  async update(
    id: string,
    data: DeepPartial<Project>,
  ): Promise<Project | null> {
    const existing = await this.projectRepository.findOne({ where: { id } });
    if (!existing) return null;
    this.projectRepository.merge(existing, data);
    return this.projectRepository.save(existing);
  }

  /**
   * @description Deletes a project by id. Returns true if a row was removed. Related plans/tasks keep their rows; `project_id` is set to null (ON DELETE SET NULL).
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.projectRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
