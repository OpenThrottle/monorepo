/**
 * @description Ingests `.agents/` skills, rules, personas, and prompts into `custom_prompts` + `custom_prompt_embeddings`.
 * Idempotent per (file_path, prompt_type). D5: hard-fail on skill/persona validation errors; warn-only on rules.
 */

/* eslint-disable no-await-in-loop -- sequential per-file upsert + embedding refresh is intentional */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  collectAgentAssetsForIngest,
} from '@openthrottle/openthrottle-skills';
import { Client } from 'pg';

import {
  embedQuery,
  isOllamaEmbeddingConfigured,
} from '@openthrottle/node-client';

const EMBEDDING_DIM = 1536;

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

const main = async (): Promise<void> => {
  const monorepoRoot = process.cwd();
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
