/**
 * @description Builds every text surface from the typed registry:
 * - the marker-delimited section of the root README.md (committed, gated);
 * - out/org-profile/README.md, for a separate owner-approved PR to
 *   OpenThrottle/.github (this script never pushes);
 * - out/linkedin.md, a paste block for LinkedIn.
 * `out/` is gitignored. Stats are computed here (gh api, nx show projects,
 * the driver registry) and never typed by hand.
 *
 * Flags: `--offline` skips the network and omits stats. The drift gate is
 * the separate `check-surfaces` target (src/scripts/check-surfaces.ts).
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { DRIVER_IDS } from '@openthrottle/openthrottle-drivers';
import {
  OPENTHROTTLE_GITHUB_REPOSITORY,
  OPENTHROTTLE_GITHUB_URL_MONOREPO,
  OPENTHROTTLE_WEBSITE_URL,
} from '@openthrottle/react-router-utils';

import { PRODUCT_FEATURES } from '../data/data.features';
import { PRODUCT_POSITIONING } from '../data/data.positioning';
import { PRODUCT_PROJECTS } from '../data/data.projects';
import type {
  StatsGraphicScheme,
  SurfaceInput,
  SurfaceStats,
} from '../types/surfaces';
import {
  renderLinkedInBlock,
  renderOrgProfile,
  renderReadmeSection,
  replaceMarkedSection,
} from '../utils/render';
import { getAgentCliNames, renderStatsSvg } from '../utils/stats-graphic';

const run = promisify(execFile);

const STATS_GRAPHIC_SCHEMES: readonly StatsGraphicScheme[] = ['dark', 'light'];

const WORKSPACE_ROOT = new URL('../../../../', import.meta.url);
const README_URL = new URL('README.md', WORKSPACE_ROOT);
const OUT_URL = new URL('../../out/', import.meta.url);

const countProjects = async (tag: string): Promise<number> => {
  const { stdout } = await run(
    'pnpm',
    ['nx', 'show', 'projects', '--projects', `tag:${tag}`, '--json'],
    { cwd: WORKSPACE_ROOT },
  );
  const parsed: unknown = JSON.parse(stdout);

  return Array.isArray(parsed) ? parsed.length : 0;
};

const countMergedPullRequests = async (): Promise<number> => {
  const query = `repo:${OPENTHROTTLE_GITHUB_REPOSITORY} is:pr is:merged`;
  const { stdout } = await run('gh', [
    'api',
    '-X',
    'GET',
    'search/issues',
    '-f',
    `q=${query}`,
    '--jq',
    '.total_count',
  ]);

  return Number.parseInt(stdout.trim(), 10);
};

const getStats = async (): Promise<SurfaceStats> => {
  const [applications, packages, mergedPullRequests] = await Promise.all([
    countProjects('type:application'),
    countProjects('type:package'),
    countMergedPullRequests(),
  ]);
  const agentClis = getAgentCliNames(DRIVER_IDS);

  return { agentClis, applications, mergedPullRequests, packages };
};

const main = async (): Promise<number> => {
  const args = new Set(process.argv.slice(2));
  const isOffline = args.has('--offline');
  const stats = isOffline ? undefined : await getStats();
  const input: SurfaceInput = {
    features: PRODUCT_FEATURES,
    positioning: PRODUCT_POSITIONING,
    projects: PRODUCT_PROJECTS,
    repositoryUrl: OPENTHROTTLE_GITHUB_URL_MONOREPO,
    stats,
    syncedOn: new Date().toISOString().slice(0, 10),
    websiteUrl: OPENTHROTTLE_WEBSITE_URL,
  };

  const readme = await readFile(README_URL, 'utf8');
  const replaced = replaceMarkedSection(readme, renderReadmeSection(input));

  if (!replaced.ok) {
    console.error(`README.md: ${replaced.reason}`);

    return 1;
  }

  const orgProfileUrl = new URL('org-profile/README.md', OUT_URL);
  const linkedInUrl = new URL('linkedin.md', OUT_URL);

  const assetsUrl = new URL('org-profile/assets/', OUT_URL);

  // Create out/ before any write starts: a rejected write would end the
  // process mid-write and truncate README.md.
  await mkdir(assetsUrl, { recursive: true });

  const writes = [
    writeFile(README_URL, replaced.document),
    writeFile(orgProfileUrl, renderOrgProfile(input)),
    writeFile(linkedInUrl, renderLinkedInBlock(input)),
  ];

  if (stats !== undefined) {
    for (const scheme of STATS_GRAPHIC_SCHEMES) {
      const svgUrl = new URL(`stats-${scheme}.svg`, assetsUrl);

      writes.push(writeFile(svgUrl, renderStatsSvg(stats, scheme)));
    }
  }

  await Promise.all(writes);

  console.log(`README.md features section written.`);
  console.log(`Org profile: ${orgProfileUrl.pathname}`);
  console.log(`LinkedIn block: ${linkedInUrl.pathname}`);

  if (stats !== undefined) {
    console.log(`Stats graphics: ${assetsUrl.pathname}stats-{dark,light}.svg`);
  }

  if (stats === undefined) {
    console.log('Offline: stats omitted.');
  }

  return 0;
};

process.exitCode = await main();
