#!/usr/bin/env node

/**
 * @description Creates the default local development user with all roles (admin, user, viewer)
 * assigned, ready for openthrottle-developer / openthrottle-admin login. Idempotent: an existing
 * user keeps their password (unless they have none); missing roles are assigned on every run.
 * Requires migrations 026/031/034 and a running OpenThrottle Postgres.
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getOpenThrottleTypeOrmOptions,
  Role,
  RolesService,
  ServiceAccount,
  User,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { DataSource } from 'typeorm';

// Overridable for shared / real installs via OPENTHROTTLE_BOOTSTRAP_USER_EMAIL
// / _PASSWORD (see .env.default); defaults to the known local dev account.
const USER_EMAIL: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_EMAIL?.trim() || 'developer@openthrottle.com' // prettier-ignore
const USER_PASSWORD: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD?.trim() || 'FullThrottle2026!' // prettier-ignore
const USER_GITHUB: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_GITHUB?.trim() || 'openthrottle-developer' // prettier-ignore

const DEFAULT_USER = {
  email: USER_EMAIL,
  githubUsername: USER_GITHUB,
  password: USER_PASSWORD,
} as const;

const ROLE_NAMES = ['admin', 'user', 'viewer'] as const;

async function ensureDefaultUser(usersService: UsersService): Promise<User> {
  const existing = await usersService.findByEmail(DEFAULT_USER.email);

  if (existing == null) {
    const created = await usersService.create({
      email: DEFAULT_USER.email,
      githubUsername: DEFAULT_USER.githubUsername,
      passwordHash: await usersService.hashPassword(DEFAULT_USER.password),
    });

    console.log(`Created user ${DEFAULT_USER.email} (${created.id}).`);

    return created;
  }

  if (existing.passwordHash == null) {
    const updated = await usersService.update(existing.id, {
      passwordHash: await usersService.hashPassword(DEFAULT_USER.password),
    });

    console.log(
      `Set default password for existing user ${DEFAULT_USER.email}.`,
    );

    return updated ?? existing;
  }

  console.log(
    `Skip create: ${DEFAULT_USER.email} already exists (password unchanged).`,
  );

  return existing;
}

async function ensureAllRoles(
  rolesService: RolesService,
  userId: string,
): Promise<void> {
  /* eslint-disable no-await-in-loop -- role assignments mutate the same user row; run in order */
  for (const roleName of ROLE_NAMES) {
    const role = await rolesService.findByName(roleName);

    if (role == null) {
      console.error(
        `Missing role "${roleName}". Run: pnpm run database:migrate`,
      );

      process.exit(1);
    }

    await rolesService.assignRoleToUser(userId, role.id);

    console.log(`Role ${roleName}: assigned.`);
  }
  /* eslint-enable no-await-in-loop */
}

async function main(): Promise<void> {
  const dataSource = new DataSource(getOpenThrottleTypeOrmOptions());
  await dataSource.initialize();

  try {
    const logger: LoggerService = {
      debug: () => undefined,
      error: () => undefined,
      log: () => undefined,
      warn: () => undefined,
    };

    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    const usersService = new UsersService(logger, userRepository);
    const rolesService = new RolesService(
      logger,
      roleRepository,
      userRepository,
      dataSource.getRepository(ServiceAccount),
    );

    const user = await ensureDefaultUser(usersService);
    await ensureAllRoles(rolesService, user.id);

    console.log('');
    console.log(`Default user ready: ${DEFAULT_USER.email}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
