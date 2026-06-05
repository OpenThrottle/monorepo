#!/usr/bin/env node

/**
 * @description Mints service account bearer tokens for local bootstrap (openthrottle-mcp, workflow-ralph).
 * Requires migration 045 and a running Cortex Postgres. Skips accounts that already have an active credential.
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getCortexTypeOrmOptions,
  ServiceAccount,
  ServiceAccountCredential,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { DataSource, IsNull } from 'typeorm';

const BOOTSTRAP_ACCOUNTS = [
  {
    envVar: 'MCP_DEVELOPER_AUTH_TOKEN',
    label: 'bootstrap-openthrottle-mcp',
    name: 'openthrottle-mcp',
  },
  {
    envVar: 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
    label: 'bootstrap-workflow-ralph',
    name: 'workflow-ralph',
  },
] as const;

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

async function mintBootstrapCredential(
  dataSource: DataSource,
  serviceAccountsService: ServiceAccountsService,
  account: (typeof BOOTSTRAP_ACCOUNTS)[number],
): Promise<boolean> {
  const row = await dataSource.getRepository(ServiceAccount).findOne({
    where: { name: account.name },
  });

  if (row == null) {
    console.error(
      `Missing service account "${account.name}". Run: pnpm run database:migrate`,
    );
    process.exit(1);
  }

  const activeCount = await countActiveCredentials(dataSource, row.id);
  if (activeCount > 0) {
    console.log(
      `Skip ${account.name}: ${activeCount} active credential(s) already exist.`,
    );
    console.log(
      `  Revoke old credentials via admin GraphQL, then re-run this script to mint a new token.`,
    );
    return false;
  }

  const created = await serviceAccountsService.createCredential({
    label: account.label,
    serviceAccountId: row.id,
  });

  if (created == null) {
    console.error(`Failed to create credential for ${account.name}.`);
    process.exit(1);
  }

  console.log('');
  console.log(`=== ${account.name} ===`);
  console.log(`${account.envVar}=${created.token}`);
  console.log('');
  return true;
}

async function main(): Promise<void> {
  const dataSource = new DataSource(getCortexTypeOrmOptions());
  await dataSource.initialize();

  try {
    const logger = { debug: () => undefined } as LoggerService;
    const serviceAccountsService = new ServiceAccountsService(
      logger,
      dataSource.getRepository(ServiceAccount),
      dataSource.getRepository(ServiceAccountCredential),
    );

    const minted = (
      await Promise.all([
        mintBootstrapCredential(
          dataSource,
          serviceAccountsService,
          BOOTSTRAP_ACCOUNTS[0],
        ),
        mintBootstrapCredential(
          dataSource,
          serviceAccountsService,
          BOOTSTRAP_ACCOUNTS[1],
        ),
      ])
    ).filter(Boolean).length;

    if (minted === 0) {
      console.log(
        'No new credentials minted. Set MCP_DEVELOPER_AUTH_TOKEN / OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN from existing tokens.',
      );
      return;
    }

    console.log('Add the lines above to:');
    console.log('  - applications/openthrottle-server/.env');
    console.log(
      '  - Cursor ~/.cursor/mcp.json env for openthrottle-mcp (MCP_DEVELOPER_AUTH_TOKEN only)',
    );
    console.log(
      'Tokens are shown once; store them securely and rotate via admin GraphQL when needed.',
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
