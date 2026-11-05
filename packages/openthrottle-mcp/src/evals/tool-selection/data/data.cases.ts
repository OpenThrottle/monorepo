import type {
  ArgMatcher,
  CaseOrigin,
  ToolSelectionCase,
} from '../eval-case.ts';

const PLAN_ID = '3f2b6c1e-8a4d-4e7b-9c21-5d6e7f8a9b0c';
const TASK_ID = '7a1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';
const OTHER_TASK_ID = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const DOCUMENT_ID = 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f';

const equals = (value: boolean | number | string): ArgMatcher => {
  return {
    kind: 'equals',
    value,
  };
};
const includes = (value: string): ArgMatcher => {
  return { kind: 'includes', value };
};
const present: ArgMatcher = { kind: 'present' };
const SEED: CaseOrigin = { kind: 'seed' };
const DESTRUCTIVE: readonly string[] = [
  'delete_note',
  'delete_plan',
  'delete_plan_output',
  'delete_task',
];

/**
 * @description The tool-selection cases. Ids are stable — baselines key on them — so rename a case only by
 * deleting it and adding a new one. Authoring rules (fail-before-fix, controls, args): ../README.md.
 */
export const TOOL_SELECTION_CASES: readonly ToolSelectionCase[] = [
  // ── plan CRUD ──────────────────────────────────────────────────────────────
  {
    area: 'plan-crud',
    expect: {
      args: {
        author: includes('visormatt'),
        category: includes('infra'),
        title: includes('Astro'),
      },
      kind: 'call',
      tools: ['create_plan', 'create_plans'],
    },
    forbid: ['write_file'],
    id: 'plan-create-basic',
    origin: SEED,
    prompt: `Create an OpenThrottle plan titled "Migrate the docs site to Astro". Category infra, author visormatt.`,
  },
  {
    area: 'plan-crud',
    expect: { args: {}, kind: 'call', tools: ['create_plan', 'create_plans'] },
    forbid: ['write_file', 'edit_file'],
    id: 'plan-create-not-markdown',
    origin: SEED,
    prompt: `Write up a plan for adding rate limiting to the GraphQL API and save it somewhere the team can pick it up. Author visormatt, category backend.`,
  },
  {
    area: 'plan-crud',
    expect: {
      args: { plans: includes('release flow') },
      kind: 'call',
      tools: ['create_plans'],
    },
    forbid: [],
    id: 'plan-create-batch',
    origin: SEED,
    prompt: `Create three plans, author visormatt, category docs: "Audit README links", "Add a CONTRIBUTING quickstart" and "Document the release flow".`,
  },
  {
    area: 'plan-crud',
    expect: {
      args: { id: equals(PLAN_ID) },
      kind: 'call',
      tools: ['get_plan'],
    },
    forbid: [],
    id: 'plan-get',
    origin: SEED,
    prompt: `Show me plan ${PLAN_ID}.`,
  },
  {
    area: 'plan-crud',
    expect: {
      args: { id: equals(PLAN_ID), status: equals('COMPLETED') },
      kind: 'call',
      tools: ['update_plan'],
    },
    forbid: DESTRUCTIVE,
    id: 'plan-update-status',
    origin: SEED,
    prompt: `Mark plan ${PLAN_ID} as completed.`,
  },
  {
    area: 'plan-crud',
    expect: {
      args: { statuses: includes('IN_PROGRESS') },
      kind: 'call',
      tools: ['list_plans_by_status'],
    },
    forbid: [],
    id: 'plan-list-in-progress',
    origin: SEED,
    prompt: `Which OpenThrottle plans are in progress right now?`,
  },
  {
    area: 'plan-crud',
    expect: {
      args: { id: equals(PLAN_ID) },
      kind: 'call',
      tools: ['delete_plan'],
    },
    forbid: ['delete_task'],
    id: 'plan-delete',
    origin: SEED,
    prompt: `Delete plan ${PLAN_ID}, it was a duplicate.`,
  },
  // ── task CRUD ──────────────────────────────────────────────────────────────
  {
    area: 'task-crud',
    expect: {
      args: { planId: equals(PLAN_ID) },
      kind: 'call',
      tools: ['create_task', 'create_tasks'],
    },
    forbid: [],
    id: 'task-create',
    origin: SEED,
    prompt: `Add a task "Write the migration rollback script" to plan ${PLAN_ID}.`,
  },
  {
    area: 'task-crud',
    expect: {
      args: { planId: equals(PLAN_ID), tasks: includes('backfill') },
      kind: 'call',
      tools: ['create_tasks'],
    },
    forbid: [],
    id: 'task-create-batch',
    origin: SEED,
    prompt: `Add these tasks to plan ${PLAN_ID}, in this order: design the schema, write the migration, backfill existing data.`,
  },
  {
    area: 'task-crud',
    expect: {
      args: { id: equals(TASK_ID), status: equals('IN_PROGRESS') },
      kind: 'call',
      tools: ['update_task'],
    },
    forbid: DESTRUCTIVE,
    id: 'task-start',
    origin: SEED,
    prompt: `I'm starting on task ${TASK_ID} now. Mark it in progress.`,
  },
  {
    area: 'task-crud',
    expect: {
      args: { id: equals(TASK_ID), status: equals('COMPLETED') },
      kind: 'call',
      tools: ['update_task'],
    },
    forbid: DESTRUCTIVE,
    id: 'task-complete',
    origin: SEED,
    prompt: `Task ${TASK_ID} is done.`,
  },
  {
    area: 'task-crud',
    expect: {
      args: { planId: equals(PLAN_ID) },
      kind: 'call',
      tools: ['get_remaining_tasks_for_plan', 'get_tasks_by_plan_id'],
    },
    forbid: [],
    id: 'task-list-remaining',
    origin: SEED,
    prompt: `What tasks are left on plan ${PLAN_ID}?`,
  },
  {
    area: 'task-crud',
    expect: {
      args: { planId: equals(PLAN_ID), taskIds: present },
      kind: 'call',
      tools: ['reorder_plan_tasks'],
    },
    forbid: ['delete_task', 'create_task', 'create_tasks'],
    id: 'task-reorder',
    origin: SEED,
    prompt: `On plan ${PLAN_ID}, task ${OTHER_TASK_ID} has to run before task ${TASK_ID}. Fix the order; those are its only two tasks.`,
  },
  {
    area: 'task-crud',
    expect: {
      args: { id: equals(TASK_ID) },
      kind: 'call',
      tools: ['get_task'],
    },
    forbid: [],
    id: 'task-get',
    origin: SEED,
    prompt: `What's the description of task ${TASK_ID}?`,
  },
  // ── semantic search ────────────────────────────────────────────────────────
  {
    area: 'search',
    expect: {
      args: { query: includes('passkey') },
      kind: 'call',
      tools: ['semantic_search'],
    },
    forbid: [],
    id: 'search-prior-work',
    origin: SEED,
    prompt: `Have we planned anything before about passkey login? Check OpenThrottle.`,
  },
  {
    area: 'search',
    expect: {
      args: { query: present },
      kind: 'call',
      tools: ['semantic_search'],
    },
    forbid: [],
    id: 'search-ask-ot',
    origin: SEED,
    prompt: `Ask OT: how did we decide to record merge-queue SHAs on the work ledger?`,
  },
  {
    area: 'search',
    expect: { args: {}, kind: 'call', tools: ['list_sources'] },
    forbid: [],
    id: 'search-list-sources',
    origin: SEED,
    prompt: `What knowledge-base collections does OpenThrottle have?`,
  },
  {
    area: 'search',
    expect: {
      args: { id: equals(DOCUMENT_ID) },
      kind: 'call',
      tools: ['get_document'],
    },
    forbid: [],
    id: 'search-get-document',
    origin: SEED,
    prompt: `A semantic search returned chunk ${DOCUMENT_ID}. Open its full content.`,
  },
  // ── follow-up tag flow ─────────────────────────────────────────────────────
  {
    area: 'follow-up',
    expect: {
      args: { tags: includes('follow-up') },
      kind: 'call',
      tools: ['create_plan', 'create_plans'],
    },
    forbid: ['write_file'],
    id: 'follow-up-file-plan',
    origin: SEED,
    prompt: `Out of scope for what I'm doing, but the CSV export truncates at 1000 rows. File it as a follow-up in OpenThrottle (author visormatt, category bug).`,
  },
  {
    area: 'follow-up',
    expect: {
      args: { planId: equals(PLAN_ID), tag: equals('follow-up') },
      kind: 'call',
      tools: ['add_plan_tag'],
    },
    forbid: [],
    id: 'follow-up-tag-plan',
    origin: SEED,
    prompt: `Tag plan ${PLAN_ID} as a follow-up.`,
  },
  {
    area: 'follow-up',
    expect: {
      args: { tag: equals('follow-up'), taskId: equals(TASK_ID) },
      kind: 'call',
      tools: ['add_task_tag'],
    },
    forbid: [],
    id: 'follow-up-tag-task',
    origin: SEED,
    prompt: `Tag task ${TASK_ID} as a follow-up.`,
  },
  // ── output stream and activity ─────────────────────────────────────────────
  {
    area: 'output',
    expect: {
      args: {
        content: includes('tests green'),
        planId: equals(PLAN_ID),
        taskId: equals(TASK_ID),
      },
      kind: 'call',
      tools: ['append_plan_output'],
    },
    forbid: [],
    id: 'output-append-progress',
    origin: SEED,
    prompt: `Log progress on plan ${PLAN_ID} for task ${TASK_ID}: "Schema migration written, tests green."`,
  },
  {
    area: 'output',
    expect: {
      args: { planId: equals(PLAN_ID) },
      kind: 'call',
      tools: ['get_plan_output'],
    },
    forbid: [
      'agent_conversation_get_messages',
      'agent_conversation_list',
      'agent_conversation_get',
    ],
    id: 'output-read-iteration-log',
    origin: SEED,
    prompt: `Show me the Ralph iteration log for plan ${PLAN_ID}.`,
  },
  {
    area: 'output',
    expect: {
      args: { planId: equals(PLAN_ID) },
      kind: 'call',
      tools: ['get_last_activity'],
    },
    forbid: [],
    id: 'output-last-activity',
    origin: SEED,
    prompt: `What was the last thing we did on plan ${PLAN_ID}?`,
  },
  {
    area: 'output',
    expect: { args: {}, kind: 'call', tools: ['get_activity_by_date'] },
    forbid: [],
    id: 'output-shipped-yesterday',
    origin: SEED,
    prompt: `What did we ship in OpenThrottle yesterday?`,
  },
  // ── controls: no OT tool is the right answer ───────────────────────────────
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: [],
    id: 'control-rename-variable',
    origin: SEED,
    prompt: 'Rename the variable `cnt` to `count` in src/utils/math.ts.',
  },
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: [],
    id: 'control-general-question',
    origin: SEED,
    prompt: `What's the difference between Promise.all and Promise.allSettled?`,
  },
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: [],
    id: 'control-git-log',
    origin: SEED,
    prompt: `Show me the last five git commits on this branch.`,
  },
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: [],
    id: 'control-edit-docs',
    origin: SEED,
    prompt: `Add a section to docs/README.md explaining how to run the tests.`,
  },
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: [],
    id: 'control-run-tests',
    origin: SEED,
    prompt: `Run the unit tests for the parser package.`,
  },
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: DESTRUCTIVE,
    id: 'control-delete-file',
    origin: SEED,
    prompt: `Delete the file scripts/old-backup.sh.`,
  },
];
