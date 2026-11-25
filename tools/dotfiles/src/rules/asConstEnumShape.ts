import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The as-const-enum-shape rule (docs/monorepo/code-style.md, "No new enums"):
 * an exported, enum-like `as const` object is named in ALL_CAPS and is followed
 * directly by its `Key` and `Value` type aliases, in exactly this form:
 *
 *     export const CODE_SEARCH_CASE_KIND = {
 *       BODY: 'body',
 *       INTENT: 'intent',
 *     } as const;
 *
 *     export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;
 *     export type CodeSearchCaseKindValue =
 *       (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];
 *
 * "Enum-like" means a flat object literal under `as const` (optionally followed
 * by `satisfies`) whose every value is a number or a whitespace-free string.
 * Objects with any other value (nested, computed, or copy with spaces) are data
 * and are ignored, as are `*_COPY` objects, `as const` arrays, module-private
 * objects, and `__generated__/` files.
 *
 * The Pascal name is derived mechanically: split on `_`, capitalize each
 * segment's first letter and lower-case the rest (`MCP_TOOL_KIND` →
 * `McpToolKind`). No acronyms are kept and nothing is singularized.
 *
 * Reports, at most one per object:
 *
 * - `pascalCaseName` — a PascalCase enum-like object; rename it to ALL_CAPS.
 * - `misnamedAlias` — an alias of the `Key`/`Value` form under another name
 *   (`type ScheduleKind = (typeof SCHEDULE_KIND)[…]`). The object's other
 *   checks wait until it is renamed, so the fix cannot leave two value types.
 * - `missingTypes`, `notAdjacent`, `nonCanonical`, `exportMismatch` — the
 *   aliases are missing, elsewhere, written differently, or not exported.
 *
 * Autofix inserts a missing alias, rewrites a non-canonical body and adds a
 * missing `export`, editing in place so an alias keeps its comments. Aliases
 * in the wrong order directly after the object are rewritten as a pair unless
 * that would drop a comment. It does not fix a rename (callers in other files)
 * or aliases that live elsewhere in the module.
 */

type MessageIds =
  | 'exportMismatch'
  | 'misnamedAlias'
  | 'missingTypes'
  | 'nonCanonical'
  | 'notAdjacent'
  | 'pascalCaseName';

/** A top-level `type` alias together with the statement that holds it. */
interface TopLevelAlias {
  readonly alias: TSESTree.TSTypeAliasDeclaration;
  readonly isExported: boolean;
  readonly statement: TSESTree.ProgramStatement;
}

/** The enum-like object a statement exports, if it exports one. */
interface EnumLikeObject {
  readonly name: string;
  readonly statement: TSESTree.ExportNamedDeclaration;
}

/** The role an alias body plays for a given object, if any. */
const ALIAS_FORM = {
  KEY: 'key',
  VALUE: 'value',
} as const;

type AliasFormKey = keyof typeof ALIAS_FORM;
type AliasFormValue = (typeof ALIAS_FORM)[AliasFormKey];

const ALL_CAPS = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const PASCAL_CASE = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)*$/;
const COPY_SUFFIX = /_COPY$/;
const WHITESPACE = /\s/;

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

/**
 * @description `MCP_TOOL_KIND` → `McpToolKind`.
 */
export const pascalNameOf = (constName: string): string => {
  return constName
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      return `${segment.slice(0, 1).toUpperCase()}${segment.slice(1).toLowerCase()}`;
    })
    .join('');
};

/**
 * @description `WorkspaceEditorId` → `WORKSPACE_EDITOR_ID`.
 */
const allCapsNameOf = (pascalName: string): string => {
  return pascalName.replace(/(?<=[a-z0-9])(?=[A-Z])/g, '_').toUpperCase();
};

/**
 * @description Whether a property value is an enum member: a number, or a
 * string with no whitespace. A string with whitespace is copy or a message, so
 * its object is data rather than an enum.
 */
const isEnumMemberValue = (value: TSESTree.Node): boolean => {
  if (value.type === AST_NODE_TYPES.Literal) {
    if (typeof value.value === 'number') return true;
    return typeof value.value === 'string' && !WHITESPACE.test(value.value);
  }
  if (value.type === AST_NODE_TYPES.TemplateLiteral) {
    const [quasi] = value.quasis;
    const text = quasi?.value.cooked ?? '';
    return value.expressions.length === 0 && !WHITESPACE.test(text);
  }
  if (value.type === AST_NODE_TYPES.UnaryExpression) {
    const isNumber =
      value.argument.type === AST_NODE_TYPES.Literal &&
      typeof value.argument.value === 'number';
    return value.operator === '-' && isNumber;
  }
  return false;
};

/**
 * @description Whether an object literal is flat and holds only literals.
 */
const isEnumLikeObject = (node: TSESTree.ObjectExpression): boolean => {
  if (node.properties.length === 0) return false;

  return node.properties.every((property) => {
    if (property.type !== AST_NODE_TYPES.Property) return false;
    if (property.computed || property.method || property.shorthand) {
      return false;
    }
    return isEnumMemberValue(property.value);
  });
};

/**
 * @description The object literal under `as const` (and an optional trailing
 * `satisfies`), or undefined when the initializer is anything else.
 */
const asConstObjectOf = (
  init: TSESTree.Expression | null,
): TSESTree.ObjectExpression | undefined => {
  const isSatisfies = init?.type === AST_NODE_TYPES.TSSatisfiesExpression;
  const asserted = isSatisfies ? init.expression : init;
  if (asserted?.type !== AST_NODE_TYPES.TSAsExpression) return undefined;

  const annotation = asserted.typeAnnotation;
  const isConst =
    annotation.type === AST_NODE_TYPES.TSTypeReference &&
    annotation.typeName.type === AST_NODE_TYPES.Identifier &&
    annotation.typeName.name === 'const';
  if (!isConst) return undefined;
  if (asserted.expression.type !== AST_NODE_TYPES.ObjectExpression) {
    return undefined;
  }
  return asserted.expression;
};

/**
 * @description The enum-like object an `export const X = {…} as const;`
 * statement declares, if it declares exactly one.
 */
const enumLikeObjectOf = (
  statement: TSESTree.ProgramStatement,
): EnumLikeObject | undefined => {
  if (statement.type !== AST_NODE_TYPES.ExportNamedDeclaration) {
    return undefined;
  }
  const declaration = statement.declaration;
  if (declaration?.type !== AST_NODE_TYPES.VariableDeclaration) {
    return undefined;
  }
  if (declaration.kind !== 'const' || declaration.declarations.length !== 1) {
    return undefined;
  }
  const [declarator] = declaration.declarations;
  if (declarator?.id.type !== AST_NODE_TYPES.Identifier) return undefined;

  const object = asConstObjectOf(declarator.init);
  if (object === undefined || !isEnumLikeObject(object)) return undefined;

  return { name: declarator.id.name, statement };
};

/**
 * @description The top-level type alias a statement holds, if any.
 */
const aliasOf = (
  statement: TSESTree.ProgramStatement,
): TopLevelAlias | undefined => {
  if (statement.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
    return { alias: statement, isExported: false, statement };
  }
  const isExportedAlias =
    statement.type === AST_NODE_TYPES.ExportNamedDeclaration &&
    statement.declaration?.type === AST_NODE_TYPES.TSTypeAliasDeclaration;
  if (!isExportedAlias) return undefined;
  if (statement.declaration?.type !== AST_NODE_TYPES.TSTypeAliasDeclaration) {
    return undefined;
  }
  return { alias: statement.declaration, isExported: true, statement };
};

/**
 * @description Whether a type node is `typeof <name>` with no type arguments.
 */
const isTypeofOf = (node: TSESTree.TypeNode, name: string): boolean => {
  return (
    node.type === AST_NODE_TYPES.TSTypeQuery &&
    node.exprName.type === AST_NODE_TYPES.Identifier &&
    node.exprName.name === name &&
    node.typeArguments === undefined
  );
};

/**
 * @description Whether an alias body describes `name`'s keys or values, in
 * any spelling (`keyof typeof X`, `(typeof X)[keyof typeof X]`, …).
 */
const aliasFormOf = (
  body: TSESTree.TypeNode,
  name: string,
): AliasFormValue | undefined => {
  const isKeyof =
    body.type === AST_NODE_TYPES.TSTypeOperator && body.operator === 'keyof';
  if (isKeyof && body.typeAnnotation !== undefined) {
    return isTypeofOf(body.typeAnnotation, name) ? ALIAS_FORM.KEY : undefined;
  }
  if (body.type === AST_NODE_TYPES.TSIndexedAccessType) {
    return isTypeofOf(body.objectType, name) ? ALIAS_FORM.VALUE : undefined;
  }
  return undefined;
};

/**
 * @description Whether an alias body is exactly the canonical one.
 */
const isCanonicalBody = (
  alias: TSESTree.TSTypeAliasDeclaration,
  form: AliasFormValue,
  name: string,
  keyName: string,
): boolean => {
  if (alias.typeParameters !== undefined) return false;
  const body = alias.typeAnnotation;

  if (form === ALIAS_FORM.KEY) {
    return aliasFormOf(body, name) === ALIAS_FORM.KEY;
  }
  if (body.type !== AST_NODE_TYPES.TSIndexedAccessType) return false;
  const index = body.indexType;
  return (
    isTypeofOf(body.objectType, name) &&
    index.type === AST_NODE_TYPES.TSTypeReference &&
    index.typeName.type === AST_NODE_TYPES.Identifier &&
    index.typeName.name === keyName &&
    index.typeArguments === undefined
  );
};

export const asConstEnumShape = createRule<[], MessageIds>({
  create(context) {
    if (context.filename.includes('__generated__')) return {};

    const sourceCode = context.sourceCode;

    /**
     * @description Checks one ALL_CAPS object against the module's aliases.
     */
    const checkObject = (
      object: EnumLikeObject,
      body: readonly TSESTree.ProgramStatement[],
      aliases: readonly TopLevelAlias[],
    ): void => {
      const { name, statement } = object;
      const pascal = pascalNameOf(name);
      const keyName = `${pascal}Key`;
      const valueName = `${pascal}Value`;

      const misnamed = aliases.filter((entry) => {
        const form = aliasFormOf(entry.alias.typeAnnotation, name);
        const aliasName = entry.alias.id.name;
        return (
          form !== undefined && aliasName !== keyName && aliasName !== valueName
        );
      });
      if (misnamed.length > 0) {
        misnamed.forEach((entry) => {
          const form = aliasFormOf(entry.alias.typeAnnotation, name);
          const expected = form === ALIAS_FORM.KEY ? keyName : valueName;
          context.report({
            data: { alias: entry.alias.id.name, expected, name },
            messageId: 'misnamedAlias',
            node: entry.alias.id,
          });
        });
        return;
      }

      const key = aliases.find((entry) => entry.alias.id.name === keyName);
      const value = aliases.find((entry) => entry.alias.id.name === valueName);
      const present = [key, value].filter((entry) => entry !== undefined);

      const index = body.indexOf(statement);
      const isKeyAdjacent =
        key === undefined || body[index + 1] === key.statement;
      const valueSlot = key === undefined ? index + 1 : index + 2;
      const isValueAdjacent =
        value === undefined || body[valueSlot] === value.statement;
      const isNonCanonical =
        (key !== undefined &&
          !isCanonicalBody(key.alias, ALIAS_FORM.KEY, name, keyName)) ||
        (value !== undefined &&
          !isCanonicalBody(value.alias, ALIAS_FORM.VALUE, name, keyName));
      const isUnexported = present.some((entry) => !entry.isExported);

      const messageId = ((): MessageIds | undefined => {
        if (key === undefined || value === undefined) return 'missingTypes';
        if (!isKeyAdjacent || !isValueAdjacent) return 'notAdjacent';
        if (isNonCanonical) return 'nonCanonical';
        if (isUnexported) return 'exportMismatch';
        return undefined;
      })();
      if (messageId === undefined) return;

      const keyLine = `export type ${keyName} = keyof typeof ${name};`;
      const valueBody = `(typeof ${name})[${keyName}]`;
      const valueLine = `export type ${valueName} = ${valueBody};`;

      // In order: edit each alias in place, which keeps its comments (a
      // `/** @public */` tag, say) and touches nothing else.
      const editInPlace = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] => {
        const fixes: TSESLint.RuleFix[] = [];
        if (key === undefined && value === undefined) {
          fixes.push(
            fixer.insertTextAfter(statement, `\n\n${keyLine}\n${valueLine}`),
          );
        } else if (key === undefined && value !== undefined) {
          // Directly above the value alias (and its comments), so the pair
          // reads as one block.
          const [leading] = sourceCode.getCommentsBefore(value.statement);
          const start = leading?.range[0] ?? value.statement.range[0];
          fixes.push(
            fixer.insertTextBeforeRange([start, start], `${keyLine}\n`),
          );
        } else if (key !== undefined && value === undefined) {
          fixes.push(fixer.insertTextAfter(key.statement, `\n${valueLine}`));
        }
        const canonicalBodies = [
          { body: `keyof typeof ${name}`, entry: key, form: ALIAS_FORM.KEY },
          { body: valueBody, entry: value, form: ALIAS_FORM.VALUE },
        ];
        canonicalBodies.forEach(({ body: canonical, entry, form }) => {
          if (entry === undefined) return;
          if (!entry.isExported) {
            fixes.push(fixer.insertTextBefore(entry.alias, 'export '));
          }
          if (!isCanonicalBody(entry.alias, form, name, keyName)) {
            fixes.push(
              fixer.replaceText(entry.alias.typeAnnotation, canonical),
            );
          }
        });
        return fixes;
      };

      // Out of order but directly after the object: rewrite that run, unless
      // it holds comments the rewrite would drop.
      const run = body.slice(index + 1, index + 1 + present.length);
      const isRun = present.every((entry) => run.includes(entry.statement));
      const runEnd = run.at(-1)?.range[1] ?? statement.range[1];
      const hasComments = sourceCode.getAllComments().some((comment) => {
        return (
          comment.range[0] >= statement.range[1] && comment.range[1] <= runEnd
        );
      });
      const rewriteRun = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix => {
        return fixer.replaceTextRange(
          [statement.range[1], runEnd],
          `\n\n${keyLine}\n${valueLine}`,
        );
      };

      const hasTypeParameters = present.some((entry) => {
        return entry.alias.typeParameters !== undefined;
      });
      const isInOrder = isKeyAdjacent && isValueAdjacent;
      const canRewrite = isRun && !hasComments;
      const fix = ((): TSESLint.ReportFixFunction | null => {
        if (hasTypeParameters) return null;
        if (isInOrder) return editInPlace;
        return canRewrite ? rewriteRun : null;
      })();

      context.report({
        data: { key: keyName, name, value: valueName },
        fix,
        messageId,
        node: statement,
      });
    };

    return {
      Program(program): void {
        const body = program.body;
        const aliases = body
          .map(aliasOf)
          .filter((entry) => entry !== undefined);

        body.forEach((statement) => {
          const object = enumLikeObjectOf(statement);
          if (object === undefined) return;
          if (COPY_SUFFIX.test(object.name)) return;

          if (ALL_CAPS.test(object.name)) {
            checkObject(object, body, aliases);
            return;
          }
          if (PASCAL_CASE.test(object.name)) {
            context.report({
              data: { expected: allCapsNameOf(object.name), name: object.name },
              messageId: 'pascalCaseName',
              node: object.statement,
            });
          }
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Require an exported enum-like \`as const\` object to be ALL_CAPS and followed directly by its canonical \`Key\` and \`Value\` types.`,
    },
    fixable: 'code',
    messages: {
      exportMismatch: `Export \`{{key}}\` and \`{{value}}\` like \`{{name}}\`.`,
      misnamedAlias: `\`{{alias}}\` is a type of \`{{name}}\`; name it \`{{expected}}\`. Rename every importer with a TS-aware rename, not sed.`,
      missingTypes: `Follow \`{{name}}\` directly with \`export type {{key}} = keyof typeof {{name}};\` and \`export type {{value}} = (typeof {{name}})[{{key}}];\`.`,
      nonCanonical: `Write \`{{key}}\` as \`keyof typeof {{name}}\` and \`{{value}}\` as \`(typeof {{name}})[{{key}}]\`, exactly.`,
      notAdjacent: `Declare \`{{key}}\` and then \`{{value}}\` directly after \`{{name}}\`.`,
      pascalCaseName: `Name the enum-like \`as const\` object \`{{name}}\` in ALL_CAPS (\`{{expected}}\`, minus any \`Enum\`/\`GraphQL\` suffix) and give it its \`Key\`/\`Value\` types.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'as-const-enum-shape',
});
