-- DEV-ONLY sample content for the public blog (migration 131: blog_authors, blog_tags,
-- blog_posts, blog_post_tags). NOT a migration: never place this under databases/migrations/
-- and never wire it into `database:migrate`, CI or a deploy path. Applied on demand by
-- `pnpm run database:seed:blog` (scripts/openthrottle-database-seed-blog.ts), which refuses
-- NODE_ENV=production and any non-local Postgres host.
--
-- Idempotent: every row is keyed by its unique slug and upserted, all timestamps are FIXED
-- absolute values (never now()-relative), and each DO UPDATE is guarded by IS DISTINCT FROM,
-- so a re-run changes no row (updated_at included). Visibility states covered
-- (public = status PUBLISHED AND published_at <= now()):
--   PUBLISHED x3 (two share published_at to exercise the (published_at, id) cursor tie-break),
--   DRAFT, ARCHIVED, and a PUBLISHED post scheduled for 2099-01-01 (not yet public).
-- Tag `release-notes` is carried only by non-visible posts, so the public tags query must hide it.

BEGIN;

-- ---------------------------------------------------------------------------
-- Authors (sample bylines only; no user_id, so they never touch the users table)
-- ---------------------------------------------------------------------------

INSERT INTO blog_authors (slug, display_name, bio, avatar_url)
VALUES
  (
    'openthrottle-team',
    'OpenThrottle Team',
    'Sample author for the local development seed. Not a real byline; the posts below are placeholder copy for layout testing.',
    'https://placehold.co/96x96/png?text=OT'
  ),
  (
    'sample-contributor',
    'Sample Contributor',
    'Sample guest author for the local development seed. Not a real person.',
    'https://placehold.co/96x96/png?text=SC'
  )
ON CONFLICT (slug) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url
WHERE (blog_authors.display_name, blog_authors.bio, blog_authors.avatar_url)
  IS DISTINCT FROM (EXCLUDED.display_name, EXCLUDED.bio, EXCLUDED.avatar_url);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

INSERT INTO blog_tags (slug, name, description)
VALUES
  ('plans', 'Plans', 'How OpenThrottle plans and tasks capture work before an agent touches code.'),
  ('agent-loops', 'Agent loops', 'Running an agent a task at a time, from plan to pull request.'),
  ('release-notes', 'Release notes', 'What shipped in OpenThrottle. Sample tag carried only by non-public posts.')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description
WHERE (blog_tags.name, blog_tags.description)
  IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

INSERT INTO blog_posts (
  slug, title, excerpt, body_markdown, cover_image_url, cover_image_alt,
  seo_title, seo_description, status, published_at, author_id
)
VALUES
  -- 1. PUBLISHED, long markdown (h2/h3, lists, blockquote, fenced code, table, image) + cover image.
  (
    'from-plan-to-pull-request',
    'From plan to pull request: how OpenThrottle works',
    'A tour of the OpenThrottle workflow: write a plan, break it into tasks, and let an agent loop carry each task to a pull request. Sample content.',
    $md$
OpenThrottle starts with a **plan**. A plan is a short, reviewable statement of intent that lives in OpenThrottle rather than in a Markdown file, so every agent and every human reads the same source of truth.

> Plans are cheap to write and expensive to get wrong. Spend the time up front.

![A plan flowing into tasks and then a pull request](https://placehold.co/960x400/png?text=Plan+to+Task+to+PR)

## Writing a plan

A good plan answers three questions before any code is written:

1. What outcome do we want, in one or two sentences?
2. What does "done" look like, as observable acceptance criteria?
3. What is explicitly out of scope?

### Break it into tasks

Each task should be small enough to finish in a single agent session. Prefer several focused tasks over one large one:

- One behavior change per task.
- Acceptance criteria written as things you can check.
- Dependencies expressed through ordering, not prose.

### Task states

| State         | Meaning                                  | Who moves it |
| ------------- | ---------------------------------------- | ------------ |
| `PENDING`     | Ready to be picked up                    | Planner      |
| `IN_PROGRESS` | An agent has an open session on it       | Agent loop   |
| `COMPLETED`   | Acceptance criteria met, commit recorded | Agent loop   |

## Running the loop

Point the loop at a plan and it works the tasks in order, each in an isolated worktree:

```ts
interface LoopOptions {
  readonly planId: string;
  readonly maxTasks: number | undefined;
}

export async function runLoop({ planId, maxTasks }: LoopOptions): Promise<void> {
  const tasks = await getRemainingTasks(planId);

  for (const task of tasks.slice(0, maxTasks ?? tasks.length)) {
    await completeTask(task); // commit, record the artifact, move on
  }
}
```

Every task ends in a commit carrying `Plan-Id` and `Task-Id` footers, which is how the work ledger ties a merged change back to the task that asked for it.

## What you get

You get a pull request whose history reads like the plan did, plus a ledger entry per task. When something goes sideways, the plan and its tasks tell you what the agent was trying to do.

_This is sample content seeded for local development._
$md$,
    'https://picsum.photos/seed/openthrottle-plan-to-pr/1200/630',
    'Abstract gradient used as a sample cover image',
    'From plan to pull request | OpenThrottle',
    'A tour of the OpenThrottle workflow from plan to tasks to pull request. Sample content.',
    'PUBLISHED',
    TIMESTAMPTZ '2026-09-01 10:00:00+00',
    (SELECT id FROM blog_authors WHERE slug = 'openthrottle-team')
  ),
  -- 2. PUBLISHED, shares published_at with #3 (cursor tie-break).
  (
    'running-an-agent-loop',
    'Running an agent loop, one task at a time',
    'Why the loop works a single task per iteration, commits after each one, and stops when the plan is empty. Sample content.',
    $md$
An agent loop is deliberately boring: pick the next `PENDING` task, do exactly that task, commit, record the result, repeat.

## One task per iteration

Small iterations keep diffs reviewable and failures cheap. If a task turns out to be two tasks, split it rather than stretching the session.

## Commit after every task

Each commit carries `Plan-Id` and `Task-Id` footers so the history stays traceable without a separate changelog.

## Stopping cleanly

The loop ends when no `PENDING` tasks remain, or sooner when a task is blocked and needs a human decision.

_Sample content for local development._
$md$,
    NULL,
    NULL,
    NULL,
    NULL,
    'PUBLISHED',
    TIMESTAMPTZ '2026-09-15 09:00:00+00',
    (SELECT id FROM blog_authors WHERE slug = 'openthrottle-team')
  ),
  -- 3. PUBLISHED, same published_at as #2.
  (
    'the-work-ledger',
    'The work ledger: tying merged commits back to tasks',
    'How OpenThrottle records which merged commit satisfied which task, and why per-task footers matter. Sample content.',
    $md$
The work ledger answers one question: *which merged change did this task produce?*

## Sessions and artifacts

Each time an agent starts on a task, OpenThrottle opens a **session**. When the task lands, the merged commit is recorded as an **artifact** on that session.

## Why footers

Work commits carry `Plan-Id` and `Task-Id` footers, so even before a merge the branch history points back to the plan.

_Sample content for local development._
$md$,
    'https://picsum.photos/seed/openthrottle-ledger/1200/630',
    'Abstract pattern used as a sample cover image',
    NULL,
    NULL,
    'PUBLISHED',
    TIMESTAMPTZ '2026-09-15 09:00:00+00',
    (SELECT id FROM blog_authors WHERE slug = 'sample-contributor')
  ),
  -- 4. DRAFT: never public, no published_at.
  (
    'draft-reviewing-a-plan-run',
    'Draft: reviewing a plan run',
    'Work in progress. Not public.',
    $md$
## Reviewing a plan run

Outline only. This sample draft must never appear on the public site.
$md$,
    NULL,
    NULL,
    NULL,
    NULL,
    'DRAFT',
    NULL,
    (SELECT id FROM blog_authors WHERE slug = 'openthrottle-team')
  ),
  -- 5. ARCHIVED: was published, now withdrawn; never public.
  (
    'archived-an-early-look-at-the-cli',
    'An early look at the OpenThrottle CLI',
    'A withdrawn sample post. Archived posts are never public.',
    $md$
## An early look

This sample post was published and then archived. It must 404 on the public site.
$md$,
    NULL,
    NULL,
    NULL,
    NULL,
    'ARCHIVED',
    TIMESTAMPTZ '2026-08-10 12:00:00+00',
    (SELECT id FROM blog_authors WHERE slug = 'sample-contributor')
  ),
  -- 6. Future-scheduled: PUBLISHED but published_at far in the future; not public yet.
  (
    'scheduled-multi-repo-plans',
    'Scheduled: multi-repo plans',
    'A sample post scheduled far in the future. Not public until published_at passes.',
    $md$
## Multi-repo plans

This sample post is PUBLISHED but scheduled for 2099-01-01, so the public queries must not serve it.
$md$,
    NULL,
    NULL,
    NULL,
    NULL,
    'PUBLISHED',
    TIMESTAMPTZ '2099-01-01 00:00:00+00',
    (SELECT id FROM blog_authors WHERE slug = 'openthrottle-team')
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body_markdown = EXCLUDED.body_markdown,
  cover_image_url = EXCLUDED.cover_image_url,
  cover_image_alt = EXCLUDED.cover_image_alt,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  author_id = EXCLUDED.author_id
WHERE (
  blog_posts.title, blog_posts.excerpt, blog_posts.body_markdown, blog_posts.cover_image_url,
  blog_posts.cover_image_alt, blog_posts.seo_title, blog_posts.seo_description,
  blog_posts.status, blog_posts.published_at, blog_posts.author_id
) IS DISTINCT FROM (
  EXCLUDED.title, EXCLUDED.excerpt, EXCLUDED.body_markdown, EXCLUDED.cover_image_url,
  EXCLUDED.cover_image_alt, EXCLUDED.seo_title, EXCLUDED.seo_description,
  EXCLUDED.status, EXCLUDED.published_at, EXCLUDED.author_id
);

-- ---------------------------------------------------------------------------
-- Post <-> tag links. The temp table is the single declaration; the DELETE makes
-- a re-run converge even if a link was edited by hand.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE seed_blog_post_tags (post_slug TEXT NOT NULL, tag_slug TEXT NOT NULL) ON COMMIT DROP;

INSERT INTO seed_blog_post_tags (post_slug, tag_slug)
VALUES
  ('from-plan-to-pull-request', 'plans'),
  ('from-plan-to-pull-request', 'agent-loops'),
  ('running-an-agent-loop', 'agent-loops'),
  ('the-work-ledger', 'plans'),
  ('draft-reviewing-a-plan-run', 'release-notes'),
  ('draft-reviewing-a-plan-run', 'plans'),
  ('archived-an-early-look-at-the-cli', 'release-notes'),
  ('scheduled-multi-repo-plans', 'release-notes'),
  ('scheduled-multi-repo-plans', 'plans');

DELETE FROM blog_post_tags bpt
USING blog_posts p
WHERE bpt.post_id = p.id
  AND p.slug IN (SELECT post_slug FROM seed_blog_post_tags)
  AND NOT EXISTS (
    SELECT 1
    FROM seed_blog_post_tags s
    JOIN blog_tags t ON t.slug = s.tag_slug
    WHERE s.post_slug = p.slug AND t.id = bpt.tag_id
  );

INSERT INTO blog_post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM seed_blog_post_tags s
JOIN blog_posts p ON p.slug = s.post_slug
JOIN blog_tags t ON t.slug = s.tag_slug
ON CONFLICT (post_id, tag_id) DO NOTHING;

COMMIT;
