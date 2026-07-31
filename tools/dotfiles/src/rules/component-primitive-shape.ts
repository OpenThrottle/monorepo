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

/**
 * `authored` = the base standard (docs/monorepo/component-primitive-shape.md):
 * one exported component matching the file name + its `*Props` + the markers.
 * `primitive` = the shadcn variant (docs/monorepo/component-shape-shadcn-variant.md):
 * a file/folder may multi-export a primitive family (VR5); every exported
 * PascalCase part carries its own `*Props` (VR1), the six markers (R3), an
 * explicit return type (VR2), and — when wrapped in `forwardRef` — a
 * `displayName` (VR2). The raw shadcn trailing `export { … }` block is banned.
 */
type Profile = 'authored' | 'primitive';

type MessageIds =
  | 'markerMissingBlankLine'
  | 'markerOutOfOrder'
  | 'missingComponentExport'
  | 'missingDisplayName'
  | 'missingMarker'
  | 'missingPropsInterface'
  | 'missingReturnType'
  | 'namedReExportBlock'
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

/** True when `node` is a `forwardRef(...)` / `React.forwardRef(...)` call. */
const isForwardRefCall = (node: TSESTree.Expression): boolean => {
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee.type === 'Identifier') return callee.name === 'forwardRef';
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name === 'forwardRef';
  }
  return false;
};

const isPascalCase = (name: string): boolean => /^[A-Z]/.test(name);

/** An exported component part discovered in the module body. */
interface ComponentPart {
  readonly exportNode: TSESTree.ExportNamedDeclaration;
  readonly fn:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | null;
  readonly isForwardRef: boolean;
  readonly name: string;
}

export const componentPrimitiveShape = createRule<
  [{ profile?: Profile }?],
  MessageIds
>({
  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const profile: Profile = options?.profile ?? 'authored';

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

    // R2 (VR2) — explicit `React.ReactElement` return type on a render function.
    const checkReturnType = (
      componentFn:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression,
      partName: string,
    ): void => {
      if (componentFn.returnType === undefined) {
        context.report({
          data: { name: partName },
          messageId: 'missingReturnType',
          node: componentFn,
        });
      } else if (
        !sourceCode
          .getText(componentFn.returnType.typeAnnotation)
          .includes('ReactElement')
      ) {
        context.report({
          data: { name: partName },
          messageId: 'returnTypeNotReactElement',
          node: componentFn.returnType,
        });
      }
    };

    // R3 — the six markers, in order, each preceded by one blank line. Applied
    // to a single render-function body; shared by both profiles (per part in
    // the primitive profile). Auto-scaffolding the full marker block is only
    // offered when `allowScaffold` (the authored profile's single component) —
    // inserting into one part of a multi-export family risks the wrong body.
    const checkMarkers = (
      componentFn:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression,
      allowScaffold: boolean,
    ): void => {
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
            allowScaffold &&
            found.length === 0 &&
            marker === missing[0] &&
            openBrace !== null
              ? (fixer) => {
                  const markerBlock = MARKERS.map((m) => `  // ${m}`).join(
                    '\n\n',
                  );
                  return fixer.insertTextAfter(openBrace, `\n${markerBlock}\n`);
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
    };

    // Collects every module-scope `export const <PascalCase> = <fn-ish>` — the
    // exported primitive parts. cva variant objects (camelCase, e.g.
    // `buttonVariants`) are excluded by the PascalCase filter; string-first
    // `cva(...)` calls are excluded by `unwrapComponent` returning null.
    const collectParts = (program: TSESTree.Program): ComponentPart[] => {
      const parts: ComponentPart[] = [];
      for (const stmt of program.body) {
        if (
          stmt.type !== 'ExportNamedDeclaration' ||
          stmt.declaration === null ||
          stmt.declaration.type !== 'VariableDeclaration'
        ) {
          continue;
        }
        for (const d of stmt.declaration.declarations) {
          if (
            d.id.type !== 'Identifier' ||
            d.init === null ||
            !isPascalCase(d.id.name)
          ) {
            continue;
          }
          const fn = unwrapComponent(d.init);
          if (fn === null) continue;
          parts.push({
            exportNode: stmt,
            fn,
            isForwardRef: isForwardRefCall(d.init),
            name: d.id.name,
          });
        }
      }
      return parts;
    };

    const collectExportedInterfaces = (
      program: TSESTree.Program,
    ): Set<string> => {
      const exportedInterfaces = new Set<string>();
      for (const stmt of program.body) {
        if (
          stmt.type === 'ExportNamedDeclaration' &&
          stmt.declaration?.type === 'TSInterfaceDeclaration'
        ) {
          exportedInterfaces.add(stmt.declaration.id.name);
        }
      }
      return exportedInterfaces;
    };

    /** Names with a `<Name>.displayName = …` assignment at module scope. */
    const collectDisplayNames = (program: TSESTree.Program): Set<string> => {
      const names = new Set<string>();
      for (const stmt of program.body) {
        if (
          stmt.type === 'ExpressionStatement' &&
          stmt.expression.type === 'AssignmentExpression' &&
          stmt.expression.left.type === 'MemberExpression' &&
          stmt.expression.left.object.type === 'Identifier' &&
          stmt.expression.left.property.type === 'Identifier' &&
          stmt.expression.left.property.name === 'displayName'
        ) {
          names.add(stmt.expression.left.object.name);
        }
      }
      return names;
    };

    const reportMissingProps = (
      partName: string,
      exportNode: TSESTree.ExportNamedDeclaration,
    ): void => {
      context.report({
        data: { name: partName },
        fix: (fixer) =>
          fixer.insertTextBefore(
            exportNode,
            `export interface ${partName}Props {}\n\n`,
          ),
        messageId: 'missingPropsInterface',
        node: exportNode,
      });
    };

    return {
      'Program:exit'(program: TSESTree.Program): void {
        const exportedInterfaces = collectExportedInterfaces(program);

        // ---- Primitive profile (shadcn variant) ----------------------------
        if (profile === 'primitive') {
          // VR5 — the raw shadcn trailing `export { Card, CardHeader, … }`
          // re-export block is banned; export each symbol at its declaration.
          for (const stmt of program.body) {
            if (
              stmt.type === 'ExportNamedDeclaration' &&
              stmt.declaration === null &&
              stmt.source === null &&
              stmt.specifiers.length > 0
            ) {
              context.report({
                messageId: 'namedReExportBlock',
                node: stmt,
              });
            }
          }

          const displayNames = collectDisplayNames(program);
          for (const part of collectParts(program)) {
            // VR1 — each part pairs with an exported `<Part>Props`.
            if (!exportedInterfaces.has(`${part.name}Props`)) {
              reportMissingProps(part.name, part.exportNode);
            }
            // VR2 — forwardRef parts must set `displayName`.
            if (part.isForwardRef && !displayNames.has(part.name)) {
              context.report({
                data: { name: part.name },
                messageId: 'missingDisplayName',
                node: part.exportNode,
              });
            }
            if (part.fn === null) continue;
            checkReturnType(part.fn, part.name);
            checkMarkers(part.fn, false);
          }
          return;
        }

        // ---- Authored profile (base standard) ------------------------------
        let componentExport: TSESTree.ExportNamedDeclaration | null = null;
        let componentFn:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | null = null;

        for (const stmt of program.body) {
          if (
            stmt.type !== 'ExportNamedDeclaration' ||
            stmt.declaration === null ||
            stmt.declaration.type !== 'VariableDeclaration'
          ) {
            continue;
          }
          for (const d of stmt.declaration.declarations) {
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

        checkReturnType(componentFn, name);
        checkMarkers(componentFn, true);
      },
    };
  },
  defaultOptions: [{ profile: 'authored' }],
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
      missingDisplayName:
        '`{{name}}` is wrapped in `forwardRef` — set `{{name}}.displayName` (VR2).',
      missingMarker:
        'Missing the `// {{marker}}` section marker (R3). Keep every marker even when its section is empty.',
      missingPropsInterface:
        'Export an interface named `{{name}}Props` (an empty interface is required) (R1/VR1).',
      missingReturnType:
        'Give `{{name}}` an explicit `React.ReactElement` return type (R2/VR2).',
      namedReExportBlock:
        'Export each primitive at its declaration; the trailing `export { … }` re-export block is banned (VR5).',
      returnTypeNotReactElement:
        '`{{name}}` should return `React.ReactElement` (or `React.ReactElement | null`) (R2/VR2).',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          profile: { enum: ['authored', 'primitive'], type: 'string' },
        },
        type: 'object',
      },
    ],
    type: 'problem',
  },
  name: 'component-primitive-shape',
});
