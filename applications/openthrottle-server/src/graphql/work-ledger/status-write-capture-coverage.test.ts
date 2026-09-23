/**
 * @description Drift gate for work-ledger `status_change` capture (OT plan
 * 10e64bb5-5568-422d-8645-e9a53432e605). Plan/task COMPLETED artifacts went missing for months
 * because nothing connected "the status column changed" to "a ledger row exists": every test
 * asserted on one side of that gap or the other, so an uncaptured write path was invisible.
 *
 * This gate is deliberately NOT a list of today's call sites — a list passes forever once someone
 * adds the next path, which is exactly how the original bug survived. It rediscovers every write to
 * a `status` column from source on each run and requires each one to be classified in
 * {@link STATUS_WRITE_REGISTRY}, so a NEW write fails the build until its author makes a deliberate
 * call. It then verifies the classification is true of the code: a site marked `captured` must have
 * a `recordStatusChange` call in the function that owns it, so deleting a capture turns this red.
 *
 * Scope note: the scan is intentionally dumb about which table is written. Rediscovering "is this
 * plans.status or plan_runs.status?" from text is exactly the kind of clever filter that lets a new
 * path slip through, so every status write in range is registered and the non-plan/task ones carry
 * the `out-of-scope` disposition with their reason.
 *
 * @see docs/monorepo/work-ledger-sessions.md § Which status writes reach the ledger
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

/** Source trees that contain every writer of `plans.status` / `tasks.status`. */
const SCANNED_ROOTS = [
  'applications/openthrottle-server/src',
  'packages/nestjs-repositories/src',
] as const;

/** The one method that writes a `status_change` artifact. Capture means calling this. */
const CAPTURE_CALL = 'recordStatusChange(';

/** Where `recordStatusChange` is declared — not itself a capturing call site. */
const CAPTURE_SERVICE_FILE =
  'applications/openthrottle-server/src/graphql/work-ledger/work-ledger-capture.service.ts';

/**
 * How a discovered status write relates to the work ledger. `as const` object rather than a TS
 * enum, per repo style.
 */
const CAPTURE_DISPOSITION = {
  /** Writes plan/task status AND records the `status_change` artifact. */
  CAPTURED: 'captured',
  /** Writes some other table's `status` column; outside the plan/task ledger invariant. */
  OUT_OF_SCOPE: 'out-of-scope',
  /** Writes plan/task status and records nothing, on the criterion in the doc. */
  UNCAPTURED_BY_DESIGN: 'uncaptured-by-design',
} as const;

/** A named function, addressed by repo-relative file plus its enclosing declaration. */
interface CodeLocation {
  readonly file: string;
  readonly symbol: string;
}

interface CapturedStatusWrite extends CodeLocation {
  /** The function that must contain the `recordStatusChange` call for this write. */
  readonly capturedIn: CodeLocation;
  readonly disposition: typeof CAPTURE_DISPOSITION.CAPTURED;
  readonly reason: string;
}

interface UnrecordedStatusWrite extends CodeLocation {
  readonly disposition:
    | typeof CAPTURE_DISPOSITION.OUT_OF_SCOPE
    | typeof CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN;
  readonly reason: string;
}

type StatusWriteRecord = CapturedStatusWrite | UnrecordedStatusWrite;

const PLANS_RESOLVER =
  'applications/openthrottle-server/src/graphql/plans/plans.resolver.ts';
const PLAN_ENQUEUE_SERVICE =
  'applications/openthrottle-server/src/graphql/plans/plan-enqueue.service.ts';
const PLAN_RULES_PROCESSOR =
  'applications/openthrottle-server/src/queues/plan-rules/plan-rules.processor.ts';
const PLAN_STATUS_SERVICE =
  'applications/openthrottle-server/src/graphql/plans/plan-status.service.ts';
const PLANS_PROCESSOR =
  'applications/openthrottle-server/src/queues/plans/plans.processor.ts';
const TASKS_RESOLVER =
  'applications/openthrottle-server/src/graphql/tasks/tasks.resolver.ts';
const TASKS_SERVICE =
  'packages/nestjs-repositories/src/modules/tasks/tasks.service.ts';

/**
 * Every function in {@link SCANNED_ROOTS} that writes a `status` column, and what it does about the
 * ledger. The set must match what the scan finds exactly — an unlisted write and a listed write
 * that no longer exists both fail.
 *
 * The criterion for `uncaptured-by-design`: the path moves a plan or task BACK toward a working or
 * restartable state (PENDING, QUEUED, IN_PROGRESS) as a side effect of a retry, cancellation, stale
 * -run reclaim or boot-time reconcile. Those assert nothing new about the work, only about
 * scheduling, and several run at boot or from a worker with no resolvable principal.
 */
const STATUS_WRITE_REGISTRY: readonly StatusWriteRecord[] = [
  {
    capturedIn: { file: PLANS_RESOLVER, symbol: 'updatePlan' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: PLANS_RESOLVER,
    reason:
      'The canonical plan-status writer: saves the row and the artifact in one transaction.',
    symbol: 'updatePlan',
  },
  {
    capturedIn: { file: TASKS_RESOLVER, symbol: 'updateTask' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: TASKS_RESOLVER,
    reason:
      'The canonical task-status writer: saves the row and the artifact in one transaction.',
    symbol: 'updateTask',
  },
  {
    capturedIn: { file: PLAN_STATUS_SERVICE, symbol: 'setStatus' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: PLAN_STATUS_SERVICE,
    reason:
      'The setPlanStatus mutation — the second capturing writer of plans.status.',
    symbol: 'setStatus',
  },
  {
    capturedIn: { file: TASKS_RESOLVER, symbol: 'captureParentPlanReconcile' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: TASKS_SERVICE,
    reason:
      'The downward reconcile that actually completes most plans. nestjs-repositories must not depend on WorkLedgerCaptureService, so the helper returns its transition and the resolver records it.',
    symbol: 'completeParentPlanIfTasksDone',
  },
  {
    capturedIn: { file: TASKS_RESOLVER, symbol: 'captureParentPlanReconcile' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: TASKS_SERVICE,
    reason:
      'The upward reconcile that starts a plan. Captured by its resolver callers; see CAPTURE_DEFERRING_HELPER_CALLERS for the boot-time caller that is not.',
    symbol: 'syncParentPlanStatus',
  },
  {
    capturedIn: {
      file: PLAN_RULES_PROCESSOR,
      symbol: 'captureOrphanedTaskSoftCloses',
    },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: 'packages/nestjs-repositories/src/modules/tag-action-rules/rule-applications.service.ts',
    reason:
      'Soft-closes rule-injected tasks to SKIPPED outside updateTask. Same split as the reconciles: the service returns the transitions, the processor records them.',
    symbol: 'orphanUnmatchedApplications',
  },
  {
    capturedIn: {
      file: 'applications/openthrottle-server/src/queues/task-promotion/task-promotion.service.ts',
      symbol: 'closeOutSourceTask',
    },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: 'applications/openthrottle-server/src/queues/task-promotion/task-promotion.service.ts',
    reason:
      'Writes the promoted source task to SKIPPED outside updateTask; records the transition in the same transaction.',
    symbol: 'closeOutSourceTask',
  },
  {
    capturedIn: {
      file: 'applications/openthrottle-server/src/queues/job-run-hooks/execute-plan-job-run-hooks.ts',
      symbol: 'recordPlanBlockedTransition',
    },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: 'applications/openthrottle-server/src/queues/job-run-hooks/execute-plan-job-run-hooks.ts',
    reason:
      'The only writer of plan-level BLOCKED; reads the prior status rather than assuming it, then captures.',
    symbol: 'recordPlanBlockedTransition',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLAN_STATUS_SERVICE,
    reason:
      'cancelRun resets the plan to PENDING after a cancellation. A scheduling fact, not a claim about the work.',
    symbol: 'cancelRun',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLAN_ENQUEUE_SERVICE,
    reason:
      'Enqueue moves the plan to QUEUED and un-terminals its tasks back to QUEUED — restartable state, asserted by the queue rather than by anyone doing work.',
    symbol: 'commitEnqueueTransaction',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: 'applications/openthrottle-server/src/notifications/emit-bulk-task-status-changes.ts',
    reason:
      'The shared bulk task reset used by cancelRun and commitEnqueueTransaction; inherits their disposition.',
    symbol: 'updateMatchingTasksAndEmitStatusChanged',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLANS_PROCESSOR,
    reason:
      'Boot-time reconcile of plans stranded IN_PROGRESS with no active job back to QUEUED. Runs before any request, with no principal to attribute.',
    symbol: 'reconcilePlanStatusOnStartup',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLANS_PROCESSOR,
    reason:
      'Resets a plan to QUEUED when its job failed or stalled, so it is not stuck IN_PROGRESS. A retry, not an outcome.',
    symbol: 'resetPlanStatusToQueued',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLANS_PROCESSOR,
    reason:
      'Plan-run start writes IN_PROGRESS operationally; the run session with its attached plan subject is what represents the worked-on state.',
    symbol: 'process',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: 'applications/openthrottle-server/src/queues/plan-runs-stale-sweep/plan-runs-stale-sweep.processor.ts',
    reason:
      'Stale-run reclaim returns a stranded plan and its IN_PROGRESS tasks to PENDING. A sweeper reclaim, not a transition anyone performed.',
    symbol: 'reconcileStrandedPlan',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: 'applications/openthrottle-server/src/queues/plan-rules/inject-task.executor.ts',
    reason:
      'Orphan revive reopens a previously soft-closed task (SKIPPED to PENDING) instead of injecting a duplicate — the inverse of the captured soft-close, restoring restartable state.',
    symbol: 'reinject',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: 'applications/openthrottle-server/src/queues/task-promotion/task-promotion.service.ts',
    reason:
      'Insert-time initial status on a newly created task. There is no `from`, so there is no transition to record.',
    symbol: 'seedInitialTask',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/plan-runs/plan-runs.service.ts',
    reason: 'Writes plan_runs.status, not plans.status.',
    symbol: 'forceSettleUnsupervisedRun',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/plan-runs/plan-runs.service.ts',
    reason: 'Writes plan_runs.status, not plans.status.',
    symbol: 'registerCliRun',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/plan-runs/plan-runs.service.ts',
    reason: 'Writes plan_runs.status, not plans.status.',
    symbol: 'settleStaleRun',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/plan-runs/plan-runs.service.ts',
    reason: 'Writes plan_runs.status, not plans.status.',
    symbol: 'settleSupersededUnsupervisedRuns',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/scheduled-agent-jobs/scheduled-agent-jobs.service.ts',
    reason: 'Writes a scheduled-agent job run status, not a plan or task.',
    symbol: 'markRunFinished',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/scheduled-agent-jobs/scheduled-agent-jobs.service.ts',
    reason: 'Writes a scheduled-agent job run status, not a plan or task.',
    symbol: 'markRunStarted',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/agent-conversations/agent-conversations.service.ts',
    reason: 'Writes agent_conversations.status, not a plan or task.',
    symbol: 'archiveConversation',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/agent-conversations/agent-conversations.service.ts',
    reason: 'Writes agent_conversations.status, not a plan or task.',
    symbol: 'softDeleteConversation',
  },
  {
    disposition: CAPTURE_DISPOSITION.OUT_OF_SCOPE,
    file: 'packages/nestjs-repositories/src/modules/tag-action-rules/tag-action-rules.service.ts',
    reason: 'Writes a tag-action rule status, not a plan or task.',
    symbol: 'upsertRule',
  },
];

/**
 * Repository helpers that write plan/task status but leave the artifact to their caller (see the
 * `captured` entries above). The write site alone cannot say whether a given call is captured — the
 * SAME helper is captured from the resolvers and deliberately uncaptured from the boot reconcile —
 * so each CALLER is registered too. A new caller fails until it is classified.
 */
const CAPTURE_DEFERRING_HELPERS = [
  'completeParentPlanIfTasksDone',
  'orphanUnmatchedApplications',
  'syncParentPlanStatus',
  'updateMatchingTasksAndEmitStatusChanged',
] as const;

const CAPTURE_DEFERRING_HELPER_CALLERS: readonly StatusWriteRecord[] = [
  {
    capturedIn: { file: TASKS_RESOLVER, symbol: 'captureParentPlanReconcile' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: TASKS_RESOLVER,
    reason: 'A task created already IN_PROGRESS starts its plan.',
    symbol: 'createTask',
  },
  {
    capturedIn: { file: TASKS_RESOLVER, symbol: 'captureParentPlanReconcile' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: TASKS_RESOLVER,
    reason: 'Same as createTask, for the batch mutation.',
    symbol: 'createTasks',
  },
  {
    capturedIn: { file: TASKS_RESOLVER, symbol: 'captureParentPlanReconcile' },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: TASKS_RESOLVER,
    reason:
      'Both reconciles: starting a task starts its plan, and completing the last one completes it.',
    symbol: 'updateTask',
  },
  {
    capturedIn: {
      file: PLAN_RULES_PROCESSOR,
      symbol: 'captureOrphanedTaskSoftCloses',
    },
    disposition: CAPTURE_DISPOSITION.CAPTURED,
    file: PLAN_RULES_PROCESSOR,
    reason:
      'Flips unmatched rule applications to orphaned and captures each resulting task soft-close.',
    symbol: 'captureOrphanedTaskSoftCloses',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLANS_PROCESSOR,
    reason:
      'Boot-time reconcile promoting a QUEUED plan whose tasks are already IN_PROGRESS. Calls the same helper the resolvers capture, but runs with no request principal and asserts scheduling, not work.',
    symbol: 'reconcilePlansQueuedWithInProgressTasks',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLAN_STATUS_SERVICE,
    reason: 'Bulk task reset to PENDING on cancellation; see cancelRun above.',
    symbol: 'cancelRun',
  },
  {
    disposition: CAPTURE_DISPOSITION.UNCAPTURED_BY_DESIGN,
    file: PLAN_ENQUEUE_SERVICE,
    reason:
      'Bulk task reset to QUEUED on enqueue; see commitEnqueueTransaction above.',
    symbol: 'commitEnqueueTransaction',
  },
];

/** Identifiers that open a block but are not a declaration we want to name a site after. */
const NON_DECLARATION_KEYWORDS = new Set([
  'await',
  'catch',
  'do',
  'else',
  'for',
  'function',
  'if',
  'in',
  'new',
  'of',
  'return',
  'switch',
  'throw',
  'try',
  'typeof',
  'while',
]);

/** Line shapes that introduce a named function scope. Group 1 is indent, group 2 is the name. */
const DECLARATION_PATTERNS = [
  /^(\s*)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
  /^(\s*)(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(?:async\s*)?(?:function\s*)?[({]/,
  /^(\s*)(?:(?:public|private|protected|static|async|override)\s+)*([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/,
];

const CLASS_DECLARATION = /^\s*(?:export\s+)?(?:abstract\s+)?class\s/;

/** A write call whose arguments may name a `status` column. */
const STATUS_WRITE_CALL = /\.(?:update|save|insert|upsert|set)\s*\(/g;

/** `entity.status = NEXT` — the mutate-then-save shape the call scan cannot see. */
const STATUS_ASSIGNMENT = /\.status\s*=[^=]/g;

const PERSIST_CALL = /\.(?:save|update|upsert|insert)\s*\(/;

function findWorkspaceRoot(start: string): string {
  let dir = start;

  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find the workspace root above ${start}`);
    }
    dir = parent;
  }

  return dir;
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      out.push(full);
    }
  }

  return out;
}

/** Index of the `)` closing the `(` at `open`, or -1. */
function matchingParen(src: string, open: number): number {
  let depth = 0;

  for (let index = open; index < src.length; index += 1) {
    const char = src[index];
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

interface DeclarationSite {
  readonly lineIndex: number;
  readonly name: string;
}

/**
 * The outermost named function enclosing `index`, stopping at the class body so a method is named
 * rather than some module-level constant above it. Callbacks are anonymous, so a write inside
 * `manager.transaction(async (manager) => …)` is still attributed to the method that opened it.
 */
function enclosingDeclaration(
  src: string,
  index: number,
): DeclarationSite | null {
  const lines = src.slice(0, index).split('\n');
  const lastLine = lines[lines.length - 1] ?? '';
  let indentLimit = (/^\s*/.exec(lastLine)?.[0] ?? '').length;
  let found: DeclarationSite | null = null;

  for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = lines[lineIndex] ?? '';
    if (CLASS_DECLARATION.test(line)) break;

    for (const pattern of DECLARATION_PATTERNS) {
      const match = pattern.exec(line);
      const indent = match?.[1];
      const name = match?.[2];
      if (indent === undefined || name === undefined) continue;
      if (NON_DECLARATION_KEYWORDS.has(name)) break;
      if (indent.length > indentLimit) break;

      found = { lineIndex, name };
      indentLimit = indent.length - 1;
      break;
    }

    if (indentLimit < 0) break;
  }

  return found;
}

/** The `{ … }` body of a declaration, skipping over its parameter list. */
function declarationBody(src: string, declaration: DeclarationSite): string {
  const start = src
    .split('\n')
    .slice(0, declaration.lineIndex)
    .join('\n').length;
  const paren = src.indexOf('(', start);
  const firstBrace = src.indexOf('{', start);
  const afterParams =
    paren !== -1 && (firstBrace === -1 || paren < firstBrace)
      ? matchingParen(src, paren)
      : start;
  const open = src.indexOf('{', afterParams === -1 ? start : afterParams);
  if (open === -1) return '';

  let depth = 0;
  for (let index = open; index < src.length; index += 1) {
    const char = src[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, index + 1);
    }
  }

  return src.slice(open);
}

interface ScannedFile {
  readonly relativePath: string;
  readonly source: string;
}

function readScannedFiles(): readonly ScannedFile[] {
  const root = findWorkspaceRoot(dirname(fileURLToPath(import.meta.url)));

  return SCANNED_ROOTS.flatMap((scanned) =>
    listSourceFiles(join(root, scanned)).map((file) => ({
      relativePath: relative(root, file).split(sep).join('/'),
      source: readFileSync(file, 'utf8'),
    })),
  );
}

const SCANNED_FILES = readScannedFiles();

function locationKey(location: CodeLocation): string {
  return `${location.file}::${location.symbol}`;
}

/** The declaration bodies of the whole scan, addressed by `file::symbol`. */
function bodyFor(location: CodeLocation): string | null {
  const file = SCANNED_FILES.find(
    (candidate) => candidate.relativePath === location.file,
  );
  if (file == null) return null;

  const pattern = new RegExp(
    `^\\s*(?:(?:export|public|private|protected|static|async|override|const|let|function)\\s+)*${location.symbol}\\s*(?:<[^>]*>)?\\s*[(=]`,
    'm',
  );
  const match = pattern.exec(file.source);
  if (match == null) return null;

  const lineIndex = file.source.slice(0, match.index).split('\n').length - 1;

  return declarationBody(file.source, { lineIndex, name: location.symbol });
}

/** Every function that writes a `status` column, deduplicated by `file::symbol`. */
function findStatusWriteSites(): readonly CodeLocation[] {
  const seen = new Map<string, CodeLocation>();

  const remember = (file: ScannedFile, index: number): void => {
    const declaration = enclosingDeclaration(file.source, index);
    const location = {
      file: file.relativePath,
      symbol: declaration?.name ?? '<module>',
    };
    seen.set(locationKey(location), location);
  };

  for (const file of SCANNED_FILES) {
    STATUS_WRITE_CALL.lastIndex = 0;
    let call = STATUS_WRITE_CALL.exec(file.source);
    while (call != null) {
      const open = call.index + call[0].length - 1;
      const close = matchingParen(file.source, open);
      if (
        close !== -1 &&
        /\bstatus\s*:/.test(file.source.slice(open + 1, close))
      ) {
        remember(file, call.index);
      }
      call = STATUS_WRITE_CALL.exec(file.source);
    }

    STATUS_ASSIGNMENT.lastIndex = 0;
    let assignment = STATUS_ASSIGNMENT.exec(file.source);
    while (assignment != null) {
      const declaration = enclosingDeclaration(file.source, assignment.index);
      // An assignment only writes a row if the same function persists it; the rest are
      // read-model mappers building a GraphQL object.
      if (
        declaration != null &&
        PERSIST_CALL.test(declarationBody(file.source, declaration))
      ) {
        remember(file, assignment.index);
      }
      assignment = STATUS_ASSIGNMENT.exec(file.source);
    }
  }

  return [...seen.values()];
}

/** Every function that calls one of the capture-deferring helpers. */
function findHelperCallers(): readonly CodeLocation[] {
  const seen = new Map<string, CodeLocation>();

  for (const file of SCANNED_FILES) {
    for (const helper of CAPTURE_DEFERRING_HELPERS) {
      const pattern = new RegExp(`\\b${helper}\\s*\\(`, 'g');
      let call = pattern.exec(file.source);

      while (call != null) {
        // Include the `(` so the helper's OWN declaration line resolves to the helper itself and
        // is filtered below, rather than to whatever method happens to precede it.
        const declaration = enclosingDeclaration(
          file.source,
          call.index + call[0].length,
        );
        const name = declaration?.name ?? '<module>';
        // The helper's own declaration is not a call site.
        if (name !== helper) {
          const location = { file: file.relativePath, symbol: name };
          seen.set(locationKey(location), location);
        }
        call = pattern.exec(file.source);
      }
    }
  }

  return [...seen.values()];
}

/** Every function that calls `recordStatusChange`, excluding its own declaration. */
function findCaptureCallSites(): readonly CodeLocation[] {
  const seen = new Map<string, CodeLocation>();

  for (const file of SCANNED_FILES) {
    if (file.relativePath === CAPTURE_SERVICE_FILE) continue;

    let index = file.source.indexOf(CAPTURE_CALL);
    while (index !== -1) {
      const declaration = enclosingDeclaration(file.source, index);
      const location = {
        file: file.relativePath,
        symbol: declaration?.name ?? '<module>',
      };
      seen.set(locationKey(location), location);
      index = file.source.indexOf(CAPTURE_CALL, index + 1);
    }
  }

  return [...seen.values()];
}

const REGISTERED_WRITES = [
  ...STATUS_WRITE_REGISTRY,
  ...CAPTURE_DEFERRING_HELPER_CALLERS,
];

function capturedRecords(): readonly CapturedStatusWrite[] {
  return REGISTERED_WRITES.filter(
    (record): record is CapturedStatusWrite =>
      record.disposition === CAPTURE_DISPOSITION.CAPTURED,
  );
}

describe('work-ledger status-capture drift gate', () => {
  test('the scan reaches the source it is supposed to guard', () => {
    // A broken path or glob would otherwise pass every assertion below with an empty set.
    expect(SCANNED_FILES.length).toBeGreaterThanOrEqual(200);
    expect(findStatusWriteSites().length).toBeGreaterThanOrEqual(20);
  });

  test('every function that writes a status column is registered', () => {
    const discovered = findStatusWriteSites().map(locationKey).sort();
    const registered = STATUS_WRITE_REGISTRY.map(locationKey).sort();

    expect(
      discovered,
      'A status write is registered in STATUS_WRITE_REGISTRY or it fails this gate.\n' +
        'Extra entries below mean a new write appeared; missing ones mean a registered write moved or was deleted.\n' +
        'Classify a new one as:\n' +
        '  • captured              — it calls recordStatusChange (name the function that does)\n' +
        '  • uncaptured-by-design  — it only restores working/restartable state (say why)\n' +
        "  • out-of-scope          — it writes some other table's status column\n" +
        'See docs/monorepo/work-ledger-sessions.md § Which status writes reach the ledger.',
    ).toEqual(registered);
  });

  test('every caller of a capture-deferring helper is registered', () => {
    const discovered = findHelperCallers().map(locationKey).sort();
    const registered = CAPTURE_DEFERRING_HELPER_CALLERS.map(locationKey).sort();

    expect(
      discovered,
      'These helpers write plan/task status but leave the artifact to the caller, so the CALLER is\n' +
        'what decides whether the transition is recorded. Register a new caller in\n' +
        'CAPTURE_DEFERRING_HELPER_CALLERS with its disposition.',
    ).toEqual(registered);
  });

  test('every site registered as captured really does capture', () => {
    const uncaptured = capturedRecords()
      .filter((record) => {
        const body = bodyFor(record.capturedIn);
        return body == null || !body.includes(CAPTURE_CALL);
      })
      .map(
        (record) =>
          `${locationKey(record)} declares capture in ${locationKey(record.capturedIn)}`,
      );

    expect(
      uncaptured,
      'These status writes are registered as captured, but the function named as their capture site\n' +
        'contains no recordStatusChange call. Either the capture was deleted — restore it — or the\n' +
        'registry entry is stale.',
    ).toEqual([]);
  });

  test('a captured write reaches its capture site from its own function', () => {
    const disconnected = capturedRecords()
      .filter((record) => record.file === record.capturedIn.file)
      .filter((record) => {
        const body = bodyFor(record);
        if (body == null) return true;
        return record.symbol === record.capturedIn.symbol
          ? !body.includes(CAPTURE_CALL)
          : !body.includes(record.capturedIn.symbol);
      })
      .map(locationKey);

    expect(
      disconnected,
      'These functions no longer reach the capture they are registered against — the wiring between\n' +
        'the status write and recordStatusChange was cut.',
    ).toEqual([]);
  });

  test('every recordStatusChange call site is claimed by the registry', () => {
    const declared = new Set(
      capturedRecords().map((record) => locationKey(record.capturedIn)),
    );
    const unclaimed = findCaptureCallSites()
      .map(locationKey)
      .filter((key) => !declared.has(key));

    expect(
      unclaimed,
      'These functions capture a status change that no registry entry names. A capture nobody points\n' +
        'at is either a write the scan missed or a registry entry that was never added.',
    ).toEqual([]);
  });
});
