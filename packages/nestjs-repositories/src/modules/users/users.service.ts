import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm/common/DeepPartial';
import {
  type ListPaginationInput,
  resolveListPagination,
} from '../../common/list-pagination';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.logger.debug('👤 users 👤');
  }

  /**
   * @description Returns the TypeORM repository for users. Use for CRUD and queries.
   */
  getRepository(): Repository<User> {
    return this.userRepository;
  }

  /**
   * @description Finds a user by id, or null if not found.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * @description Finds a user by email, or null if not found. Use for local auth login.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * @description Finds a user by github_username, or null if not found.
   */
  async findByGithubUsername(githubUsername: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { githubUsername } });
  }

  /** Default bcrypt rounds when hashing passwords (10 is a reasonable default). */
  private static readonly DEFAULT_BCRYPT_ROUNDS = 10;

  /**
   * @description Hashes a plain-text password with bcrypt. Use when creating or updating a user (e.g. registration).
   */
  async hashPassword(
    plainPassword: string,
    rounds: number = UsersService.DEFAULT_BCRYPT_ROUNDS,
  ): Promise<string> {
    return bcrypt.hash(plainPassword, rounds);
  }

  /**
   * @description Compares a plain-text password with a bcrypt hash. Returns true if they match.
   * Use when validating login credentials (e.g. in Passport local strategy).
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string | null | undefined,
  ): Promise<boolean> {
    if (hashedPassword == null || hashedPassword === '') {
      return false;
    }
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * @description Returns users ordered by created_at descending. Accepts an
   * optional clamped `{ limit, offset }` so the result set stays bounded.
   */
  async findAll(pagination?: ListPaginationInput): Promise<User[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /**
   * @description Creates a new user. Returns the saved entity.
   */
  async create(data: DeepPartial<User>): Promise<User> {
    const entity = this.userRepository.create(data);
    return this.userRepository.save(entity);
  }

  /**
   * @description Updates an existing user by id. Returns the saved entity or null if not found.
   */
  async update(id: string, data: DeepPartial<User>): Promise<User | null> {
    const existing = await this.userRepository.findOne({ where: { id } });
    if (!existing) return null;
    this.userRepository.merge(existing, data);
    return this.userRepository.save(existing);
  }

  /**
   * @description Disables a user by setting disabledAt. Login will be rejected for disabled users. Returns updated user or null.
   */
  async disable(id: string): Promise<User | null> {
    return this.update(id, { disabledAt: new Date() });
  }

  /**
   * @description Re-enables a user by clearing disabledAt. Returns updated user or null.
   */
  async enable(id: string): Promise<User | null> {
    return this.update(id, { disabledAt: null });
  }
}
