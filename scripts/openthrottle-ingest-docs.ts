#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { createProjectGraphAsync } from '@nx/devkit';
import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';

/* eslint-disable no-await-in-loop */

/**
 * @description Ingests docs/ markdown and NX project READMEs into Cortex documentation + documentation_embeddings.
 * Idempotent per (repo, sha, path). Uses POSTGRES_* and OPENAI_API_KEY for embeddings.
 * Set DOCS_REPO and DOCS_SHA for source metadata (e.g. from workflow); defaults to local/repo and local.
 * Optional DOCS_PATHS: comma-separated relative paths to ingest only those files (used by BullMQ doc-ingestion job).
 */

const DOCS_ROOT = join(process.cwd(), 'docs');
const WORKSPACE_ROOT = process.cwd();

export interface ProjectRootEntry {
  readonly name: string;
  readonly root: string;
}

/**
 * @description Loads NX project graph and returns project names with resolved root paths (relative to workspace).
 */
export async function getProjectRootsFromGraph(): Promise<ProjectRootEntry[]> {
  try {
    const testing = await createProjectGraphAsync();
    console.log('🚨 Debugging 🧩', { testing });
  } catch (error) {
    console.error('🚨 Error', error);
  }

  const graph = await createProjectGraphAsync();
  const entries: ProjectRootEntry[] = [];

  console.log('🚨 Debugging', { nodes: Object.values(graph.nodes) });

  for (const node of Object.values(graph.nodes)) {
    const root = node.data?.root;
    if (typeof root === 'string' && root) {
      entries.push({ name: node.name, root });
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export interface DocEntry {
  readonly path: string;
  readonly absolutePath: string;
}

/** Prefix for documentation path for NX project READMEs (stable, distinct from docs/). */
const PROJECTS_PATH_PREFIX = 'projects/';

/**
 * @description Collects README.md paths from each NX project root; only includes entries where the file exists.
 * Path key is project-relative: projects/<root>/README.md for idempotency per (repo, sha, path).
 */
export async function collectProjectReadmeEntries(
  projectRoots: ProjectRootEntry[],
): Promise<DocEntry[]> {
  const entries: DocEntry[] = [];

  for (const { root } of projectRoots) {
    const absolutePath = join(WORKSPACE_ROOT, root, 'README.md');

    try {
      await access(absolutePath);

      entries.push({
        absolutePath,
        path: `${PROJECTS_PATH_PREFIX}${root}/README.md`,
      });
    } catch {
      // README.md does not exist; skip
    }
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

/** ~3 chars/token; text-embedding-3-small max is 8192 tokens. */
const MAX_EMBEDDING_CHARS = 24_000;

/**
 * @description Splits text into chunks under MAX_EMBEDDING_CHARS for the embedding model.
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

/**
 * @description Recursively collects relative paths of .md files under dir (relative to DOCS_ROOT).
 */
async function collectMdPaths(
  dir: string,
  baseRelative: string,
): Promise<string[]> {
  const out: string[] = [];

  let entries: { name: string; isFile: () => boolean }[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const e of entries) {
    const rel = baseRelative ? `${baseRelative}/${e.name}` : e.name;

    if (e.isFile() && e.name.endsWith('.md')) {
      out.push(rel);
    } else if (e.isFile() === false) {
      out.push(...(await collectMdPaths(join(dir, e.name), rel)));
    }
  }

  return out;
}

async function main(): Promise<void> {
  const { connectionString } = getCortexPostgresConfig();

  const repo = process.env.DOCS_REPO?.trim() ?? 'local/repo';
  const sha = process.env.DOCS_SHA?.trim() ?? 'local';
  const authorsJson = JSON.stringify(
    process.env.DOCS_AUTHORS
      ? process.env.DOCS_AUTHORS.split(',').map((a) => a.trim())
      : [],
  );

  const message = process.env.DOCS_MESSAGE?.trim() ?? null;
  const prNumber = process.env.DOCS_PR_NUMBER
    ? Number.parseInt(process.env.DOCS_PR_NUMBER, 10)
    : null;

  const docsPathsEnv = process.env.DOCS_PATHS?.trim();
  let docEntries: DocEntry[];

  if (docsPathsEnv) {
    const pathsList = docsPathsEnv
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const entries: DocEntry[] = [];
    for (const rel of pathsList) {
      const absolutePath = join(WORKSPACE_ROOT, rel);
      try {
        await access(absolutePath);
        entries.push({ absolutePath, path: rel });
      } catch {
        // Skip missing paths
      }
    }
    docEntries = entries.sort((a, b) => a.path.localeCompare(b.path));
    console.log(
      `DOCS_PATHS set: ingesting ${docEntries.length} path(s) (${pathsList.length} requested).`,
    );
  } else {
    const [mdPaths, projectRoots] = await Promise.all([
      collectMdPaths(DOCS_ROOT, ''),
      getProjectRootsFromGraph(),
    ]);

    const docsEntriesFromDocs: DocEntry[] = mdPaths.map((rel) => ({
      absolutePath: join(DOCS_ROOT, rel),
      path: rel,
    }));

    const projectReadmeEntries =
      await collectProjectReadmeEntries(projectRoots);
    docEntries = [...docsEntriesFromDocs, ...projectReadmeEntries];

    console.log(`Found ${mdPaths.length} markdown file(s) under docs/.`);
    console.log(`Loaded ${projectRoots.length} project root(s) from NX graph.`);
    console.log(
      `Collected ${projectReadmeEntries.length} project README(s) for ingestion.`,
    );
  }

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (!hasOpenAi) {
    console.log(
      'OPENAI_API_KEY not set; skipping embeddings (documentation_embeddings will be empty).',
    );
  }

  let embeddings:
    | { embedDocuments: (texts: string[]) => Promise<number[][]> }
    | undefined;

  if (hasOpenAi) {
    const { OpenAIEmbeddings } = await import('@langchain/openai');
    embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-small' });
  }

  const client = new Client({ connectionString });
  await client.connect();

  let docsUpserted = 0;
  let embeddingsInserted = 0;

  const errors: string[] = [];

  try {
    for (const entry of docEntries) {
      const { path: docPath, absolutePath: docAbsolutePath } = entry;

      try {
        const content = await readFile(docAbsolutePath, 'utf-8');
        const docResult = await client.query<{ id: string }>(
          `INSERT INTO documentation (path, content, repo, sha, pr_number, authors, message)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
           ON CONFLICT (repo, sha, path)
           DO UPDATE SET content = EXCLUDED.content, pr_number = EXCLUDED.pr_number, authors = EXCLUDED.authors, message = EXCLUDED.message
           RETURNING id`,
          [docPath, content, repo, sha, prNumber ?? null, authorsJson, message],
        );

        const docId = docResult.rows[0]?.id;
        if (!docId) {
          errors.push(`${docPath}: documentation upsert did not return id`);
          continue;
        }

        docsUpserted += 1;

        await client.query(
          'DELETE FROM documentation_embeddings WHERE documentation_id = $1',
          [docId],
        );

        if (embeddings && content.trim()) {
          const chunks = chunkTextForEmbedding(content.trim());
          if (chunks.length > 0) {
            try {
              const vecs = await embeddings.embedDocuments(chunks);
              for (let i = 0; i < chunks.length; i++) {
                const vec = vecs[i];
                const chunk = chunks[i];
                if (vec && vec.length === 1536 && chunk) {
                  await client.query(
                    `INSERT INTO documentation_embeddings (documentation_id, content, embedding, metadata)
                     VALUES ($1, $2, $3::vector, '{}'::jsonb)`,
                    [docId, chunk, `[${vec.join(',')}]`],
                  );
                  embeddingsInserted += 1;
                }
              }
            } catch (e) {
              errors.push(`${docPath} embedding: ${String(e)}`);
            }
          }
        }

        console.log(`  Ingested: ${docPath}`);
      } catch (e) {
        const msg = `${docPath}: ${String(e)}`;
        errors.push(msg);
        console.error(`  Error: ${msg}`);
      }
    }

    console.log('\nDone.');
    console.log(`  Documentation rows upserted: ${docsUpserted}`);
    if (hasOpenAi) {
      console.log(`  Documentation embeddings: ${embeddingsInserted}`);
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
