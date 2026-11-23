#!/usr/bin/env node

/**
 * @description Creates the default local development user with all roles (admin, user, viewer)
 * assigned, ready for openthrottle-developer / openthrottle-admin login. Idempotent: an existing
 * user keeps their password (unless they have none); missing roles are assigned on every run.
 * Requires migrations 026/031/034 and a running OpenThrottle Postgres.
 */

import {
  getOpenThrottleTypeOrmOptions,
  hashPassword,
  Role,
  RolesRepository,
  ServiceAccount,
  User,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import { DataSource } from 'typeorm';

import { upsertLocalSecrets } from './local-secrets-file.ts';
import { createLogger } from './utils/logger.ts';

const logger = createLogger();

// Email defaults to the known local dev account. The password has NO source
// default: a literal here would be a known admin login for any database this
// ran against. Local setup gets it from `.env` (copied from `.env.default`).
const USER_EMAIL: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_EMAIL?.trim() || 'developer@openthrottle.ai'; // prettier-ignore
const USER_PASSWORD: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD?.trim() ?? ''; // prettier-ignore
const USER_GITHUB: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_GITHUB?.trim() || 'openthrottle-developer'; // prettier-ignore

const DEFAULT_USER = {
  email: USER_EMAIL,
  githubUsername: USER_GITHUB,
  password: USER_PASSWORD,
} as const;

// Login URLs honor the same env the apps read (see .env.default), falling back
// to the known local dev ports so the recorded file is useful out of the box.
const ADMIN_URL: string = process.env.OPENTHROTTLE_DEVELOPER_APP_URL_ADMIN?.trim() || 'http://localhost:6022'; // prettier-ignore
const DEVELOPER_URL: string = process.env.OPENTHROTTLE_DEVELOPER_APP_URL?.trim() || 'http://localhost:6020'; // prettier-ignore

const ROLE_NAMES = ['admin', 'user', 'viewer'] as const;

async function ensureDefaultUser(
  usersRepository: UsersRepository,
): Promise<User> {
  const existing = await usersRepository.findByEmail(DEFAULT_USER.email);

  if (existing == null) {
    const created = await usersRepository.create({
      email: DEFAULT_USER.email,
      githubUsername: DEFAULT_USER.githubUsername,
      passwordHash: await hashPassword(DEFAULT_USER.password),
    });

    logger.success(`Created user ${DEFAULT_USER.email} (${created.id}).`);

    return created;
  }

  if (existing.passwordHash == null) {
    const updated = await usersRepository.update(existing.id, {
      passwordHash: await hashPassword(DEFAULT_USER.password),
    });

    logger.success(
      `Set default password for existing user ${DEFAULT_USER.email}.`,
    );

    return updated;
  }

  logger.step(
    `Skip create: ${DEFAULT_USER.email} already exists (password unchanged).`,
  );

  return existing;
}

async function ensureAllRoles(
  rolesRepository: RolesRepository,
  userId: string,
): Promise<void> {
  /* eslint-disable no-await-in-loop -- role assignments mutate the same user row; run in order */
  for (const roleName of ROLE_NAMES) {
    const role = await rolesRepository.findByName(roleName);

    if (role == null) {
      logger.fail(`Missing role "${roleName}". Run: pnpm run database:migrate`);

      process.exit(1);
    }

    await rolesRepository.assignRoleToUser(userId, role.id);

    logger.success(`Role ${roleName}: assigned.`);
  }
  /* eslint-enable no-await-in-loop */
}

/**
 * Bootstrap service accounts that act as the default user (see
 * scripts/bootstrap-service-account-credentials.ts for their credentials).
 */
const ACTING_SERVICE_ACCOUNT_NAMES = ['openthrottle-mcp', 'plan-runner'];

/**
 * Link each bootstrap service account to the default user via
 * acting_user_id so user-scoped conveniences (e.g. plan workspace seeding)
 * resolve for MCP and plan-run callers. Only fills a NULL link — an explicit link to
 * a different user is respected. Idempotent.
 */
async function linkActingUser(
  dataSource: DataSource,
  userId: string,
): Promise<void> {
  const serviceAccountRepository = dataSource.getRepository(ServiceAccount);

  /* eslint-disable no-await-in-loop -- two fixed accounts; run in order for stable logs */
  for (const name of ACTING_SERVICE_ACCOUNT_NAMES) {
    const account = await serviceAccountRepository.findOne({
      where: { name },
    });

    if (account == null) {
      console.log(
        `Acting user ${name}: service account missing (run: pnpm run database:migrate); skipped.`,
      );
      continue;
    }

    if (account.actingUserId === userId) {
      console.log(`Acting user ${name}: already linked.`);
      continue;
    }

    if (account.actingUserId != null) {
      console.log(
        `Acting user ${name}: linked to a different user; left as-is.`,
      );
      continue;
    }

    account.actingUserId = userId;
    await serviceAccountRepository.save(account);
    console.log(`Acting user ${name}: linked to ${USER_EMAIL}.`);
  }
  /* eslint-enable no-await-in-loop */
}

async function main(): Promise<void> {
  if (USER_PASSWORD === '') {
    logger.fail(
      `OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD is not set. Set it in .env (local setup copies it from .env.default) or the environment, then re-run.`,
    );

    process.exit(1);
  }

  const dataSource = new DataSource(getOpenThrottleTypeOrmOptions());
  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    const usersRepository = new UsersRepository(userRepository);
    const rolesRepository = new RolesRepository(
      roleRepository,
      userRepository,
      dataSource.getRepository(ServiceAccount),
    );

    const user = await ensureDefaultUser(usersRepository);
    await ensureAllRoles(rolesRepository, user.id);
    await linkActingUser(dataSource, user.id);

    // Record the login to the git-ignored local file so a fresh machine can
    // sign in without scrolling back through setup output. Upsert semantics
    // mean this coexists with the credentials script's token keys.
    await upsertLocalSecrets({
      OPENTHROTTLE_ADMIN_URL: ADMIN_URL,
      OPENTHROTTLE_BOOTSTRAP_USER_EMAIL: DEFAULT_USER.email,
      OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD: DEFAULT_USER.password,
      OPENTHROTTLE_DEVELOPER_URL: DEVELOPER_URL,
    });

    logger.blank();
    logger.success(`Default user ready: ${DEFAULT_USER.email}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  logger.fail(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
