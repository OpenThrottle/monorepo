import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GlobalClsModule } from './global-cls.module';
import { GlobalClsService } from './global-cls.service';

describe('GlobalClsService', () => {
  let service: GlobalClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [GlobalClsModule],
      providers: [],
    }).compile();

    service = module.get<GlobalClsService>(GlobalClsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setUser', () => {
    it('stores user on the CLS context', () => {
      service.run(() => {
        service.setUser({
          displayName: 'Ada',
          email: 'ada@example.com',
          isDeleted: false,
          permissions: ['read'],
          roles: ['admin'],
          uuid: 'user-uuid',
        });

        expect(service.get('user')).toEqual({
          displayName: 'Ada',
          email: 'ada@example.com',
          isDeleted: false,
          permissions: ['read'],
          roles: ['admin'],
          uuid: 'user-uuid',
        });
      });
    });

    it('clones roles and permissions so callers cannot mutate stored arrays', () => {
      const roles = ['admin'];
      const permissions = ['read'];

      service.run(() => {
        service.setUser({
          displayName: 'Ada',
          email: 'ada@example.com',
          isDeleted: false,
          permissions,
          roles,
          uuid: 'user-uuid',
        });

        roles.push('user');
        permissions.push('write');

        expect(service.get('user')?.roles).toEqual(['admin']);
        expect(service.get('user')?.permissions).toEqual(['read']);
      });
    });
  });

  it('does not set user until setUser is called', () => {
    service.run(() => {
      expect(service.has('user')).toBe(false);
    });
  });
});
