/**
 * @description The product-registry drift gate. Fails (exit 1) when:
 * - the root README.md features section differs from what generate-surfaces
 *   would write;
 * - the registry breaks a static rule (lengths, ids, pillars, dates, UUIDs,
 *   emoji, project summaries);
 * - a `PRODUCT_PROJECTS` entry points at a directory that does not exist;
 * - a `shipped`/`preview` entry cites a PR that is not merged;
 * - an `in-flight`/`planned` entry cites an OpenThrottle plan that is
 *   CANCELED or missing.
 * The last two need the network: each is skipped with a warning when `gh` or
 * the OpenThrottle GraphQL API cannot be reached (as in CI for the API), so a
 * missing token never turns into a false failure.
 */
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import {
  OPENTHROTTLE_GITHUB_REPOSITORY,
  OPENTHROTTLE_GITHUB_URL_MONOREPO,
  OPENTHROTTLE_WEBSITE_URL,
} from '@openthrottle/react-router-utils';

import { PRODUCT_FEATURES } from '../data/data.features';
import { PRODUCT_POSITIONING } from '../data/data.positioning';
import { PRODUCT_PROJECTS } from '../data/data.projects';
import { isLandedFeature, isUpcomingFeature } from '../utils/features';
import { renderReadmeSection, replaceMarkedSection } from '../utils/render';
import { validateProjects, validateRegistry } from '../utils/validate';

const run = promisify(execFile);

const WORKSPACE_ROOT = new URL('../../../../', import.meta.url);
const README_URL = new URL('README.md', WORKSPACE_ROOT);
const API_URL =
  process.env.OPENTHROTTLE_GRAPHQL_URL ?? 'http://localhost:6021/graphql';
const API_TOKEN =
  process.env.OPENTHROTTLE_MCP_AUTH_TOKEN ?? process.env.API_TOKEN;
const DEAD_PLAN_STATUSES = new Set(['CANCELED']);
const NETWORK_TIMEOUT_MS = 5_000;

type NetworkResult =
  | {
      readonly checked: number;
      readonly kind: 'checked';
      readonly problems: string[];
    }
  | { readonly kind: 'skipped'; readonly reason: string };

const checkReadme = async (): Promise<string[]> => {
  const readme = await readFile(README_URL, 'utf8');
  const section = renderReadmeSection({
    features: PRODUCT_FEATURES,
    positioning: PRODUCT_POSITIONING,
    projects: PRODUCT_PROJECTS,
    repositoryUrl: OPENTHROTTLE_GITHUB_URL_MONOREPO,
    stats: undefined,
    syncedOn: '',
    websiteUrl: OPENTHROTTLE_WEBSITE_URL,
  });
  const replaced = replaceMarkedSection(readme, section);

  if (!replaced.ok) {
    return [`README.md: ${replaced.reason}`];
  }

  if (replaced.document !== readme) {
    return [
      'README.md features section is stale. Run: pnpm nx run @openthrottle/openthrottle-product:generate-surfaces',
    ];
  }

  return [];
};

const checkProjectPaths = async (): Promise<string[]> => {
  const missing = await Promise.all(
    PRODUCT_PROJECTS.map(async (project) => {
      try {
        await access(new URL(`${project.path}/`, WORKSPACE_ROOT));

        return undefined;
      } catch {
        return `project ${project.name}: ${project.path} does not exist`;
      }
    }),
  );

  return missing.filter((problem) => {
    return problem !== undefined;
  });
};

const isPullRequestMerged = async (pr: number): Promise<boolean> => {
  const { stdout } = await run(
    'gh',
    [
      'api',
      `repos/${OPENTHROTTLE_GITHUB_REPOSITORY}/pulls/${pr}`,
      '--jq',
      '.merged_at',
    ],
    { timeout: NETWORK_TIMEOUT_MS },
  );
  const mergedAt = stdout.trim();

  return mergedAt !== '' && mergedAt !== 'null';
};

const getPullRequestOwners = (): Map<number, string[]> => {
  const owners = new Map<number, string[]>();

  for (const feature of PRODUCT_FEATURES.filter(isLandedFeature)) {
    const prs: readonly number[] = feature.evidence.prs;

    for (const pr of prs) {
      owners.set(pr, [...(owners.get(pr) ?? []), feature.id]);
    }
  }

  return owners;
};

const checkPullRequests = async (): Promise<NetworkResult> => {
  const owners = getPullRequestOwners();
  const prs = [...owners.keys()];

  try {
    const merged = await Promise.all(prs.map(isPullRequestMerged));
    const problems = prs
      .filter((_pr, index) => {
        return merged[index] !== true;
      })
      .map((pr) => {
        const citedBy = (owners.get(pr) ?? []).join(', ');

        return `PR #${pr} (cited by ${citedBy}) is not merged`;
      });

    return { checked: prs.length, kind: 'checked', problems };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return {
      kind: 'skipped',
      reason: `gh unavailable: ${reason.split('\n')[0]}`,
    };
  }
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/** @description `data.plan.status` from a GraphQL response, if present. */
const readPlanStatus = (body: unknown): string | undefined => {
  if (!isObject(body) || !isObject(body.data)) {
    return undefined;
  }

  const plan = body.data.plan;

  if (!isObject(plan) || typeof plan.status !== 'string') {
    return undefined;
  }

  return plan.status;
};

const fetchPlanStatus = async (
  planId: string,
  token: string,
): Promise<string | undefined> => {
  const response = await fetch(API_URL, {
    body: JSON.stringify({
      query: 'query ($id: ID!) { plan(id: $id) { status } }',
      variables: { id: planId },
    }),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    method: 'POST',
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body: unknown = await response.json();

  return readPlanStatus(body);
};

const checkPlans = async (): Promise<NetworkResult> => {
  if (API_TOKEN === undefined || API_TOKEN === '') {
    return {
      kind: 'skipped',
      reason: 'no OPENTHROTTLE_MCP_AUTH_TOKEN or API_TOKEN',
    };
  }

  const token = API_TOKEN;
  const cited = PRODUCT_FEATURES.filter(isUpcomingFeature).flatMap(
    (feature) => {
      return feature.evidence.planIds.map((planId) => {
        return { featureId: feature.id, planId };
      });
    },
  );

  try {
    const statuses = await Promise.all(
      cited.map(({ planId }) => {
        return fetchPlanStatus(planId, token);
      }),
    );
    const problems: string[] = [];

    cited.forEach(({ featureId, planId }, index) => {
      const status = statuses[index];

      if (status === undefined) {
        problems.push(`${featureId}: plan ${planId} not found`);
      } else if (DEAD_PLAN_STATUSES.has(status)) {
        problems.push(`${featureId}: plan ${planId} is ${status}`);
      }
    });

    return { checked: cited.length, kind: 'checked', problems };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return { kind: 'skipped', reason: `${API_URL} unreachable: ${reason}` };
  }
};

const main = async (): Promise<number> => {
  const isOffline = process.argv.includes('--offline');
  const problems = [
    ...validateRegistry(PRODUCT_FEATURES, PRODUCT_POSITIONING),
    ...validateProjects(PRODUCT_PROJECTS),
    ...(await checkReadme()),
    ...(await checkProjectPaths()),
  ];
  const network: { label: string; result: NetworkResult }[] = [];

  if (!isOffline) {
    const [pullRequests, plans] = await Promise.all([
      checkPullRequests(),
      checkPlans(),
    ]);

    network.push(
      { label: 'merged-PR evidence', result: pullRequests },
      { label: 'live-plan evidence', result: plans },
    );
  }

  for (const { label, result } of network) {
    if (result.kind === 'skipped') {
      console.warn(`⚠️  Skipped ${label}: ${result.reason}`);
    } else {
      console.log(`Checked ${label}: ${result.checked} cited.`);
      problems.push(...result.problems);
    }
  }

  if (problems.length > 0) {
    console.error('❌ Product registry drift:');

    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }

    return 1;
  }

  console.log('✅ Product registry and generated surfaces are in sync.');

  return 0;
};

process.exitCode = await main();
