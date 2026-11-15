/**
 * @description Ingests `docs/**.md` and every project README (`applications|databases|packages|tools/<name>/README.md`,
 * stored as `projects/<root>/README.md`) into the OpenThrottle `documentation` table. Content only: openthrottle-server
 * embeds the rows — its embeddings reconciler picks up raw-SQL writes like these within one interval (15 minutes by
 * default) or on its next boot. Idempotent per (repo, sha, path).
 *
 * Env: POSTGRES_* (connection); optional DOCS_REPO (default `local/repo`), DOCS_SHA (default `local`), DOCS_AUTHORS
 * (comma-separated), DOCS_MESSAGE, DOCS_PR_NUMBER, and DOCS_PATHS (comma-separated workspace-relative paths to ingest
 * only those files).
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import { createLogger } from './utils/logger.ts';

interface DocEntry {
  readonly absolutePath: string;
  readonly path: string;
}

const logger = createLogger();
const WORKSPACE_ROOT = process.cwd();
const DOCS_ROOT = join(WORKSPACE_ROOT, 'docs');
const PROJECT_FOLDERS = ['applications', 'databases', 'packages', 'tools'];
const PROJECTS_PATH_PREFIX = 'projects/';

const readOptional = (name: string): string | undefined => {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
};

const collectMarkdown = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => {
      return entry.isFile() && entry.name.endsWith('.md');
    })
    .map((entry) => {
      return join(entry.parentPath, entry.name);
    });
};

const collectProjectReadmes = async (): Promise<DocEntry[]> => {
  const perFolder = await Promise.all(
    PROJECT_FOLDERS.map(async (folder) => {
      const root = join(WORKSPACE_ROOT, folder);

      if (!existsSync(root)) {
        return [];
      }

      const projects = await readdir(root, { withFileTypes: true });

      return projects
        .filter((project) => {
          return project.isDirectory();
        })
        .map((project) => {
          return join(root, project.name, 'README.md');
        })
        .filter((absolutePath) => {
          return existsSync(absolutePath);
        })
        .map((absolutePath) => {
          return {
            absolutePath,
            path: `${PROJECTS_PATH_PREFIX}${relative(WORKSPACE_ROOT, absolutePath)}`,
          };
        });
    }),
  );

  return perFolder.flat();
};

const collectEntries = async (): Promise<DocEntry[]> => {
  const docsPaths = readOptional('DOCS_PATHS');

  if (docsPaths) {
    return docsPaths
      .split(',')
      .map((path) => {
        return path.trim();
      })
      .filter((path) => {
        return path !== '' && existsSync(join(WORKSPACE_ROOT, path));
      })
      .map((path) => {
        return { absolutePath: join(WORKSPACE_ROOT, path), path };
      });
  }

  const [markdown, readmes] = await Promise.all([
    existsSync(DOCS_ROOT) ? collectMarkdown(DOCS_ROOT) : Promise.resolve([]),
    collectProjectReadmes(),
  ]);
  const docs = markdown.map((absolutePath) => {
    return { absolutePath, path: relative(DOCS_ROOT, absolutePath) };
  });

  return [...docs, ...readmes].sort((a, b) => {
    return a.path.localeCompare(b.path);
  });
};

const main = async (): Promise<void> => {
  const repo = readOptional('DOCS_REPO') ?? 'local/repo';
  const sha = readOptional('DOCS_SHA') ?? 'local';
  const authors = JSON.stringify(
    (readOptional('DOCS_AUTHORS') ?? '')
      .split(',')
      .map((author) => {
        return author.trim();
      })
      .filter(Boolean),
  );
  const message = readOptional('DOCS_MESSAGE') ?? null;
  const prNumberRaw = readOptional('DOCS_PR_NUMBER');
  const prNumber = prNumberRaw ? Number.parseInt(prNumberRaw, 10) : null;

  const entries = await collectEntries();

  logger.heading(
    `Ingesting ${entries.length} documentation file(s) for ${repo}@${sha}`,
  );

  const client = new Client({ connectionString: getPostgresUrl() });

  await client.connect();

  try {
    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        const content = await readFile(entry.absolutePath, 'utf8');

        await client.query(
          `INSERT INTO documentation (path, content, repo, sha, pr_number, authors, message)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
           ON CONFLICT (repo, sha, path)
           DO UPDATE SET content = EXCLUDED.content, pr_number = EXCLUDED.pr_number,
                         authors = EXCLUDED.authors, message = EXCLUDED.message`,
          [entry.path, content, repo, sha, prNumber, authors, message],
        );

        return entry.path;
      }),
    );
    const failures = results.flatMap((result, index) => {
      return result.status === 'rejected'
        ? [`${entries[index]?.path ?? '?'}: ${String(result.reason)}`]
        : [];
    });

    logger.heading('Done.');
    logger.detail(
      `documentation upserted: ${results.length - failures.length}`,
    );
    logger.detail(
      'Embeddings: openthrottle-server embeds these rows (reconciler, within 15 minutes or on next boot).',
    );

    if (failures.length > 0) {
      logger.fail(`Errors: ${failures.length}`);
      for (const failure of failures) {
        logger.fail(`  ${failure}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
};

await main();
