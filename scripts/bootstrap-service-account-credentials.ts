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
import { fileURLToPath } from 'node:url';
import { DataSource, IsNull } from 'typeorm';

import {
  LOCAL_SECRETS_FILENAME,
  readLocalSecrets,
  upsertLocalSecrets,
} from './local-secrets-file';

export const BOOTSTRAP_ACCOUNTS = [
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

type ProvisionOutcome =
  'created' | 'minted' | 'noop' | 'rotated' | 'skipped' | 'updated';

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

    // The plaintext token is known here (it came from the environment), so
    // persist a durable copy — otherwise a machine that provisions from env
    // would leave this key absent from the local secrets file.
    await upsertLocalSecrets({ [account.envVar]: token });

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

/**
 * Mint a fresh credential, print it once, and persist it to the git-ignored
 * local file. Secrets only exist at mint time and cannot be re-derived later,
 * so the durable copy is written here. Shared by the fresh-mint and rotate
 * paths.
 */
async function createAndRecordCredential(
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
  serviceAccountId: string,
): Promise<void> {
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

  await upsertLocalSecrets({ [account.envVar]: created.token });
}

/**
 * Revoke every active credential for a bootstrap account, then mint a fresh
 * one. Used to self-heal the skip branch when an active credential exists but
 * its plaintext is absent from the local file and unrecoverable (only a bcrypt
 * hash is stored). Restricted by its only callers to the two known
 * BOOTSTRAP_ACCOUNTS — never a generalized revoke of arbitrary accounts.
 */
async function rotateBootstrapCredential(
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
  serviceAccountId: string,
): Promise<ProvisionOutcome> {
  const active =
    await serviceAccountsService.findActiveCredentials(serviceAccountId);

  /* eslint-disable no-await-in-loop -- revoke sequentially; small fixed set */
  for (const credential of active) {
    await serviceAccountsService.revokeCredential(credential.id);
  }
  /* eslint-enable no-await-in-loop */

  console.log(
    `Rotate ${account.name}: revoked ${active.length} stale credential(s) and minting a fresh token (${account.envVar} was missing from ${LOCAL_SECRETS_FILENAME}).`,
  );

  await createAndRecordCredential(
    serviceAccountsService,
    account,
    serviceAccountId,
  );

  return 'rotated';
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
    const recorded = ((await readLocalSecrets())[account.envVar] ?? '').trim();

    // Complete file + existing credential: nothing to do, stay a clean no-op.
    if (recorded !== '') {
      console.log(
        `Skip ${account.name}: ${activeCount} active credential(s) and a durable token already recorded.`,
      );

      return 'skipped';
    }

    // Active credential but no durable copy: the old plaintext is unrecoverable,
    // so rotate to a usable token (owner decision, 2026-08-13) rather than leave
    // the file missing this key.
    return rotateBootstrapCredential(
      serviceAccountsService,
      account,
      serviceAccountId,
    );
  }

  await createAndRecordCredential(
    serviceAccountsService,
    account,
    serviceAccountId,
  );

  return 'minted';
}

export async function provisionAccount(
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

    if (outcomes.includes('minted') || outcomes.includes('rotated')) {
      console.log('Add the minted line(s) above to:');
      console.log('  - applications/openthrottle-server/.env');
      console.log(
        '  - Cursor ~/.cursor/mcp.json env for openthrottle-mcp (OPENTHROTTLE_MCP_AUTH_TOKEN only)',
      );

      console.log(
        `Tokens are shown once; a durable copy was also written to the git-ignored ${LOCAL_SECRETS_FILENAME} at the repo root. Store them securely and rotate via admin GraphQL when needed.`,
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

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
