#!/usr/bin/env node

/**
 * @description Provisions service account bearer tokens for local bootstrap (openthrottle-mcp, workflow-ralph).
 * Requires migration 045 and a running OpenThrottle Postgres.
 *
 * Two modes, chosen per account by whether its env var is set:
 * - Env-provided (fully-Dockerized / shared-instance path): when
 *   `OPENTHROTTLE_MCP_AUTH_TOKEN` / `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` is
 *   set, deterministically upsert a credential whose bcrypt hash matches the
 *   provided token so the same value verifies end-to-end. Idempotent: a token
 *   that already verifies is a no-op. Nothing secret is printed.
 * - Mint-and-print (host `setup.sh` path): when the env var is unset, mint a
 *   random credential and print it once, skipping accounts that already have an
 *   active credential (unchanged legacy behavior).
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getOpenThrottleTypeOrmOptions,
  ServiceAccount,
  ServiceAccountCredential,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { DataSource, IsNull } from 'typeorm';

const BOOTSTRAP_ACCOUNTS = [
  {
    envVar: 'OPENTHROTTLE_MCP_AUTH_TOKEN',
    label: 'bootstrap-openthrottle-mcp',
    name: 'openthrottle-mcp',
  },
  {
    envVar: 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
    label: 'bootstrap-workflow-ralph',
    name: 'workflow-ralph',
  },
] as const;

/** Copy-pasteable command that emits a valid `ot_sa_<prefix>_<secret>` token. */
const TOKEN_GENERATION_HINT =
  "node -e \"const c=require('node:crypto');const a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';const r=n=>Array.from(c.randomBytes(n),b=>a[b%a.length]).join('');console.log('ot_sa_'+r(12)+'_'+r(32))\"";

type ProvisionOutcome = 'created' | 'minted' | 'noop' | 'skipped' | 'updated';

async function countActiveCredentials(
  dataSource: DataSource,
  serviceAccountId: string,
): Promise<number> {
  return dataSource.getRepository(ServiceAccountCredential).count({
    where: {
      revokedAt: IsNull(),
      serviceAccountId,
    },
  });
}

async function upsertBootstrapCredentialFromEnv(
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
  serviceAccountId: string,
  token: string,
): Promise<ProvisionOutcome> {
  try {
    const result = await serviceAccountsService.upsertCredentialForToken({
      label: account.label,
      serviceAccountId,
      token,
    });

    if (result == null) {
      console.error(
        `Failed to provision ${account.name}: service account missing or disabled.`,
      );
      process.exit(1);
    }

    const detail =
      result.action === 'noop'
        ? 'credential already matches (no change)'
        : `${result.action} credential`;

    console.log(`${account.name}: ${detail} from ${account.envVar}.`);

    return result.action;
  } catch (error) {
    console.error(
      `Failed to provision ${account.name} from ${account.envVar}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    console.error(
      `  ${account.envVar} must be a valid service account token (ot_sa_<prefix>_<secret>). Generate one with:`,
    );

    console.error(`    ${TOKEN_GENERATION_HINT}`);

    process.exit(1);
  }
}

async function mintBootstrapCredential(
  dataSource: DataSource,
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
  serviceAccountId: string,
): Promise<ProvisionOutcome> {
  const activeCount = await countActiveCredentials(
    dataSource,
    serviceAccountId,
  );

  if (activeCount > 0) {
    console.log(
      `Skip ${account.name}: ${activeCount} active credential(s) already exist.`,
    );

    console.log(
      `  Revoke old credentials via admin GraphQL, then re-run this script to mint a new token.`,
    );

    return 'skipped';
  }

  const created = await serviceAccountsService.createCredential({
    label: account.label,
    serviceAccountId,
  });

  if (created == null) {
    console.error(`Failed to create credential for ${account.name}.`);
    process.exit(1);
  }

  console.log('');
  console.log(`=== ${account.name} ===`);
  console.log(`${account.envVar}=${created.token}`);
  console.log('');

  return 'minted';
}

async function provisionAccount(
  dataSource: DataSource,
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
): Promise<ProvisionOutcome> {
  const row = await dataSource.getRepository(ServiceAccount).findOne({
    where: { name: account.name },
  });

  if (row == null) {
    console.error(
      `Missing service account "${account.name}". Run: pnpm run database:migrate`,
    );
    process.exit(1);
  }

  const envToken = (process.env[account.envVar] ?? '').trim();
  if (envToken !== '') {
    return upsertBootstrapCredentialFromEnv(
      serviceAccountsService,
      account,
      row.id,
      envToken,
    );
  }

  return mintBootstrapCredential(
    dataSource,
    serviceAccountsService,
    account,
    row.id,
  );
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

    const serviceAccountsService = new ServiceAccountsService(
      logger,
      dataSource.getRepository(ServiceAccount),
      dataSource.getRepository(ServiceAccountCredential),
    );

    const outcomes = await Promise.all(
      BOOTSTRAP_ACCOUNTS.map((account) =>
        provisionAccount(dataSource, serviceAccountsService, account),
      ),
    );

    if (outcomes.includes('minted')) {
      console.log('Add the minted line(s) above to:');
      console.log('  - applications/openthrottle-server/.env');
      console.log(
        '  - Cursor ~/.cursor/mcp.json env for openthrottle-mcp (OPENTHROTTLE_MCP_AUTH_TOKEN only)',
      );

      console.log(
        'Tokens are shown once; store them securely and rotate via admin GraphQL when needed.',
      );
    } else if (
      !outcomes.some(
        (outcome) => outcome === 'created' || outcome === 'updated',
      )
    ) {
      console.log(
        'No credential changes. Env-provided tokens already verify, or set OPENTHROTTLE_MCP_AUTH_TOKEN / OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN from existing tokens.',
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
