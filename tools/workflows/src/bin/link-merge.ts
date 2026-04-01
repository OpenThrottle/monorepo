#!/usr/bin/env node

/**
 * @description Links the squash commit (after PR merge) to a Cortex plan. Run after merging a PR so commit_links stores the one SHA on main. Option A: no pre-merge linking; activity-by-date reflects only landed commits.
 */

import {
  ensureCortexReachableOrExit,
  getCortexConfigOrExit,
  insertCommitLink,
} from '../utils/cortex-ralph';

const RFC4122_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseArgs(): {
  message: string | null;
  planId: string;
  repo: string;
  sha: string;
  taskId: string | null;
} {
  const args = process.argv.slice(2);
  let message: string | null = null;
  let planId = '';
  let repo = '';
  let sha = '';
  let taskId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: workflow-link-merge --plan <uuid> --sha <sha> --repo <owner/repo> [--message <msg>] [--task <uuid>]

Links the squash commit (after PR merge) to a Cortex plan.
Cortex required (CORTEX_POSTGRES_URL or CORTEX_POSTGRES_*). See tools/workflows/README.md.

Options:
  --plan <uuid>   Cortex plan ID (required)
  --sha <sha>     Squash commit SHA from the merged PR (required)
  --repo <repo>  Repo identifier, e.g. owner/repo (required)
  --message <msg> Optional message (e.g. PR title)
  --task <uuid>  Optional Cortex task ID
`);
      process.exit(0);
    }
    if (arg === '--plan' && i + 1 < args.length) {
      planId = args[++i] ?? '';
      continue;
    }
    if (arg === '--sha' && i + 1 < args.length) {
      sha = args[++i] ?? '';
      continue;
    }
    if (arg === '--repo' && i + 1 < args.length) {
      repo = args[++i] ?? '';
      continue;
    }
    if (arg === '--message' && i + 1 < args.length) {
      message = args[++i] ?? null;
      continue;
    }
    if (arg === '--task' && i + 1 < args.length) {
      taskId = args[++i] ?? null;
      continue;
    }
  }

  if (!planId || !sha || !repo) {
    console.error('Missing required options. Run with --help for usage.');
    process.exit(1);
  }
  if (!RFC4122_UUID.test(planId)) {
    console.error('--plan must be a valid UUID.');
    process.exit(1);
  }
  if (taskId !== null && !RFC4122_UUID.test(taskId)) {
    console.error('--task must be a valid UUID when provided.');
    process.exit(1);
  }

  return { message, planId, repo, sha, taskId };
}

const main = async (): Promise<void> => {
  const { message, planId, repo, sha, taskId } = parseArgs();

  const config = getCortexConfigOrExit();
  await ensureCortexReachableOrExit(config);

  try {
    const link = await insertCommitLink(config, {
      message,
      planId,
      repo,
      sha,
      taskId,
    });
    console.log(
      `Linked commit ${repo}@${sha} to plan ${planId}${taskId ? ` and task ${taskId}` : ''}.`,
    );
    console.log(JSON.stringify(link, null, 2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('link_merge failed:', msg);
    process.exit(1);
  }
};

main();
