#!/usr/bin/env -S pnpm exec tsx
/**
 * One-off: Associate completed plans with NX projects.
 * For each plan with status COMPLETED, infers an NX project from title, description, summary, and task titles;
 * ensures a project row exists for that NX project and sets plan.project_id.
 * Usage: pnpm exec tsx scripts/associate-completed-plans-with-nx-projects.ts [--dry-run]
 */
import {
  ensureDatabaseReachableOrExit,
  ensureProjectForNxName,
  getCortexConfigOrExit,
  getPlanById,
  getTasksByPlanId,
  listPlansByStatus,
  listProjects,
  updatePlanProjectId,
} from '../src/utils/openthrottle-ralph';
import { getNxProjectNames } from '../src/utils/projects';

const dryRun = process.argv.includes('--dry-run');

function buildPlanContent(
  title: string,
  description: string | null,
  summary: string | null,
  taskTitles: string[],
): string {
  const parts = [title, description ?? '', summary ?? '', ...taskTitles];
  return parts.join(' ').toLowerCase();
}

/**
 * @description Picks the best-matching NX project name from content (longest substring match), or null if none.
 */
function inferNxProjectName(
  content: string,
  nxProjectNames: string[],
): string | null {
  const matches = nxProjectNames.filter((name) =>
    content.includes(name.toLowerCase()),
  );
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (a.length >= b.length ? a : b));
}

async function main(): Promise<void> {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);

  const [completedPlans, nxProjectNames] = await Promise.all([
    listPlansByStatus(config, 'COMPLETED'),
    getNxProjectNames(),
  ]);

  if (completedPlans.length === 0) {
    console.log('No completed plans found.');
    return;
  }

  console.log(
    `Found ${completedPlans.length} completed plan(s) and ${nxProjectNames.length} NX project(s).`,
  );
  if (dryRun) console.log('(dry-run: no updates will be written)\n');

  for (const nxName of nxProjectNames) {
    // eslint-disable-next-line no-await-in-loop
    await ensureProjectForNxName(config, nxName);
  }

  const projects = await listProjects(config);
  const nxNameToId = new Map<string, string>();
  for (const p of projects) {
    if (p.nxProjectName) nxNameToId.set(p.nxProjectName, p.id);
  }

  let updated = 0;
  let skipped = 0;

  for (const plan of completedPlans) {
    // eslint-disable-next-line no-await-in-loop
    const full = await getPlanById(config, plan.id);
    if (!full) continue;

    // eslint-disable-next-line no-await-in-loop
    const tasks = await getTasksByPlanId(config, plan.id);
    const taskTitles = tasks.map((t) => t.title);
    const content = buildPlanContent(
      full.title,
      full.description,
      full.summary,
      taskTitles,
    );
    const inferred = inferNxProjectName(content, nxProjectNames);
    const projectId = inferred ? (nxNameToId.get(inferred) ?? null) : null;

    if (projectId) {
      if (!dryRun) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await updatePlanProjectId(config, plan.id, projectId);

        if (ok) updated++;
      } else {
        console.log(
          `[dry-run] Would set plan ${plan.id} "${plan.title}" -> ${inferred}`,
        );
        updated++;
      }
    } else {
      console.log(`(no match) ${plan.id} "${plan.title}"`);
      skipped++;
    }
  }

  console.log(
    dryRun
      ? `\nDry-run: would update ${updated} plan(s), ${skipped} left unset.`
      : `\nUpdated ${updated} plan(s), ${skipped} left unset.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
