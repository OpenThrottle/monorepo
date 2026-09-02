#!/usr/bin/env node

/**
 * @description Seed the deterministic demo workspace used by the screencast
 * pipeline: one demo user with every role, two fictional projects, eleven plans
 * across statuses with tasks in mixed lifecycle, four notes, and one pre-baked
 * agent run for the replay videos.
 *
 * Content comes from `../fixtures/demo-content.ts` and is entirely fictional.
 *
 * Writes to the DEMO database, not the dev one — the caller sets `POSTGRES_DB`
 * (see seed-demo.sh). Guards against being pointed at a non-demo database by
 * name, because the reset path truncates tables.
 *
 * Idempotent: every insert is an upsert on a fixed id, so re-running produces the
 * same rows. `--reset` clears the demo scope first, which is what makes take 7
 * look like take 1.
 */

import {
  getOpenThrottleTypeOrmOptions,
  Role,
  RolesService,
  ServiceAccount,
  User,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { DataSource } from 'typeorm';

import { fileURLToPath } from 'node:url';

import {
  DEFAULT_DOMAIN_TAG_VOCABULARY,
  DEFAULT_PHASE_TAG_VOCABULARY,
} from '@openthrottle/openthrottle-skills';

import {
  DEMO_EXTRA_TAG,
  DEMO_NOTES,
  DEMO_PLANS,
  DEMO_PROJECTS,
  DEMO_RULES,
  DEMO_RUN,
  DEMO_SKILLS,
  DEMO_USER,
} from '../fixtures/demo-content';
import {
  loadSnapshot,
  readSnapshotTables,
  remapOwnershipToDemoUser,
} from '../snapshot/load';
import { reflectSchema } from '../snapshot/schema';

const ROLE_NAMES = ['admin', 'user', 'viewer'] as const;

const SNAPSHOT_DATA_DIR = fileURLToPath(
  new URL('../snapshot/data', import.meta.url),
);

/**
 * The reset path truncates. Refuse to run against a database whose name does not
 * look like a demo database, so a mis-set POSTGRES_DB cannot wipe real work.
 */
const assertDemoDatabase = (): string => {
  // Read the RESOLVED connection, not POSTGRES_DB: the server's .env sets
  // POSTGRES_URL, which beats the POSTGRES_* pieces, so POSTGRES_DB can say
  // 'demo' while the connection actually points at the dev database.
  const name = new URL(getPostgresUrl()).pathname.replace(/^\//, '');

  if (!name.includes('demo')) {
    console.error(
      `seed-demo: refusing to run against database '${name}' — the name must contain 'demo'.`,
    );
    console.error(
      'seed-demo: run it through scripts/seed-demo.sh, which sets the override.',
    );
    process.exit(1);
  }

  return name;
};

/**
 * Offsets are minutes before "now" rather than absolute dates, because the UI
 * renders relative time. An absolute fixture would drift on every take and
 * eventually read "8 months ago".
 */
const at = (now: Date, offsetMinutes: number): Date =>
  new Date(now.getTime() + offsetMinutes * 60_000);

// The repository services take the real LoggerService. It is a class with a
// private member, so a structural stand-in cannot satisfy the type — instantiate
// it rather than faking it.
const logger = new LoggerService();

const seed = async (dataSource: DataSource, reset: boolean): Promise<void> => {
  // A pinned DEMO_NOW makes a run reproducible to the second; without it, "now".
  const now = process.env.DEMO_NOW
    ? new Date(process.env.DEMO_NOW)
    : new Date();

  if (Number.isNaN(now.getTime())) {
    console.error(
      `seed-demo: DEMO_NOW is not a valid date: '${process.env.DEMO_NOW}'`,
    );
    process.exit(1);
  }

  const userRepository = dataSource.getRepository(User);
  const usersService = new UsersService(logger, userRepository);
  const rolesService = new RolesService(
    logger,
    dataSource.getRepository(Role),
    userRepository,
    dataSource.getRepository(ServiceAccount),
  );

  if (reset) {
    // The snapshot widened the demo scope well past the hand-authored tables,
    // so the reset list is derived from the snapshot's own table manifest
    // rather than hand-maintained — a new exported table would otherwise keep
    // stale rows across a --reset and quietly diverge take 7 from take 1.
    // CASCADE covers dependents, so order does not matter here.
    const snapshotTables = await readSnapshotTables(SNAPSHOT_DATA_DIR);
    const heroTables = [
      'notes',
      'plan_embeddings',
      'plan_output_stream',
      'plan_runs',
      'plans',
      'project_skills',
      'projects',
      'rule_applications',
      'tag_action_rules',
      'task_embeddings',
      'tasks',
      'user_skill_tags',
    ];
    const targets = [
      ...new Set([
        ...snapshotTables.map((entry) => entry.table),
        ...heroTables,
      ]),
    ]
      // users is deliberately NOT truncated: the demo login user is created by
      // the seeder above and re-created here would orphan its role grants.
      .filter((table) => table !== 'users')
      .sort();

    await dataSource.query(
      `TRUNCATE ${targets.join(', ')} RESTART IDENTITY CASCADE`,
    );
    console.log(`seed-demo: truncated ${targets.length} tables.`);
  }

  const existing = await usersService.findByEmail(DEMO_USER.email);
  const user =
    existing ??
    (await usersService.create({
      email: DEMO_USER.email,
      githubUsername: DEMO_USER.githubUsername,
      passwordHash: await usersService.hashPassword(DEMO_USER.password),
    }));

  // `--reset` deliberately does not truncate `users` (that would cascade to
  // half the workspace), so a demo user created by an OLDER seed keeps its old
  // password hash forever and the documented demo login silently stops working
  // with "Invalid email or password" against a user that demonstrably exists.
  // Re-stamp it — but only when it does not already validate: bcrypt salts
  // every hash differently, so an unconditional write would churn the row (and
  // its updated_at trigger) on every run and break seed idempotency.
  if (
    existing != null &&
    !(await usersService.validatePassword(
      DEMO_USER.password,
      existing.passwordHash,
    ))
  ) {
    await dataSource.query(
      'UPDATE users SET password_hash = $2 WHERE id = $1',
      [user.id, await usersService.hashPassword(DEMO_USER.password)],
    );
    console.log('seed-demo: demo user password re-stamped from the fixture.');
  }

  /* eslint-disable no-await-in-loop -- sequential writes against one connection */
  for (const roleName of ROLE_NAMES) {
    const role = await rolesService.findByName(roleName);

    if (role == null) {
      console.error(
        `seed-demo: missing role '${roleName}'. Did migrations run?`,
      );
      process.exit(1);
    }

    await rolesService.assignRoleToUser(user.id, role.id);
  }

  for (const project of DEMO_PROJECTS) {
    await dataSource.query(
      `INSERT INTO projects (id, name, description, nx_project_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, name = EXCLUDED.name
       WHERE (projects.description, projects.name)
         IS DISTINCT FROM (EXCLUDED.description, EXCLUDED.name)`,
      [
        project.id,
        project.name,
        project.description,
        project.nxProjectName,
        at(now, -20000),
      ],
    );
  }

  for (const plan of DEMO_PLANS) {
    await dataSource.query(
      `INSERT INTO plans (id, title, summary, description, author, assignee, category, status, project_id, created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::plan_task_status, $9, $10, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         assignee = EXCLUDED.assignee, category = EXCLUDED.category,
         completed_at = EXCLUDED.completed_at, created_at = EXCLUDED.created_at,
         description = EXCLUDED.description, project_id = EXCLUDED.project_id,
         status = EXCLUDED.status, summary = EXCLUDED.summary,
         title = EXCLUDED.title, updated_at = EXCLUDED.updated_at
       WHERE (plans.assignee, plans.category, plans.completed_at, plans.created_at,
              plans.description, plans.project_id, plans.status, plans.summary, plans.title)
         IS DISTINCT FROM (EXCLUDED.assignee, EXCLUDED.category, EXCLUDED.completed_at,
              EXCLUDED.created_at, EXCLUDED.description, EXCLUDED.project_id,
              EXCLUDED.status, EXCLUDED.summary, EXCLUDED.title)`,
      [
        plan.id,
        plan.title,
        plan.summary,
        plan.description,
        plan.author,
        plan.assignee,
        plan.category,
        plan.status,
        plan.projectId ?? null,
        at(now, plan.createdAtOffset),
        plan.completedAtOffset === undefined
          ? null
          : at(now, plan.completedAtOffset),
      ],
    );

    for (const task of plan.tasks) {
      await dataSource.query(
        // project_id is inherited from the plan rather than declared per task:
        // a task under a plan that points at atlas-api belongs to atlas-api, and
        // /projects/:id renders `tasksByProjectId`. Without this every demo
        // project detail page is an empty tasks table on camera.
        `INSERT INTO tasks (id, plan_id, project_id, title, summary, description, category, status, sort_order, assignee, created_at, updated_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::plan_task_status, $9, $10, $11, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           category = EXCLUDED.category, completed_at = EXCLUDED.completed_at,
           created_at = EXCLUDED.created_at, description = EXCLUDED.description,
           project_id = EXCLUDED.project_id,
           sort_order = EXCLUDED.sort_order, status = EXCLUDED.status,
           summary = EXCLUDED.summary, title = EXCLUDED.title,
           updated_at = EXCLUDED.updated_at
         WHERE (tasks.category, tasks.completed_at, tasks.created_at, tasks.description,
                tasks.sort_order, tasks.status, tasks.summary, tasks.title)
           IS DISTINCT FROM (EXCLUDED.category, EXCLUDED.completed_at, EXCLUDED.created_at,
                EXCLUDED.description, EXCLUDED.sort_order, EXCLUDED.status,
                EXCLUDED.summary, EXCLUDED.title)`,
        [
          task.id,
          plan.id,
          plan.projectId ?? null,
          task.title,
          task.summary,
          task.description,
          task.category,
          task.status,
          task.sortOrder,
          plan.assignee,
          at(now, task.createdAtOffset),
          task.completedAtOffset === undefined
            ? null
            : at(now, task.completedAtOffset),
        ],
      );
    }
  }

  // The tag vocabulary, whole. The server self-seeds it only for a user with
  // ZERO rows (SkillTagsService.listForUser), so inserting just the demo's extra
  // tag would suppress every default — insert the defaults plus the extra.
  const vocabulary = [
    ...DEFAULT_DOMAIN_TAG_VOCABULARY.map((tag) => ({
      dimension: 'domain',
      tag,
    })),
    ...DEFAULT_PHASE_TAG_VOCABULARY.map((tag) => ({ dimension: 'phase', tag })),
    DEMO_EXTRA_TAG,
  ];

  for (const entry of vocabulary) {
    await dataSource.query(
      `INSERT INTO user_skill_tags (user_id, tag, dimension)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, tag) DO NOTHING`,
      [user.id, entry.tag, entry.dimension],
    );
  }

  // Skills on the dogfood project — what /rules/new's skill dropdown lists.
  for (const skill of DEMO_SKILLS) {
    await dataSource.query(
      `INSERT INTO project_skills (id, project_id, slug, tags, description, source_path, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'external')
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description, slug = EXCLUDED.slug,
         source_path = EXCLUDED.source_path, tags = EXCLUDED.tags`,
      [
        skill.id,
        'd0d0d0d0-0000-4000-8000-0000000000a3',
        skill.slug,
        skill.tags,
        skill.description,
        skill.sourcePath,
      ],
    );
  }

  // The pre-existing rule video 09 fires on camera.
  for (const rule of DEMO_RULES) {
    await dataSource.query(
      `INSERT INTO tag_action_rules (id, user_id, tag_all, action_type, action_payload, enabled, title, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $7)
       ON CONFLICT (id) DO UPDATE SET
         action_payload = EXCLUDED.action_payload, action_type = EXCLUDED.action_type,
         enabled = EXCLUDED.enabled, tag_all = EXCLUDED.tag_all,
         title = EXCLUDED.title`,
      [
        rule.id,
        user.id,
        rule.tagAll,
        rule.actionType,
        JSON.stringify(rule.actionPayload),
        rule.title,
        at(now, rule.createdAtOffset),
      ],
    );
  }

  for (const note of DEMO_NOTES) {
    await dataSource.query(
      `INSERT INTO notes (id, content, author, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, created_at = EXCLUDED.created_at
       WHERE (notes.content, notes.created_at)
         IS DISTINCT FROM (EXCLUDED.content, EXCLUDED.created_at)`,
      [
        note.id,
        note.content,
        DEMO_USER.githubUsername,
        at(now, note.createdAtOffset),
      ],
    );
  }

  // The pre-baked run for the replay videos: a real-looking run that already
  // happened, including the failure and the recovery, which is the persuasive part.
  //
  // Status is COMPLETED, deliberately. Seeding it IN_PROGRESS looks right for
  // about two minutes and then the server's stale-run sweep finds a run with no
  // live heartbeat, marks it stale, and reconciles the plan back to PENDING — so
  // take 1 and take 7 disagree and the plan badge is wrong on camera. A finished
  // run still renders its full output stream, which is all the replay flows need;
  // "live" comes from the flow scrolling the stream, not from an active process.
  const runId = 'd0d0d0d0-0000-4000-8000-00000000ff01';
  await dataSource.query(
    `INSERT INTO plan_runs (id, plan_id, status, run_kind, execution_backend, branch, model, actor_user_id, created_at, updated_at, last_heartbeat_at)
     VALUES ($1, $2, 'COMPLETED', 'spawn', 'claude', $3, $4, $5, $6, $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       branch = EXCLUDED.branch, last_heartbeat_at = EXCLUDED.last_heartbeat_at,
       model = EXCLUDED.model, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
     WHERE (plan_runs.branch, plan_runs.last_heartbeat_at, plan_runs.model, plan_runs.status)
       IS DISTINCT FROM (EXCLUDED.branch, EXCLUDED.last_heartbeat_at, EXCLUDED.model,
            EXCLUDED.status)`,
    [
      runId,
      DEMO_RUN.planId,
      DEMO_RUN.branch,
      DEMO_RUN.model,
      user.id,
      at(now, -19),
      at(now, -1),
    ],
  );

  // Each chunk gets a DETERMINISTIC id derived from its index. The column
  // defaults to gen_random_uuid(), so the previous delete-and-reinsert minted
  // fresh ids on every run — the rows were identical but the table never was,
  // which is exactly the kind of drift `--reset` exists to remove.
  const chunkId = (index: number): string =>
    `d0d0d0d0-0000-4000-8000-0000000${String(index).padStart(5, '0')}`;

  await dataSource.query(
    'DELETE FROM plan_output_stream WHERE plan_id = $1 AND id <> ALL($2::uuid[])',
    [DEMO_RUN.planId, DEMO_RUN.chunks.map((_, index) => chunkId(index))],
  );

  for (const [index, chunk] of DEMO_RUN.chunks.entries()) {
    await dataSource.query(
      `INSERT INTO plan_output_stream (id, plan_id, task_id, iteration, content, created_at)
       VALUES ($5, $1, $2, 1, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content, created_at = EXCLUDED.created_at,
         task_id = EXCLUDED.task_id
       WHERE (plan_output_stream.content, plan_output_stream.created_at,
              plan_output_stream.task_id)
         IS DISTINCT FROM (EXCLUDED.content, EXCLUDED.created_at, EXCLUDED.task_id)`,
      [
        DEMO_RUN.planId,
        index < 13 ? DEMO_RUN.taskId : null,
        chunk.content,
        at(now, chunk.offset),
        chunkId(index),
      ],
    );
  }
  /* eslint-enable no-await-in-loop */

  const planCount = DEMO_PLANS.length;
  const taskCount = DEMO_PLANS.reduce(
    (total, plan) => total + plan.tasks.length,
    0,
  );
  console.log(
    `seed-demo: hero fixture — ${planCount} plans, ${taskCount} tasks, ${DEMO_NOTES.length} notes, ${DEMO_PROJECTS.length} projects, ${DEMO_SKILLS.length} skills, ${DEMO_RULES.length} rules, ${DEMO_RUN.chunks.length} output chunks.`,
  );

  // The imported background, loaded after the hero rows so the two id spaces
  // are visibly separate: hero ids stay d0d0d0d0-, imported rows keep the real
  // ids they carry, and the loader refuses if the two ever overlap.
  const runner = {
    query: async (
      sql: string,
      params?: unknown[],
    ): Promise<{ rows: Record<string, unknown>[] }> => ({
      rows: await dataSource.query(sql, params),
    }),
  };

  const schema = await reflectSchema(runner);

  const loaded = await loadSnapshot({
    dataDir: SNAPSHOT_DATA_DIR,
    // Every FK into `users` is rewritten by the ownership remap below, so the
    // loader must not treat the imported owner as the value to restore.
    ownedColumns: new Set(
      schema.foreignKeys
        .filter(
          (edge) => edge.parentTable === 'users' && edge.childTable !== 'users',
        )
        .map((edge) => `${edge.childTable}.${edge.childColumn}`),
    ),
    runner,
    schema,
    seedTime: now,
  });

  const importedRows = loaded.reduce(
    (total, entry) => total + entry.rowCount,
    0,
  );
  console.log(
    `seed-demo: snapshot — ${importedRows} rows across ${loaded.length} tables.`,
  );

  // A dropped duplicate is expected (the hero project and the exported one are
  // the same project), but it is never silent: a NEW one means either the hero
  // fixture has grown into the snapshot's natural keys, or the source database
  // is missing a unique index the demo database has.
  for (const entry of loaded.filter((table) => table.reconciled.length > 0)) {
    const first = entry.reconciled[0];

    console.warn(
      `seed-demo: NOTE '${entry.table}' — ${entry.reconciled.length} snapshot row(s) dropped onto an existing row with the same natural key (${first.key}), starting with ${first.droppedId} → ${first.keptId}. References follow the row that was kept.`,
    );
  }

  // Imported rows arrive owned by the imported users, but the recording logs
  // in as the demo user — and most workspace surfaces are scoped to the
  // signed-in user. Without this the demo would hold 125 conversations and
  // still render "no conversations yet".
  const remapped = await remapOwnershipToDemoUser({
    demoUserId: user.id,
    runner,
    schema,
  });

  const remappedRows = remapped.reduce(
    (total, entry) => total + entry.rowCount,
    0,
  );
  console.log(
    `seed-demo: ownership — ${remappedRows} rows across ${remapped.length} columns re-pointed at the demo user.`,
  );

  // A column the demo schema cannot represent means the dev database the
  // snapshot came from has drifted ahead of the committed migrations. Not
  // fatal for a recording, but it should never grow silently.
  const drifted = loaded.filter((entry) => entry.skippedColumns.length > 0);

  for (const entry of drifted) {
    console.warn(
      `seed-demo: WARNING '${entry.table}' snapshot has ${entry.skippedColumns.join(', ')} — absent from the demo schema, so skipped. The dev database is ahead of databases/migrations.`,
    );
  }
  console.log(`seed-demo: demo login is ${DEMO_USER.email}`);
};

const main = async (): Promise<void> => {
  const database = assertDemoDatabase();
  const reset = process.argv.includes('--reset');
  // TypeORM logs every failed statement itself, before it throws. The loader
  // expects and handles unique violations (see `upsertRow`), so that logging
  // prints a full SQL error block for a collision it then resolves — the exact
  // "errors around dups" a re-seed looked like it was drowning in. Everything
  // that actually stops the seed is still reported: `QueryFailedError` carries
  // the query and its parameters, and `main` prints the error whole.
  const dataSource = new DataSource({
    ...getOpenThrottleTypeOrmOptions(),
    logging: ['warn'],
  });
  await dataSource.initialize();

  try {
    console.log(`seed-demo: seeding '${database}'${reset ? ' (reset)' : ''}…`);
    await seed(dataSource, reset);
  } finally {
    await dataSource.destroy();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
