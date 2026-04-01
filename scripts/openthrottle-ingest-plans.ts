#!/usr/bin/env node

/* eslint-disable no-await-in-loop */

/**
 * @description Ingests plan JSON and optional output Markdown from plans/ into the Cortex Postgres database.
 * Read-only with respect to the filesystem; does not delete or modify plan files.
 * Uses CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars. Optional embeddings when OPENAI_API_KEY or OLLAMA_* is set (see @openthrottle/ai-mcp embedding).
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import {
  embedQuery,
  isOllamaEmbeddingConfigured,
} from '@openthrottle/ai-mcp/src/embedding';

const PLANS_ROOT = join(process.cwd(), 'plans');
const TEMPLATES_DIR = 'templates';
const OUTPUT_SUFFIX = '-output.json';
const OUTPUT_MD_SUFFIX = '-output.md';

interface PlanMetadata {
  readonly author: string;
  readonly category: string;
  readonly created?: string;
  readonly description?: string;
  readonly status?: string;
  readonly summary?: string;
  readonly title: string;
}

interface PlanTask {
  readonly category?: string;
  readonly description?: string;
  readonly requirements?: readonly string[];
  readonly status?: string;
  readonly summary?: string;
  readonly title: string;
}

interface PlanJson {
  readonly metadata: PlanMetadata;
  readonly tasks: readonly PlanTask[];
}

function isValidPlanJson(value: unknown): value is PlanJson {
  if (value === null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (!o.metadata || typeof o.metadata !== 'object') return false;
  const meta = o.metadata as Record<string, unknown>;
  if (
    typeof meta.author !== 'string' ||
    typeof meta.category !== 'string' ||
    typeof meta.title !== 'string'
  ) {
    return false;
  }
  if (!Array.isArray(o.tasks)) return false;
  for (const t of o.tasks) {
    if (
      t === null ||
      typeof t !== 'object' ||
      typeof (t as Record<string, unknown>).title !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

/**
 * @description Returns subdir names under PLANS_ROOT excluding TEMPLATES_DIR, plus '' for root.
 */
async function getPlanSubdirs(): Promise<string[]> {
  let entries: { name: string; isDirectory: () => boolean }[];
  try {
    entries = await readdir(PLANS_ROOT, { withFileTypes: true });
  } catch {
    return [''];
  }
  const subdirs = entries
    .filter((e) => e.isDirectory() && e.name !== TEMPLATES_DIR)
    .map((e) => e.name)
    .sort();
  return ['', ...subdirs];
}

async function collectPlanJsonPaths(): Promise<
  { relativePath: string; absolutePath: string }[]
> {
  const out: { relativePath: string; absolutePath: string }[] = [];
  const subdirs = await getPlanSubdirs();
  for (const sub of subdirs) {
    const dir = sub ? join(PLANS_ROOT, sub) : PLANS_ROOT;
    let entries: string[];
    try {
      entries = await readdir(dir, { withFileTypes: false });
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith('.json') || name.endsWith(OUTPUT_SUFFIX)) continue;
      const absolutePath = join(dir, name);
      const relativePath = sub ? `${sub}/${name}` : name;
      out.push({ absolutePath, relativePath });
    }
  }
  return out;
}

async function loadPlanJson(absolutePath: string): Promise<PlanJson> {
  const raw = await readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isValidPlanJson(parsed)) {
    throw new Error(`Invalid plan JSON structure: ${absolutePath}`);
  }
  return parsed;
}

async function loadOutputMarkdownIfExists(
  absolutePath: string,
): Promise<string | undefined> {
  const mdPath = absolutePath.replace(/\.json$/, OUTPUT_MD_SUFFIX);
  try {
    return await readFile(mdPath, 'utf-8');
  } catch {
    return undefined;
  }
}

function buildPlanContentForEmbedding(
  plan: PlanJson,
  outputMd?: string,
): string {
  const meta = plan.metadata;
  const parts: string[] = [
    meta.title,
    meta.description ?? '',
    meta.summary ?? '',
    meta.author,
    meta.category,
    ...plan.tasks.map(
      (t) => t.title + (t.description ?? '') + (t.summary ?? ''),
    ),
  ];
  if (outputMd) parts.push(outputMd);
  return parts.filter(Boolean).join('\n');
}

function buildTaskContentForEmbedding(task: PlanTask): string {
  const parts: string[] = [
    task.title,
    task.description ?? '',
    task.summary ?? '',
  ];
  if (Array.isArray(task.requirements)) {
    parts.push(task.requirements.join(' '));
  }
  return parts.filter(Boolean).join('\n');
}

/** ~3 chars/token for English; text-embedding-3-small max is 8192 tokens. */
const MAX_EMBEDDING_CHARS = 24_000;

/**
 * @description Splits text into chunks under MAX_EMBEDDING_CHARS so each fits the embedding model context.
 */
function chunkTextForEmbedding(text: string): string[] {
  if (text.length <= MAX_EMBEDDING_CHARS) return [text];
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  for (const p of paragraphs) {
    const next = current ? `${current}\n\n${p}` : p;
    if (next.length <= MAX_EMBEDDING_CHARS) {
      current = next;
    } else {
      if (current) {
        chunks.push(current);
        current = '';
      }
      if (p.length <= MAX_EMBEDDING_CHARS) {
        current = p;
      } else {
        for (const line of p.split(/\n/)) {
          const lineBlock = current ? `${current}\n${line}` : line;
          if (lineBlock.length <= MAX_EMBEDDING_CHARS) {
            current = lineBlock;
          } else {
            if (current) chunks.push(current);
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
  if (current) chunks.push(current);
  return chunks;
}

async function main(): Promise<void> {
  const config = getCortexPostgresConfig();
  if (!config) {
    throw new Error(
      'Cortex Postgres not configured. Set CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars.',
    );
  }
  const connectionString = config.connectionString;

  const planPaths = await collectPlanJsonPaths();
  console.log(`Found ${planPaths.length} plan JSON file(s).`);

  const hasEmbeddings =
    Boolean(process.env.OPENAI_API_KEY?.trim()) ||
    isOllamaEmbeddingConfigured();
  if (!hasEmbeddings) {
    console.log(
      'No embedding provider (OPENAI_API_KEY or OLLAMA_*); skipping embeddings (plan_embeddings and task_embeddings will be empty).',
    );
  }

  /** When set, use env-driven embedder (OpenAI or Ollama) for plan/task embeddings; vectors must be 1536-dim for Cortex schema. */
  let embedDocuments: ((texts: string[]) => Promise<number[][]>) | undefined;
  if (hasEmbeddings) {
    embedDocuments = async (texts: string[]): Promise<number[][]> => {
      const out: number[][] = [];
      for (const text of texts) {
        const vec = await embedQuery(text);
        out.push(vec ?? []);
      }
      return out;
    };
  }

  const client = new Client({ connectionString });
  await client.connect();

  let plansInserted = 0;
  let planOutputStreamInserted = 0;
  let tasksInserted = 0;
  let planEmbeddingsInserted = 0;
  let taskEmbeddingsInserted = 0;
  const errors: string[] = [];

  try {
    for (const { relativePath, absolutePath } of planPaths) {
      try {
        const plan = await loadPlanJson(absolutePath);
        const outputMd = await loadOutputMarkdownIfExists(absolutePath);

        const planResult = await client.query(
          `INSERT INTO plans (title, author, category, status, description, summary)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, created_at`,
          [
            plan.metadata.title,
            plan.metadata.author,
            plan.metadata.category,
            plan.metadata.status ?? 'pending',
            plan.metadata.description ?? null,
            plan.metadata.summary ?? null,
          ],
        );
        const planId = planResult.rows[0]?.id as string | undefined;
        if (!planId) {
          errors.push(`${relativePath}: plans insert did not return id`);
          continue;
        }
        plansInserted += 1;

        if (outputMd?.trim()) {
          try {
            await client.query(
              `INSERT INTO plan_output_stream (plan_id, content, iteration)
               VALUES ($1, $2, NULL)`,
              [planId, outputMd.trim()],
            );
            planOutputStreamInserted += 1;
          } catch (e) {
            errors.push(`${relativePath} plan_output_stream: ${String(e)}`);
          }
        }

        for (const task of plan.tasks) {
          const taskResult = await client.query(
            `INSERT INTO tasks (plan_id, title, description, category, status, requirements, summary)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              planId,
              task.title,
              task.description ?? null,
              task.category ?? null,
              task.status ?? 'pending',
              JSON.stringify(task.requirements ?? []),
              task.summary ?? null,
            ],
          );
          const taskId = taskResult.rows[0]?.id as string | undefined;
          if (!taskId) {
            errors.push(
              `${relativePath} task "${task.title}": tasks insert did not return id`,
            );
            continue;
          }
          tasksInserted += 1;

          if (embedDocuments && taskId) {
            const taskContent = buildTaskContentForEmbedding(task);
            if (taskContent.trim()) {
              try {
                const [vec] = await embedDocuments([taskContent]);
                if (vec && vec.length === 1536) {
                  await client.query(
                    `INSERT INTO task_embeddings (task_id, content, embedding, metadata)
                     VALUES ($1, $2, $3, '{}'::jsonb)`,
                    [taskId, taskContent, `[${vec.join(',')}]`],
                  );
                  taskEmbeddingsInserted += 1;
                }
              } catch (e) {
                errors.push(
                  `${relativePath} task "${task.title}" embedding: ${String(e)}`,
                );
              }
            }
          }
        }

        if (embedDocuments) {
          const planContent = buildPlanContentForEmbedding(plan, outputMd);
          if (planContent.trim()) {
            const planChunks = chunkTextForEmbedding(planContent.trim());
            try {
              const vecs = await embedDocuments(planChunks);
              for (let i = 0; i < planChunks.length; i++) {
                const vec = vecs[i];
                const chunk = planChunks[i];
                if (vec && vec.length === 1536 && chunk) {
                  await client.query(
                    `INSERT INTO plan_embeddings (plan_id, content, embedding, metadata)
                     VALUES ($1, $2, $3, '{}'::jsonb)`,
                    [planId, chunk, `[${vec.join(',')}]`],
                  );
                  planEmbeddingsInserted += 1;
                }
              }
            } catch (e) {
              errors.push(`${relativePath} plan embedding: ${String(e)}`);
            }
          }
        }

        console.log(`  Ingested: ${relativePath}`);
      } catch (e) {
        const msg = `${relativePath}: ${String(e)}`;
        errors.push(msg);
        console.error(`  Error: ${msg}`);
      }
    }

    console.log('\nDone.');
    console.log(`  Plans: ${plansInserted}`);
    console.log(`  Plan output stream chunks: ${planOutputStreamInserted}`);
    console.log(`  Tasks: ${tasksInserted}`);
    if (hasEmbeddings) {
      console.log(`  Plan embeddings: ${planEmbeddingsInserted}`);
      console.log(`  Task embeddings: ${taskEmbeddingsInserted}`);
    }
    if (errors.length > 0) {
      console.error(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.error(`    ${err}`));
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
