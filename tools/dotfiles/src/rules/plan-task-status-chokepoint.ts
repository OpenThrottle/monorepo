import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * `openthrottle/plan-task-status-chokepoint` — flags a `plans.status` or
 * `tasks.status` write that bypasses the status-transition chokepoints
 * (`PlanStatusService.applyStatusChange`/`writeGuardedStatus`,
 * `applyBulkTaskStatusChange`, and the handful of task writers that capture a
 * `status_change` work-ledger artifact inline next to their write — see
 * docs/monorepo/work-ledger-sessions.md). 282 plans currently disagree with
 * their own last recorded transition because a writer changed `.status`
 * without going through one of those and recording the artifact; this rule is
 * what stops the next one being written silently.
 *
 * No type-checker is wired into this workspace's ESLint config (a project-wide
 * type-aware lint was evaluated and rejected elsewhere for cost — see the
 * `@nx/dependency-checks` comment in `index.ts`), so this rule is a syntactic
 * heuristic, in the same spirit as `component-primitive-shape` and
 * `route-primitive-shape`: it traces a small, local "is this a Plan/Task
 * repository or entity" provenance through the file being linted —
 * `manager.getRepository(Task)` / `this.tasksService.getRepository()` /
 * `this.plansService.getRepository()`, an explicit `: Task` / `: Plan` type
 * annotation, or a `new Task()` / `new Plan()` — and flags:
 *
 *   - a plain `<entity>.status = …` assignment on a traced Plan/Task binding;
 *   - a `repo.update(criteria, { status })` / `manager.update(Task, id, { status })`
 *     call whose target resolves to Plan/Task;
 *   - a query-builder `.set({ status })` chained off a traced Plan/Task
 *     repository (however deep the `.where()`/`.andWhere()`/`.setLock()` chain
 *     between them).
 *
 * Creating a row is not a transition and is never flagged — `repo.create({
 * status: 'PENDING' })` is a plain object-literal argument, not an assignment
 * or an `.update()`/`.set()` call, so it never matches any of the three shapes
 * above.
 *
 * Sanctioned chokepoints are named, not `eslint-disable`d: pass
 * `allowedFunctionNames` (scoped per file via the `files` glob this rule is
 * enabled under in `index.ts`, the same mechanism `component-primitive-shape`
 * uses for its `profile` option) naming the function/method that IS the
 * chokepoint for that file. A disable comment is invisible at review time —
 * exactly what let the silent writers this rule now guards against land in
 * the first place.
 *
 * `packages/node-client/src/openthrottle-client.ts` writes `plan.status` and
 * `task.status` directly against its own `DataSource` — no NestJS DI graph, no
 * HTTP request, nothing the server-side chokepoint can reach. It is out of
 * scope for this rule (a real, undocumented gap, not a carve-out): `index.ts`
 * scopes this rule's enabling `files` glob to exclude
 * `packages/node-client/**` entirely, with a comment explaining why, rather
 * than either an in-file disable or silently narrowing the rule's matching
 * everywhere else.
 */

type Entity = 'plan' | 'task';

type MessageIds = 'bareStatusAssignment' | 'bareStatusWrite';

interface RuleOptions {
  /**
   * Function/method names, local to the file this option is configured for,
   * that are the sanctioned chokepoint for that file — every status write
   * inside them (including in a nested anonymous closure, e.g. a
   * `manager.transaction(async (manager) => { … })` callback) is exempt.
   */
  readonly allowedFunctionNames?: readonly string[];
}

const createRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/work-ledger-sessions.md#status-write-chokepoint',
);

const tableForEntity = (entity: Entity): string =>
  entity === 'plan' ? 'plans' : 'tasks';

/** The two DI service field names this codebase consistently uses for the Plan/Task repositories. */
const entityForServiceBindingName = (name: string): Entity | null => {
  if (name === 'plansService') return 'plan';
  if (name === 'tasksService') return 'task';
  return null;
};

/** The two entity class names this rule cares about (matched against the imported/local name). */
const entityForImportedName = (name: string): Entity | null => {
  if (name === 'Plan') return 'plan';
  if (name === 'Task') return 'task';
  return null;
};

/** Unwraps `await <expr>` to `<expr>`. */
const unwrapAwait = (node: TSESTree.Node): TSESTree.Node =>
  node.type === 'AwaitExpression' ? unwrapAwait(node.argument) : node;

/** True when an object-literal has a (non-computed) `status` key. */
const hasStatusKey = (object: TSESTree.ObjectExpression): boolean =>
  object.properties.some(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      ((property.key.type === 'Identifier' && property.key.name === 'status') ||
        (property.key.type === 'Literal' && property.key.value === 'status')),
  );

/**
 * Walks outward from `node` to the nearest NAMED enclosing function or method
 * — an anonymous closure (a bare callback, a `manager.transaction(async
 * (manager) => { … })` argument) is transparent: its status write is
 * attributed to the named function/method that contains it, which is what a
 * caller configuring `allowedFunctionNames` actually names.
 */
const getEnclosingFunctionName = (node: TSESTree.Node): string | null => {
  let current: TSESTree.Node | undefined = node.parent;
  while (current !== undefined) {
    if (current.type === 'FunctionDeclaration' && current.id !== null) {
      return current.id.name;
    }
    if (
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      const owner = current.parent;
      if (
        owner?.type === 'MethodDefinition' &&
        owner.key.type === 'Identifier'
      ) {
        return owner.key.name;
      }
      if (
        owner?.type === 'PropertyDefinition' &&
        owner.key.type === 'Identifier'
      ) {
        return owner.key.name;
      }
      if (owner?.type === 'Property' && owner.key.type === 'Identifier') {
        return owner.key.name;
      }
      if (
        owner?.type === 'VariableDeclarator' &&
        owner.id.type === 'Identifier'
      ) {
        return owner.id.name;
      }
      if (
        owner?.type === 'AssignmentExpression' &&
        owner.left.type === 'Identifier'
      ) {
        return owner.left.name;
      }
      // Anonymous — keep walking out to the enclosing named function/method.
    }
    current = current.parent;
  }
  return null;
};

export const planTaskStatusChokepoint = createRule<[RuleOptions?], MessageIds>({
  create(context, [options]) {
    const allowedFunctionNames = new Set(options?.allowedFunctionNames ?? []);

    // Local alias -> entity, populated from this file's own imports (so a
    // renamed import, `import { Task as TaskEntity }`, is still recognized).
    const importedEntityLocalNames = new Map<string, Entity>();
    // Variable name -> entity, populated as declarations are visited in
    // source order (a repo bound from `getRepository(Task)`, then an entity
    // bound from that repo's `.findOne(...)`). Not scoped per-function: two
    // sibling methods reusing a generic name like `repo` for different
    // entities resolve correctly because the later declarator overwrites the
    // earlier binding before it is used — see the module doc comment.
    const bindings = new Map<string, Entity>();
    // Interface name -> (property name -> entity), pre-scanned from the whole
    // file's own `TSInterfaceDeclaration`s before anything else runs (see the
    // `Program` handler below). Closes the `applyStatusChange`-shaped gap: a
    // parameter typed `params: ApplyStatusChangeParams` is later destructured
    // as `const { entity, … } = params;`, where `entity` only carries a
    // resolvable type one level removed, through the interface's own `entity:
    // Plan` member — a local, single-file type lookup, not a type-checker.
    const interfacePropertyEntity = new Map<string, Map<string, Entity>>();
    // Parameter-local name -> the interface name annotating it (`params` ->
    // `'ApplyStatusChangeParams'`), so a later `const { entity } = params`
    // destructure can resolve `entity` through `interfacePropertyEntity`.
    const paramInterfaceName = new Map<string, string>();

    const entityFromTypeNode = (typeNode: TSESTree.TypeNode): Entity | null => {
      if (
        typeNode.type === 'TSTypeReference' &&
        typeNode.typeName.type === 'Identifier'
      ) {
        const direct = importedEntityLocalNames.get(typeNode.typeName.name);
        if (direct !== undefined) return direct;
        // Unwrap one level of generic wrapper — `Repository<Task>` (the
        // universal NestJS `@InjectRepository(Task) private readonly
        // taskRepository: Repository<Task>` shape) as well as `Promise<Task>`
        // and similar — so a directly-injected repository field is traced the
        // same as a local `getRepository(Task)` call.
        const typeArgument = typeNode.typeArguments?.params[0];
        return typeArgument !== undefined
          ? entityFromTypeNode(typeArgument)
          : null;
      }
      if (typeNode.type === 'TSUnionType') {
        for (const member of typeNode.types) {
          const entity = entityFromTypeNode(member);
          if (entity !== null) return entity;
        }
        return null;
      }
      if (typeNode.type === 'TSArrayType') {
        return entityFromTypeNode(typeNode.elementType);
      }
      return null;
    };

    const entityFromServiceReceiver = (node: TSESTree.Node): Entity | null => {
      if (node.type === 'Identifier') {
        return entityForServiceBindingName(node.name);
      }
      if (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.property.type === 'Identifier'
      ) {
        return entityForServiceBindingName(node.property.name);
      }
      return null;
    };

    /**
     * The binding-map key for a `this.<field>` access — a distinct namespace
     * from local-variable bindings (a local variable can never be literally
     * named `this.foo`), so a class field traced from a constructor
     * parameter property (`@InjectRepository(Task) private readonly
     * taskRepository: Repository<Task>`) and a local variable of the same
     * bare name never collide.
     */
    const thisFieldKey = (node: TSESTree.Node): string | null => {
      if (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.object.type === 'ThisExpression' &&
        node.property.type === 'Identifier'
      ) {
        return `this.${node.property.name}`;
      }
      return null;
    };

    /**
     * Resolves the Plan/Task entity a repository/entity-producing expression
     * traces back to, or null. Any call-chain method NOT specifically
     * recognized (`.where()`, `.andWhere()`, `.setLock()`, `.orderBy()`,
     * `.findOne()`, `.create()`, `.save()`, …) is transparent: resolution just
     * recurses into its receiver, so the chain's entity flows through
     * unchanged from wherever it was actually established
     * (`getRepository(Task)` or an `update(Task, …)`/`update(Plan, …)` call).
     */
    const resolveEntity = (node: TSESTree.Node): Entity | null => {
      const unwrapped = unwrapAwait(node);

      if (unwrapped.type === 'Identifier') {
        return bindings.get(unwrapped.name) ?? null;
      }

      const fieldKey = thisFieldKey(unwrapped);
      if (fieldKey !== null) {
        return bindings.get(fieldKey) ?? null;
      }

      if (unwrapped.type === 'NewExpression') {
        if (unwrapped.callee.type === 'Identifier') {
          return importedEntityLocalNames.get(unwrapped.callee.name) ?? null;
        }
        return null;
      }

      if (unwrapped.type === 'CallExpression') {
        const callee = unwrapped.callee;
        if (callee.type !== 'MemberExpression' || callee.computed) {
          return null;
        }
        if (callee.property.type !== 'Identifier') return null;
        const methodName = callee.property.name;

        if (methodName === 'getRepository') {
          const arg0 = unwrapped.arguments[0];
          if (arg0 !== undefined && arg0.type === 'Identifier') {
            const byArg = importedEntityLocalNames.get(arg0.name);
            if (byArg !== undefined) return byArg;
          }
          return entityFromServiceReceiver(callee.object);
        }

        if (methodName === 'update') {
          const arg0 = unwrapped.arguments[0];
          if (arg0 !== undefined && arg0.type === 'Identifier') {
            const byArg = importedEntityLocalNames.get(arg0.name);
            if (byArg !== undefined) return byArg;
          }
          return resolveEntity(callee.object);
        }

        // Transparent chain passthrough (see the doc comment above).
        return resolveEntity(callee.object);
      }

      return null;
    };

    const reportIfNotAllowed = (
      node: TSESTree.Node,
      entity: Entity,
      messageId: MessageIds,
    ): void => {
      const functionName = getEnclosingFunctionName(node);
      if (functionName !== null && allowedFunctionNames.has(functionName)) {
        return;
      }
      context.report({
        data: { table: tableForEntity(entity) },
        messageId,
        node,
      });
    };

    return {
      // A `: Task` / `: Plan` parameter annotation is enough on its own — a
      // function receiving an already-loaded entity has no repository call in
      // sight for `resolveEntity` to trace. A constructor parameter property
      // (`@InjectRepository(Task) private readonly taskRepository:
      // Repository<Task>`) is bound as a `this.<field>` access instead of a
      // bare identifier — that field is read via `this.taskRepository`
      // everywhere else in the class, never as a bare `taskRepository`.
      'ArrowFunctionExpression, FunctionDeclaration, FunctionExpression'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression,
      ): void {
        for (const param of node.params) {
          if (param.type === 'TSParameterProperty') {
            const inner =
              param.parameter.type === 'AssignmentPattern'
                ? param.parameter.left
                : param.parameter;
            const annotation = inner.typeAnnotation?.typeAnnotation;
            if (annotation === undefined) continue;
            const entity = entityFromTypeNode(annotation);
            if (entity !== null) {
              bindings.set(`this.${inner.name}`, entity);
            }
            continue;
          }
          if (param.type !== 'Identifier') continue;
          const annotation = param.typeAnnotation?.typeAnnotation;
          if (annotation === undefined) continue;
          const entity = entityFromTypeNode(annotation);
          if (entity !== null) {
            bindings.set(param.name, entity);
            continue;
          }
          // Not itself a Plan/Task (or a generic wrapper of one) — but if it
          // names a local interface, remember the pairing so a later
          // destructure of this parameter (`const { entity } = params;`) can
          // resolve `entity` through that interface's own member type.
          if (
            annotation.type === 'TSTypeReference' &&
            annotation.typeName.type === 'Identifier'
          ) {
            paramInterfaceName.set(param.name, annotation.typeName.name);
          }
        }
      },

      AssignmentExpression(node): void {
        if (node.operator !== '=') return;
        const left = node.left;
        if (left.type !== 'MemberExpression' || left.computed) return;
        if (left.property.type !== 'Identifier') return;
        if (left.property.name !== 'status') return;

        const bindingKey =
          left.object.type === 'Identifier'
            ? left.object.name
            : thisFieldKey(left.object);
        if (bindingKey === null) return;

        const entity = bindings.get(bindingKey);
        if (entity === undefined) return;

        reportIfNotAllowed(left, entity, 'bareStatusAssignment');
      },

      'CallExpression:exit'(node): void {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier') return;
        const methodName = callee.property.name;

        if (methodName === 'update') {
          const args = node.arguments;
          const arg0 = args[0];
          let entity: Entity | null = null;
          let partial: TSESTree.CallExpressionArgument | undefined;

          if (
            arg0 !== undefined &&
            arg0.type === 'Identifier' &&
            importedEntityLocalNames.has(arg0.name)
          ) {
            entity = importedEntityLocalNames.get(arg0.name) ?? null;
            partial = args[2];
          } else if (args.length >= 2) {
            entity = resolveEntity(callee.object);
            partial = args[1];
          }

          if (
            entity !== null &&
            partial !== undefined &&
            partial.type === 'ObjectExpression' &&
            hasStatusKey(partial)
          ) {
            reportIfNotAllowed(node, entity, 'bareStatusWrite');
          }
          return;
        }

        if (methodName === 'set') {
          const arg0 = node.arguments[0];
          if (
            arg0 === undefined ||
            arg0.type !== 'ObjectExpression' ||
            !hasStatusKey(arg0)
          ) {
            return;
          }
          const entity = resolveEntity(callee.object);
          if (entity !== null) {
            reportIfNotAllowed(node, entity, 'bareStatusWrite');
          }
        }
      },

      // A single pre-scan of the file's top-level statements, run before any
      // other visitor: imports first (so `entityFromTypeNode` below can
      // already resolve `Plan`/`Task` type references), then every
      // `TSInterfaceDeclaration`'s own Plan/Task-typed members. This is what
      // lets a parameter typed `params: ApplyStatusChangeParams` — later
      // destructured as `const { entity } = params;` — resolve `entity`
      // through that interface's own `entity: Plan` member, regardless of
      // whether the interface is declared before or after its use.
      Program(node): void {
        for (const statement of node.body) {
          if (statement.type !== 'ImportDeclaration') continue;
          for (const specifier of statement.specifiers) {
            if (
              specifier.type !== 'ImportSpecifier' ||
              specifier.imported.type !== 'Identifier'
            ) {
              continue;
            }
            const entity = entityForImportedName(specifier.imported.name);
            if (entity !== null) {
              importedEntityLocalNames.set(specifier.local.name, entity);
            }
          }
        }

        for (const statement of node.body) {
          // A `TSInterfaceDeclaration` at the top level, OR the far more
          // common `export interface Foo { … }` — an `ExportNamedDeclaration`
          // wrapping one.
          const declaration =
            statement.type === 'ExportNamedDeclaration'
              ? statement.declaration
              : statement;
          if (declaration?.type !== 'TSInterfaceDeclaration') continue;

          const propertyEntities = new Map<string, Entity>();
          for (const member of declaration.body.body) {
            if (member.type !== 'TSPropertySignature') continue;
            if (member.key.type !== 'Identifier') continue;
            const annotation = member.typeAnnotation?.typeAnnotation;
            if (annotation === undefined) continue;
            const entity = entityFromTypeNode(annotation);
            if (entity !== null) {
              propertyEntities.set(member.key.name, entity);
            }
          }
          if (propertyEntities.size > 0) {
            interfacePropertyEntity.set(declaration.id.name, propertyEntities);
          }
        }
      },

      VariableDeclarator(node): void {
        if (node.id.type === 'ObjectPattern') {
          if (node.init === null || node.init.type !== 'Identifier') return;
          const interfaceName = paramInterfaceName.get(node.init.name);
          if (interfaceName === undefined) return;
          const propertyEntities = interfacePropertyEntity.get(interfaceName);
          if (propertyEntities === undefined) return;

          for (const property of node.id.properties) {
            if (property.type !== 'Property' || property.computed) continue;
            if (property.key.type !== 'Identifier') continue;
            if (property.value.type !== 'Identifier') continue;
            const entity = propertyEntities.get(property.key.name);
            if (entity !== undefined) {
              bindings.set(property.value.name, entity);
            }
          }
          return;
        }

        if (node.id.type !== 'Identifier') return;

        const annotation = node.id.typeAnnotation?.typeAnnotation;
        const annotated =
          annotation !== undefined ? entityFromTypeNode(annotation) : null;
        if (annotated !== null) {
          bindings.set(node.id.name, annotated);
          return;
        }

        if (node.init === null) return;
        const entity = resolveEntity(node.init);
        if (entity !== null) {
          bindings.set(node.id.name, entity);
        }
      },
    };
  },
  defaultOptions: [{ allowedFunctionNames: [] }],
  meta: {
    docs: {
      description:
        'Guard plans.status/tasks.status writes: route status transitions through the chokepoint (PlanStatusService, applyBulkTaskStatusChange, or an inline-capturing writer) instead of a bare assignment or repo/query-builder update.',
    },
    messages: {
      bareStatusAssignment:
        "Direct assignment to `{{table}}.status` bypasses the status chokepoint, so no `status_change` work-ledger artifact is recorded. Route this transition through PlanStatusService.applyStatusChange/writeGuardedStatus (plans) or applyBulkTaskStatusChange / an inline-capturing writer (tasks) — or, if this function IS the chokepoint, add its name to this rule's `allowedFunctionNames` option where it is configured for this file.",
      bareStatusWrite:
        "This `.update(...)`/`.set(...)` writes `{{table}}.status` outside the status chokepoint, so no `status_change` work-ledger artifact is recorded. Route this transition through PlanStatusService.applyStatusChange/writeGuardedStatus (plans) or applyBulkTaskStatusChange / an inline-capturing writer (tasks) — or, if this function IS the chokepoint, add its name to this rule's `allowedFunctionNames` option where it is configured for this file.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedFunctionNames: {
            items: { type: 'string' },
            type: 'array',
          },
        },
        type: 'object',
      },
    ],
    type: 'problem',
  },
  name: 'plan-task-status-chokepoint',
});
