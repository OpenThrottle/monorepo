import { createAntiFlakeRule } from './anti-flake-shared.ts';

/**
 * The no-screen rule: query through the render result (`component`), not the
 * global `screen` (docs/monorepo/code-style.md, "Testing"). `screen` is bound
 * to `document.body` for the whole file, so a query cannot say which render
 * it means; `const component = render(...)` ties each query to the render
 * that produced it. The render result's queries are bound to `baseElement`
 * (`document.body` by default), so portaled content is still reachable.
 *
 * Reported once per file, on the import, so the burn-down count is files.
 * The rare test with no render result to query — content rendered by code
 * the test does not call `render` for — takes an inline disable with the
 * reason.
 */

type MessageIds = 'screen';

const SCREEN_SOURCES: ReadonlySet<string> = new Set([
  '@testing-library/dom',
  '@testing-library/react',
]);

export const noScreen = createAntiFlakeRule<[], MessageIds>({
  create(context) {
    return {
      ImportDeclaration(node): void {
        if (!SCREEN_SOURCES.has(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'screen'
          ) {
            context.report({ messageId: 'screen', node: specifier });
          }
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: 'Disallow screen in tests; query the render result.',
    },
    messages: {
      screen: `Query the render result, not \`screen\`: \`const component = render(...)\`, then \`component.getByRole(...)\`. Its queries are bound to \`document.body\`, so portaled content is still reachable. A test with no render result to query may keep \`screen\` behind an inline disable with the reason.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'no-screen',
});
