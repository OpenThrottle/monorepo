import type {
  GitCommitResult,
  GitHeadState,
  LoopDeps,
  LoopFollowUp,
  LoopTask,
  LoopTaskStatus,
  ValidationResult,
  WorkerAttemptInput,
  WorkerAttemptResult,
} from '../../contract/index.ts';

export const GOOD_REASON = `Implemented the whole thing and its tests, as asked.`;

export const makeTask = (
  id: string,
  overrides: Partial<LoopTask> = {},
): LoopTask => {
  return {
    category: null,
    createdAt: `2026-11-09T00:00:00.${id.padStart(3, '0')}Z`,
    description: `A description that is comfortably longer than the thin task threshold for ${id}.`,
    id,
    requirements: [],
    sortOrder: Number(id),
    status: 'PENDING',
    title: `Task ${id}`,
    ...overrides,
  };
};

export const done = (
  overrides: Partial<{
    commitMessage: string | null;
    followUps: readonly LoopFollowUp[];
    status: 'blocked' | 'done' | 'skipped';
  }> = {},
): WorkerAttemptResult => {
  return {
    kind: 'ok',
    result: {
      commitMessage: 'feat(x): do it',
      followUps: [],
      reason: GOOD_REASON,
      status: 'done',
      ...overrides,
    },
  };
};

export type WorkerScript = (
  input: WorkerAttemptInput,
  world: FakeWorld,
) => Promise<WorkerAttemptResult> | WorkerAttemptResult;

export interface FakeWorld {
  readonly abort: AbortController;
  cancelAfterPolls: number;
  commitResults: GitCommitResult[];
  readonly deps: LoopDeps;
  head: GitHeadState;
  inbox: string[][];
  readonly log: string[];
  planStatus: string;
  readonly sessions: {
    readonly id: string;
    readonly model: string | undefined;
    readonly taskId: string;
  }[];
  readonly tasks: Map<string, LoopTask>;
  validations: ValidationResult[];
  readonly violations: string[];
  workerInputs: WorkerAttemptInput[];
}

export interface FakeWorldOptions {
  readonly commitResults?: GitCommitResult[];
  readonly inbox?: string[][];
  readonly tasks: readonly LoopTask[];
  readonly validations?: ValidationResult[];
  readonly worker?: WorkerScript;
}

export const makeWorld = (options: FakeWorldOptions): FakeWorld => {
  const abort = new AbortController();
  const tasks = new Map(options.tasks.map((task) => [task.id, task]));
  const log: string[] = [];
  let sessionCounter = 0;
  let polls = 0;
  const script: WorkerScript = options.worker ?? (() => done());

  const world: FakeWorld = {
    abort,
    cancelAfterPolls: Number.POSITIVE_INFINITY,
    commitResults: options.commitResults ?? [],
    deps: {
      cancel: {
        isCancelled: () => {
          polls += 1;

          return Promise.resolve(polls > world.cancelAfterPolls);
        },
        signal: abort.signal,
      },
      client: {
        claimInbox: ({ taskId }) => {
          log.push(`claim:${taskId}`);

          return Promise.resolve(world.inbox.shift() ?? []);
        },
        createFollowUps: ({ followUps }) => {
          log.push(`followups:${followUps.map((f) => f.title).join('|')}`);

          return Promise.resolve();
        },
        endWorkSession: (sessionId) => {
          log.push(`end-session:${sessionId}`);

          return Promise.resolve();
        },
        getPlanStatus: () => Promise.resolve(world.planStatus),
        listTasks: () => Promise.resolve([...tasks.values()]),
        narrate: () => Promise.resolve(),
        startWorkSession: ({ model, taskId }) => {
          sessionCounter += 1;

          const id = `s${sessionCounter}`;

          world.sessions.push({ id, model, taskId });
          log.push(`start-session:${id}:${taskId}`);

          return Promise.resolve(id);
        },
        updatePlanStatus: ({ status }) => {
          log.push(`plan:${status}`);
          world.planStatus = status;

          return Promise.resolve();
        },
        updateTask: ({ status, taskId }) => {
          const current = tasks.get(taskId);

          if (current === undefined) {
            return Promise.reject(new Error(`no task ${taskId}`));
          }

          if (status === 'IN_PROGRESS') {
            const other = [...tasks.values()].find(
              (task) => task.id !== taskId && task.status === 'IN_PROGRESS',
            );

            if (other !== undefined) {
              world.violations.push(
                `${taskId} started while ${other.id} IN_PROGRESS`,
              );
            }
          }

          tasks.set(taskId, { ...current, status });
          log.push(`task:${taskId}:${status}`);

          return Promise.resolve();
        },
      },
      clock: { now: () => 1_000 },
      git: {
        commit: () => {
          log.push('commit');

          return Promise.resolve(
            world.commitResults.shift() ?? { kind: 'committed', sha: 'c1' },
          );
        },
        discardTaskChanges: ({ taskId }) => {
          log.push(`discard:${taskId}`);

          return Promise.resolve({ statSummary: '' });
        },
        head: () => Promise.resolve(world.head),
        restoreHead: (head) => {
          log.push(`restore:${head.sha}`);
          world.head = head;

          return Promise.resolve();
        },
      },
      modelFor: (task) =>
        task.category === 'hard' ? 'big-model' : 'small-model',
      validator: {
        validate: () => {
          log.push('validate');

          return Promise.resolve(
            world.validations.shift() ?? { kind: 'green' },
          );
        },
      },
      worker: {
        run: async (input) => {
          log.push(`work:${input.task.id}`);
          world.workerInputs.push(input);

          return script(input, world);
        },
      },
    },
    head: { branch: 'run', sha: 'start' },
    inbox: options.inbox ?? [],
    log,
    planStatus: 'IN_PROGRESS',
    sessions: [],
    tasks,
    validations: options.validations ?? [],
    violations: [],
    workerInputs: [],
  };

  return world;
};

export const statusOf = (
  world: FakeWorld,
  id: string,
): LoopTaskStatus | undefined => {
  return world.tasks.get(id)?.status;
};
