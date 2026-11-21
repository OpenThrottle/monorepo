import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  PaginationInput,
  PaginationOptions,
} from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  resolvePagination,
} from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { User } from './user.entity.ts';
import type { UserCreateInput } from './users.types.ts';

/**
 * @description Data access for the openthrottle `users` table on the default connection: the
 * `BaseRepository` CRUD plus the login lookups, the newest-first list and the disable switch.
 * A delete is a soft delete. Password hashing lives in `hashPassword` / `validatePassword`.
 * @public
 */
@Injectable()
export class UsersRepository extends BaseRepository<User, UserCreateInput> {
  protected readonly tableName = 'users';

  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
  ) {
    super(repository);
  }

  /**
   * @description Finds a live user by email, or null if not found. Use for local auth login.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  /**
   * @description Finds a live user by github_username, or null if not found.
   */
  async findByGithubUsername(githubUsername: string): Promise<User | null> {
    return this.repository.findOne({ where: { githubUsername } });
  }

  /**
   * @description Returns live users ordered by created_at descending. Accepts an optional
   * clamped `{ limit, offset }` so the result set stays bounded.
   */
  async findAll(
    pagination?: PaginationInput,
    options?: PaginationOptions,
  ): Promise<User[]> {
    const { skip, take } = resolvePagination(pagination, options);
    return this.repository.find({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /**
   * @description Disables a user by setting disabledAt. Login is rejected for disabled users.
   * @throws NotFoundException when no live user has that id.
   */
  async disable(id: string): Promise<User> {
    return this.update(id, { disabledAt: new Date() });
  }

  /**
   * @description Re-enables a user by clearing disabledAt.
   * @throws NotFoundException when no live user has that id.
   */
  async enable(id: string): Promise<User> {
    return this.update(id, { disabledAt: null });
  }
}
