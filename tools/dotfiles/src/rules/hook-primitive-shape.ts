import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import {
  collectMarkerViolations,
  expectedName,
} from './primitive-shape-shared.ts';

const OPT_OUT = /hook-shape:\s*opt-out/;

const HOOK_NAME = /^use[A-Z]/;

type MessageIds =
  | 'exportedFunction'
  | 'exportedType'
  | 'exportedValue'
  | 'extraHook'
  | 'markerMissingBlankLine'
  | 'markerOutOfOrder'
  | 'misnamedHook'
  | 'missingHook'
  | 'missingMarker'
  | 'missingReturnType'
  | 'moduleScopeValue'
  | 'nonExportedHook'
  | 'reExport';

type HookFunction =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

/** The only type names a hook file may export, derived from the hook name. */
interface AllowedNames {
  readonly options: string;
  readonly result: string;
}

/** An exported `use*` binding discovered in the module body. */
interface ExportedHook {
  readonly fn: HookFunction | null;
  readonly name: string;
  readonly node: TSESTree.Node;
}

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/hook-primitive-shape.md#${name}`,
);

const isHookName = (name: string): boolean => HOOK_NAME.test(name);

/** `useFoo` → `UseFoo`. */
const toPascalCase = (name: string): string =>
  `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;

const isFunctionInit = (
  node: TSESTree.Expression | null,
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression =>
  node !== null &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression');

/** Type-only declarations carry no runtime value, so module scope may hold them. */
const isTypeOnlyStatement = (stmt: TSESTree.ProgramStatement): boolean => {
  switch (stmt.type) {
    case 'ClassDeclaration':
    case 'FunctionDeclaration':
    case 'TSEnumDeclaration':
    case 'TSModuleDeclaration':
    case 'VariableDeclaration':
      return stmt.declare;
    case 'TSDeclareFunction':
    case 'TSInterfaceDeclaration':
    case 'TSTypeAliasDeclaration':
      return true;
    default:
      return false;
  }
};

export const hookPrimitiveShape = createRule<[], MessageIds>({
  create(context) {
    const sourceCode = context.sourceCode;

    // Opt-out: a `/* hook-shape: opt-out — reason */` block comment on the
    // first line disables every check (last-resort escape hatch).
    const firstComment = sourceCode.getAllComments()[0];
    if (
      firstComment &&
      firstComment.type === 'Block' &&
      firstComment.loc.start.line === 1 &&
      OPT_OUT.test(firstComment.value)
    ) {
      return {};
    }

    // H1 compares against the camelCased file name: a kebab-case file is the
    // audit's H6 finding, not a second report here.
    const name = expectedName(context.filename, { camelCase: true });

    /** Reports a module-scope statement that is neither an import, a type nor the hook (H3). */
    const reportModuleScope = (
      node: TSESTree.Node,
      kind: string,
      where: string,
    ): void => {
      context.report({
        data: { kind, where },
        messageId: 'moduleScopeValue',
        node,
      });
    };

    /** Reports an exported non-hook declaration (H2, which also covers H3 for it). */
    const reportExportedDeclaration = (
      stmt: TSESTree.ExportNamedDeclaration,
      declaration: TSESTree.ExportDeclaration,
      names: AllowedNames,
    ): void => {
      switch (declaration.type) {
        case 'TSInterfaceDeclaration':
        case 'TSTypeAliasDeclaration':
          context.report({
            data: {
              name: declaration.id.name,
              options: names.options,
              result: names.result,
            },
            messageId: 'exportedType',
            node: stmt,
          });
          return;
        case 'FunctionDeclaration':
        case 'TSDeclareFunction':
          context.report({
            data: { name: declaration.id?.name ?? 'default' },
            messageId: 'exportedFunction',
            node: stmt,
          });
          return;
        default:
          context.report({
            data: {
              name:
                'id' in declaration && declaration.id?.type === 'Identifier'
                  ? declaration.id.name
                  : 'this value',
            },
            messageId: 'exportedValue',
            node: stmt,
          });
      }
    };

    return {
      'Program:exit'(program: TSESTree.Program): void {
        const hooks: ExportedHook[] = [];
        const exportedNonHookStatements: {
          readonly declaration: TSESTree.ExportDeclaration;
          readonly stmt: TSESTree.ExportNamedDeclaration;
        }[] = [];

        // ---- Pass 1: classify the module body (H1 / H2 / H3) ---------------
        for (const stmt of program.body) {
          switch (stmt.type) {
            case 'ImportDeclaration':
            case 'TSImportEqualsDeclaration':
              break;

            case 'ExportAllDeclaration':
              context.report({ messageId: 'reExport', node: stmt });
              break;

            case 'ExportDefaultDeclaration':
              context.report({
                data: { name: 'the default export' },
                messageId: 'exportedValue',
                node: stmt,
              });
              break;

            case 'ExportNamedDeclaration': {
              const declaration = stmt.declaration;
              if (declaration === null) {
                context.report({ messageId: 'reExport', node: stmt });
                break;
              }
              if (declaration.type === 'TSDeclareFunction') {
                // Overload signature of the implementation that follows.
                if (!isHookName(declaration.id?.name ?? '')) {
                  exportedNonHookStatements.push({ declaration, stmt });
                }
                break;
              }
              if (declaration.type === 'FunctionDeclaration') {
                const fnName = declaration.id?.name ?? '';
                if (isHookName(fnName)) {
                  hooks.push({ fn: declaration, name: fnName, node: stmt });
                  break;
                }
              }
              if (declaration.type === 'VariableDeclaration') {
                for (const d of declaration.declarations) {
                  if (d.id.type === 'Identifier' && isHookName(d.id.name)) {
                    hooks.push({
                      fn: isFunctionInit(d.init) ? d.init : null,
                      name: d.id.name,
                      node: d,
                    });
                  } else {
                    context.report({
                      data: {
                        name:
                          d.id.type === 'Identifier' ? d.id.name : 'this value',
                      },
                      messageId: 'exportedValue',
                      node: d,
                    });
                  }
                }
                break;
              }
              exportedNonHookStatements.push({ declaration, stmt });
              break;
            }

            case 'FunctionDeclaration': {
              const fnName = stmt.id?.name ?? '';
              if (isTypeOnlyStatement(stmt)) break;
              if (isHookName(fnName)) {
                context.report({
                  data: { name: fnName },
                  messageId: 'nonExportedHook',
                  node: stmt,
                });
              } else {
                reportModuleScope(stmt, 'function', '`utils/`');
              }
              break;
            }

            case 'VariableDeclaration': {
              if (isTypeOnlyStatement(stmt)) break;
              let reportedValue = false;
              for (const d of stmt.declarations) {
                if (d.id.type === 'Identifier' && isHookName(d.id.name)) {
                  context.report({
                    data: { name: d.id.name },
                    messageId: 'nonExportedHook',
                    node: d,
                  });
                } else if (!reportedValue) {
                  reportedValue = true;
                  reportModuleScope(
                    stmt,
                    stmt.kind === 'const' ? 'constant' : `\`${stmt.kind}\``,
                    '`data/` or `config/`',
                  );
                }
              }
              break;
            }

            case 'ClassDeclaration':
              if (!isTypeOnlyStatement(stmt)) {
                reportModuleScope(stmt, 'class', '`utils/`');
              }
              break;

            case 'ExpressionStatement':
              // `'use client'` and friends parse as directives.
              if (stmt.directive === undefined) {
                reportModuleScope(stmt, 'statement', '`utils/`');
              }
              break;

            default:
              if (!isTypeOnlyStatement(stmt)) {
                reportModuleScope(stmt, 'declaration', '`data/` or `config/`');
              }
          }
        }

        // ---- H1: exactly one exported hook, named after the file -----------
        const primary =
          hooks.find((hook) => hook.name === name) ?? hooks[0] ?? null;
        if (primary === null) {
          context.report({
            data: { name },
            messageId: 'missingHook',
            node: program,
          });
        } else if (primary.name !== name) {
          context.report({
            data: { actual: primary.name, name },
            messageId: 'misnamedHook',
            node: primary.node,
          });
        }
        for (const hook of hooks) {
          if (hook === primary) continue;
          context.report({
            data: { name: hook.name },
            messageId: 'extraHook',
            node: hook.node,
          });
        }

        // ---- H2: every other export, with where it belongs -----------------
        // The Options/Result names follow the hook's own name; when the hook is
        // misnamed, the name its file expects is accepted too, so renaming the
        // hook does not cascade into a second report.
        const pascalNames = new Set([toPascalCase(name)]);
        if (primary !== null) pascalNames.add(toPascalCase(primary.name));
        const optionsNames = new Set(
          [...pascalNames].map((pascal) => `${pascal}Options`),
        );
        const resultNames = new Set(
          [...pascalNames].map((pascal) => `${pascal}Result`),
        );
        const pascalHook = toPascalCase(primary?.name ?? name);
        const names: AllowedNames = {
          options: `${pascalHook}Options`,
          result: `${pascalHook}Result`,
        };

        for (const { declaration, stmt } of exportedNonHookStatements) {
          // `Options` is an interface; `Result` may also be a type alias.
          const isAllowedType =
            (declaration.type === 'TSInterfaceDeclaration' &&
              (optionsNames.has(declaration.id.name) ||
                resultNames.has(declaration.id.name))) ||
            (declaration.type === 'TSTypeAliasDeclaration' &&
              resultNames.has(declaration.id.name));
          if (isAllowedType) continue;
          reportExportedDeclaration(stmt, declaration, names);
        }

        // ---- H5 / H4: return type and markers of the exported hook ---------
        const fn = primary?.fn ?? null;
        if (primary === null || fn === null) return;

        if (fn.returnType === undefined) {
          context.report({
            data: { name: primary.name },
            messageId: 'missingReturnType',
            node: fn,
          });
        }

        if (fn.body.type === 'BlockStatement') {
          for (const descriptor of collectMarkerViolations(
            sourceCode,
            fn.body,
            true,
          )) {
            context.report(descriptor);
          }
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Enforce the OpenThrottle hook primitive shape (one exported hook named after the file, only its Options/Result exports, no module-scope values, the ordered section markers, an explicit return type).',
    },
    fixable: 'code',
    messages: {
      exportedFunction:
        'Do not export `{{name}}` from a hook file — a pure function belongs in the sibling `utils/` (H2/H3).',
      exportedType:
        'Do not export `{{name}}` from a hook file — only `{{options}}` (an interface) and `{{result}}` (an interface or type alias) may be exported. Move any other type or interface to the sibling `types.ts` (H2).',
      exportedValue:
        'Do not export `{{name}}` from a hook file — static data or a lookup table belongs in the sibling `data/`, a tunable (timeout, threshold, page size) in `config/` (H2/H3).',
      extraHook:
        'A hook file holds one hook: move `{{name}}` to its own file in `hooks/` (H1). A helper hook that is not public is still a hook — just leave it out of `index.ts`.',
      markerMissingBlankLine:
        'The `// {{marker}}` marker must be preceded by exactly one blank line (H4).',
      markerOutOfOrder:
        'Section markers must appear in the canonical order: {{order}} (H4).',
      misnamedHook:
        'The exported hook `{{actual}}` must be named after the file: rename it to `{{name}}` (H1).',
      missingHook:
        'Expected an exported `{{name}}` hook matching the file name (H1).',
      missingMarker:
        'Missing the `// {{marker}}` section marker (H4). Keep every marker even when its section is empty.',
      missingReturnType:
        'Give `{{name}}` an explicit return type: `(): UseFooResult`, `(): boolean`, or `(): void` for an effect-only hook (H5).',
      moduleScopeValue:
        'A hook file may hold only imports, type declarations and the hook — move this {{kind}} out of module scope (H3). If only this hook uses it, declare it inside the hook under `// Setup`; if several files share it, move it to {{where}} and import it.',
      nonExportedHook:
        'Give the module-scope hook `{{name}}` its own file in `hooks/` (H1/H3); a hook only used internally is simply left out of `index.ts`.',
      reExport:
        'Do not re-export from a hook file — `export { … }`, `export { … } from` and `export *` belong in the package `index.ts` (H2).',
    },
    schema: [],
    type: 'problem',
  },
  name: 'hook-primitive-shape',
});
