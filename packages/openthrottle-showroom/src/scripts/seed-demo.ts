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

const ROLE_NAMES = ['admin', 'user', 'viewer'] as const;

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
    // Order matters only for the tables without ON DELETE CASCADE to plans.
    await dataSource.query(
      'TRUNCATE plan_output_stream, plan_runs, task_embeddings, plan_embeddings, tasks, plans, notes, rule_applications, tag_action_rules, project_skills, user_skill_tags, projects RESTART IDENTITY CASCADE',
    );
    console.log('seed-demo: demo scope truncated.');
  }

  const existing = await usersService.findByEmail(DEMO_USER.email);
  const user =
    existing ??
    (await usersService.create({
      email: DEMO_USER.email,
      githubUsername: DEMO_USER.githubUsername,
      passwordHash: await usersService.hashPassword(DEMO_USER.password),
    }));

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
       ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, name = EXCLUDED.name`,
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
         title = EXCLUDED.title, updated_at = EXCLUDED.updated_at`,
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
           updated_at = EXCLUDED.updated_at`,
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
       ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, created_at = EXCLUDED.created_at`,
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
       model = EXCLUDED.model, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
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

  await dataSource.query('DELETE FROM plan_output_stream WHERE plan_id = $1', [
    DEMO_RUN.planId,
  ]);

  for (const [index, chunk] of DEMO_RUN.chunks.entries()) {
    await dataSource.query(
      `INSERT INTO plan_output_stream (plan_id, task_id, iteration, content, created_at)
       VALUES ($1, $2, 1, $3, $4)`,
      [
        DEMO_RUN.planId,
        index < 13 ? DEMO_RUN.taskId : null,
        chunk.content,
        at(now, chunk.offset),
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
    `seed-demo: ${planCount} plans, ${taskCount} tasks, ${DEMO_NOTES.length} notes, ${DEMO_PROJECTS.length} projects, ${DEMO_SKILLS.length} skills, ${DEMO_RULES.length} rules, ${DEMO_RUN.chunks.length} output chunks.`,
  );
  console.log(`seed-demo: demo login is ${DEMO_USER.email}`);
};

const main = async (): Promise<void> => {
  const database = assertDemoDatabase();
  const reset = process.argv.includes('--reset');
  const dataSource = new DataSource(getOpenThrottleTypeOrmOptions());
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
