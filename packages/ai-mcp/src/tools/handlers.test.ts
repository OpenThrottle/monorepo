import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.ts';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Handler-level tests for the MCP tool registrations. The cortex-client and the
 * embedding call are mocked, so these exercise the registered tool callbacks'
 * own logic — the config-missing guard (the dead-guard P1 bug: a search tool
 * must return a friendly error when Postgres is unconfigured rather than throw),
 * the invalid-args path, and the GITHUB_USER author/assignee override matrix —
 * without a network or live pgvector instance.
 *
 * Handlers are registered against a real McpServer whose registerTool is spied
 * on to capture the callbacks by tool name, then invoked directly.
 */

interface CapturedToolResult {
  readonly content: readonly { readonly text: string; readonly type: string }[];
  readonly isError?: boolean;
  readonly structuredContent?: Record<string, unknown>;
}

type CapturedHandler = (args: unknown) => Promise<CapturedToolResult>;

/** The tool callback shape the register functions pass to server.registerTool. */
type ToolCallback = (
  args: unknown,
  extra: unknown,
) => Promise<CapturedToolResult>;

/** Minimal register-tool surface the register functions exercise. */
type RegisterTool = (
  name: string,
  config: unknown,
  cb: ToolCallback,
) => unknown;

const cortex = vi.hoisted(() => ({
  createTask: vi.fn(),
  insertTaskEmbedding: vi.fn(),
  runSemanticSearch: vi.fn(),
  updateTask: vi.fn(),
}));

const embedQuery = vi.hoisted(() => vi.fn());

vi.mock('../cortex-client.js', () => ({
  createTask: cortex.createTask,
  deleteTask: vi.fn(),
  deleteTaskEmbeddings: vi.fn(),
  getChunkById: vi.fn(),
  getCommitLinksByTaskId: vi.fn(),
  getRemainingTasksByPlanId: vi.fn(),
  getTaskById: vi.fn(),
  getTasksByPlanId: vi.fn(),
  insertTaskEmbedding: cortex.insertTaskEmbedding,
  listSources: vi.fn(),
  listTasksByCategory: vi.fn(),
  runSemanticSearch: cortex.runSemanticSearch,
  updateTask: cortex.updateTask,
}));

vi.mock('../embedding.js', () => ({ embedQuery }));

const { registerSearchTools } = await import('./search.js');
const { registerTaskTools } = await import('./tasks.js');

/**
 * Registers the given tool group against a throwaway McpServer and returns a map
 * of tool name → captured handler callback.
 */
function captureHandlers(
  register: (server: McpServer) => void,
): Map<string, CapturedHandler> {
  const handlers = new Map<string, CapturedHandler>();
  const server = new McpServer({ name: 'test', version: '0.0.0' });

  const registerTool: RegisterTool = (name, _config, cb) => {
    // The registered handlers read only their parsed args; the MCP `extra`
    // argument is not consulted, so an empty stand-in is sufficient here.
    handlers.set(name, (args: unknown) => cb(args, {}));
    return undefined;
  };

  // The real registerTool is heavily overloaded with MCP SDK generics; replace
  // it with our minimal, capture-only stand-in to record the callbacks the
  // register functions wire up. consistent-type-assertions is off in this
  // package's eslint config (see eslint.config.ts).
  server.registerTool = registerTool as McpServer['registerTool'];

  register(server);
  return handlers;
}

beforeEach(() => {
  cortex.createTask.mockReset();
  cortex.insertTaskEmbedding.mockReset();
  cortex.runSemanticSearch.mockReset();
  cortex.updateTask.mockReset();
  embedQuery.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('search tools — config-missing guard', () => {
  function unsetPostgresEnv(): void {
    vi.stubEnv('OPENTHROTTLE_POSTGRES_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    vi.stubEnv('POSTGRES_DB', '');
    vi.stubEnv('POSTGRES_HOST', '');
    vi.stubEnv('POSTGRES_PASSWORD', '');
    vi.stubEnv('POSTGRES_PORT', '');
    vi.stubEnv('POSTGRES_USER', '');
  }

  test('semantic_search returns a friendly error (not a throw) when Postgres is unconfigured', async () => {
    unsetPostgresEnv();
    const handlers = captureHandlers(registerSearchTools);

    const result = await handlers.get('semantic_search')?.({
      query: 'anything',
    });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('Postgres');
    // The guard must short-circuit before embedding or querying.
    expect(embedQuery).not.toHaveBeenCalled();
    expect(cortex.runSemanticSearch).not.toHaveBeenCalled();
  });

  test('list_sources returns a friendly error when Postgres is unconfigured', async () => {
    unsetPostgresEnv();
    const handlers = captureHandlers(registerSearchTools);

    const result = await handlers.get('list_sources')?.({});

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('Postgres');
  });
});

describe('tool handlers — invalid-args path', () => {
  test('semantic_search rejects an empty query with an Invalid arguments error', async () => {
    const handlers = captureHandlers(registerSearchTools);

    const result = await handlers.get('semantic_search')?.({ query: '' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('Invalid arguments');
    expect(cortex.runSemanticSearch).not.toHaveBeenCalled();
  });

  test('create_task rejects a missing title with an Invalid arguments error', async () => {
    const handlers = captureHandlers(registerTaskTools);

    const result = await handlers.get('create_task')?.({
      planId: '00000000-0000-0000-0000-000000000000',
    });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('Invalid arguments');
    expect(cortex.createTask).not.toHaveBeenCalled();
  });

  test('create_task rejects a non-UUID planId', async () => {
    const handlers = captureHandlers(registerTaskTools);

    const result = await handlers.get('create_task')?.({
      planId: 'not-a-uuid',
      title: 'Valid title',
    });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('Invalid arguments');
    expect(cortex.createTask).not.toHaveBeenCalled();
  });
});

describe('GITHUB_USER override matrix — create_task assignee', () => {
  const planId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    cortex.createTask.mockResolvedValue({ id: 'task-1', title: 'T' });
    // No embedding → skips the insertTaskEmbedding side effect.
    embedQuery.mockResolvedValue(undefined);
  });

  test('GITHUB_USER wins over the caller-supplied assignee when set', async () => {
    vi.stubEnv('GITHUB_USER', 'octocat');
    const handlers = captureHandlers(registerTaskTools);

    await handlers.get('create_task')?.({
      assignee: 'display-name',
      planId,
      title: 'T',
    });

    expect(cortex.createTask).toHaveBeenCalledTimes(1);
    expect(cortex.createTask.mock.calls[0]?.[0]).toMatchObject({
      assignee: 'octocat',
    });
  });

  test('GITHUB_USER wins even when the caller omits assignee', async () => {
    vi.stubEnv('GITHUB_USER', 'octocat');
    const handlers = captureHandlers(registerTaskTools);

    await handlers.get('create_task')?.({ planId, title: 'T' });

    expect(cortex.createTask.mock.calls[0]?.[0]).toMatchObject({
      assignee: 'octocat',
    });
  });

  test('falls back to the caller assignee when GITHUB_USER is unset', async () => {
    vi.stubEnv('GITHUB_USER', '');
    const handlers = captureHandlers(registerTaskTools);

    await handlers.get('create_task')?.({
      assignee: 'alice',
      planId,
      title: 'T',
    });

    expect(cortex.createTask.mock.calls[0]?.[0]).toMatchObject({
      assignee: 'alice',
    });
  });

  test('falls back to null when neither GITHUB_USER nor caller assignee is set', async () => {
    vi.stubEnv('GITHUB_USER', '');
    const handlers = captureHandlers(registerTaskTools);

    await handlers.get('create_task')?.({ planId, title: 'T' });

    expect(cortex.createTask.mock.calls[0]?.[0]).toMatchObject({
      assignee: null,
    });
  });
});

describe('GITHUB_USER override matrix — update_task assignee', () => {
  const id = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    cortex.updateTask.mockResolvedValue({ id, title: 'T' });
    embedQuery.mockResolvedValue(undefined);
  });

  test('GITHUB_USER overrides the caller assignee on update when supplied', async () => {
    vi.stubEnv('GITHUB_USER', 'octocat');
    const handlers = captureHandlers(registerTaskTools);

    await handlers.get('update_task')?.({ assignee: 'display-name', id });

    expect(cortex.updateTask).toHaveBeenCalledTimes(1);
    expect(cortex.updateTask.mock.calls[0]?.[1]).toMatchObject({
      assignee: 'octocat',
    });
  });

  test('leaves assignee untouched when the caller omits it', async () => {
    vi.stubEnv('GITHUB_USER', 'octocat');
    const handlers = captureHandlers(registerTaskTools);

    await handlers.get('update_task')?.({ id, status: 'COMPLETED' });

    const updateArgs = cortex.updateTask.mock.calls[0]?.[1];
    expect(updateArgs).not.toHaveProperty('assignee');
  });
});
