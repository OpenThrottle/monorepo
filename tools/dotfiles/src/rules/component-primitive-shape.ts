import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * The six canonical section markers, in order. Kept in sync with the generator
 * template and docs/monorepo/component-primitive-shape.md (R3). A line comment
 * `// Hooks` parses to a comment whose trimmed value is `Hooks`.
 */
const MARKERS: readonly string[] = [
  'Hooks',
  'Setup',
  'Handlers',
  'Markup',
  'Life Cycle',
  '🔌 Short Circuit',
];

const OPT_OUT = /component-shape:\s*opt-out/;

type MessageIds =
  | 'markerMissingBlankLine'
  | 'markerOutOfOrder'
  | 'missingComponentExport'
  | 'missingMarker'
  | 'missingPropsInterface'
  | 'missingReturnType'
  | 'returnTypeNotReactElement';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/component-primitive-shape.md#${name}`,
);

/**
 * Derives the expected component/hook name from the file path: the basename
 * without extension, or the parent directory when the file is an `index`.
 */
const expectedName = (filename: string): string => {
  const parts = filename.split('/');
  const base = parts[parts.length - 1].replace(/\.tsx?$/, '');
  if (base === 'index' && parts.length >= 2) return parts[parts.length - 2];
  return base;
};

/** Unwraps `memo(...)` / `forwardRef(...)` / `React.memo(...)` to the inner function. */
const unwrapComponent = (
  node: TSESTree.Expression,
): TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | null => {
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
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

export const componentPrimitiveShape = createRule<[], MessageIds>({
  create(context) {
    const sourceCode = context.sourceCode;

    // Opt-out: a `/* component-shape: opt-out — reason */` block comment on the
    // first line disables every check (R: last-resort escape hatch).
    const firstComment = sourceCode.getAllComments()[0];
    if (
      firstComment &&
      firstComment.type === 'Block' &&
      firstComment.loc.start.line === 1 &&
      OPT_OUT.test(firstComment.value)
    ) {
      return {};
    }

    const name = expectedName(context.filename);

    return {
      'Program:exit'(program: TSESTree.Program): void {
        const exportedInterfaces = new Set<string>();
        let componentExport: TSESTree.ExportNamedDeclaration | null = null;
        let componentFn:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | null = null;

        for (const stmt of program.body) {
          if (
            stmt.type !== 'ExportNamedDeclaration' ||
            stmt.declaration === null
          ) {
            continue;
          }
          const decl = stmt.declaration;
          if (decl.type === 'TSInterfaceDeclaration') {
            exportedInterfaces.add(decl.id.name);
          }
          if (decl.type === 'VariableDeclaration') {
            for (const d of decl.declarations) {
              if (
                d.id.type === 'Identifier' &&
                d.id.name === name &&
                d.init !== null
              ) {
                componentExport = stmt;
                componentFn = unwrapComponent(d.init);
              }
            }
          }
        }

        // R1 — exported component matching the file name.
        if (componentExport === null) {
          context.report({
            data: { name },
            messageId: 'missingComponentExport',
            node: program,
          });
        }

        // R1 — exported `<Name>Props` interface (fixable: scaffold an empty one).
        if (!exportedInterfaces.has(`${name}Props`)) {
          context.report({
            data: { name },
            fix:
              componentExport === null
                ? undefined
                : (fixer) =>
                    fixer.insertTextBefore(
                      componentExport,
                      `export interface ${name}Props {}\n\n`,
                    ),
            messageId: 'missingPropsInterface',
            node: componentExport ?? program,
          });
        }

        if (componentFn === null) return;

        // R2 — explicit React.ReactElement return type.
        if (componentFn.returnType === undefined) {
          context.report({
            data: { name },
            messageId: 'missingReturnType',
            node: componentFn,
          });
        } else if (
          !sourceCode
            .getText(componentFn.returnType.typeAnnotation)
            .includes('ReactElement')
        ) {
          context.report({
            data: { name },
            messageId: 'returnTypeNotReactElement',
            node: componentFn.returnType,
          });
        }

        // R3 — the six markers, in order, each preceded by one blank line.
        if (componentFn.body.type !== 'BlockStatement') return;
        const body = componentFn.body;

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
            // Only auto-scaffold when the body has no markers at all — inserting
            // into a partially-marked body risks the wrong placement — and only
            // once (on the first missing marker) so the fixes don't overlap.
            fix:
              found.length === 0 && marker === missing[0] && openBrace !== null
                ? (fixer) => {
                    const markerBlock = MARKERS.map((m) => `  // ${m}`).join(
                      '\n\n',
                    );
                    return fixer.insertTextAfter(
                      openBrace,
                      `\n${markerBlock}\n`,
                    );
                  }
                : undefined,

            messageId: 'missingMarker',

            node: body,
          });
        }

        // Order: the markers that ARE present must appear in canonical order.
        const expectedPresent = MARKERS.filter((m) => found.includes(m));
        if (found.length > 0 && found.join('|') !== expectedPresent.join('|')) {
          context.report({
            data: { order: MARKERS.map((m) => `// ${m}`).join(', ') },
            messageId: 'markerOutOfOrder',
            node: body,
          });
        }

        // Whitespace: one blank line before each present marker — except a
        // marker that is the first line of the body (directly after `{`).
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
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Enforce the OpenThrottle component primitive shape (exported Foo + FooProps and the ordered section markers).',
    },
    fixable: 'code',
    messages: {
      markerMissingBlankLine:
        'The `// {{marker}}` marker must be preceded by exactly one blank line (R3).',
      markerOutOfOrder:
        'Section markers must appear in the canonical order: {{order}} (R3).',
      missingComponentExport:
        'Expected an exported `{{name}}` component matching the file name (R1).',
      missingMarker:
        'Missing the `// {{marker}}` section marker (R3). Keep every marker even when its section is empty.',
      missingPropsInterface:
        'Export an interface named `{{name}}Props` (an empty interface is required) (R1).',
      missingReturnType:
        'Give `{{name}}` an explicit `React.ReactElement` return type (R2).',
      returnTypeNotReactElement:
        '`{{name}}` should return `React.ReactElement` (or `React.ReactElement | null`) (R2).',
    },
    schema: [],
    type: 'problem',
  },
  name: 'component-primitive-shape',
});
