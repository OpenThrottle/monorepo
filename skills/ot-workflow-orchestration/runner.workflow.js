export const meta = {
  name: 'ot-workflow-orchestration',
  description:
    'Run the ot-plan-loop / agents-ralph per-task discipline across N OpenThrottle plans. v1 is SEQUENTIAL (concurrency K=1): each plan gets its own worktree+branch, one fresh subagent per task (IN_PROGRESS → implement → validate → commit → COMPLETED), then a NORMAL PR per plan. No auto-merge, never pushes to main, OT-only for plans/tasks.',
  phases: [
    {
      title: 'Setup',
      detail:
        'per plan: create worktree off baseRef, plan IN_PROGRESS, codegen bootstrap, pull PENDING tasks',
    },
    {
      title: 'Implement',
      detail:
        'per plan: one fresh subagent per task — implement → validate → commit → COMPLETED',
    },
    {
      title: 'Finalize',
      detail:
        'per plan: mark plan COMPLETED, push branch, open a NORMAL PR, optional worktree teardown',
    },
  ],
};

// ============================================================================
// ot-workflow-orchestration runner (v1, sequential multi-plan)
// ----------------------------------------------------------------------------
// A Workflow subagent CANNOT invoke the built-in /loop. This runner re-implements
// the ralph per-task discipline (skills/ot-plan-loop + skills/agents-ralph) inside
// each subagent prompt: one fresh agent() per TASK (context reset per task, like
// /loop gives), all sharing ONE worktree per plan, then a finalize agent opens
// the PR. ot-plan-loop / agents-ralph are the SOURCE OF TRUTH for the per-task
// prompt — this workflow does not shell out to them.
//
// v1 is SEQUENTIAL. N plans share ONE Postgres/Redis + the Nx cache (local + GCS)
// + one OT MCP instance; parallel runs are flaky (cache poisoning, DB corruption).
// Real K-way parallelism needs infra isolation — tracked in the v2 follow-up plan.
// The concurrency knob K defaults to 1 and is the primary throttle; K>1 is unsafe
// until v2 lands (the chunked outer loop below makes it a one-line flip).
//
// Plain JS (no TS). No Date.now()/Math.random() (vary labels by index).
// ============================================================================

const BASE_REPO = '/Users/matt/Development/openthrottle-worktrees/base';
const WORKTREES_DIR = '/Users/matt/Development/openthrottle-worktrees';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---- args + knobs ----------------------------------------------------------
// args accepts EITHER:
//   - a JS array of plan-id uuids:  ['uuid1', 'uuid2', …]
//   - a whitespace/comma-separated string: 'uuid1 uuid2, uuid3'
//   - an object: { planIds: [...] | 'uuid1 uuid2', ...knob overrides }
// The skill passes `/ot-workflow-orchestration uuid1 uuid2 …` → an array/string here.
function parseArgs(raw) {
  // The Workflow harness may deliver `args` as a JSON-STRINGIFIED value (e.g.
  // '["uuid1","uuid2"]' or '{"planIds":[…]}') even when passed as a real array
  // in the tool call — so JSON.parse a string first, falling back to treating it
  // as a raw whitespace/comma-separated id list when it isn't valid JSON.
  let parsed = raw;
  if (typeof parsed === 'string') {
    const s = parsed.trim();
    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        parsed = JSON.parse(s);
      } catch {
        parsed = s; // leave as string → split below
      }
    }
  }
  const isPlainObject =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  const source = isPlainObject ? parsed : { planIds: parsed };
  const rawIds = Array.isArray(source.planIds)
    ? source.planIds
    : String(source.planIds || '').split(/[\s,]+/);
  const seen = new Set();
  const planIds = [];
  const invalid = [];
  for (const id of rawIds) {
    const v = String(id || '').trim();
    if (!v) continue;
    if (!UUID_RE.test(v)) {
      invalid.push(v);
      continue;
    }
    if (seen.has(v)) continue; // dedupe, preserve first-seen order
    seen.add(v);
    planIds.push(v);
  }
  return {
    planIds,
    invalid,
    // Knobs (defaults). Override via the object form of args.
    concurrency:
      Number(source.concurrency) > 0
        ? Math.floor(Number(source.concurrency))
        : 1, // K — SEQUENTIAL default; K>1 unsafe until v2
    baseRef: source.baseRef || 'origin/main',
    implementModel: source.implementModel || 'sonnet', // bulk work; escalate to opus/fable is a manual override
    perPlanBudget:
      Number(source.perPlanBudget) > 0 ? Number(source.perPlanBudget) : 450_000, // measured ≈350–420k/plan
    teardownAfterPr: source.teardownAfterPr !== false, // default true
    keepBranch: true, // ALWAYS — the open PR + user verification depend on the branch
  };
}

const CFG = parseArgs(args);
if (CFG.invalid.length)
  log(
    `⚠️ Ignoring ${CFG.invalid.length} non-uuid arg(s): ${CFG.invalid.join(', ')}`,
  );
if (!CFG.planIds.length) {
  log('No valid plan ids supplied. <promise>ERROR</promise>');
  return { error: 'no-plan-ids', invalid: CFG.invalid };
}
log(
  `ot-workflow-orchestration v1 — ${CFG.planIds.length} plan(s), K=${CFG.concurrency} (` +
    `${CFG.concurrency === 1 ? 'sequential' : 'PARALLEL — unsafe until v2 infra isolation'}), ` +
    `baseRef=${CFG.baseRef}, implementModel=${CFG.implementModel}, perPlanBudget=${CFG.perPlanBudget}.`,
);

// ---- derivation helpers ----------------------------------------------------
// Slug/branch/worktree are derived by the Setup agent (it reads the plan title via
// MCP; only agents talk to OT). The canonical algorithm the prompt pins:
//   slug = title.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase().slice(0,60) || 'plan'
//   branch = `ot/<slug>`   worktree = `${WORKTREES_DIR}/loop-<slug>`
function chunk(items, k) {
  const out = [];
  for (let i = 0; i < items.length; i += k) out.push(items.slice(i, i + k));
  return out;
}

// ---- schemas (prior-art SETUP/TASK/PR minus draft + gatedTitles/needs-human) -
const SETUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['worktreeReady', 'slug', 'worktree', 'branch', 'tasks'],
  properties: {
    worktreeReady: { type: 'boolean' },
    slug: { type: 'string' },
    worktree: { type: 'string' },
    branch: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
    error: { type: 'string' },
    note: { type: 'string' },
  },
};
const TASK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'note'],
  properties: {
    status: { enum: ['done', 'failed'] },
    sha: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string' },
    note: { type: 'string' },
  },
};
const PR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prUrl'],
  properties: {
    prUrl: { type: 'string' },
    planCompleted: { type: 'boolean' },
    tornDown: { type: 'boolean' },
    note: { type: 'string' },
  },
};

// ---- phase functions -------------------------------------------------------
// Setup phase — per plan: create worktree+branch off baseRef, plan IN_PROGRESS,
// codegen bootstrap, pull PENDING/QUEUED tasks in canonical order.
async function setupPhase(planId, idx) {
  const setup = await agent(
    `Set up an OpenThrottle (OT) plan run. You create ONE git worktree and read OT — no code changes.

Plan-Id: ${planId}
BASE_REPO (base checkout — run git worktree commands from here): ${BASE_REPO}
baseRef: ${CFG.baseRef}
Worktrees dir: ${WORKTREES_DIR}

Steps:
1. Load OT tools: ToolSearch \`select:mcp__openthrottle-mcp__get_plan,mcp__openthrottle-mcp__get_tasks_by_plan_id,mcp__openthrottle-mcp__update_plan\`.
2. get_plan(${planId}). If it fails, retry ONCE; if it still fails, ABORT loudly: return { worktreeReady: false, error: 'get_plan failed', note }. Never map a null read to "no tasks".
3. Derive the slug from the plan TITLE with EXACTLY this algorithm:
   slug = title.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+\$/g,'').toLowerCase().slice(0,60) || 'plan'
   branch = \`ot/<slug>\`   worktree = \`${WORKTREES_DIR}/loop-<slug>\`
4. Create the worktree+branch off baseRef:
   \`git -C ${BASE_REPO} worktree add -b <branch> <worktree> ${CFG.baseRef}\`
   IDEMPOTENT RECOVERY: if the branch and/or worktree already exist, REUSE them (e.g. \`git -C ${BASE_REPO} worktree add <worktree> <branch>\` when the branch exists but the worktree doesn't, or just verify the existing worktree is on <branch>) and report that in note. On any hard worktree error you cannot recover, ABORT: return { worktreeReady: false, error, note }.
5. A FRESH worktree needs codegen before app tests will collect. If \`<worktree>/applications/openthrottle-server/schema.gql\` or the \`__generated__\` output is missing, run \`pnpm nx run-many --target=codegen-graphql --all\` from inside <worktree> (\`cd <worktree> && …\`). Skip if already present (reused worktree).
6. update_plan(${planId}, { status: 'IN_PROGRESS' }) if it is not already IN_PROGRESS/COMPLETED.
7. get_tasks_by_plan_id(${planId}). Return tasks in canonical order (sortOrder ASC, then createdAt ASC — the tool already returns this order) whose status is PENDING or QUEUED, EXCLUDING placeholder tasks whose description (trimmed) begins with "None". If any task is already IN_PROGRESS, put it FIRST (resume it before new work).

Return { worktreeReady: true, slug, worktree, branch, tasks: [{ id, title, description }], note }. On any hard failure return { worktreeReady: false, error, note }.`,
    {
      schema: SETUP_SCHEMA,
      model: CFG.implementModel, // all phases default to the model knob (sonnet); escalation to opus/fable is a manual override
      phase: 'Setup',
      label: `[${idx + 1}] setup:${planId.slice(0, 8)}`,
    },
  );
  return setup;
}
// Implement phase — ONE fresh agent() per task (context reset per task, like
// /loop gives). Serial within a plan (shared worktree + shared Nx cache).
// The prompt faithfully re-implements the ralph per-task loop from
// skills/ot-plan-loop/SKILL.md steps 1-7 and skills/agents-ralph.
async function implementPhase(planId, setup, idx) {
  const results = [];
  for (let ti = 0; ti < setup.tasks.length; ti++) {
    const t = setup.tasks[ti];
    const r = await agent(
      `You implement exactly ONE OpenThrottle (OT) task in an existing git worktree, following the ralph per-task discipline (skills/ot-plan-loop steps 1-7 + skills/agents-ralph). Your ENTIRE scope is this one task — do not touch unrelated code.

Worktree (subagents do NOT share cwd — use absolute paths or \`git -C ${setup.worktree}\`): ${setup.worktree}
Plan-Id: ${planId}
Task-Id: ${t.id}
Task: ${t.title}

${t.description}

Procedure (do these in order):
1. Load OT tools: ToolSearch \`select:mcp__openthrottle-mcp__update_task,mcp__openthrottle-mcp__append_plan_output,mcp__openthrottle-mcp__create_tasks\`. Set task ${t.id} → IN_PROGRESS via update_task(id, { status: 'IN_PROGRESS' }).
2. Do the work for EXACTLY this one task, scoped tight. Follow repo conventions (CLAUDE.md + .cursor/rules): generators-first (NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:… before hand-writing), no new TS enums (use \`as const\`), avoid \`as\`/\`any\`, \`import type\` for type-only imports, explicit return types, source-first packages (no build target — validate via a consumer app), UI from @openthrottle/react-router-shadcn, use \`component\` not \`screen\` in tests + userEvent not fireEvent, no deep package imports (consume via main entry). If a generator fits and you skip it, say why.
3. VALIDATE before completing. Discover the touched project(s) and their real targets via nx (\`pnpm nx show project <p> --json\`), then run the ones that exist among lint, typecheck, test — run them SEQUENTIALLY, NEVER in parallel (shared Nx cache), with \`--skip-nx-cache\`. Prefer \`pnpm nx affected --target=lint\` etc. for touched projects. Do NOT complete on red — if validation fails and you cannot fix it within this task's scope, return { status: 'failed', note } with the failure.
4. Commit in the worktree with a conventional-commit message and EXACT footers (no Co-authored-by / attribution — footers only):
   Plan-Id: ${planId}
   Task-Id: ${t.id}
   Use \`git -C ${setup.worktree} add …\` then \`git -C ${setup.worktree} commit\`. Never \`--no-verify\`; never push to main.
5. Set task ${t.id} → COMPLETED via update_task, then append_plan_output(planId=${planId}, content=<2-line note>, taskId=${t.id}) describing what you did + the validation result.
6. If the work reveals MORE work, create_tasks under plan ${planId} (omit sortOrder to append after the plan max) — do NOT expand this task's own scope to cover it.

Return { status: 'done' | 'failed', sha, changedFiles, validation, note }. Report the real commit sha and the files you changed.`,
      {
        schema: TASK_SCHEMA,
        model: CFG.implementModel,
        phase: 'Implement',
        label: `[${idx + 1}] task:${String(t.title).slice(0, 32)}`,
      },
    );
    // agent() returns null on user-skip / terminal API error after retries — never
    // treat null as success (hardened further in task 5's isolation pass).
    const norm = r || {
      status: 'failed',
      note: 'agent() returned null (skipped or terminal API error)',
    };
    results.push({ id: t.id, title: t.title, ...norm });
    log(`[${idx + 1}] ${t.title} → ${norm.status}`);
  }
  return results;
}
// Finalize phase — per plan: mark plan COMPLETED (only if every task done),
// push branch, open a NORMAL (ready, not draft) PR (idempotent), optional
// worktree teardown (branch always kept).
async function finalizePhase(planId, setup, results, idx) {
  const done = results.filter((r) => r.status === 'done');
  const failed = results.filter((r) => r.status === 'failed');
  const allDone = results.length > 0 && failed.length === 0;
  if (done.length === 0) {
    log(
      `[${idx + 1}] no tasks implemented (all failed) — no PR, plan left IN_PROGRESS.`,
    );
    return {
      prUrl: '',
      planCompleted: false,
      tornDown: false,
      note: 'no work implemented',
    };
  }
  const bodyLines = [
    `Runs OpenThrottle plan \`${planId}\` (${setup.slug}) to completion via ot-workflow-orchestration.`,
    ``,
    `Done: ${done.length} · Failed: ${failed.length}`,
    ...results.map((r) => `- [${r.status}] ${r.title}`),
    ``,
    `Per-task validation lives in the commit history (each commit carries \`Plan-Id:\`/\`Task-Id:\` footers).`,
  ];
  const prBody = bodyLines.join('\n');
  const final = await agent(
    `Finalize an OpenThrottle plan branch as a NORMAL (ready, NOT draft) pull request. Do NOT merge; never push to main.

Worktree (use \`git -C <worktree>\`): ${setup.worktree}
Branch: ${setup.branch}
Plan-Id: ${planId}
BASE_REPO: ${BASE_REPO}
Every task COMPLETED? ${allDone ? 'YES' : 'NO — some tasks failed'}
teardownAfterPr: ${CFG.teardownAfterPr}

Steps:
1. Load OT tools: ToolSearch \`select:mcp__openthrottle-mcp__update_plan\`. ${allDone ? `Since every task reached COMPLETED, set update_plan(${planId}, { status: 'COMPLETED' }) — there is NO server-side downward reconcile, so without this the plan is stranded IN_PROGRESS with all tasks done.` : `Some tasks FAILED — leave the plan IN_PROGRESS (do NOT mark COMPLETED).`}
2. Push the branch: \`git -C ${setup.worktree} push -u origin ${setup.branch}\`.
3. IDEMPOTENT PR: first \`gh pr list --head ${setup.branch} --state open --json url --jq '.[0].url'\` (run from ${setup.worktree}); if a PR already exists, REUSE its URL. Otherwise create a NORMAL (ready, not draft) PR: \`gh pr create --base main --head ${setup.branch} --title "<conventional-commit title>" --body "<body below>"\` following .github/pull_request_template.md, with testing steps phrased as things to DO (not done). Capture the PR URL.
4. Teardown — ONLY if teardownAfterPr is true AND the PR URL is real AND \`git -C ${setup.worktree} status\` shows the branch up to date with its remote and nothing uncommitted:
   - Stop anything running scoped to THIS worktree path only (e.g. \`pkill -f '${setup.worktree}'\`). NEVER a bare process-name pattern — that kills the main checkout's server + OT MCP.
   - Remove the worktree from the base checkout: \`git -C ${BASE_REPO} worktree remove ${setup.worktree}\` (add --force only if git objects AFTER you have confirmed everything is committed and pushed), then \`git -C ${BASE_REPO} worktree prune\`.
   - NEVER delete the branch — the open PR and the user's verification checkout depend on it.
   If PR creation failed or anything is unpushed, LEAVE the worktree intact and report it in note.

PR body:
${prBody}

Return { prUrl, planCompleted: ${allDone}, tornDown, note }.`,
    {
      schema: PR_SCHEMA,
      model: CFG.implementModel, // all phases default to the model knob (sonnet); escalation is a manual override
      phase: 'Finalize',
      label: `[${idx + 1}] finalize:${setup.slug}`,
    },
  );
  return (
    final || {
      prUrl: '',
      planCompleted: false,
      tornDown: false,
      note: 'finalize agent returned null',
    }
  );
}

// ---- per-plan orchestration ------------------------------------------------
async function runPlan(planId, idx) {
  try {
    const setup = await setupPhase(planId, idx);
    if (!setup || !setup.worktreeReady) {
      const note =
        (setup && (setup.error || setup.note)) ||
        'setup returned null (terminal error)';
      log(`[${planId}] setup failed: ${note}`);
      return { planId, status: 'failed', phase: 'setup', note };
    }
    const results = await implementPhase(planId, setup, idx);
    const final = await finalizePhase(planId, setup, results, idx);
    const done = results.filter((r) => r.status === 'done').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    return {
      planId,
      slug: setup.slug,
      branch: setup.branch,
      status: failed === 0 ? 'done' : 'partial',
      prUrl: final && final.prUrl ? final.prUrl : null,
      done,
      failed,
      results,
    };
  } catch (err) {
    log(
      `[${planId}] aborted: ${err && err.message ? err.message : String(err)}`,
    );
    return {
      planId,
      status: 'failed',
      phase: 'exception',
      note: err && err.message ? err.message : String(err),
    };
  }
}

// ---- outer loop (sequential; chunked so K>1 is a one-line flip in v2) -------
// K defaults to 1 → each chunk is a single plan, so this runs strictly one plan
// at a time and the budget gate is applied per plan. K>1 batches a chunk with
// parallel() (NOT parallel-all), but is UNSAFE until the v2 infra-isolation plan
// lands (shared Postgres/Redis + Nx cache + one OT MCP). Failure isolation: a
// plan that throws or returns null becomes a {status:'failed'} report entry and
// the loop CONTINUES — one plan failing never aborts the fleet.
const groups = chunk(CFG.planIds, CFG.concurrency);
const report = [];
const skippedForBudget = [];
let launchedIdx = 0;
let budgetHit = false;
for (const group of groups) {
  // Budget gate: only meaningful when a token target was set (budget.total).
  // With no target, remaining() is Infinity — do NOT gate (but also don't run
  // unbounded logic off it). Measured ≈350–420k tokens/plan; default gate 450k.
  if (budget.total && budget.remaining() < CFG.perPlanBudget) {
    budgetHit = true;
    skippedForBudget.push(...group);
    log(
      `Budget gate: ${Math.round(budget.remaining() / 1000)}k remaining < ${Math.round(
        CFG.perPlanBudget / 1000,
      )}k perPlanBudget — skipping remaining ${group.length} plan(s) in this chunk for budget.`,
    );
    continue; // keep collecting the rest as skipped-budget below
  }
  const settled = await parallel(
    group.map((planId, gi) => () => runPlan(planId, launchedIdx + gi)),
  );
  settled.forEach((r, gi) => {
    report.push(
      r || {
        planId: group[gi],
        status: 'failed',
        note: 'runPlan returned null',
      },
    );
  });
  launchedIdx += group.length;
}
// Any chunk after the first budget trip is also skipped — record them all.
if (budgetHit) {
  for (const s of skippedForBudget) {
    if (!report.some((r) => r.planId === s)) {
      report.push({ planId: s, status: 'skipped-budget' });
    }
  }
}

// ---- synthesis report ------------------------------------------------------
const summary = report.map((r) => ({
  planId: r.planId,
  slug: r.slug || null,
  status: r.status,
  prUrl: r.prUrl || null,
  done: r.done || 0,
  failed: r.failed || 0,
}));
log('Synthesis:');
for (const s of summary) {
  log(
    `  ${s.planId} [${s.status}] done=${s.done} failed=${s.failed} ${s.prUrl || ''}`,
  );
}
if (skippedForBudget.length)
  log(`Skipped for budget: ${skippedForBudget.join(', ')}`);

return { plans: report.length, summary, skippedForBudget, report };
