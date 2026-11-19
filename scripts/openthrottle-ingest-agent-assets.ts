/**
 * @description Ingests `.agents/` skills, rules, personas, and prompts into `custom_prompts`.
 * Content only: openthrottle-server embeds the rows (its embeddings reconciler picks up raw-SQL
 * writes like these within one interval — 15 minutes by default — or on its next boot).
 * Idempotent per (file_path, prompt_type). D5: hard-fail on skill/persona validation errors; warn-only on rules.
 */

/* eslint-disable no-await-in-loop -- sequential per-file upsert is intentional */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import type { SkillsLockMap } from '@openthrottle/openthrottle-skills';
import {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  collectAgentAssetsForIngest,
  parseSkillsLockFile,
  SKILLS_LOCK_FILENAME,
  toProjectSkillInputs,
} from '@openthrottle/openthrottle-skills';
import { Client } from 'pg';

import { createLogger } from './utils/logger.ts';

const logger = createLogger();

/**
 * nx_project_name of the dogfood project the monorepo's own skills reconcile
 * into. `project_skills` rows for this project are the skill universe the
 * availability surface answers for this repo. Connected workspace repos use the
 * same reconcile shape against the project their checkout links to (see the
 * stub note in `reconcileProjectSkills`).
 */
const DOGFOOD_NX_PROJECT_NAME = 'OpenThrottle/monorepo';

const formatIssue = (issue: {
  readonly field: string;
  readonly message: string;
  readonly path: string;
}): string => {
  return `${issue.path}: [${issue.field}] ${issue.message}`;
};

/**
 * @description Resolves (find-or-create) the dogfood project keyed by
 * `DOGFOOD_NX_PROJECT_NAME` and returns its id.
 */
const resolveDogfoodProjectId = async (client: Client): Promise<string> => {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM projects WHERE nx_project_name = $1 AND deleted_at IS NULL LIMIT 1',
    [DOGFOOD_NX_PROJECT_NAME],
  );
  const existingId = existing.rows[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = await client.query<{ id: string }>(
    'INSERT INTO projects (name, nx_project_name) VALUES ($1, $2) RETURNING id',
    [DOGFOOD_NX_PROJECT_NAME, DOGFOOD_NX_PROJECT_NAME],
  );
  const createdId = created.rows[0]?.id;
  if (!createdId) {
    throw new Error('failed to create dogfood project row');
  }
  return createdId;
};

/**
 * @description Refreshes `project_skills` for the dogfood project from the
 * ingest records: upserts every skill on (project_id, slug) without overwriting
 * `tags` (new rows insert `{}`), and marks vanished slugs as orphans instead of
 * deleting them. Only live rows take part: a soft-deleted skill (`deleted_at` set) is skipped
 * by the conflict target and the orphan update, so re-ingesting its slug inserts a fresh row.
 * Idempotent. Returns the upsert count and stale slug list.
 *
 * This is the trigger (a) — the monorepo's own skills (dogfood). Trigger (b), a
 * connected workspace repo, is not yet wired: it would `walkAgentAssetFiles`
 * over that checkout, map + `toProjectSkillInputs`, and run this same reconcile
 * against the project its `workspace_local_repositories` row links to. The
 * server-side interface for that is `ProjectSkillsRepository.reconcile`
 * in `@openthrottle/nestjs-repositories-server`.
 */
const reconcileDogfoodProjectSkills = async (
  client: Client,
  records: Parameters<typeof toProjectSkillInputs>[0],
  lock: SkillsLockMap,
): Promise<{ staleSlugs: string[]; upserted: number }> => {
  const projectId = await resolveDogfoodProjectId(client);
  const inputs = toProjectSkillInputs(records, lock);

  for (const input of inputs) {
    await client.query(
      `INSERT INTO project_skills (
         project_id, slug, description, tags, disable_model_invocation, source, source_url, source_path, ingested_at, orphaned_at
       )
       VALUES ($1, $2, $3, '{}'::text[], $4, $5, $6, $7, NOW(), NULL)
       ON CONFLICT (project_id, slug) WHERE deleted_at IS NULL
       DO UPDATE SET
         description = EXCLUDED.description,
         disable_model_invocation = EXCLUDED.disable_model_invocation,
         source = EXCLUDED.source,
         source_url = EXCLUDED.source_url,
         source_path = EXCLUDED.source_path,
         ingested_at = EXCLUDED.ingested_at,
         orphaned_at = NULL,
         updated_at = NOW()`,
      [
        projectId,
        input.slug,
        input.description ?? null,
        input.disableModelInvocation ?? null,
        input.source,
        input.sourceUrl ?? null,
        input.sourcePath,
      ],
    );
  }

  const keepSlugs = inputs.map((input) => input.slug);
  let staleSql = `UPDATE project_skills
           SET orphaned_at = COALESCE(orphaned_at, NOW()), updated_at = NOW()
           WHERE project_id = $1 AND deleted_at IS NULL
           RETURNING slug`;
  let staleParams: unknown[] = [projectId];
  if (keepSlugs.length > 0) {
    staleSql = `UPDATE project_skills
           SET orphaned_at = COALESCE(orphaned_at, NOW()), updated_at = NOW()
           WHERE project_id = $1 AND deleted_at IS NULL AND slug <> ALL($2::text[])
           RETURNING slug`;
    staleParams = [projectId, keepSlugs];
  }

  const staleResult = await client.query<{ slug: string }>(
    staleSql,
    staleParams,
  );

  const staleSlugs = staleResult.rows
    .map((row) => row.slug)
    .sort((left, right) => left.localeCompare(right));

  return { staleSlugs, upserted: inputs.length };
};

/** Reads the repo-root skills-lock.json; a missing lockfile is an empty map. */
const readSkillsLock = (monorepoRoot: string): SkillsLockMap => {
  try {
    return parseSkillsLockFile(
      readFileSync(join(monorepoRoot, SKILLS_LOCK_FILENAME), 'utf8'),
    );
  } catch {
    return {};
  }
};

const main = async (): Promise<void> => {
  const monorepoRoot = process.cwd();
  const skillsLock = readSkillsLock(monorepoRoot);
  const { records, validation } = collectAgentAssetsForIngest({
    monorepoRoot,
  });

  for (const warning of validation.warnings) {
    logger.warn(
      `openthrottle-ingest-agent-assets: warning: ${formatIssue(warning)}`,
    );
  }

  if (validation.errors.length > 0) {
    for (const error of validation.errors) {
      logger.fail(
        `openthrottle-ingest-agent-assets: error: ${formatIssue(error)}`,
      );
    }
    logger.fail(
      `openthrottle-ingest-agent-assets: ${validation.errors.length} validation error(s); aborting ingest`,
    );
    process.exit(1);
  }

  const url = getPostgresUrl();
  const client = new Client({ connectionString: url });
  await client.connect();

  const ingestedPaths = new Set(records.map((record) => record.filePath));
  let promptsUpserted = 0;
  const errors: string[] = [];
  try {
    for (const record of records) {
      try {
        const labelsJson = JSON.stringify(record.labels);
        const upsertResult = await client.query<{ id: string }>(
          `INSERT INTO custom_prompts (
             title, content, description, prompt_type, labels, file_path, deleted_at
           )
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, NULL)
           ON CONFLICT (file_path, prompt_type)
           WHERE file_path IS NOT NULL
           DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             description = EXCLUDED.description,
             labels = EXCLUDED.labels,
             deleted_at = NULL,
             updated_at = NOW()
           RETURNING id`,
          [
            record.title,
            record.content,
            record.description,
            record.promptType,
            labelsJson,
            record.filePath,
          ],
        );

        const promptId = upsertResult.rows[0]?.id;
        if (!promptId) {
          errors.push(`${record.filePath}: upsert did not return id`);
          continue;
        }

        promptsUpserted += 1;

        logger.step(`Ingested: ${record.filePath}`);
      } catch (error) {
        const message = `${record.filePath}: ${String(error)}`;
        errors.push(message);
        logger.fail(`Error: ${message}`);
      }
    }

    const prefixConditions = AGENT_ASSET_INGEST_PATH_PREFIXES.map(
      (_prefix, index) => `file_path LIKE $${index + 1}`,
    ).join(' OR ');
    const prefixParams = AGENT_ASSET_INGEST_PATH_PREFIXES.map(
      (prefix) => `${prefix}%`,
    );

    const staleResult = await client.query<{ file_path: string }>(
      `SELECT file_path
       FROM custom_prompts
       WHERE deleted_at IS NULL
         AND file_path IS NOT NULL
         AND (${prefixConditions})`,
      prefixParams,
    );

    const stalePaths = staleResult.rows
      .map((row) => row.file_path)
      .filter((filePath) => !ingestedPaths.has(filePath));

    if (stalePaths.length > 0) {
      await client.query(
        `UPDATE custom_prompts
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE deleted_at IS NULL
           AND file_path = ANY($1::text[])`,
        [stalePaths],
      );
      logger.step(`Soft-deleted ${stalePaths.length} stale path(s)`);
    }

    try {
      const projectSkills = await reconcileDogfoodProjectSkills(
        client,
        records,
        skillsLock,
      );
      logger.step(
        `project_skills reconciled: ${projectSkills.upserted} upserted` +
          (projectSkills.staleSlugs.length > 0
            ? `; orphans (suggest remove): ${projectSkills.staleSlugs.join(', ')}`
            : ''),
      );
    } catch (error) {
      const message = `project_skills reconcile: ${String(error)}`;
      errors.push(message);
      logger.fail(`Error: ${message}`);
    }

    logger.heading('Done.');
    logger.detail(`custom_prompts upserted: ${promptsUpserted}`);
    logger.detail(
      'Embeddings: openthrottle-server embeds these rows (reconciler, within 15 minutes or on next boot).',
    );
    if (errors.length > 0) {
      logger.fail(`Errors: ${errors.length}`);
      for (const error of errors) {
        logger.fail(`  ${error}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
