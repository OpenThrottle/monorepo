/**
 * @description Finds the TypeScript constructs Node's strip-only type loader
 * refuses.
 *
 * Node can run `.ts` directly, but only by *erasing* types — it never emits
 * code. Any construct whose semantics require generated output is therefore
 * rejected outright rather than mis-compiled:
 *
 * - constructor **parameter properties** — imply a `this.x = x` assignment
 * - **`enum`** / **`const enum`** — imply a runtime object and reverse mapping
 * - **decorators** — imply a call wrapping the decorated declaration
 * - **`namespace`** / `module` blocks — imply an IIFE and an object merge
 *
 * This matters only for packages whose `exports` name `./src/`, because those
 * hand a consumer raw TypeScript. See
 * `docs/monorepo/source-first-packages-and-strip-only.md`.
 *
 * Detection is a real parse, not a text search: `enum` occurs in prose,
 * identifiers and type names, and `private` occurs in plenty of positions that
 * are not parameter properties.
 */

import ts from 'typescript';

/**
 * @description Which strip-only-hostile construct was found
 * @public
 */
export const STRIP_ONLY_CONSTRUCT = {
  DECORATOR: 'decorator',
  ENUM: 'enum',
  NAMESPACE: 'namespace',
  PARAMETER_PROPERTY: 'parameter property',
} as const;

/**
 * @description One of {@link STRIP_ONLY_CONSTRUCT}'s values
 * @public
 */
export type StripOnlyConstruct =
  (typeof STRIP_ONLY_CONSTRUCT)[keyof typeof STRIP_ONLY_CONSTRUCT];

/**
 * @description A single offending site
 * @public
 */
export interface StripOnlyFinding {
  /** Which construct was found */
  readonly construct: StripOnlyConstruct;
  /** 1-based line number within the parsed source */
  readonly line: number;
}

/**
 * @description True when a parameter declares a property via a modifier
 * (`public`/`private`/`protected`/`readonly`/`override`). This is the construct
 * that produced the original downstream failure.
 */
const isParameterProperty = (node: ts.ParameterDeclaration): boolean =>
  node.modifiers !== undefined && node.modifiers.length > 0;

/**
 * @description True for a `namespace`/`module` block that survives erasure.
 *
 * A `declare namespace` (or one inside a `.d.ts`) is types only — it erases
 * cleanly and Node never sees it — so flagging it would be a false positive. A
 * namespace whose body holds only interfaces and type aliases is likewise
 * erasable, but detecting that requires whole-body analysis for no practical
 * gain: the repo has no such namespace, and the fix for one is the same either
 * way.
 */
const isEmittedNamespace = (node: ts.ModuleDeclaration): boolean =>
  !node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword,
  );

/**
 * @description Every strip-only-hostile construct in the given TypeScript
 * source, in source order.
 *
 * `fileName` steers the parser's language variant only (`.tsx` vs `.ts`); the
 * file is never read from disk, so callers may pass source text from anywhere.
 * @public
 */
export const findStripOnlyConstructs = (
  sourceText: string,
  fileName: string,
): readonly StripOnlyFinding[] => {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  // Ambient declaration files are types only — nothing in them reaches Node.
  if (sourceFile.isDeclarationFile) return [];

  const findings: StripOnlyFinding[] = [];

  const record = (construct: StripOnlyConstruct, position: number): void => {
    findings.push({
      construct,
      line: sourceFile.getLineAndCharacterOfPosition(position).line + 1,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isParameter(node) && isParameterProperty(node)) {
      record(
        STRIP_ONLY_CONSTRUCT.PARAMETER_PROPERTY,
        node.getStart(sourceFile),
      );
    }

    if (ts.isEnumDeclaration(node)) {
      record(STRIP_ONLY_CONSTRUCT.ENUM, node.getStart(sourceFile));
    }

    if (ts.isModuleDeclaration(node) && isEmittedNamespace(node)) {
      record(STRIP_ONLY_CONSTRUCT.NAMESPACE, node.getStart(sourceFile));
    }

    if (ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        record(STRIP_ONLY_CONSTRUCT.DECORATOR, decorator.getStart(sourceFile));
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return findings;
};
