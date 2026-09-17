import type pg from 'pg';

/**
 * @description Seeds every free-text column the task's privacy contract names
 * — plan titles, task descriptions, `cwd`, `git_branch`, `args`, conversation
 * titles, `external_ref`, and `raw_usage` — with a distinctive sentinel
 * string, then wires up the minimum FK graph (`users` → `plans`/`tasks`,
 * `agent_conversations`, `work_sessions`, `agent_token_usage`) so every insert
 * succeeds against a freshly migrated database.
 */
export const SENTINEL = 'ZZ-SENTINEL-DO-NOT-LEAK-8f3c1a';

export async function seedSentinelFixture(pool: pg.Pool): Promise<void> {
  const { rows: userRows } = await pool.query<{ id: string }>(
    `INSERT INTO users (github_username, email) VALUES ($1, $2) RETURNING id`,
    [`sentinel-user-${SENTINEL}`, `${SENTINEL}@example.com`],
  );
  const userId = userRows[0]?.id;
  if (!userId) throw new Error('sentinel fixture: failed to insert user');

  const { rows: planRows } = await pool.query<{ id: string }>(
    `INSERT INTO plans (title, description, author, category, status)
     VALUES ($1, $2, $3, 'testing', 'COMPLETED')
     RETURNING id`,
    [`Plan title ${SENTINEL}`, `Plan description ${SENTINEL}`, SENTINEL],
  );
  const planId = planRows[0]?.id;
  if (!planId) throw new Error('sentinel fixture: failed to insert plan');

  await pool.query(
    `INSERT INTO tasks (plan_id, title, description, status, sort_order)
     VALUES ($1, $2, $3, 'COMPLETED', 0)`,
    [planId, `Task title ${SENTINEL}`, `Task description ${SENTINEL}`],
  );

  await pool.query(
    `INSERT INTO skill_usage_events
       (skill_name, args, cwd, git_branch, scope, occurred_at)
     VALUES ('ot-telemetry-fixture', $1, $2, $3, 'ours', now())`,
    [`--flag ${SENTINEL}`, `/Users/${SENTINEL}/repo`, `feature/${SENTINEL}`],
  );

  const { rows: conversationRows } = await pool.query<{ id: string }>(
    `INSERT INTO agent_conversations (user_id, title, status)
     VALUES ($1, $2, 'active')
     RETURNING id`,
    [userId, `Conversation ${SENTINEL}`],
  );
  const conversationId = conversationRows[0]?.id;
  if (!conversationId) {
    throw new Error('sentinel fixture: failed to insert agent_conversations');
  }

  await pool.query(
    `INSERT INTO work_sessions (actor_user_id, tool_name, external_ref)
     VALUES ($1, 'ot-telemetry-fixture', $2)`,
    [userId, `ref-${SENTINEL}`],
  );

  await pool.query(
    `INSERT INTO agent_token_usage (user_id, conversation_id, provider, raw_usage)
     VALUES ($1, $2, 'anthropic', $3)`,
    [userId, conversationId, JSON.stringify({ note: SENTINEL })],
  );
}
