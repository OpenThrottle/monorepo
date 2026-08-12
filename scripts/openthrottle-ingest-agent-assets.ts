/**
 * @description Ingests `.agents/` skills, rules, personas, and prompts into `custom_prompts` + `custom_prompt_embeddings`.
 * Idempotent per (file_path, prompt_type). D5: hard-fail on skill/persona validation errors; warn-only on rules.
 */

/* eslint-disable no-await-in-loop -- sequential per-file upsert + embedding refresh is intentional */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  collectAgentAssetsForIngest,
  parseSkillsLockFile,
  parseSkillTagOverlayFile,
  SKILL_TAG_OVERLAYS_FILENAME,
  SKILLS_LOCK_FILENAME,
  toProjectSkillInputs,
} from '@openthrottle/openthrottle-skills';
import type {
  SkillsLockMap,
  SkillTagOverlayMap,
} from '@openthrottle/openthrottle-skills';
import { Client } from 'pg';

import {
  embedQuery,
  isOllamaEmbeddingConfigured,
} from '@openthrottle/node-client';

const EMBEDDING_DIM = 1536;

/**
 * nx_project_name of the dogfood project the monorepo's own skills reconcile
 * into. `project_skills` rows for this project are the skill universe the
 * availability surface answers for this repo. Connected workspace repos use the
 * same reconcile shape against the project their checkout links to (see the
 * stub note in `reconcileProjectSkills`).
 */
const DOGFOOD_NX_PROJECT_NAME = 'monorepo';

/** ~3 chars/token; text-embedding-3-small max is 8192 tokens. */
const MAX_EMBEDDING_CHARS = 24_000;

/**
 * @description Splits text into chunks under MAX_EMBEDDING_CHARS for the embedding model.
 */
const chunkTextForEmbedding = (text: string): string[] => {
  if (text.length <= MAX_EMBEDDING_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= MAX_EMBEDDING_CHARS) {
      current = next;
    } else {
      if (current) {
        chunks.push(current);
        current = '';
      }

      if (paragraph.length <= MAX_EMBEDDING_CHARS) {
        current = paragraph;
      } else {
        for (const line of paragraph.split(/\n/)) {
          const lineBlock = current ? `${current}\n${line}` : line;

          if (lineBlock.length <= MAX_EMBEDDING_CHARS) {
            current = lineBlock;
          } else {
            if (current) {
              chunks.push(current);
            }

            if (line.length <= MAX_EMBEDDING_CHARS) {
              current = line;
            } else {
              for (let i = 0; i < line.length; i += MAX_EMBEDDING_CHARS) {
                chunks.push(line.slice(i, i + MAX_EMBEDDING_CHARS));
              }

              current = '';
            }
          }
        }
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const formatIssue = (issue: {
  readonly field: string;
  readonly message: string;
  readonly path: string;
}): string => `${issue.path}: [${issue.field}] ${issue.message}`;

const hasEmbeddingProvider = (): boolean =>
  Boolean(process.env.OPENAI_API_KEY?.trim()) || isOllamaEmbeddingConfigured();

/**
 * @description Resolves (find-or-create) the dogfood project keyed by
 * `DOGFOOD_NX_PROJECT_NAME` and returns its id.
 */
const resolveDogfoodProjectId = async (client: Client): Promise<string> => {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM projects WHERE nx_project_name = $1 LIMIT 1',
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
 * ingest records: upserts every skill on (project_id, slug) and deletes rows for
 * skills that no longer exist. Idempotent; a re-run converges the project's rows
 * to exactly the ingested skill set. Returns the upsert/delete counts.
 *
 * This is the trigger (a) — the monorepo's own skills (dogfood). Trigger (b), a
 * connected workspace repo, is not yet wired: it would `walkAgentAssetFiles`
 * over that checkout, map + `toProjectSkillInputs`, and run this same reconcile
 * against the project its `workspace_local_repositories` row links to. The
 * server-side interface for that is `ProjectSkillsService.reconcileProjectSkills`
 * in `@openthrottle/nestjs-repositories`.
 */
const reconcileDogfoodProjectSkills = async (
  client: Client,
  records: Parameters<typeof toProjectSkillInputs>[0],
  overlays: SkillTagOverlayMap,
  lock: SkillsLockMap,
): Promise<{ deleted: number; upserted: number }> => {
  const projectId = await resolveDogfoodProjectId(client);
  const inputs = toProjectSkillInputs(records, overlays, lock);

  for (const input of inputs) {
    await client.query(
      `INSERT INTO project_skills (
         project_id, slug, description, tags, disable_model_invocation, source, source_url, source_path, ingested_at
       )
       VALUES ($1, $2, $3, $4::text[], $5, $6, $7, $8, NOW())
       ON CONFLICT (project_id, slug)
       DO UPDATE SET
         description = EXCLUDED.description,
         tags = EXCLUDED.tags,
         disable_model_invocation = EXCLUDED.disable_model_invocation,
         source = EXCLUDED.source,
         source_url = EXCLUDED.source_url,
         source_path = EXCLUDED.source_path,
         ingested_at = EXCLUDED.ingested_at,
         updated_at = NOW()`,
      [
        projectId,
        input.slug,
        input.description ?? null,
        input.tags,
        input.disableModelInvocation ?? null,
        input.source,
        input.sourceUrl ?? null,
        input.sourcePath,
      ],
    );
  }

  const keepSlugs = inputs.map((input) => input.slug);
  const deleteResult =
    keepSlugs.length > 0
      ? await client.query(
          'DELETE FROM project_skills WHERE project_id = $1 AND slug <> ALL($2::text[])',
          [projectId, keepSlugs],
        )
      : await client.query('DELETE FROM project_skills WHERE project_id = $1', [
          projectId,
        ]);

  return { deleted: deleteResult.rowCount ?? 0, upserted: inputs.length };
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
  const overlayFile = parseSkillTagOverlayFile(
    readFileSync(join(monorepoRoot, SKILL_TAG_OVERLAYS_FILENAME), 'utf8'),
  );
  const skillsLock = readSkillsLock(monorepoRoot);
  const { records, validation } = collectAgentAssetsForIngest({
    monorepoRoot,
  });

  for (const warning of validation.warnings) {
    console.warn(
      `openthrottle-ingest-agent-assets: warning: ${formatIssue(warning)}`,
    );
  }

  if (validation.errors.length > 0) {
    for (const error of validation.errors) {
      console.error(
        `openthrottle-ingest-agent-assets: error: ${formatIssue(error)}`,
      );
    }
    console.error(
      `openthrottle-ingest-agent-assets: ${validation.errors.length} validation error(s); aborting ingest`,
    );
    process.exit(1);
  }

  const url = getPostgresUrl();
  const client = new Client({ connectionString: url });
  await client.connect();

  const ingestedPaths = new Set(records.map((record) => record.filePath));
  let promptsUpserted = 0;
  let embeddingsInserted = 0;
  const errors: string[] = [];
  const embedEnabled = hasEmbeddingProvider();

  if (!embedEnabled) {
    console.log(
      'OPENAI_API_KEY and Ollama embedding env not set; skipping custom_prompt_embeddings.',
    );
  }

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

        await client.query(
          'DELETE FROM custom_prompt_embeddings WHERE custom_prompt_id = $1',
          [promptId],
        );

        if (embedEnabled && record.content.trim()) {
          const chunks = chunkTextForEmbedding(record.content.trim());

          for (let i = 0; i < chunks.length; i += 1) {
            const chunk = chunks[i];
            if (!chunk) {
              continue;
            }

            try {
              const vec = await embedQuery(chunk);
              if (vec && vec.length === EMBEDDING_DIM) {
                await client.query(
                  `INSERT INTO custom_prompt_embeddings (
                     custom_prompt_id, content, embedding, metadata
                   )
                   VALUES ($1, $2, $3::vector, $4::jsonb)`,
                  [
                    promptId,
                    chunk,
                    `[${vec.join(',')}]`,
                    JSON.stringify({
                      chunkIndex: i,
                      filePath: record.filePath,
                    }),
                  ],
                );
                embeddingsInserted += 1;
              }
            } catch (error) {
              errors.push(
                `${record.filePath} embedding chunk ${i}: ${String(error)}`,
              );
            }
          }
        }

        console.log(`  Ingested: ${record.filePath}`);
      } catch (error) {
        const message = `${record.filePath}: ${String(error)}`;
        errors.push(message);
        console.error(`  Error: ${message}`);
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
      console.log(`  Soft-deleted ${stalePaths.length} stale path(s)`);
    }

    try {
      const projectSkills = await reconcileDogfoodProjectSkills(
        client,
        records,
        overlayFile.overlays,
        skillsLock,
      );
      console.log(
        `  project_skills reconciled: ${projectSkills.upserted} upserted, ${projectSkills.deleted} removed`,
      );
    } catch (error) {
      const message = `project_skills reconcile: ${String(error)}`;
      errors.push(message);
      console.error(`  Error: ${message}`);
    }

    console.log('\nDone.');
    console.log(`  custom_prompts upserted: ${promptsUpserted}`);
    if (embedEnabled) {
      console.log(`  custom_prompt_embeddings: ${embeddingsInserted}`);
    }
    if (errors.length > 0) {
      console.error(`  Errors: ${errors.length}`);
      for (const error of errors) {
        console.error(`    ${error}`);
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
