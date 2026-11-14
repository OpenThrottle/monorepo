/**
 * @description Release automation for the `applications` Nx release group
 * (the production apps plus the root `monorepo` project, which carries the
 * product version). Nx computes every version from the project graph and the
 * conventional-commit PR titles; this script adds the parts Nx does not do
 * under a merge queue: a reviewable release PR and post-merge tags.
 *
 * Subcommands:
 * - `baseline [--ref=<sha>] [--apply] [--push]` — tag every project at its
 *   current package.json version (`<project>@<version>`), so Nx resolves
 *   versions from tags instead of walking all of history. Run once, on the
 *   commit that introduced this release config. Dry-run unless `--apply`
 *   (create locally) or `--push` (create and push to origin).
 * - `prepare [--body-file=<path>] [--dry-run]` — run Nx version + changelog
 *   for the group (writing package.json versions and CHANGELOG.md files, no
 *   git), add the version table to the product changelog, and write the
 *   release PR body. Reports `has_release`, `title` and `version` on
 *   `$GITHUB_OUTPUT` when set. The workflow commits the result to
 *   `release/next` and opens or updates the release PR.
 * - `publish [--ref=<sha> | --scan=<n>] [--dry-run]` — for each merged
 *   release PR (`--ref`, or every one among the last `--scan` first-parent
 *   commits, default 30), tag every project whose package.json version it
 *   changed and create its GitHub release from that version's CHANGELOG.md
 *   section. Idempotent: existing tags and releases are skipped. Reports the
 *   newly created `tags` (space-separated) on `$GITHUB_OUTPUT`.
 */
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProjectGraphAsync } from '@nx/devkit';
import { releaseChangelog, releaseVersion } from 'nx/release';

import type { ReleaseProject } from './utils/index.ts';
import {
  collectVersionChanges,
  createLogger,
  extractChangelogSection,
  flagValue,
  hasFlag,
  insertVersionTable,
  isReleaseCommit,
  planBaselineTags,
  positionals,
  PRODUCT_PROJECT,
  readGroupPatterns,
  readManifestVersion,
  RELEASE_GROUP,
  releasePrTitle,
  releaseTagName,
  releaseTitle,
  renderReleasePrBody,
  renderVersionTable,
  resolveProductVersion,
  run,
} from './utils/index.ts';

const logger = createLogger();

const listReleaseProjects = async (): Promise<readonly ReleaseProject[]> => {
  const patterns = readGroupPatterns(readFileSync('nx.json', 'utf8'), RELEASE_GROUP); // prettier-ignore

  if (patterns.length === 0) {
    throw new Error(`nx.json has no release group "${RELEASE_GROUP}"`);
  }

  const names: unknown = JSON.parse(
    run('pnpm', ['nx', 'show', 'projects', '--json', '--projects', patterns.join(',')]).stdout, // prettier-ignore
  );

  if (!Array.isArray(names)) {
    throw new Error('`nx show projects --json` did not return an array');
  }

  const graph = await createProjectGraphAsync();

  return names
    .filter((name): name is string => typeof name === 'string')
    .sort()
    .map((name) => {
      const root = graph.nodes[name]?.data.root ?? '.';
      const version = readManifestVersion(readFileSync(join(root, 'package.json'), 'utf8')); // prettier-ignore

      if (version === undefined) {
        throw new Error(`${name}: no version in ${join(root, 'package.json')}`);
      }

      return { name, root, version };
    });
};

const existingReleaseTags = (): ReadonlySet<string> => {
  const output = run('git', ['tag', '--list', '*@*']).stdout;

  return new Set(output === '' ? [] : output.split('\n'));
};

const baseline = async (args: readonly string[]): Promise<number> => {
  const ref = flagValue('ref', [...args]) ?? 'HEAD';
  const push = hasFlag('push', [...args]);
  const apply = push || hasFlag('apply', [...args]);
  const sha = run('git', ['rev-parse', '--verify', `${ref}^{commit}`]).stdout;
  const plan = planBaselineTags(await listReleaseProjects(), existingReleaseTags()); // prettier-ignore

  logger.heading(`Baseline release tags at ${sha.slice(0, 9)} (${ref})`);

  for (const tag of plan.existing) {
    logger.detail(`exists  ${tag}`);
  }

  if (plan.missing.length === 0) {
    logger.success('Every project already has its baseline tag');

    return 0;
  }

  if (!apply) {
    for (const tag of plan.missing) {
      logger.step(`would tag ${tag}`);
    }

    logger.info('Dry run: pass --apply to create the tags locally, or --push to also push them'); // prettier-ignore

    return 0;
  }

  for (const tag of plan.missing) {
    run('git', ['tag', tag, sha]);
    logger.success(`tagged ${tag}`);
  }

  if (push) {
    run('git', ['push', 'origin', ...plan.missing.map((tag) => `refs/tags/${tag}`)], { stdio: 'inherit' }); // prettier-ignore
    logger.success(`pushed ${plan.missing.length} tag(s) to origin`);
  }

  return 0;
};

const writeOutputs = (outputs: Readonly<Record<string, string>>): void => {
  const target = process.env.GITHUB_OUTPUT;

  for (const [key, value] of Object.entries(outputs)) {
    logger.detail(`${key}=${value}`);

    if (target !== undefined && target !== '') {
      appendFileSync(target, `${key}=${value}\n`);
    }
  }
};

const prepare = async (args: readonly string[]): Promise<number> => {
  const dryRun = hasFlag('dry-run', [...args]);
  const bodyFile = flagValue('body-file', [...args]);
  const projects = await listReleaseProjects();
  const product = projects.find((project) => project.name === PRODUCT_PROJECT);

  logger.heading(`Preparing the ${RELEASE_GROUP} release${dryRun ? ' (dry run)' : ''}`); // prettier-ignore

  const versionResult = await releaseVersion({ dryRun, groups: [RELEASE_GROUP], verbose: false }); // prettier-ignore
  const changes = collectVersionChanges(versionResult.projectsVersionData);

  if (changes.length === 0) {
    logger.success('Nothing to release: no project has a releasable commit since its tag'); // prettier-ignore
    writeOutputs({ has_release: 'false' });

    return 0;
  }

  await releaseChangelog({
    dryRun,
    groups: [RELEASE_GROUP],
    verbose: false,
    versionData: versionResult.projectsVersionData,
  });

  const productVersion = resolveProductVersion(changes, product?.version ?? '0.0.0'); // prettier-ignore
  const productChangelog = join(product?.root ?? '.', 'CHANGELOG.md');

  if (!dryRun) {
    const contents = readFileSync(productChangelog, 'utf8');

    writeFileSync(productChangelog, insertVersionTable(contents, productVersion, renderVersionTable(changes))); // prettier-ignore
  }

  for (const change of changes) {
    logger.step(`${change.name} ${change.from} → ${change.to}`);
  }

  if (bodyFile !== undefined) {
    writeFileSync(bodyFile, renderReleasePrBody(productVersion, changes));
  }

  writeOutputs({ has_release: 'true', title: releasePrTitle(productVersion), version: productVersion }); // prettier-ignore

  return 0;
};

const versionAt = (ref: string, root: string): string | undefined => {
  const result = run('git', ['show', `${ref}:${join(root, 'package.json')}`], { allowFailure: true }); // prettier-ignore

  return result.exitCode === 0 ? readManifestVersion(result.stdout) : undefined;
};

const releaseExists = (tag: string): boolean => {
  return run('gh', ['release', 'view', tag, '--json', 'tagName'], { allowFailure: true }).exitCode === 0; // prettier-ignore
};

interface PublishContext {
  readonly dryRun: boolean;
  readonly existing: ReadonlySet<string>;
  readonly notesDir: string;
  readonly projects: readonly ReleaseProject[];
}

/** Tag and release every project whose version the release commit `sha` changed. */
const publishCommit = (
  sha: string,
  context: PublishContext,
): readonly string[] => {
  const published: string[] = [];

  logger.heading(`Publishing ${sha.slice(0, 9)}: ${run('git', ['log', '-1', '--format=%s', sha]).stdout}`); // prettier-ignore

  for (const project of context.projects) {
    const version = versionAt(sha, project.root);

    if (
      version === undefined ||
      version === versionAt(`${sha}^`, project.root)
    ) {
      continue;
    }

    const tag = releaseTagName(project.name, version);
    const changelog = run('git', ['show', `${sha}:${join(project.root, 'CHANGELOG.md')}`], { allowFailure: true }); // prettier-ignore
    const notes = extractChangelogSection(changelog.stdout, version) ?? `Release ${tag}.`; // prettier-ignore
    const notesFile = join(context.notesDir, `${project.name}-${version}.md`);

    published.push(tag);
    writeFileSync(notesFile, `${notes}\n`);

    if (context.existing.has(tag)) {
      logger.detail(`tag exists  ${tag}`);
    } else if (context.dryRun) {
      logger.step(`would tag ${tag}`);
    } else {
      run('git', ['tag', tag, sha]);
      run('git', ['push', 'origin', `refs/tags/${tag}`]);
      logger.success(`tagged ${tag}`);
    }

    if (context.dryRun) {
      logger.step(`would release ${tag} unless it exists`);
      continue;
    }

    if (releaseExists(tag)) {
      logger.detail(`release exists  ${tag}`);
      continue;
    }

    const latest = project.name === PRODUCT_PROJECT ? '--latest' : '--latest=false'; // prettier-ignore

    run('gh', ['release', 'create', tag, '--verify-tag', latest, '--title', releaseTitle(project.name, version), '--notes-file', notesFile]); // prettier-ignore
    logger.success(`released ${tag}`);
  }

  return published;
};

/**
 * The release commits to publish, oldest first: `--ref` alone, or every
 * release commit among the last `--scan` first-parent commits of HEAD.
 * Scanning matters because GitHub cancels a pending run when a newer one
 * queues behind it, so the run for a release commit may never happen.
 */
const releaseCommitsToPublish = (
  args: readonly string[],
): readonly string[] => {
  const ref = flagValue('ref', [...args]);

  if (ref !== undefined) {
    const sha = run('git', ['rev-parse', '--verify', `${ref}^{commit}`]).stdout;

    return isReleaseCommit(run('git', ['log', '-1', '--format=%s', sha]).stdout) ? [sha] : []; // prettier-ignore
  }

  const depth = flagValue('scan', [...args]) ?? '30';
  const log = run('git', ['log', '--first-parent', `--max-count=${depth}`, '--format=%H %s', 'HEAD']).stdout; // prettier-ignore

  return log
    .split('\n')
    .map((line) => {
      const space = line.indexOf(' ');

      return { sha: line.slice(0, space), subject: line.slice(space + 1) };
    })
    .filter((commit) => isReleaseCommit(commit.subject))
    .map((commit) => commit.sha)
    .reverse();
};

const publish = async (args: readonly string[]): Promise<number> => {
  const commits = releaseCommitsToPublish(args);

  if (commits.length === 0) {
    logger.success('No release commit to publish');
    writeOutputs({ tags: '' });

    return 0;
  }

  const context: PublishContext = {
    dryRun: hasFlag('dry-run', [...args]),
    existing: existingReleaseTags(),
    notesDir: mkdtempSync(join(tmpdir(), 'release-notes-')),
    projects: await listReleaseProjects(),
  };
  const tags = commits.flatMap((sha) => {
    return publishCommit(sha, context).filter((tag) => !context.existing.has(tag)); // prettier-ignore
  });

  writeOutputs({ tags: tags.join(' ') });

  return 0;
};

export const main = async (args: readonly string[]): Promise<number> => {
  const [command] = positionals([...args], ['body-file', 'ref', 'scan']);

  if (command === 'baseline') {
    return baseline(args);
  }

  if (command === 'prepare') {
    return prepare(args);
  }

  if (command === 'publish') {
    return publish(args);
  }

  logger.fail(`Unknown subcommand "${command ?? ''}". Expected: baseline, prepare, publish`); // prettier-ignore

  return 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
