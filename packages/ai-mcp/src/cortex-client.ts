/**
 * @description Runs vector similarity search against Cortex Postgres (plan_embeddings + task_embeddings + documentation_embeddings).
 */

import {
  PLAN_TASK_LIST_ORDER,
  Plan,
  PlanEmbedding,
  Task,
  TaskEmbedding,
} from '@openthrottle/nestjs-repositories';
import type {
  PlanData,
  PlanEmbeddingSearchRow,
  TaskData,
  TaskEmbeddingSearchRow,
} from '@openthrottle/nestjs-repositories';
import { In } from 'typeorm';
import { getOrCreateDataSource, runQuery } from './data-source.js';
import { embedQuery } from './embedding.js';

/** Raw plan row (snake_case) as returned by plans table SELECT. Used to type ds.query results before mapping to {@link PlanData}. */
interface PlanRawRow {
  assignee: string | null;
  author: string;
  category: string;
  created_at: string;
  id: string;
  project: string | null;
  project_id: string | null;
  status: string;
  summary: string | null;
  title: string;
  updated_at: string;
}

/**
 * @description Normalizes TypeORM query result (array or pg-style { rows, rowCount }) to { rows, rowCount }.
 */
function normalizeQueryResult<T>(raw: unknown): {
  rowCount: number;
  rows: T[];
} {
  if (Array.isArray(raw)) {
    return { rowCount: raw.length, rows: raw as T[] };
  }
  const r = raw as { rowCount?: number; rows?: T[] };
  return { rowCount: r.rowCount ?? 0, rows: r.rows ?? [] };
}

export interface SemanticSearchChunk {
  readonly authors?: readonly unknown[];
  readonly content: string;
  /** Set when source is 'documentation'. */
  readonly documentationId?: string;
  readonly id: string;
  readonly metadata: Record<string, unknown>;
  readonly path?: string;
  readonly planId?: string;
  readonly planTitle?: string;
  readonly prNumber?: number | null;
  readonly repo?: string;
  readonly sha?: string;
  readonly similarity: number;
  readonly source: 'plan' | 'task' | 'documentation';
  readonly taskId?: string;
  readonly taskTitle?: string;
}

/** Raw row from documentation_embeddings + documentation join for semantic search. */
interface DocumentationEmbeddingSearchRow {
  authors: unknown;
  content: string;
  documentation_id: string;
  id: string;
  metadata: unknown;
  path: string;
  pr_number: number | null;
  repo: string;
  sha: string;
  similarity: string;
}

/**
 * @description Runs cosine-similarity search over plan_embeddings, task_embeddings, and documentation_embeddings; merges and returns top chunks.
 * Uses TypeORM DataSource with raw SQL so pgvector operator `<=>` and existing HNSW indexes are preserved (TypeORM has no built-in pgvector API).
 * @param embedding 1536-dim query embedding (e.g. from OpenAI text-embedding-3-small).
 * @param limit Max number of chunks to return (default 10).
 */
export async function runSemanticSearch(
  embedding: number[],
  limit: number,
): Promise<SemanticSearchChunk[]> {
  const vectorStr = `[${embedding.join(',')}]`;
  const ds = await getOrCreateDataSource();

  const planRowsRaw = await ds.query<PlanEmbeddingSearchRow>(
    `SELECT pe.id, pe.content, pe.metadata, pe.plan_id, p.title AS plan_title,
              1 - (pe.embedding <=> $1::vector) AS similarity
       FROM plan_embeddings pe
       JOIN plans p ON pe.plan_id = p.id
       ORDER BY pe.embedding <=> $1::vector
       LIMIT $2`,
    [vectorStr, limit],
  );

  const taskRowsRaw = await ds.query<TaskEmbeddingSearchRow>(
    `SELECT te.id, te.content, te.metadata, te.task_id, t.title AS task_title,
              t.plan_id, p.title AS plan_title,
              1 - (te.embedding <=> $1::vector) AS similarity
       FROM task_embeddings te
       JOIN tasks t ON te.task_id = t.id
       JOIN plans p ON t.plan_id = p.id
       ORDER BY te.embedding <=> $1::vector
       LIMIT $2`,
    [vectorStr, limit],
  );

  const docRowsRaw = await ds.query<DocumentationEmbeddingSearchRow>(
    `SELECT de.id, de.content, de.metadata, de.documentation_id,
              d.path, d.repo, d.sha, d.pr_number, d.authors,
              1 - (de.embedding <=> $1::vector) AS similarity
       FROM documentation_embeddings de
       JOIN documentation d ON de.documentation_id = d.id
       ORDER BY de.embedding <=> $1::vector
       LIMIT $2`,
    [vectorStr, limit],
  );

  const { rows: planRowsList } =
    normalizeQueryResult<PlanEmbeddingSearchRow>(planRowsRaw);
  const { rows: taskRowsList } =
    normalizeQueryResult<TaskEmbeddingSearchRow>(taskRowsRaw);
  const { rows: docRowsList } =
    normalizeQueryResult<DocumentationEmbeddingSearchRow>(docRowsRaw);

  const planChunks: SemanticSearchChunk[] = planRowsList.map((r) => ({
    content: r.content,
    id: r.id,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    planId: r.plan_id,
    planTitle: r.plan_title,
    similarity: Number(r.similarity),
    source: 'plan' as const,
    taskId: undefined,
    taskTitle: undefined,
  }));

  const taskChunks: SemanticSearchChunk[] = taskRowsList.map((r) => ({
    content: r.content,
    id: r.id,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    planId: r.plan_id,
    planTitle: r.plan_title,
    similarity: Number(r.similarity),
    source: 'task' as const,
    taskId: r.task_id,
    taskTitle: r.task_title,
  }));

  const docChunks: SemanticSearchChunk[] = docRowsList.map((r) => ({
    authors: Array.isArray(r.authors) ? r.authors : [],
    content: r.content,
    documentationId: r.documentation_id,
    id: r.id,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    path: r.path,
    prNumber: r.pr_number,
    repo: r.repo,
    sha: r.sha,
    similarity: Number(r.similarity),
    source: 'documentation' as const,
  }));

  const merged = [...planChunks, ...taskChunks, ...docChunks]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return merged;
}

/** A single agent-asset (custom_prompt) match from semantic search over custom_prompt_embeddings. */
export interface AgentAssetSearchChunk {
  readonly content: string;
  readonly customPromptId: string;
  readonly description: string | null;
  readonly filePath: string | null;
  readonly id: string;
  readonly labels: readonly string[];
  readonly projectId: string | null;
  readonly promptType: string;
  readonly similarity: number;
  readonly title: string;
}

/** Raw row from custom_prompt_embeddings + custom_prompts join for agent-asset semantic search. */
interface CustomPromptEmbeddingSearchRow {
  content: string;
  custom_prompt_id: string;
  description: string | null;
  file_path: string | null;
  id: string;
  labels: string[];
  project_id: string | null;
  prompt_type: string;
  similarity: string;
  title: string;
}

/** Default max candidate rows fetched before de-duping by custom_prompt_id. */
const AGENT_ASSET_CANDIDATE_CAP = 200;

/**
 * @description Cosine-similarity search over custom_prompt_embeddings (agent assets: skills, rules, personas, …),
 * joined to custom_prompts for display metadata. Over-fetches candidates then de-dupes by custom_prompt_id keeping
 * the best-scoring chunk so each asset appears once. Optionally filtered by prompt types and project id.
 * Uses raw SQL so the pgvector `<=>` operator and HNSW index are preserved.
 * @param embedding 1536-dim query embedding (e.g. OpenAI text-embedding-3-small).
 * @param limit Max number of distinct assets to return.
 * @param promptTypes Optional prompt_type filter (e.g. ['skills','rules','personas']); empty/undefined = all types.
 * @param projectId Optional project_id filter (multi-repo scoping).
 */
export async function searchAgentAssets(
  embedding: number[],
  limit: number,
  promptTypes?: readonly string[],
  projectId?: string | null,
): Promise<AgentAssetSearchChunk[]> {
  const vectorStr = `[${embedding.join(',')}]`;
  const ds = await getOrCreateDataSource();

  const conditions: string[] = ['cp.deleted_at IS NULL'];
  const params: (string | number | string[])[] = [vectorStr];
  let paramIndex = 2;

  if (promptTypes && promptTypes.length > 0) {
    conditions.push(`cp.prompt_type = ANY($${paramIndex++})`);
    params.push([...promptTypes]);
  }
  if (projectId != null && projectId !== '') {
    conditions.push(`cp.project_id = $${paramIndex++}`);
    params.push(projectId);
  }

  const candidateLimit = Math.min(
    Math.max(limit * 3, limit),
    AGENT_ASSET_CANDIDATE_CAP,
  );
  const limitParam = paramIndex;
  params.push(candidateLimit);

  const rowsRaw = await ds.query<CustomPromptEmbeddingSearchRow>(
    `SELECT cpe.id, cpe.content, cpe.custom_prompt_id,
              cp.title, cp.prompt_type, cp.file_path, cp.project_id, cp.description, cp.labels,
              1 - (cpe.embedding <=> $1::vector) AS similarity
       FROM custom_prompt_embeddings cpe
       JOIN custom_prompts cp ON cpe.custom_prompt_id = cp.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cpe.embedding <=> $1::vector
       LIMIT $${limitParam}`,
    params,
  );

  const { rows } =
    normalizeQueryResult<CustomPromptEmbeddingSearchRow>(rowsRaw);

  const seen = new Set<string>();
  const chunks: AgentAssetSearchChunk[] = [];
  for (const r of rows) {
    if (seen.has(r.custom_prompt_id)) continue;
    seen.add(r.custom_prompt_id);
    chunks.push({
      content: r.content,
      customPromptId: r.custom_prompt_id,
      description: r.description,
      filePath: r.file_path,
      id: r.id,
      labels: Array.isArray(r.labels) ? r.labels : [],
      projectId: r.project_id,
      promptType: r.prompt_type,
      similarity: Number(r.similarity),
      title: r.title,
    });
    if (chunks.length >= limit) break;
  }
  return chunks;
}

/**
 * @description Fetches a single chunk by id from plan_embeddings, task_embeddings, or documentation_embeddings.
 * @param id UUID of the chunk (plan_embedding, task_embedding, or documentation_embedding id).
 * @returns The chunk or null if not found.
 */
export async function getChunkById(
  id: string,
): Promise<SemanticSearchChunk | null> {
  const ds = await getOrCreateDataSource();

  type PlanEmbeddingGetRow = Pick<
    PlanEmbeddingSearchRow,
    'id' | 'content' | 'metadata' | 'plan_id' | 'plan_title'
  >;
  const planRaw = await ds.query<PlanEmbeddingGetRow>(
    `SELECT pe.id, pe.content, pe.metadata, pe.plan_id, p.title AS plan_title
       FROM plan_embeddings pe
       JOIN plans p ON pe.plan_id = p.id
       WHERE pe.id = $1`,
    [id],
  );

  const { rows: planRowRows } =
    normalizeQueryResult<PlanEmbeddingGetRow>(planRaw);
  if (planRowRows.length > 0) {
    const r = planRowRows[0];
    return {
      content: r.content,
      id: r.id,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      planId: r.plan_id,
      planTitle: r.plan_title,
      similarity: 1,
      source: 'plan',
      taskId: undefined,
      taskTitle: undefined,
    };
  }

  type TaskEmbeddingGetRow = Pick<
    TaskEmbeddingSearchRow,
    | 'id'
    | 'content'
    | 'metadata'
    | 'plan_id'
    | 'plan_title'
    | 'task_id'
    | 'task_title'
  >;
  const taskRaw = await ds.query<TaskEmbeddingGetRow>(
    `SELECT te.id, te.content, te.metadata, te.task_id, t.title AS task_title,
              t.plan_id, p.title AS plan_title
       FROM task_embeddings te
       JOIN tasks t ON te.task_id = t.id
       JOIN plans p ON t.plan_id = p.id
       WHERE te.id = $1`,
    [id],
  );
  const { rows: taskRowRows } =
    normalizeQueryResult<TaskEmbeddingGetRow>(taskRaw);
  if (taskRowRows.length > 0) {
    const r = taskRowRows[0];
    return {
      content: r.content,
      id: r.id,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      planId: r.plan_id,
      planTitle: r.plan_title,
      similarity: 1,
      source: 'task',
      taskId: r.task_id,
      taskTitle: r.task_title,
    };
  }

  type DocEmbeddingGetRow = Pick<
    DocumentationEmbeddingSearchRow,
    | 'id'
    | 'content'
    | 'metadata'
    | 'documentation_id'
    | 'path'
    | 'repo'
    | 'sha'
    | 'pr_number'
    | 'authors'
  >;
  const docRaw = await ds.query<DocEmbeddingGetRow>(
    `SELECT de.id, de.content, de.metadata, de.documentation_id,
              d.path, d.repo, d.sha, d.pr_number, d.authors
       FROM documentation_embeddings de
       JOIN documentation d ON de.documentation_id = d.id
       WHERE de.id = $1`,
    [id],
  );
  const { rows: docRowRows } = normalizeQueryResult<DocEmbeddingGetRow>(docRaw);
  if (docRowRows.length > 0) {
    const r = docRowRows[0];
    return {
      authors: Array.isArray(r.authors) ? r.authors : [],
      content: r.content,
      documentationId: r.documentation_id,
      id: r.id,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      path: r.path,
      prNumber: r.pr_number,
      repo: r.repo,
      sha: r.sha,
      similarity: 1,
      source: 'documentation',
    };
  }

  return null;
}

const DEFAULT_SEMANTIC_SEARCH_LIMIT = 20;

/**
 * @description Search plans by semantic similarity to a query string. Embeds the query via OpenAI, runs vector search, and returns matching plans (deduped by plan id, in relevance order). Requires OPENAI_API_KEY.
 * @param query Free-text search query.
 * @param limit Max number of plans to return (default 20).
 * @returns List of plans matching the query, or empty if embedding fails or no matches.
 */
export async function searchPlansBySemanticQuery(
  query: string,
  limit: number = DEFAULT_SEMANTIC_SEARCH_LIMIT,
): Promise<ListPlansByStatusResult> {
  const embedding = await embedQuery(query.trim());
  if (!embedding) {
    return { plans: [], totalCount: 0 };
  }
  const chunks = await runSemanticSearch(embedding, Math.min(limit * 2, 50));
  const seen = new Set<string>();
  const planIds: string[] = [];
  for (const c of chunks) {
    if (c.planId != null && !seen.has(c.planId)) {
      seen.add(c.planId);
      planIds.push(c.planId);
      if (planIds.length >= limit) break;
    }
  }
  const planResults = await Promise.all(
    planIds.map((planId) => getPlanById(planId)),
  );
  const plans: ListPlansByStatusPlan[] = [];
  for (const plan of planResults) {
    if (plan) {
      plans.push({
        assignee: plan.assignee,
        author: plan.author,
        category: plan.category,
        createdAt: plan.createdAt,
        id: plan.id,
        project: plan.project,
        projectId: plan.projectId,
        status: plan.status,
        summary: plan.summary,
        title: plan.title,
        updatedAt: plan.updatedAt,
      });
    }
  }
  return { plans, totalCount: plans.length };
}

interface ListSourcesItem {
  readonly description: string;
  readonly name: string;
}

interface ListSourcesResult {
  readonly plans: readonly Pick<PlanData, 'id' | 'title'>[];
  readonly sources: ListSourcesItem[];
}

/**
 * @description Lists knowledge-base sources (plan, task, documentation) and plan titles from Cortex.
 */
export async function listSources(): Promise<ListSourcesResult> {
  const ds = await getOrCreateDataSource();
  const planRaw = await ds.query<Pick<PlanData, 'id' | 'title'>>(
    `SELECT id, title FROM plans ORDER BY title`,
  );
  const { rows: planRowsList } =
    normalizeQueryResult<Pick<PlanData, 'id' | 'title'>>(planRaw);

  return {
    plans: planRowsList.map((r) => ({ id: r.id, title: r.title })),
    sources: [
      {
        description: 'Embedded plan content chunks (vector search)',
        name: 'plan',
      },
      {
        description: 'Embedded task content chunks (vector search)',
        name: 'task',
      },
      {
        description: 'Embedded documentation content chunks (vector search)',
        name: 'documentation',
      },
    ],
  };
}

export interface PlanStatusCount {
  readonly count: number;
  readonly status: string;
}

/** Plan row returned by listPlansByStatus (all plan columns except description). Aligns with {@link PlanData} but with string timestamps from raw query. */
export interface ListPlansByStatusPlan extends Omit<
  PlanData,
  'createdAt' | 'updatedAt' | 'description'
> {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListPlansByStatusResult {
  readonly plans: readonly ListPlansByStatusPlan[];
  readonly totalCount: number;
}

/** Sort field for listPlansByStatus. */
export type ListPlansByStatusSortBy = 'created' | 'updated';

/** Sort direction for listPlansByStatus. */
export type ListPlansByStatusSortOrder = 'asc' | 'desc';

export const DEFAULT_PLANS_PAGE_SIZE = 20;

/**
 * @description Lists plans in Cortex filtered by status (from plan JSON metadata). Optionally filter by assignee or title substring. Supports sort by created_at or updated_at. Supports pagination via limit and offset.
 * @param status Plan status to filter by (e.g. BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, QUEUED, SKIPPED). Use '' or 'all' to show plans regardless of status.
 * @param assignee Optional: filter plans where author or assignee equals this value (e.g. GitHub username).
 * @param project Optional: filter plans whose project equals this value (NX project name).
 * @param projectId Optional: filter plans whose project_id equals this UUID (FK to projects).
 * @param sortBy Optional: sort by created or updated (default: created).
 * @param sortOrder Optional: asc or desc (default: desc, newest first).
 * @param titleSubstring Optional: filter plans whose title contains this string (case-insensitive).
 * @param limit Optional: max plans to return (default 20).
 * @param offset Optional: number of plans to skip (default 0).
 */
export async function listPlansByStatus(
  status: string,
  assignee?: string | null,
  project?: string | null,
  projectId?: string | null,
  sortBy: ListPlansByStatusSortBy = 'created',
  sortOrder: ListPlansByStatusSortOrder = 'desc',
  titleSubstring?: string | null,
  limit: number = DEFAULT_PLANS_PAGE_SIZE,
  offset: number = 0,
): Promise<ListPlansByStatusResult> {
  const ds = await getOrCreateDataSource();

  const orderColumn = sortBy === 'updated' ? 'updated_at' : 'created_at';
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${orderColumn} ${orderDir}`;
  const showAllStatuses = status === '' || status === 'all';
  const titlePattern =
    titleSubstring?.trim() != null && titleSubstring.trim() !== ''
      ? `%${titleSubstring.trim()}%`
      : null;
  const projectFilter =
    project?.trim() != null && project.trim() !== '' ? project.trim() : null;
  const projectIdFilter =
    projectId?.trim() != null && projectId.trim() !== ''
      ? projectId.trim()
      : null;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIndex = 1;
  if (!showAllStatuses) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status.toUpperCase());
  }
  if (assignee) {
    conditions.push(`(author = $${paramIndex} OR assignee = $${paramIndex})`);
    params.push(assignee);
    paramIndex++;
  }
  if (projectFilter != null) {
    conditions.push(`project = $${paramIndex++}`);
    params.push(projectFilter);
  }
  if (projectIdFilter != null) {
    conditions.push(`project_id = $${paramIndex++}`);
    params.push(projectIdFilter);
  }
  if (titlePattern != null) {
    conditions.push(`title ILIKE $${paramIndex++}`);
    params.push(titlePattern);
  }
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countParams = params;
  const countRaw = await ds.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM plans ${whereClause}`,
    countParams,
  );
  const { rows: countRows } = normalizeQueryResult<{ count: string }>(countRaw);
  const totalCount = Number(countRows[0]?.count ?? 0);

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const dataParams = [...params, limit, offset];
  const dataQuery = `SELECT id, title, status, author, category, assignee, summary, project, project_id, created_at, updated_at
         FROM plans
         ${whereClause}
         ${orderClause}
         LIMIT $${limitParam} OFFSET $${offsetParam}`;

  const planRaw = await ds.query<PlanRawRow>(dataQuery, dataParams);
  const { rows: planRowsList } = normalizeQueryResult<PlanRawRow>(planRaw);
  return {
    plans: planRowsList.map(
      (r): ListPlansByStatusPlan => ({
        assignee: r.assignee,
        author: r.author,
        category: r.category,
        createdAt: r.created_at,
        id: r.id,
        project: r.project,
        projectId: r.project_id,
        status: r.status,
        summary: r.summary,
        title: r.title,
        updatedAt: r.updated_at,
      }),
    ),
    totalCount,
  };
}

// ---------------------------------------------------------------------------
// Plan and Task CRUD (schema: plans, tasks in Cortex Postgres)
// ---------------------------------------------------------------------------

/** Plan row with ISO string dates (e.g. from cortex-client CRUD). Derived from {@link PlanData}. */
export type PlanRow = Omit<PlanData, 'createdAt' | 'updatedAt'> & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Task row with ISO string dates (e.g. from cortex-client CRUD). Derived from {@link TaskData}. */
export type TaskRow = Omit<TaskData, 'createdAt' | 'updatedAt'> & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** GitHub username: 1–39 chars, alphanumeric and single hyphens (no leading/trailing/consecutive). */
const GITHUB_USERNAME_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * @description Normalizes assignee to a valid GitHub username or null per Cortex assignee rule.
 * Empty, whitespace, and invalid formats (e.g. display names, emails) become null.
 */
function normalizeAssignee(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  return GITHUB_USERNAME_REGEX.test(trimmed) ? trimmed : null;
}

interface CreatePlanInput {
  readonly assignee?: string | null;
  readonly author: string;
  readonly category: string;
  readonly description?: string | null;
  readonly project?: string | null;
  readonly projectId?: string | null;
  readonly status?: string;
  readonly summary?: string | null;
  readonly title: string;
}

interface UpdatePlanInput {
  readonly assignee?: string | null;
  readonly author?: string;
  readonly category?: string;
  readonly description?: string | null;
  readonly project?: string | null;
  readonly projectId?: string | null;
  readonly status?: string;
  readonly summary?: string | null;
  readonly title?: string;
}

interface CreateTaskInput {
  readonly assignee?: string | null;
  readonly category?: string | null;
  readonly description?: string | null;
  readonly planId: string;
  readonly project?: string | null;
  readonly projectId?: string | null;
  readonly requirements?: readonly unknown[];
  readonly status?: string;
  readonly summary?: string | null;
  readonly title: string;
}

interface UpdateTaskInput {
  readonly assignee?: string | null;
  readonly category?: string | null;
  readonly description?: string | null;
  readonly planId?: string;
  readonly project?: string | null;
  readonly projectId?: string | null;
  readonly requirements?: readonly unknown[];
  readonly status?: string;
  readonly summary?: string | null;
  readonly title?: string;
}

function _mapPlanRow(r: {
  assignee: string | null;
  author: string;
  category: string;
  created_at: string;
  description: string | null;
  id: string;
  project: string | null;
  project_id: string | null;
  status: string;
  summary: string | null;
  title: string;
  updated_at: string;
}): PlanRow {
  return {
    assignee: r.assignee,
    author: r.author,
    category: r.category,
    createdAt: r.created_at,
    description: r.description,
    id: r.id,
    project: r.project,
    projectId: r.project_id,
    status: r.status,
    summary: r.summary,
    title: r.title,
    updatedAt: r.updated_at,
  };
}

function _mapTaskRow(r: {
  assignee: string | null;
  category: string | null;
  created_at: string;
  description: string | null;
  id: string;
  plan_id: string;
  project: string | null;
  project_id: string | null;
  requirements: unknown;
  sort_order: number;
  status: string;
  summary: string | null;
  title: string;
  updated_at: string;
}): TaskRow {
  const requirements = r.requirements as readonly unknown[];
  return {
    assignee: r.assignee,
    category: r.category,
    createdAt: r.created_at,
    description: r.description,
    id: r.id,
    planId: r.plan_id,
    project: r.project,
    projectId: r.project_id,
    requirements: Array.isArray(requirements) ? requirements : [],
    sortOrder: r.sort_order,
    status: r.status,
    summary: r.summary,
    title: r.title,
    updatedAt: r.updated_at,
  };
}

/**
 * @description Maps a Plan entity to {@link PlanRow} (dates to ISO strings).
 */
function mapPlanEntityToRow(plan: Plan): PlanRow {
  const createdAt =
    plan.createdAt instanceof Date
      ? plan.createdAt
      : new Date(plan.createdAt as string);
  const updatedAt =
    plan.updatedAt instanceof Date
      ? plan.updatedAt
      : new Date(plan.updatedAt as string);
  return {
    assignee: plan.assignee,
    author: plan.author,
    category: plan.category,
    createdAt: createdAt.toISOString(),
    description: plan.description,
    id: plan.id,
    project: plan.project,
    projectId: plan.projectId,
    status: plan.status,
    summary: plan.summary,
    title: plan.title,
    updatedAt: updatedAt.toISOString(),
  };
}

/**
 * @description Maps a Task entity to {@link TaskRow} (dates to ISO strings).
 */
function mapTaskEntityToRow(task: Task): TaskRow {
  const createdAt =
    task.createdAt instanceof Date
      ? task.createdAt
      : new Date(task.createdAt as string);
  const updatedAt =
    task.updatedAt instanceof Date
      ? task.updatedAt
      : new Date(task.updatedAt as string);
  return {
    assignee: task.assignee,
    category: task.category,
    createdAt: createdAt.toISOString(),
    description: task.description,
    id: task.id,
    planId: task.planId,
    project: task.project,
    projectId: task.projectId,
    requirements: Array.isArray(task.requirements) ? task.requirements : [],
    sortOrder: task.sortOrder,
    status: task.status,
    summary: task.summary,
    title: task.title,
    updatedAt: updatedAt.toISOString(),
  };
}

/**
 * @description Creates a plan in Cortex and returns the inserted row.
 */
export async function createPlan(input: CreatePlanInput): Promise<PlanRow> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Plan);
  const plan = repo.create({
    assignee: normalizeAssignee(input.assignee),
    author: input.author,
    category: input.category,
    description: input.description ?? null,
    project: input.project ?? null,
    projectId: input.projectId ?? null,
    status: (input.status ?? 'PENDING').toUpperCase(),
    summary: input.summary ?? null,
    title: input.title,
  });
  const saved = await repo.save(plan);
  return mapPlanEntityToRow(saved);
}

/**
 * @description Fetches a plan by id, or null if not found.
 */
export async function getPlanById(id: string): Promise<PlanRow | null> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Plan);
  const plan = await repo.findOne({ where: { id } });
  return plan ? mapPlanEntityToRow(plan) : null;
}

/**
 * @description Updates a plan by id; returns updated row or null if not found.
 */
export async function updatePlan(
  id: string,
  input: UpdatePlanInput,
): Promise<PlanRow | null> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Plan);
  const plan = await repo.findOne({ where: { id } });
  if (!plan) return null;
  if (input.title !== undefined) plan.title = input.title;
  if (input.author !== undefined) plan.author = input.author;
  if (input.category !== undefined) plan.category = input.category;
  if (input.description !== undefined) plan.description = input.description;
  if (input.status !== undefined) plan.status = input.status.toUpperCase();
  if (input.assignee !== undefined) {
    plan.assignee = normalizeAssignee(input.assignee);
  }
  if (input.summary !== undefined) plan.summary = input.summary;
  if (input.project !== undefined) plan.project = input.project;
  if (input.projectId !== undefined) plan.projectId = input.projectId;
  const saved = await repo.save(plan);
  return mapPlanEntityToRow(saved);
}

/**
 * @description Deletes a plan by id (cascades to tasks). Returns true if a row was deleted.
 */
export async function deletePlan(id: string): Promise<boolean> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Plan);
  const result = await repo.delete(id);
  return (result.affected ?? 0) > 0;
}

/**
 * @description Infers a task category from title and optional description using keyword heuristics.
 */
function inferTaskCategory(title: string, description?: string | null): string {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (/\b(ui|dashboard|component|route|page|ux|frontend|design)\b/.test(text)) {
    return 'product';
  }
  if (
    /\b(mcp|api|schema|migration|db|database|postgres|infrastructure)\b/.test(
      text,
    )
  ) {
    return 'infrastructure';
  }
  if (/\b(test|spec|e2e|unit|coverage)\b/.test(text)) {
    return 'testing';
  }
  if (/\b(doc|readme|docs|documentation)\b/.test(text)) {
    return 'docs';
  }
  return 'general';
}

/**
 * @description Creates a task in Cortex and returns the inserted row.
 */
export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const ds = await getOrCreateDataSource();
  const taskRepo = ds.getRepository(Task);
  const planRepo = ds.getRepository(Plan);
  const status = (input.status ?? 'PENDING').toUpperCase();
  const requirements = input.requirements ?? [];
  const category =
    input.category ?? inferTaskCategory(input.title, input.description);
  const task = taskRepo.create({
    assignee: normalizeAssignee(input.assignee),
    category,
    description: input.description ?? null,
    planId: input.planId,
    project: input.project ?? null,
    projectId: input.projectId ?? null,
    requirements: Array.isArray(requirements) ? [...requirements] : [],
    status,
    summary: input.summary ?? null,
    title: input.title,
  });
  const saved = await taskRepo.save(task);

  const plan = await planRepo.findOne({ where: { id: input.planId } });
  if (
    plan &&
    (plan.status === 'CANCELED' ||
      plan.status === 'COMPLETED' ||
      plan.status === 'SKIPPED')
  ) {
    plan.status = 'IN_PROGRESS';
    await planRepo.save(plan);
  }

  return mapTaskEntityToRow(saved);
}

/**
 * @description Fetches a task by id, or null if not found.
 */
export async function getTaskById(id: string): Promise<TaskRow | null> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Task);
  const task = await repo.findOne({ where: { id } });
  return task ? mapTaskEntityToRow(task) : null;
}

/**
 * @description Fetches all tasks for a plan, ordered by sortOrder then createdAt.
 */
export async function getTasksByPlanId(
  planId: string,
): Promise<readonly TaskRow[]> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Task);
  const tasks = await repo.find({
    order: { ...PLAN_TASK_LIST_ORDER },
    where: { planId },
  });
  return tasks.map(mapTaskEntityToRow);
}

/** Statuses considered "remaining" (not completed, skipped, or canceled). Canonical enum values: BACKLOG, BLOCKED, IN_PROGRESS, PENDING. */
const REMAINING_TASK_STATUSES = [
  'BACKLOG',
  'BLOCKED',
  'IN_PROGRESS',
  'PENDING',
] as const;

/**
 * @description Fetches tasks for a plan whose status is BACKLOG, BLOCKED, IN_PROGRESS, or PENDING (i.e. remaining work). Ordered by sortOrder then createdAt.
 */
export async function getRemainingTasksByPlanId(
  planId: string,
): Promise<readonly TaskRow[]> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Task);
  const tasks = await repo.find({
    order: { ...PLAN_TASK_LIST_ORDER },
    where: {
      planId,
      status: In([...REMAINING_TASK_STATUSES]),
    },
  });
  return tasks.map(mapTaskEntityToRow);
}

/** Input for {@link listTasksByCategory}. */
interface ListTasksByCategoryInput {
  readonly category: string;
  readonly limit?: number;
  readonly planId?: string;
  readonly status?: string;
}

/**
 * @description Fetches tasks filtered by category, optionally by status and/or planId. Ordered by created_at.
 * Uses idx_tasks_category for the required category filter.
 */
export async function listTasksByCategory(
  input: ListTasksByCategoryInput,
): Promise<readonly TaskRow[]> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Task);
  const where: { category: string; planId?: string; status?: string } = {
    category: input.category,
  };
  if (input.planId !== undefined) where.planId = input.planId;
  if (input.status !== undefined) {
    where.status = input.status.toUpperCase();
  }
  const findOptions = {
    order: { createdAt: 'ASC' as const },
    where,
    ...(input.limit !== undefined && { take: input.limit }),
  };
  const tasks = await repo.find(findOptions);
  return tasks.map(mapTaskEntityToRow);
}

/**
 * @description Updates a task by id; returns updated row or null if not found.
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<TaskRow | null> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Task);
  const task = await repo.findOne({ where: { id } });
  if (!task) return null;
  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.category !== undefined) task.category = input.category;
  if (input.status !== undefined) task.status = input.status.toUpperCase();
  if (input.planId !== undefined) task.planId = input.planId;
  if (input.requirements !== undefined) {
    task.requirements = Array.isArray(input.requirements)
      ? [...input.requirements]
      : [];
  }
  if (input.assignee !== undefined) {
    task.assignee = normalizeAssignee(input.assignee);
  }
  if (input.summary !== undefined) task.summary = input.summary;
  if (input.project !== undefined) task.project = input.project;
  if (input.projectId !== undefined) task.projectId = input.projectId;
  const saved = await repo.save(task);
  return mapTaskEntityToRow(saved);
}

/**
 * @description Deletes a task by id. Returns true if a row was deleted.
 */
export async function deleteTask(id: string): Promise<boolean> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(Task);
  const result = await repo.delete(id);
  return (result.affected ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Commit links (associate git commits with plans/tasks)
// ---------------------------------------------------------------------------

interface CommitLinkRow {
  readonly createdAt: string;
  readonly id: string;
  readonly message: string | null;
  readonly planId: string;
  readonly repo: string;
  readonly sha: string;
  readonly taskId: string | null;
}

interface CreateCommitLinkInput {
  readonly message?: string | null;
  readonly planId: string;
  readonly repo: string;
  readonly sha: string;
  readonly taskId?: string | null;
}

/**
 * @description Creates a link between a git commit and a plan (and optionally a task). Returns the inserted row.
 */
export async function createCommitLink(
  input: CreateCommitLinkInput,
): Promise<CommitLinkRow> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    created_at: string;
    id: string;
    message: string | null;
    plan_id: string;
    repo: string;
    sha: string;
    task_id: string | null;
  }>(
    ds,
    `INSERT INTO commit_links (plan_id, task_id, repo, sha, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, plan_id, task_id, repo, sha, message, created_at`,
    [
      input.planId,
      input.taskId ?? null,
      input.repo,
      input.sha,
      input.message ?? null,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('createCommitLink: no row returned');
  return {
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    planId: row.plan_id,
    repo: row.repo,
    sha: row.sha,
    taskId: row.task_id,
  };
}

/**
 * @description Fetches all commit links for a plan (plan-level and task-level for that plan), ordered by created_at desc.
 */
export async function getCommitLinksByPlanId(
  planId: string,
): Promise<readonly CommitLinkRow[]> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    created_at: string;
    id: string;
    message: string | null;
    plan_id: string;
    repo: string;
    sha: string;
    task_id: string | null;
  }>(
    ds,
    `SELECT id, plan_id, task_id, repo, sha, message, created_at
       FROM commit_links
       WHERE plan_id = $1
       ORDER BY created_at DESC`,
    [planId],
  );
  return res.rows.map((r) => ({
    createdAt: r.created_at,
    id: r.id,
    message: r.message,
    planId: r.plan_id,
    repo: r.repo,
    sha: r.sha,
    taskId: r.task_id,
  }));
}

/**
 * @description Fetches all commit links for a task (task-level only), ordered by created_at desc.
 */
export async function getCommitLinksByTaskId(
  taskId: string,
): Promise<readonly CommitLinkRow[]> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    created_at: string;
    id: string;
    message: string | null;
    plan_id: string;
    repo: string;
    sha: string;
    task_id: string | null;
  }>(
    ds,
    `SELECT id, plan_id, task_id, repo, sha, message, created_at
       FROM commit_links
       WHERE task_id = $1
       ORDER BY created_at DESC`,
    [taskId],
  );
  return res.rows.map((r) => ({
    createdAt: r.created_at,
    id: r.id,
    message: r.message,
    planId: r.plan_id,
    repo: r.repo,
    sha: r.sha,
    taskId: r.task_id,
  }));
}

// ---------------------------------------------------------------------------
// Last activity for plan or task ("What was the last thing we did?")
// ---------------------------------------------------------------------------

export type LastActivityKind = 'commit' | 'output_chunk' | 'task_update';

export interface LastActivityResult {
  readonly at: string;
  readonly commit?: {
    readonly message: string | null;
    readonly repo: string;
    readonly sha: string;
  };
  readonly kind: LastActivityKind;
  readonly outputChunk?: {
    readonly content: string;
    readonly iteration: number | null;
  };
  readonly planId: string;
  /** Human-readable summary for the answer. */
  readonly summary: string;
  readonly taskId: string | null;
  readonly taskUpdate?: {
    readonly status: string;
    readonly taskId: string;
    readonly taskTitle: string;
  };
}

/**
 * @description Fetches the single most recent activity (commit, plan output chunk, or task update) for a plan or for a specific task. Use for "What was the last thing we did for <plan> or <task>?"
 */
export async function getLastActivityForPlanOrTask(
  planId: string,
  taskId?: string | null,
): Promise<LastActivityResult | null> {
  const ds = await getOrCreateDataSource();

  type Candidate = {
    at: string;
    commit?: LastActivityResult['commit'];
    kind: LastActivityKind;
    outputChunk?: LastActivityResult['outputChunk'];
    summary: string;
    taskUpdate?: LastActivityResult['taskUpdate'];
  };
  const candidates: Candidate[] = [];

  if (taskId) {
    const commitRes = await runQuery<{
      created_at: string;
      message: string | null;
      repo: string;
      sha: string;
    }>(
      ds,
      `SELECT created_at, repo, sha, message FROM commit_links WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [taskId],
    );
    const commitRow = commitRes.rows[0];
    if (commitRow) {
      candidates.push({
        at: commitRow.created_at,
        commit: {
          message: commitRow.message,
          repo: commitRow.repo,
          sha: commitRow.sha,
        },
        kind: 'commit',
        summary: `Commit: ${commitRow.message ?? commitRow.sha} (${commitRow.repo}@${commitRow.sha.slice(0, 7)})`,
      });
    }
  } else {
    const commitRes = await runQuery<{
      created_at: string;
      message: string | null;
      repo: string;
      sha: string;
    }>(
      ds,
      `SELECT created_at, repo, sha, message FROM commit_links WHERE plan_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [planId],
    );
    const commitRow = commitRes.rows[0];
    if (commitRow) {
      candidates.push({
        at: commitRow.created_at,
        commit: {
          message: commitRow.message,
          repo: commitRow.repo,
          sha: commitRow.sha,
        },
        kind: 'commit',
        summary: `Commit: ${commitRow.message ?? commitRow.sha} (${commitRow.repo}@${commitRow.sha.slice(0, 7)})`,
      });
    }
  }

  const outputRes = await runQuery<{
    content: string;
    created_at: string;
    iteration: number | null;
  }>(
    ds,
    `SELECT content, created_at, iteration FROM plan_output_stream WHERE plan_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [planId],
  );
  const outputRow = outputRes.rows[0];
  if (outputRow) {
    const preview =
      outputRow.content.slice(0, 120) +
      (outputRow.content.length > 120 ? '…' : '');
    candidates.push({
      at: outputRow.created_at,
      kind: 'output_chunk',
      outputChunk: {
        content: outputRow.content,
        iteration: outputRow.iteration,
      },
      summary: `Plan output: ${preview}`,
    });
  }

  if (taskId) {
    const taskRes = await runQuery<{
      status: string;
      title: string;
      updated_at: string;
    }>(ds, `SELECT title, status, updated_at FROM tasks WHERE id = $1`, [
      taskId,
    ]);
    const taskRow = taskRes.rows[0];
    if (taskRow) {
      candidates.push({
        at: taskRow.updated_at,
        kind: 'task_update',
        summary: `Task "${taskRow.title}" updated to status ${taskRow.status}`,
        taskUpdate: {
          status: taskRow.status,
          taskId,
          taskTitle: taskRow.title,
        },
      });
    }
  } else {
    const taskRes = await runQuery<{
      id: string;
      status: string;
      title: string;
      updated_at: string;
    }>(
      ds,
      `SELECT id, title, status, updated_at FROM tasks WHERE plan_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [planId],
    );
    const taskRow = taskRes.rows[0];
    if (taskRow) {
      candidates.push({
        at: taskRow.updated_at,
        kind: 'task_update',
        summary: `Task "${taskRow.title}" updated to status ${taskRow.status}`,
        taskUpdate: {
          status: taskRow.status,
          taskId: taskRow.id,
          taskTitle: taskRow.title,
        },
      });
    }
  }

  if (candidates.length === 0) return null;
  const latest = candidates.reduce((a, b) => (a.at > b.at ? a : b));
  return {
    at: latest.at,
    commit: latest.commit,
    kind: latest.kind,
    outputChunk: latest.outputChunk,
    planId,
    summary: latest.summary,
    taskId: taskId ?? null,
    taskUpdate: latest.taskUpdate,
  };
}

// ---------------------------------------------------------------------------
// Plan output stream (streaming output / agent log per plan)
// ---------------------------------------------------------------------------

interface PlanOutputChunkRow {
  readonly content: string;
  readonly createdAt: string;
  readonly id: string;
  readonly iteration: number | null;
  readonly planId: string;
}

interface CreatePlanOutputChunkInput {
  readonly content: string;
  readonly iteration?: number | null;
  readonly planId: string;
}

/**
 * @description Appends a chunk of streaming output to a plan (e.g. agent iteration log). Returns the inserted row.
 */
export async function createPlanOutputChunk(
  input: CreatePlanOutputChunkInput,
): Promise<PlanOutputChunkRow> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    content: string;
    created_at: string;
    id: string;
    iteration: number | null;
    plan_id: string;
  }>(
    ds,
    `INSERT INTO plan_output_stream (plan_id, iteration, content)
       VALUES ($1, $2, $3)
       RETURNING id, plan_id, iteration, content, created_at`,
    [input.planId, input.iteration ?? null, input.content],
  );
  const row = res.rows[0];
  if (!row) throw new Error('createPlanOutputChunk: no row returned');
  return {
    content: row.content,
    createdAt: row.created_at,
    id: row.id,
    iteration: row.iteration,
    planId: row.plan_id,
  };
}

/**
 * @description Fetches all output chunks for a plan, ordered by created_at ascending (stream order).
 */
export async function getPlanOutputByPlanId(
  planId: string,
): Promise<readonly PlanOutputChunkRow[]> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    content: string;
    created_at: string;
    id: string;
    iteration: number | null;
    plan_id: string;
  }>(
    ds,
    `SELECT id, plan_id, iteration, content, created_at
       FROM plan_output_stream
       WHERE plan_id = $1
       ORDER BY created_at ASC`,
    [planId],
  );
  return res.rows.map((r) => ({
    content: r.content,
    createdAt: r.created_at,
    id: r.id,
    iteration: r.iteration,
    planId: r.plan_id,
  }));
}

// ---------------------------------------------------------------------------
// Activity by date (for "worked on / shipped on X date or X days ago")
// ---------------------------------------------------------------------------

interface ActivityCommitRow extends CommitLinkRow {
  readonly planTitle: string;
  readonly taskTitle: string | null;
}

interface ActivityOutputChunkRow extends PlanOutputChunkRow {
  readonly planTitle: string;
}

interface ActivityTaskUpdatedRow {
  readonly id: string;
  readonly planId: string;
  readonly planTitle: string;
  readonly status: string;
  readonly title: string;
  readonly updatedAt: string;
}

interface ActivityByDateResult {
  readonly commits: readonly ActivityCommitRow[];
  readonly outputChunks: readonly ActivityOutputChunkRow[];
  readonly tasksUpdated: readonly ActivityTaskUpdatedRow[];
}

/**
 * @description Fetches commit links in a date range (inclusive start, exclusive end). Joins plan and task titles.
 */
async function getCommitLinksInDateRange(
  startIso: string,
  endIso: string,
): Promise<readonly ActivityCommitRow[]> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    created_at: string;
    id: string;
    message: string | null;
    plan_id: string;
    plan_title: string;
    repo: string;
    sha: string;
    task_id: string | null;
    task_title: string | null;
  }>(
    ds,
    `SELECT cl.id, cl.plan_id, cl.task_id, cl.repo, cl.sha, cl.message, cl.created_at,
              p.title AS plan_title, t.title AS task_title
       FROM commit_links cl
       JOIN plans p ON cl.plan_id = p.id
       LEFT JOIN tasks t ON cl.task_id = t.id
       WHERE cl.created_at >= $1::timestamptz AND cl.created_at < $2::timestamptz
       ORDER BY cl.created_at DESC`,
    [startIso, endIso],
  );
  return res.rows.map((r) => ({
    createdAt: r.created_at,
    id: r.id,
    message: r.message,
    planId: r.plan_id,
    planTitle: r.plan_title,
    repo: r.repo,
    sha: r.sha,
    taskId: r.task_id,
    taskTitle: r.task_title ?? null,
  }));
}

/**
 * @description Fetches plan output stream chunks in a date range. Joins plan title.
 */
async function getPlanOutputChunksInDateRange(
  startIso: string,
  endIso: string,
): Promise<readonly ActivityOutputChunkRow[]> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    content: string;
    created_at: string;
    id: string;
    iteration: number | null;
    plan_id: string;
    plan_title: string;
  }>(
    ds,
    `SELECT pos.id, pos.plan_id, pos.iteration, pos.content, pos.created_at, p.title AS plan_title
       FROM plan_output_stream pos
       JOIN plans p ON pos.plan_id = p.id
       WHERE pos.created_at >= $1::timestamptz AND pos.created_at < $2::timestamptz
       ORDER BY pos.created_at ASC`,
    [startIso, endIso],
  );
  return res.rows.map((r) => ({
    content: r.content,
    createdAt: r.created_at,
    id: r.id,
    iteration: r.iteration,
    planId: r.plan_id,
    planTitle: r.plan_title,
  }));
}

/**
 * @description Fetches tasks whose updated_at falls in a date range. Joins plan title.
 */
async function getTasksUpdatedInDateRange(
  startIso: string,
  endIso: string,
): Promise<readonly ActivityTaskUpdatedRow[]> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    id: string;
    plan_id: string;
    plan_title: string;
    status: string;
    title: string;
    updated_at: string;
  }>(
    ds,
    `SELECT t.id, t.plan_id, t.title, t.status, t.updated_at, p.title AS plan_title
       FROM tasks t
       JOIN plans p ON t.plan_id = p.id
       WHERE t.updated_at >= $1::timestamptz AND t.updated_at < $2::timestamptz
       ORDER BY t.updated_at DESC`,
    [startIso, endIso],
  );
  return res.rows.map((r) => ({
    id: r.id,
    planId: r.plan_id,
    planTitle: r.plan_title,
    status: r.status,
    title: r.title,
    updatedAt: r.updated_at,
  }));
}

/**
 * @description Fetches all activity (commits, plan output chunks, tasks updated) in a date range for "worked on / shipped on X date or X days ago" answers.
 */
export async function getActivityByDateRange(
  startIso: string,
  endIso: string,
): Promise<ActivityByDateResult> {
  const [commits, outputChunks, tasksUpdated] = await Promise.all([
    getCommitLinksInDateRange(startIso, endIso),
    getPlanOutputChunksInDateRange(startIso, endIso),
    getTasksUpdatedInDateRange(startIso, endIso),
  ]);
  return { commits, outputChunks, tasksUpdated };
}

// ---------------------------------------------------------------------------
// Notes (quick unstructured thoughts; foundation for notes route and planning)
// ---------------------------------------------------------------------------

export interface NoteRow {
  readonly author: string | null;
  readonly content: string;
  readonly createdAt: string;
  readonly id: string;
  readonly updatedAt: string;
}

interface CreateNoteInput {
  readonly author?: string | null;
  readonly content: string;
}

interface UpdateNoteInput {
  readonly author?: string | null;
  readonly content?: string;
}

function mapNoteRow(r: {
  author: string | null;
  content: string;
  created_at: string;
  id: string;
  updated_at: string;
}): NoteRow {
  return {
    author: r.author,
    content: r.content,
    createdAt: r.created_at,
    id: r.id,
    updatedAt: r.updated_at,
  };
}

/**
 * @description Creates a note in Cortex and returns the inserted row.
 */
export async function createNote(input: CreateNoteInput): Promise<NoteRow> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    author: string | null;
    content: string;
    created_at: string;
    id: string;
    updated_at: string;
  }>(
    ds,
    `INSERT INTO notes (content, author)
       VALUES ($1, $2)
       RETURNING id, content, author, created_at, updated_at`,
    [input.content, input.author ?? null],
  );
  const row = res.rows[0];
  if (!row) throw new Error('createNote: no row returned');
  return mapNoteRow(row);
}

/**
 * @description Fetches a note by id, or null if not found.
 */
export async function getNoteById(id: string): Promise<NoteRow | null> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery<{
    author: string | null;
    content: string;
    created_at: string;
    id: string;
    updated_at: string;
  }>(
    ds,
    `SELECT id, content, author, created_at, updated_at
       FROM notes WHERE id = $1`,
    [id],
  );
  const row = res.rows[0];
  return row ? mapNoteRow(row) : null;
}

/**
 * @description Lists notes, newest first. Optional author filter and limit.
 */
export async function listNotes(
  options: { author?: string | null; limit?: number } = {},
): Promise<readonly NoteRow[]> {
  const ds = await getOrCreateDataSource();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const res = await runQuery<{
    author: string | null;
    content: string;
    created_at: string;
    id: string;
    updated_at: string;
  }>(
    ds,
    options.author != null
      ? `SELECT id, content, author, created_at, updated_at
         FROM notes WHERE author = $1
         ORDER BY created_at DESC
         LIMIT $2`
      : `SELECT id, content, author, created_at, updated_at
         FROM notes
         ORDER BY created_at DESC
         LIMIT $1`,
    options.author != null ? [options.author, limit] : [limit],
  );
  return res.rows.map(mapNoteRow);
}

/**
 * @description Updates a note by id; returns updated row or null if not found.
 */
export async function updateNote(
  id: string,
  input: UpdateNoteInput,
): Promise<NoteRow | null> {
  const ds = await getOrCreateDataSource();

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.content !== undefined) {
    updates.push(`content = $${i++}`);
    values.push(input.content);
  }
  if (input.author !== undefined) {
    updates.push(`author = $${i++}`);
    values.push(input.author);
  }
  if (updates.length === 0) return getNoteById(id);
  values.push(id);
  const res = await runQuery<{
    author: string | null;
    content: string;
    created_at: string;
    id: string;
    updated_at: string;
  }>(
    ds,
    `UPDATE notes SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, content, author, created_at, updated_at`,
    values,
  );
  const row = res.rows[0];
  return row ? mapNoteRow(row) : null;
}

/**
 * @description Deletes a note by id. Returns true if a row was deleted.
 */
export async function deleteNote(id: string): Promise<boolean> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery(ds, 'DELETE FROM notes WHERE id = $1', [id]);
  return res.rowCount > 0;
}

// ---------------------------------------------------------------------------
// Plan and task embeddings (vectorization for semantic search)
// Uses TypeORM DataSource; raw SQL for pgvector (<=>, ::vector) and CRUD so indexes and behavior stay consistent.
// ---------------------------------------------------------------------------

/**
 * @description Deletes all embedding rows for a plan. Use before replacing plan embedding (e.g. on update).
 */
export async function deletePlanEmbeddings(planId: string): Promise<number> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery(
    ds,
    'DELETE FROM plan_embeddings WHERE plan_id = $1',
    [planId],
  );
  return res.rowCount;
}

/**
 * @description Deletes all embedding rows for a task. Use before replacing task embedding (e.g. on update).
 */
export async function deleteTaskEmbeddings(taskId: string): Promise<number> {
  const ds = await getOrCreateDataSource();

  const res = await runQuery(
    ds,
    'DELETE FROM task_embeddings WHERE task_id = $1',
    [taskId],
  );
  return res.rowCount;
}

/**
 * @description Inserts a plan embedding row for semantic search. Embedding must be 1536-dim (e.g. OpenAI text-embedding-3-small).
 */
export async function insertPlanEmbedding(
  planId: string,
  content: string,
  embedding: number[],
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(PlanEmbedding);
  const entity = repo.create({
    content,
    embedding,
    metadata,
    planId,
  });
  await repo.save(entity);
}

/**
 * @description Inserts a task embedding row for semantic search. Embedding must be 1536-dim (e.g. OpenAI text-embedding-3-small).
 */
export async function insertTaskEmbedding(
  taskId: string,
  content: string,
  embedding: number[],
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const ds = await getOrCreateDataSource();
  const repo = ds.getRepository(TaskEmbedding);
  const entity = repo.create({
    content,
    embedding,
    metadata,
    taskId,
  });
  await repo.save(entity);
}
