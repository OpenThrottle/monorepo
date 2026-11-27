/**
 * @description The single list of every BullMQ queue this server registers with
 * `NestjsBullmqModule.registerQueue(...)` in a `queues/<queue>/producer/producer.module.ts`.
 * The queues GraphQL surface (`/queues`, queue detail, job detail, queue controls) resolves
 * queues from this list, so a queue missing here is invisible there. `queues.constants.test.ts`
 * scans the producer modules and fails when a registered queue is missing.
 *
 * Each name is re-exported from its queue's own `*.constants.ts`. Never change a name string:
 * names are Redis keys, so a rename orphans the queue's existing jobs and repeatables.
 */
import { AGENTIC_TEST_QUEUE_NAME } from './agentic-test/agentic-test.constants.ts';
import { ATTACHMENTS_JANITOR_QUEUE_NAME } from './attachments-janitor/attachments-janitor.constants.ts';
import { CODE_INDEX_QUEUE_NAME } from './code-index/code-index.constants.ts';
import { DAILY_STATS_QUEUE_NAME } from './daily-stats/daily-stats.constants.ts';
import { DATA_RETENTION_QUEUE_NAME } from './data-retention/data-retention.constants.ts';
import { DATABASE_BACKUP_QUEUE_NAME } from './database-backup/database-backup.constants.ts';
import { EMBEDDINGS_QUEUE_NAME } from './embeddings/embeddings.constants.ts';
import { EMBEDDINGS_RECONCILE_QUEUE_NAME } from './embeddings-reconcile/embeddings-reconcile.constants.ts';
import { PLAN_LIFECYCLE_HOOKS_QUEUE_NAME } from './plan-lifecycle-hooks/plan-lifecycle-hooks.constants.ts';
import { PLAN_RULES_QUEUE_NAME } from './plan-rules/plan-rules.constants.ts';
import { PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME } from './plan-run-worktree-reaper/plan-run-worktree-reaper.constants.ts';
import { PLAN_RUNS_STALE_SWEEP_QUEUE_NAME } from './plan-runs-stale-sweep/plan-runs-stale-sweep.constants.ts';
import { PLANS_QUEUE_NAME } from './plans/plans.constants.ts';
import { SCHEDULED_AGENT_JOBS_QUEUE_NAME } from './scheduled-agent-jobs/scheduled-agent-jobs.constants.ts';
import { TAGGING_QUEUE_NAME } from './tagging/tagging.constants.ts';
import { TASK_PROMOTION_QUEUE_NAME } from './task-promotion/task-promotion.constants.ts';
import { WORK_LEDGER_HARVEST_QUEUE_NAME } from './work-ledger-harvest/work-ledger-harvest.constants.ts';
import { WORK_LEDGER_SWEEP_QUEUE_NAME } from './work-ledger-sweep/work-ledger-sweep.constants.ts';
import { WORK_LEDGER_VERIFY_QUEUE_NAME } from './work-ledger-verify/work-ledger-verify.constants.ts';

export const SERVER_QUEUE_NAMES = [
  AGENTIC_TEST_QUEUE_NAME,
  ATTACHMENTS_JANITOR_QUEUE_NAME,
  CODE_INDEX_QUEUE_NAME,
  DAILY_STATS_QUEUE_NAME,
  DATA_RETENTION_QUEUE_NAME,
  DATABASE_BACKUP_QUEUE_NAME,
  EMBEDDINGS_QUEUE_NAME,
  EMBEDDINGS_RECONCILE_QUEUE_NAME,
  PLAN_LIFECYCLE_HOOKS_QUEUE_NAME,
  PLAN_RULES_QUEUE_NAME,
  PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME,
  PLAN_RUNS_STALE_SWEEP_QUEUE_NAME,
  PLANS_QUEUE_NAME,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
  TAGGING_QUEUE_NAME,
  TASK_PROMOTION_QUEUE_NAME,
  WORK_LEDGER_HARVEST_QUEUE_NAME,
  WORK_LEDGER_SWEEP_QUEUE_NAME,
  WORK_LEDGER_VERIFY_QUEUE_NAME,
] as const;
