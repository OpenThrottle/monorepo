import { describe, expect, it } from 'vitest';
import { buildPayloads, renderInstructions } from '../print-mcp-install.ts';

const ROOT = '/tmp/checkout';
const LAUNCHER = `${ROOT}/scripts/run-openthrottle-mcp.sh`;

describe('buildPayloads', () => {
  it('injects the resolved root into the launcher path for both clients', () => {
    const { launcher, claudeConfig, cursorConfig } = buildPayloads(ROOT);
    expect(launcher).toBe(LAUNCHER);
    expect(claudeConfig.args).toEqual([LAUNCHER]);
    expect(cursorConfig.mcpServers['openthrottle-mcp'].args).toEqual([
      LAUNCHER,
    ]);
  });

  it('emits a valid claude add-json command whose embedded JSON round-trips', () => {
    const { claudeCommand, claudeConfig } = buildPayloads(ROOT);
    expect(claudeCommand).toMatch(
      /^claude mcp add-json openthrottle-mcp --scope user '.*'$/,
    );
    const embedded = claudeCommand.replace(
      /^claude mcp add-json openthrottle-mcp --scope user '(.*)'$/,
      '$1',
    );
    expect(JSON.parse(embedded)).toEqual(claudeConfig);
  });

  it('keeps the two clients at env-key parity', () => {
    const { claudeConfig, cursorConfig } = buildPayloads(ROOT);
    const cursorEnv = cursorConfig.mcpServers['openthrottle-mcp'].env;
    expect(Object.keys(claudeConfig.env).sort()).toEqual(
      Object.keys(cursorEnv).sort(),
    );
  });

  it('preserves each client’s distinct placeholder values verbatim', () => {
    const { claudeConfig, cursorConfig } = buildPayloads(ROOT);
    const cursorEnv = cursorConfig.mcpServers['openthrottle-mcp'].env;

    // Shared placeholders.
    expect(claudeConfig.env.ANTHROPIC_API_KEY).toBe('${ANTHROPIC_API_KEY}');
    expect(cursorEnv.ANTHROPIC_API_KEY).toBe('${ANTHROPIC_API_KEY}');

    // Intentionally divergent API_URL placeholders.
    expect(claudeConfig.env.API_URL).toBe(
      '${OPENTHROTTLE_DEVELOPER_API_URL_EXTERNAL}',
    );
    expect(claudeConfig.env.API_URL_INTERNAL).toBe(
      '${OPENTHROTTLE_DEVELOPER_API_URL_INTERNAL}',
    );
    expect(cursorEnv.API_URL).toBe('${API_URL}');
    expect(cursorEnv.API_URL_INTERNAL).toBe('${API_URL_INTERNAL}');
  });

  it('every placeholder value is a literal ${...} token', () => {
    const { claudeConfig, cursorConfig } = buildPayloads(ROOT);
    const values = [
      ...Object.values(claudeConfig.env),
      ...Object.values(cursorConfig.mcpServers['openthrottle-mcp'].env),
    ];
    for (const value of values) {
      expect(value).toMatch(/^\$\{[A-Z_]+\}$/);
    }
  });
});

describe('renderInstructions', () => {
  it('names both clients and embeds the resolved launcher path', () => {
    const output = renderInstructions(ROOT);
    expect(output).toContain('Claude Code');
    expect(output).toContain('Cursor');
    expect(output).toContain(LAUNCHER);
  });

  it('contains a parseable Cursor mcp.json block', () => {
    const output = renderInstructions(ROOT);
    // The Cursor block is the pretty-printed object; pull it out and parse it.
    const start = output.indexOf('{\n  "mcpServers"');
    expect(start).toBeGreaterThan(-1);
    const block = output.slice(start);
    const end = block.indexOf('\n}') + 2;
    const parsed: unknown = JSON.parse(block.slice(0, end));
    expect(parsed).toMatchObject({
      mcpServers: { 'openthrottle-mcp': { env: { API_URL: '${API_URL}' } } },
    });
  });
});
