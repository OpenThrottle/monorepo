import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { mcpToolRegistration } from '../rules/mcp-tool-registration.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const ELSEWHERE = '/repo/packages/nestjs-other/src/extra-tools.ts';

ruleTester.run('mcp-tool-registration', mcpToolRegistration, {
  invalid: [
    {
      code: "server.registerTool('rogue', { description: 'x' }, handler);",
      errors: [{ messageId: 'registerTool' }],
      filename: ELSEWHERE,
    },
    {
      code: "server.tool('rogue', schema, handler);",
      errors: [{ messageId: 'registerTool' }],
      filename: ELSEWHERE,
    },
    {
      code: [
        "import { Tool as McpTool } from '@rekog/mcp-nest';",
        'class Surface {',
        "  @McpTool({ name: 'rogue' })",
        '  rogue() {}',
        '}',
      ].join('\n'),
      errors: [{ messageId: 'decorator' }],
      filename: ELSEWHERE,
    },
    {
      // An explicit allow-list replaces the default one.
      code: "server.registerTool('x', {}, handler);",
      errors: [{ messageId: 'registerTool' }],
      filename: '/repo/packages/openthrottle-mcp/src/tool-registry.ts',
      options: [{ allowedFiles: ['somewhere-else.ts'] }],
    },
  ],
  valid: [
    {
      code: "server.registerTool('ok', { description: 'x' }, handler);",
      filename: '/repo/packages/openthrottle-mcp/src/tool-registry.ts',
    },
    {
      code: [
        "import { Tool } from '@rekog/mcp-nest';",
        'class Surface {',
        "  @Tool({ name: 'ok' })",
        '  ok() {}',
        '}',
      ].join('\n'),
      filename:
        '/repo/packages/openthrottle-mcp/src/nest/openthrottle-mcp-mcp-surface.ts',
    },
    {
      // A `@Tool` that is not the mcp-nest decorator.
      code: [
        "import { Tool } from './my-decorators';",
        'class Surface {',
        '  @Tool()',
        '  ok() {}',
        '}',
      ].join('\n'),
      filename: ELSEWHERE,
    },
    {
      // Unrelated `.tool()` methods take no tool-name string.
      code: 'toolbox.tool(handler);',
      filename: ELSEWHERE,
    },
    {
      code: 'registerDeveloperMcpTools(server);',
      filename: ELSEWHERE,
    },
  ],
});
