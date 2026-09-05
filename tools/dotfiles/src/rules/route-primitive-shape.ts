import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * The route-primitive-shape rule keeps React Router route modules under
 * `app/routes/*.tsx` thin and template-shaped — the routing-layer sibling of
 * `component-primitive-shape`. It implements
 * docs/monorepo/route-primitive-shape.md:
 *
 *   - R1 — only the allowed route exports (the RR framework surface + type-only
 *          declarations). Any other named value export is a helper/config/data
 *          that must move under `~/routing/<area>/{utils,config,data,hooks}`.
 *   - R2 — the default `Component` keeps the six section markers, in order,
 *          each preceded by one blank line (same contract as the component
 *          template's R3).
 *   - R3 — no module-scope value declarations. Non-exported consts/functions at
 *          the route file's top level are helpers/config/data and move under
 *          `~/routing/<area>/{utils,config,data,hooks}`.
 *   - R5 — a first-line `route-shape: opt-out — reason` block-comment pragma
 *          disables every check.
 *
 * R4 (the file-size cap) is enforced separately by ESLint `max-lines` scoped to
 * route files, exactly like the component R6 cap.
 */

/** The six canonical section markers, in order. Shared with the component shape. */
const MARKERS: readonly string[] = [
  'Hooks',
  'Setup',
  'Handlers',
  'Markup',
  'Life Cycle',
  '🔌 Short Circuit',
];

/**
 * The React Router route module export surface. Everything else that is a value
 * (not a type) export is an R1 violation. Keep in sync with the R1 table in
 * docs/monorepo/route-primitive-shape.md.
 */
const ALLOWED_ROUTE_EXPORTS: ReadonlySet<string> = new Set([
  'ErrorBoundary',
  'HydrateFallback',
  'Layout',
  'action',
  'clientAction',
  'clientLoader',
  'clientMiddleware',
  'handle',
  'headers',
  'links',
  'loader',
  'meta',
  'middleware',
  'shouldRevalidate',
]);

const OPT_OUT = /route-shape:\s*opt-out/;

const HOIST_HINT = '~/routing/<area>/{utils,config,data,hooks}';

type MessageIds =
  | 'disallowedExport'
  | 'markerMissingBlankLine'
  | 'markerOutOfOrder'
  | 'missingMarker'
  | 'moduleScopeDeclaration';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/route-primitive-shape.md#${name}`,
);

type RenderFn =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

/** Unwraps `memo(...)` / `React.memo(...)` to the inner render function. */
const unwrapFunction = (node: TSESTree.Node): RenderFn | null => {
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration'
  ) {
    return node;
  }
  if (node.type === 'CallExpression' && node.arguments.length > 0) {
    const first = node.arguments[0];
    if (
      first.type === 'ArrowFunctionExpression' ||
      first.type === 'FunctionExpression'
    ) {
      return first;
    }
  }
  return null;
};

export const routePrimitiveShape = createRule<[], MessageIds>({
  create(context) {
    const sourceCode = context.sourceCode;

    // R5 — a `/* route-shape: opt-out — reason */` block comment on the first
    // line disables every check.
    const firstComment = sourceCode.getAllComments()[0];
    if (
      firstComment &&
      firstComment.type === 'Block' &&
      firstComment.loc.start.line === 1 &&
      OPT_OUT.test(firstComment.value)
    ) {
      return {};
    }

    // R2 — the six markers, in order, each preceded by one blank line. Applied
    // to the default Component's body. Mirrors the component rule's checker.
    const checkMarkers = (renderFn: RenderFn): void => {
      if (renderFn.body.type !== 'BlockStatement') return;
      const body = renderFn.body;

      const markerComments = sourceCode
        .getCommentsInside(body)
        .filter((c) => c.type === 'Line' && MARKERS.includes(c.value.trim()));
      const found = markerComments.map((c) => c.value.trim());

      const openBrace = sourceCode.getFirstToken(body);
      const braceLine = openBrace === null ? 0 : openBrace.loc.end.line;

      const missing = MARKERS.filter((m) => !found.includes(m));
      for (const marker of missing) {
        context.report({
          data: { marker },
          // Auto-scaffold the full marker block only when the body has no
          // markers at all (inserting into a partially-marked body risks the
          // wrong placement) and only once, on the first missing marker.
          fix:
            found.length === 0 && marker === missing[0] && openBrace !== null
              ? (fixer) => {
                  const block = MARKERS.map((m) => `  // ${m}`).join('\n\n');
                  return fixer.insertTextAfter(openBrace, `\n${block}\n`);
                }
              : undefined,
          messageId: 'missingMarker',
          node: body,
        });
      }

      const expectedPresent = MARKERS.filter((m) => found.includes(m));
      if (found.length > 0 && found.join('|') !== expectedPresent.join('|')) {
        context.report({
          data: { order: MARKERS.map((m) => `// ${m}`).join(', ') },
          messageId: 'markerOutOfOrder',
          node: body,
        });
      }

      const lines = sourceCode.lines;
      for (const comment of markerComments) {
        const line = comment.loc.start.line;
        if (line === braceLine + 1) continue;
        const above = line >= 2 ? lines[line - 2] : '';
        if (above.trim() !== '') {
          context.report({
            data: { marker: comment.value.trim() },
            messageId: 'markerMissingBlankLine',
            node: comment,
          });
        }
      }
    };

    return {
      'Program:exit'(program: TSESTree.Program): void {
        // Pass 1 — resolve the default-export component so it is never treated
        // as an R3 module-scope helper. It can be an inline
        // `export default function Component() {}` / arrow, or an identifier
        // (`export default RouteComponent`) declared elsewhere in the module.
        let defaultComponentName: string | null = null;
        let defaultRenderFn: RenderFn | null = null;

        for (const stmt of program.body) {
          if (stmt.type !== 'ExportDefaultDeclaration') continue;
          const decl = stmt.declaration;
          if (decl.type === 'Identifier') {
            defaultComponentName = decl.name;
          } else {
            const fn = unwrapFunction(decl);
            if (fn !== null) defaultRenderFn = fn;
          }
        }

        // Pass 2 — walk the module body.
        for (const stmt of program.body) {
          // Imports and type-only declarations are always allowed.
          if (
            stmt.type === 'ImportDeclaration' ||
            stmt.type === 'TSTypeAliasDeclaration' ||
            stmt.type === 'TSInterfaceDeclaration' ||
            stmt.type === 'ExportDefaultDeclaration' ||
            stmt.type === 'ExportAllDeclaration'
          ) {
            continue;
          }

          if (stmt.type === 'ExportNamedDeclaration') {
            const decl = stmt.declaration;
            // `export { a, b }` re-export blocks and type-only exports are left
            // alone — routes rarely use them and they are not value helpers.
            if (decl === null) continue;
            if (
              decl.type === 'TSTypeAliasDeclaration' ||
              decl.type === 'TSInterfaceDeclaration'
            ) {
              continue;
            }
            if (decl.type === 'FunctionDeclaration' && decl.id !== null) {
              if (!ALLOWED_ROUTE_EXPORTS.has(decl.id.name)) {
                context.report({
                  data: { hint: HOIST_HINT, name: decl.id.name },
                  messageId: 'disallowedExport',
                  node: decl.id,
                });
              }
              continue;
            }
            if (decl.type === 'VariableDeclaration') {
              for (const d of decl.declarations) {
                if (
                  d.id.type === 'Identifier' &&
                  !ALLOWED_ROUTE_EXPORTS.has(d.id.name)
                ) {
                  context.report({
                    data: { hint: HOIST_HINT, name: d.id.name },
                    messageId: 'disallowedExport',
                    node: d.id,
                  });
                }
              }
            }
            continue;
          }

          // Non-exported module-scope FUNCTION — a helper (R3).
          if (stmt.type === 'FunctionDeclaration') {
            if (stmt.id !== null && stmt.id.name === defaultComponentName) {
              continue;
            }
            context.report({
              data: {
                hint: HOIST_HINT,
                name: stmt.id === null ? 'a function' : stmt.id.name,
              },
              messageId: 'moduleScopeDeclaration',
              node: stmt.id ?? stmt,
            });
            continue;
          }

          // Non-exported module-scope VARIABLE(s) — helpers/config/data (R3).
          if (stmt.type === 'VariableDeclaration') {
            for (const d of stmt.declarations) {
              if (d.id.type !== 'Identifier') continue;
              if (d.id.name === defaultComponentName) continue;
              context.report({
                data: { hint: HOIST_HINT, name: d.id.name },
                messageId: 'moduleScopeDeclaration',
                node: d.id,
              });
            }
          }
        }

        // R2 — markers on the default Component's body (when there is one; a
        // resource route with no default export has nothing to check here).
        if (defaultRenderFn !== null) {
          checkMarkers(defaultRenderFn);
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Enforce the OpenThrottle route primitive shape (only the RR framework exports; hoist module-scope helpers/config/data into app/routing/<area>).',
    },
    fixable: 'code',
    messages: {
      disallowedExport:
        '`{{name}}` is not a React Router route export. Move it under {{hint}} and import it back (R1).',
      markerMissingBlankLine:
        'The `// {{marker}}` marker must be preceded by exactly one blank line (R2).',
      markerOutOfOrder:
        'Section markers must appear in the canonical order: {{order}} (R2).',
      missingMarker:
        'The default Component is missing the `// {{marker}}` section marker (R2). Keep every marker even when its section is empty.',
      moduleScopeDeclaration:
        '`{{name}}` is a module-scope declaration in a route file. Move it under {{hint}} and import it back (R3).',
    },
    schema: [],
    type: 'problem',
  },
  name: 'route-primitive-shape',
});
