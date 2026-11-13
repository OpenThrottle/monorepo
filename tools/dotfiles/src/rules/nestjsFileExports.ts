import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import { parseNestFile } from './nestjs-file-shared.ts';

/**
 * The nestjs-file-exports rule: a NestJS file exports only what its kind says
 * (docs/monorepo/code-style.md, "NestJS file names"). The sibling of
 * `nestjs-file-naming` — that rule checks the name, this one checks the name
 * is telling the truth.
 *
 *   - `.module.ts` / `.service.ts` / `.processor.ts` / `.resolver.ts` /
 *     `.controller.ts` export exactly one class carrying the matching Nest
 *     decorator, and nothing else — a type a provider needs lives in the
 *     folder's `.types.ts`.
 *   - `.repository.ts` exports only classes: a data-access class over one
 *     table, which may be an undecorated abstract base or an `@Injectable()`
 *     subclass. A type it needs lives in `.types.ts`.
 *   - `.utils.ts` exports only functions.
 *   - `.types.ts` exports only types and interfaces.
 *   - `.constants.ts` exports only `const` values that are not functions.
 *   - `.provider.ts` exports only Nest provider values: `const` provider
 *     objects or arrays, or functions returning them. An injectable class is a
 *     `.service.ts`, and a type goes in `.types.ts`.
 *
 * `.provider.ts` is the one subject-named kind with an export check, because
 * its name alone cannot stop a file of types and tokens from calling itself a
 * provider. The other subject-named kinds (`.object.ts`, `.input.ts`, …) and
 * test files are not checked.
 */

type ExportShape = 'class' | 'constant' | 'function' | 'other' | 'type';

interface ExportedBinding {
  /** Decorator names on an exported class (`Injectable`, `Module`, …). */
  readonly decorators: readonly string[];
  readonly name: string;
  readonly node: TSESTree.Node;
  readonly shape: ExportShape;
}

/** The decorator each provider kind's one exported class must carry. */
const PROVIDER_DECORATORS: Readonly<Record<string, string>> = {
  controller: 'Controller',
  module: 'Module',
  processor: 'Processor',
  resolver: 'Resolver',
  service: 'Injectable',
};

interface AllowedExports {
  /** Where a misplaced export of a given shape goes, overriding {@link HOME_BY_SHAPE}. */
  readonly homes: Readonly<Partial<Record<ExportShape, string>>>;
  /** How the message names what the kind allows. */
  readonly label: string;
  readonly shapes: readonly ExportShape[];
}

/** What each kind without a decorated class may export, and how the message names it. */
const ALLOWED_SHAPES: Readonly<Record<string, AllowedExports>> = {
  constants: {
    homes: {},
    label: 'non-function `const` values',
    shapes: ['constant'],
  },
  provider: {
    homes: { class: 'a `.service.ts` in its own folder' },
    label: `Nest provider values (\`const\` provider objects or arrays, or functions returning them)`,
    shapes: ['constant', 'function'],
  },
  repository: {
    homes: {},
    label: 'repository classes',
    shapes: ['class'],
  },
  types: { homes: {}, label: 'types and interfaces', shapes: ['type'] },
  utils: { homes: {}, label: 'functions', shapes: ['function'] },
};

/** Where a misplaced export belongs, by its shape. */
const HOME_BY_SHAPE: Readonly<Record<ExportShape, string>> = {
  class: 'its own `<name>/<name>.<kind>.ts` folder',
  constant: '`<folder>.constants.ts`',
  function: '`<folder>.utils.ts`',
  other: 'the file whose kind it is',
  type: '`<folder>.types.ts`',
};

type MessageIds = 'providerCount' | 'wrongExport';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

const decoratorName = (decorator: TSESTree.Decorator): string | null => {
  const { expression: decorated } = decorator;
  const isCall = decorated.type === 'CallExpression';
  const expression = isCall ? decorated.callee : decorated;
  if (expression.type === 'Identifier') return expression.name;
  if (
    expression.type === 'MemberExpression' &&
    expression.property.type === 'Identifier'
  ) {
    return expression.property.name;
  }
  return null;
};

const isFunctionInit = (init: TSESTree.Expression | null): boolean => {
  return (
    init !== null &&
    (init.type === 'ArrowFunctionExpression' ||
      init.type === 'FunctionExpression')
  );
};

/** Classifies one top-level declaration into the bindings it declares. */
const bindingsOf = (
  declaration: TSESTree.Node,
  node: TSESTree.Node,
): ExportedBinding[] => {
  switch (declaration.type) {
    case 'ClassDeclaration':
      return [
        {
          decorators: declaration.decorators
            .map(decoratorName)
            .filter((name): name is string => name !== null),
          name: declaration.id?.name ?? 'default',
          node,
          shape: 'class',
        },
      ];
    case 'FunctionDeclaration':
    case 'TSDeclareFunction':
      return [
        {
          decorators: [],
          name: declaration.id?.name ?? 'default',
          node,
          shape: 'function',
        },
      ];
    case 'TSInterfaceDeclaration':
    case 'TSTypeAliasDeclaration':
      return [
        { decorators: [], name: declaration.id.name, node, shape: 'type' },
      ];
    case 'VariableDeclaration':
      return declaration.declarations.map((declarator) => {
        const name =
          declarator.id.type === 'Identifier' ? declarator.id.name : '{…}';
        let shape: ExportShape = 'other';
        if (isFunctionInit(declarator.init)) shape = 'function';
        else if (declaration.kind === 'const') shape = 'constant';
        return { decorators: [], name, node, shape };
      });
    default: {
      let name = 'default';
      if (
        'id' in declaration &&
        declaration.id !== null &&
        declaration.id.type === 'Identifier'
      ) {
        name = declaration.id.name;
      }

      return [{ decorators: [], name, node, shape: 'other' }];
    }
  }
};

/** Top-level statements that declare a binding `export { … }` can name. */
const DECLARATION_TYPES: ReadonlySet<string> = new Set([
  'ClassDeclaration',
  'FunctionDeclaration',
  'TSDeclareFunction',
  'TSEnumDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'VariableDeclaration',
]);

/** Every binding the module exports, with its shape. */
const collectExports = (program: TSESTree.Program): ExportedBinding[] => {
  const topLevel = new Map<string, TSESTree.Node>();
  for (const statement of program.body) {
    const isNamedExport = statement.type === 'ExportNamedDeclaration';
    const declaration = isNamedExport ? statement.declaration : statement;
    if (declaration === null || !DECLARATION_TYPES.has(declaration.type)) {
      continue;
    }
    for (const binding of bindingsOf(declaration, declaration)) {
      topLevel.set(binding.name, declaration);
    }
  }

  const exported: ExportedBinding[] = [];
  for (const statement of program.body) {
    if (statement.type === 'ExportDefaultDeclaration') {
      exported.push(...bindingsOf(statement.declaration, statement));
      continue;
    }
    if (statement.type === 'ExportAllDeclaration') {
      exported.push({
        decorators: [],
        name: '*',
        node: statement,
        shape: statement.exportKind === 'type' ? 'type' : 'other',
      });
      continue;
    }
    if (statement.type !== 'ExportNamedDeclaration') continue;
    if (statement.declaration !== null) {
      exported.push(...bindingsOf(statement.declaration, statement));
      continue;
    }
    // `export { a, b }` / `export type { A } from './x'`.
    for (const specifier of statement.specifiers) {
      const { local: localNode } = specifier;
      const isIdentifier = localNode.type === 'Identifier';
      const local = isIdentifier ? localNode.name : localNode.value;
      const isTypeOnly =
        statement.exportKind === 'type' || specifier.exportKind === 'type';
      const declaration =
        statement.source === null ? topLevel.get(local) : undefined;
      const resolved =
        declaration === undefined ? [] : bindingsOf(declaration, specifier);
      const match = resolved.find((binding) => binding.name === local);
      exported.push(
        match ?? {
          decorators: [],
          name: local,
          node: specifier,
          shape: isTypeOnly ? 'type' : 'other',
        },
      );
    }
  }
  return exported;
};

export const nestjsFileExports = createRule<[], MessageIds>({
  create(context) {
    const parsed = parseNestFile(context.filename);
    if (parsed === null || parsed.isTest || parsed.kind === null) return {};
    const { kind } = parsed;

    const decorator = PROVIDER_DECORATORS[kind];
    const allowed = ALLOWED_SHAPES[kind];
    if (decorator === undefined && allowed === undefined) return {};

    return {
      Program(program): void {
        const exported = collectExports(program);

        if (decorator !== undefined) {
          const providers = exported.filter(
            (binding) =>
              binding.shape === 'class' &&
              binding.decorators.includes(decorator),
          );
          if (providers.length !== 1) {
            context.report({
              data: { count: String(providers.length), decorator, kind },
              loc: { column: 0, line: 1 },
              messageId: 'providerCount',
              node: program,
            });
          }
          for (const binding of exported) {
            if (providers.includes(binding)) continue;
            context.report({
              data: {
                allowed: `one \`@${decorator}()\` class`,
                home: HOME_BY_SHAPE[binding.shape],
                kind,
                name: binding.name,
              },
              messageId: 'wrongExport',
              node: binding.node,
            });
          }
          return;
        }

        if (allowed === undefined) return;
        for (const binding of exported) {
          if (allowed.shapes.includes(binding.shape)) continue;
          context.report({
            data: {
              allowed: allowed.label,
              home:
                allowed.homes[binding.shape] ?? HOME_BY_SHAPE[binding.shape],
              kind,
              name: binding.name,
            },
            messageId: 'wrongExport',
            node: binding.node,
          });
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `A NestJS file exports only what its kind suffix says it does.`,
    },
    messages: {
      providerCount: `A \`.{{kind}}.ts\` file exports exactly one \`@{{decorator}}()\` class; this one exports {{count}}.`,
      wrongExport: `\`{{name}}\` does not belong in a \`.{{kind}}.ts\` file, which exports only {{allowed}}. Move it to {{home}}.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'nestjs-file-exports',
});
