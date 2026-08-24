import { describe, expect, test } from 'vitest';

import { scanText } from '../../scan/scan-text';
import {
  CONNECT_OT_MCP_COMMANDS,
  CONNECT_OT_MCP_SURFACES,
} from '../connect-ot-mcp';

/**
 * Video 05 is the season's worst case for the `home-path` rule: its subject matter
 * is literally file paths and machine configuration, and the one thing it asks the
 * viewer to copy is an absolute launcher path.
 *
 * `scan/leak-scan.ts` only runs AFTER a recording, against the page-text dumps. That
 * is too late to be the only guard here — a surface that leaks a path leaks it in
 * every take, and the fix is a code change, not a re-record. So the surfaces are
 * scanned at build time too, from the same rules engine the publish gate uses.
 *
 * The HTML is scanned rather than the rendered text, deliberately: the HTML also
 * contains everything currently hidden behind `data-demo-hidden`, so a path that only
 * appears three beats in is caught here as well.
 */
describe('05-connect-ot-mcp surfaces', () => {
  const surfaces = Object.entries(CONNECT_OT_MCP_SURFACES);

  test('every surface is scanned', () => {
    expect(surfaces.map(([name]) => name)).toStrictEqual(['agent', 'terminal']);
  });

  test.each(surfaces)('%s carries no leak-scan error', (name, html) => {
    const errors = scanText(name, html, 'frame').filter(
      (finding) => finding.severity === 'error',
    );

    expect(errors).toStrictEqual([]);
  });

  test.each(surfaces)('%s shows no home directory at all', (name, html) => {
    expect(name).not.toBe('');
    // Belt and braces over the rule: the rule is what the gate enforces, this is what
    // the frame must never contain, and the two should not be able to drift apart.
    expect(html).not.toMatch(/\/(?:Users|home)\//i);
  });

  test('the terminal renders the fictional root, not this machine', () => {
    expect(CONNECT_OT_MCP_SURFACES.terminal).toContain(
      '/workspace/openthrottle/scripts/run-openthrottle-mcp.sh',
    );
  });

  test('the printed block is the fresh-install rendering, not the skip message', () => {
    // The machine recording this has OT MCP installed, so the default detection would
    // print "already installed, nothing to do" and the short would have no subject.
    // That the capture still matches the renderer is asserted at the root, in
    // scripts/__tests__/setup_mcp-instructions.test.ts.
    expect(CONNECT_OT_MCP_SURFACES.terminal).toContain('claude mcp add-json');
    expect(CONNECT_OT_MCP_SURFACES.terminal).not.toContain('already installed');
  });

  test('the register confirmation names the same launcher the block does', () => {
    expect(CONNECT_OT_MCP_SURFACES.terminal).toContain(
      'Added stdio MCP server openthrottle-mcp with command: bash /workspace/openthrottle/scripts/run-openthrottle-mcp.sh',
    );
  });

  test('env placeholders stay literal so the viewer copies them verbatim', () => {
    for (const key of [
      'ANTHROPIC_API_KEY',
      'API_URL',
      'API_URL_INTERNAL',
      'OPENTHROTTLE_MCP_AUTH_TOKEN',
    ]) {
      expect(CONNECT_OT_MCP_SURFACES.terminal).toContain(`${'${'}${key}}`);
    }
  });

  test('the command the flow types is the command the frame shows', () => {
    // "Copy it" at 0:09 and "run it" at 0:15 are the same string, or the short lies.
    // Compared on the un-escaped prefix: the printed block is HTML-escaped in the
    // surface (the embedded JSON is full of double quotes), so a whole-string
    // toContain would be testing escapeHtml rather than the agreement that matters.
    const prefix = 'claude mcp add-json openthrottle-mcp --scope user';

    expect(CONNECT_OT_MCP_COMMANDS.registerCommand.startsWith(prefix)).toBe(
      true,
    );
    expect(CONNECT_OT_MCP_SURFACES.terminal).toContain(prefix);
  });

  test('the agent reply names the plan the browser then cuts to', () => {
    expect(CONNECT_OT_MCP_SURFACES.agent).toContain(
      'Add request tracing to the gateway',
    );
    expect(CONNECT_OT_MCP_SURFACES.agent).toContain(
      'd0d0d0d0-0000-4000-8000-000000000011',
    );
  });
});
