import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { User } from './user.entity';
import { usersFactory } from './users.factory';
import { UsersService } from './users.service';

describe('UsersService', () => {
  type GetRepository = ReturnType<UsersService['getRepository']>;

  let service: UsersService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        UsersService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMock<GetRepository>({
            create: (data) => data,
            find: () => Promise.resolve(usersFactory.buildList(2)),
            findOne: () => Promise.resolve(usersFactory.build()),
            merge: () => ({}),
            save: async (entity) => {
              // FIXME: Tighten this up
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              return entity as User;
            },
          }),
        },
      ],
    }).compile();

    service = app.get<UsersService>(UsersService);
  });

  describe('getRepository', () => {
    it('returns the user repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });
  });

  describe('findById', () => {
    it('returns a user when found', async () => {
      const user = await service.findById('test-id');

      expect(user).toBeDefined();
      expect(user).toMatchObject({
        githubUsername: expect.any(String),
      });
    });
  });

  describe('findByEmail', () => {
    it('returns a user when found', async () => {
      const user = await service.findByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user).toMatchObject({
        githubUsername: expect.any(String),
      });
    });
  });

  describe('findByGithubUsername', () => {
    it('returns a user when found', async () => {
      const user = await service.findByGithubUsername('visormatt');

      expect(user).toBeDefined();
      expect(user).toMatchObject({
        githubUsername: expect.any(String),
      });
    });
  });

  describe('validatePassword', () => {
    it('returns false when hash is null', async () => {
      const result = await service.validatePassword('secret', null);

      expect(result).toBe(false);
    });

    it('returns false when hash is undefined', async () => {
      const result = await service.validatePassword('secret', undefined);

      expect(result).toBe(false);
    });

    it('returns false when hash is empty string', async () => {
      const result = await service.validatePassword('secret', '');

      expect(result).toBe(false);
    });

    it('returns true when plain password matches bcrypt hash', async () => {
      const hash = await import('bcrypt').then((b) => b.hash('correct', 10));
      const result = await service.validatePassword('correct', hash);

      expect(result).toBe(true);
    });

    it('returns false when plain password does not match hash', async () => {
      const hash = await import('bcrypt').then((b) => b.hash('correct', 10));
      const result = await service.validatePassword('wrong', hash);

      expect(result).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('returns a bcrypt hash that validatePassword accepts', async () => {
      const plain = 'mySecret123';
      const hash = await service.hashPassword(plain);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$2')).toBe(true);

      const valid = await service.validatePassword(plain, hash);

      expect(valid).toBe(true);
    });
  });

  describe('findAll', () => {
    it('returns factory-built data from find', async () => {
      const users = await service.findAll();

      expect(users).toHaveLength(2);
      expect(users[0]).toMatchObject({
        githubUsername: expect.any(String),
      });
    });
  });

  describe('create', () => {
    it('creates and returns a user', async () => {
      const created = await service.create({
        githubUsername: 'newuser',
      });

      expect(created).toBeDefined();
      expect(created).toMatchObject({ githubUsername: 'newuser' });
    });
  });

  describe('update', () => {
    it('returns updated user when found', async () => {
      const updated = await service.update('test-id', {
        githubUsername: 'updated-user',
      });

      expect(updated).toBeDefined();
    });
  });

  describe('disable', () => {
    it('returns updated user when found', async () => {
      const disabled = await service.disable('test-id');

      expect(disabled).toBeDefined();
    });
  });

  describe('enable', () => {
    it('returns updated user when found', async () => {
      const enabled = await service.enable('test-id');

      expect(enabled).toBeDefined();
    });
  });
});
