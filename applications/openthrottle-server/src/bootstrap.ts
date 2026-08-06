/**
 * @description One-shot provisioning entry for the Docker-native install, run from
 * the already-published `openthrottle/server` image (so there is no separate
 * `bootstrap` image to build/publish/pull). Creates the default login user and,
 * when OPENTHROTTLE_MCP_AUTH_TOKEN / OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN are set,
 * upserts matching `ot_sa` service-account credentials. Idempotent.
 *
 * Compose runs it via a `command` override on the server image:
 *   command: ["-r", "dotenv/config", "build/src/bootstrap.js"]
 *
 * Mirrors the host scripts scripts/bootstrap-default-user.ts and
 * scripts/bootstrap-service-account-credentials.ts (host `setup.sh` /
 * `pnpm run database:bootstrap-service-accounts` still use those). Keep the three
 * in sync; DRY-ing them behind a shared @openthrottle/nestjs-repositories export is
 * a tracked follow-up.
 */
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getOpenThrottleTypeOrmOptions,
  Role,
  RolesService,
  ServiceAccount,
  ServiceAccountCredential,
  ServiceAccountsService,
  User,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { DataSource } from 'typeorm';

const USER_EMAIL: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_EMAIL?.trim() || 'developer@openthrottle.ai' // prettier-ignore
const USER_GITHUB: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_GITHUB?.trim() || 'openthrottle-developer' // prettier-ignore
const USER_PASSWORD: string = process.env.OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD?.trim() || 'FullThrottle2026!' // prettier-ignore

const ROLE_NAMES = ['admin', 'user', 'viewer'] as const;

const BOOTSTRAP_ACCOUNTS = [
  { envVar: 'OPENTHROTTLE_MCP_AUTH_TOKEN', label: 'bootstrap-openthrottle-mcp', name: 'openthrottle-mcp' }, // prettier-ignore
  { envVar: 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', label: 'bootstrap-workflow-ralph', name: 'workflow-ralph' }, // prettier-ignore
] as const;

async function ensureDefaultUser(usersService: UsersService): Promise<User> {
  const existing = await usersService.findByEmail(USER_EMAIL);

  if (existing == null) {
    const created = await usersService.create({
      email: USER_EMAIL,
      githubUsername: USER_GITHUB,
      passwordHash: await usersService.hashPassword(USER_PASSWORD),
    });

    console.log(`Created user ${USER_EMAIL} (${created.id}).`);

    return created;
  }

  if (existing.passwordHash == null) {
    const updated = await usersService.update(existing.id, {
      passwordHash: await usersService.hashPassword(USER_PASSWORD),
    });

    console.log(`Set default password for existing user ${USER_EMAIL}.`);

    return updated ?? existing;
  }

  console.log(
    `Skip create: ${USER_EMAIL} already exists (password unchanged).`,
  );

  return existing;
}

async function ensureAllRoles(
  rolesService: RolesService,
  userId: string,
): Promise<void> {
  for (const roleName of ROLE_NAMES) {
    // eslint-disable-next-line no-await-in-loop -- assignments mutate the same user row; run in order
    const role = await rolesService.findByName(roleName);
    if (role == null) {
      throw new Error(`Missing role "${roleName}". Apply migrations first.`);
    }

    // eslint-disable-next-line no-await-in-loop -- see above
    await rolesService.assignRoleToUser(userId, role.id);
    console.log(`Role ${roleName}: assigned.`);
  }
}

async function provisionServiceAccount(
  dataSource: DataSource,
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
): Promise<void> {
  const row = await dataSource
    .getRepository(ServiceAccount)
    .findOne({ where: { name: account.name } });

  if (row == null) {
    throw new Error(
      `Missing service account "${account.name}". Apply migrations first.`,
    );
  }

  const token = (process.env[account.envVar] ?? '').trim();
  if (token === '') {
    console.log(
      `Skip ${account.name}: ${account.envVar} not set (no machine token to provision).`,
    );
    return;
  }

  const result = await serviceAccountsService.upsertCredentialForToken({
    label: account.label,
    serviceAccountId: row.id,
    token,
  });
  if (result == null) {
    throw new Error(
      `Failed to provision ${account.name}: service account missing or disabled.`,
    );
  }

  const detail =
    result.action === 'noop'
      ? 'credential already matches (no change)'
      : `${result.action} credential`;

  console.log(`${account.name}: ${detail} from ${account.envVar}.`);
}

async function main(): Promise<void> {
  const dataSource = new DataSource(getOpenThrottleTypeOrmOptions());
  await dataSource.initialize();

  try {
    const logger = new LoggerService();
    const usersService = new UsersService(
      logger,
      dataSource.getRepository(User),
    );
    const rolesService = new RolesService(
      logger,
      dataSource.getRepository(Role),
      dataSource.getRepository(User),
      dataSource.getRepository(ServiceAccount),
    );
    const serviceAccountsService = new ServiceAccountsService(
      logger,
      dataSource.getRepository(ServiceAccount),
      dataSource.getRepository(ServiceAccountCredential),
    );

    console.log('🔐 OpenThrottle bootstrap — default user + service accounts');
    const user = await ensureDefaultUser(usersService);
    await ensureAllRoles(rolesService, user.id);
    for (const account of BOOTSTRAP_ACCOUNTS) {
      // eslint-disable-next-line no-await-in-loop -- provision sequentially for readable logs
      await provisionServiceAccount(
        dataSource,
        serviceAccountsService,
        account,
      );
    }

    console.log(`✅ bootstrap complete — login: ${USER_EMAIL}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
