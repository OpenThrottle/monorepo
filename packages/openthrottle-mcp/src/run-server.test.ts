import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn(async () => undefined);
const registerToolMock = vi.fn();

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    connect = connectMock;
    registerTool = registerToolMock;
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('./nest/index.js', () => ({
  McpTransportType: { STDIO: 'STDIO' },
  bootstrapMcpDeveloperApp: vi.fn(async () => undefined),
}));

vi.mock('./nest-tool-handlers.js', () => ({
  registerKnowledgeBaseResource: vi.fn(),
}));

vi.mock('./tool-registry.js', () => ({
  registerDeveloperMcpTools: vi.fn(),
}));

import { runServerLocal } from './run-server.js';

describe('runServerLocal token preflight', () => {
  const originalToken = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    connectMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalToken === undefined) {
      delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    } else {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = originalToken;
    }
  });

  it('boots and warns (does not throw) when the auth token is missing', async () => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;

    await expect(runServerLocal()).resolves.toBeUndefined();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('OPENTHROTTLE_MCP_AUTH_TOKEN is not set'),
    );
  });

  it('boots without warning when the auth token is present', async () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_test_secret';

    await expect(runServerLocal()).resolves.toBeUndefined();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('OPENTHROTTLE_MCP_AUTH_TOKEN is not set'),
    );
  });
});
