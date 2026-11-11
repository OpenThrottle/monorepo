/**
 * @description Emits (or verifies) one JSON Schema (draft 7) per CMS content block, from the
 * block's TypeScript props interface. OT plan `a608869b`; the contract is in
 * `packages/react-router-cms-ui/AGENTS.md` § "Prop doc-comment tags are a JSON Schema contract".
 *
 * Usage, from the workspace root (the `cms-schemas` Nx target runs this):
 *
 *   tsx ./scripts/generate-cms-schemas.ts --package=packages/react-router-cms-ui --write
 *   tsx ./scripts/generate-cms-schemas.ts --package=packages/react-router-cms-ui --check
 *
 * - **Discovery.** A content block is an export of the package's `src/index.ts` that carries a
 *   `debug` static (every CMS block does, see `CmsComponentDebug`), paired with the exported
 *   `<Name>Props` interface. There is no hand-kept path list.
 * - **Own members only.** Only members declared in the props interface's own body become
 *   properties, so attributes a block inherits from the DOM (`extends Pick<ButtonHTMLAttributes,
 *   …>`) never reach the editor.
 * - **Widgets.** `@cmsWidget <name>` emits the custom `x-cms-widget` keyword next to a standard
 *   `type`. A non-standard `type` (RocketCMS's `@TJS-type className`) is rejected, because it is
 *   not JSON Schema and fails meta-validation.
 * - **Required.** A member is required unless it is optional (`?:`), admits `undefined`, or is a
 *   `children` widget (children come from the fragment tree, never from `properties`).
 * - **Defaults.** `@default` is parsed as JSON; text that is not JSON (Wysiwyg's HTML) is kept as a
 *   string.
 * - **Identity.** `typename` is the component's export name; `version` is a content hash of the
 *   schema, so an unchanged schema keeps its version and any change mints a new one.
 *
 * Uses the repository's own `typescript` compiler API rather than `typescript-json-schema`, which
 * vendors its own TypeScript and crashes on this repo's composite `tsconfig.lib.json`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'; // prettier-ignore
import { join, relative, resolve } from 'node:path';

import * as prettier from 'prettier';
import ts from 'typescript';

import { createLogger, flagValue, hasFlag } from './utils/index.ts';

const logger = createLogger();

/** The custom keyword a widget hint is emitted under. */
export const CMS_WIDGET_KEYWORD = 'x-cms-widget';

/** Folder, under the package root, the schemas are written to. */
export const CMS_SCHEMAS_DIR = 'schemas';

/** The manifest file, inside {@link CMS_SCHEMAS_DIR}. */
export const CMS_SCHEMAS_MANIFEST = 'manifest.json';

/** Stamped into every emitted file so check-generated-attributes recognises it. */
export const CMS_SCHEMAS_BANNER = `GENERATED — DO NOT EDIT. Regenerate with \`pnpm nx run <project>:cms-schemas:write\` (scripts/generate-cms-schemas.ts).`; // prettier-ignore

/** Widget names a `@cmsWidget` tag may carry. Mirrors cms-core's `CmsSchemaInstanceType`. */
export const CMS_WIDGETS: readonly string[] = [
  'children',
  'className',
  'color',
  'image',
  'json',
  'link',
  'wysiwyg',
];

/** Numeric JSON Schema keywords a member's JSDoc may set directly (`@maxItems 2`). */
const NUMERIC_KEYWORDS: readonly string[] = [
  'maxItems',
  'maxLength',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
];

/** String JSON Schema keywords a member's JSDoc may set directly (`@format uri`). */
const STRING_KEYWORDS: readonly string[] = ['format', 'pattern'];

/** A JSON value, as emitted into a schema. */
export type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** A JSON object, as emitted into a schema. */
export type JsonObject = { readonly [key: string]: JsonValue };

/** One generated block schema. */
export interface CmsBlockSchema {
  readonly schema: JsonObject;
  readonly typename: string;
  readonly version: string;
}

/** The manifest entry for one block. */
export interface CmsSchemaManifestEntry {
  readonly file: string;
  readonly typename: string;
  readonly version: string;
}

/** Thrown when a props interface cannot be expressed as a schema. */
export class CmsSchemaError extends Error {}

const isJsonObject = (value: JsonValue): value is JsonObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Sorts object keys recursively, so equal schemas serialize identically. */
export const canonicalize = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (!isJsonObject(value)) {
    return value;
  }

  const keys = Object.keys(value).sort();

  return Object.fromEntries(
    keys.map((key) => {
      const entry = value[key];

      return [key, entry === undefined ? null : canonicalize(entry)];
    }),
  );
};

/**
 * A content hash of a schema: the first 16 hex chars of sha256 over its canonical JSON. `$comment`
 * (the generated banner) is left out, so rewording the banner never mints new versions.
 */
export const schemaVersion = (schema: JsonObject): string => {
  const { $comment: _banner, ...content } = schema;
  const canonical = JSON.stringify(canonicalize(content));

  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
};

const toJsonValue = (value: unknown): JsonValue | undefined => {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    const items = value.map(toJsonValue);

    return items.every((item) => item !== undefined) ? items.filter((item) => item !== undefined) : undefined; // prettier-ignore
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([key, entry]) => {
      return [key, toJsonValue(entry)] as const;
    });

    if (entries.some(([, entry]) => entry === undefined)) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  return undefined;
};

/** Parses a `@default` tag: JSON when it parses, otherwise the trimmed text as a string. */
export const parseDefault = (text: string): JsonValue => {
  const trimmed = text.trim();

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const value = toJsonValue(parsed);

    return value === undefined ? trimmed : value;
  } catch {
    return trimmed;
  }
};

const tagText = (tag: ts.JSDocTag): string => {
  const { comment } = tag;

  if (comment === undefined) {
    return '';
  }

  if (typeof comment === 'string') {
    return comment;
  }

  return comment.map((part) => part.text).join('');
};

/** Collapses a description's line breaks and indentation into single spaces. */
const normalizeDescription = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

const jsDocTags = (node: ts.Node): ReadonlyMap<string, string> => {
  const tags = new Map<string, string>();

  for (const tag of ts.getJSDocTags(node)) {
    tags.set(tag.tagName.text, tagText(tag));
  }

  return tags;
};

interface TypeContext {
  readonly checker: ts.TypeChecker;
  readonly where: string;
}

const isUndefinedType = (type: ts.Type): boolean => {
  return (type.flags & ts.TypeFlags.Undefined) !== 0;
};

const isBooleanType = (type: ts.Type): boolean => {
  return (type.flags & ts.TypeFlags.BooleanLike) !== 0;
};

/** The members of a union without `undefined`, or the type itself. */
const definedParts = (type: ts.Type): readonly ts.Type[] => {
  const parts = type.isUnion() ? type.types : [type];

  return parts.filter((part) => !isUndefinedType(part));
};

const arrayElementType = (
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | undefined => {
  if (!checker.isArrayType(type)) {
    return undefined;
  }

  const [element] = checker.getTypeArguments(type);

  return element;
};

const typeToSchema = (type: ts.Type, context: TypeContext): JsonObject => {
  const { checker, where } = context;
  const parts = definedParts(type);

  if (parts.length > 0 && parts.every((part) => part.isStringLiteral())) {
    return { enum: parts.map((part) => (part.isStringLiteral() ? part.value : '')), type: 'string' }; // prettier-ignore
  }

  if (parts.length > 0 && parts.every(isBooleanType)) {
    return { type: 'boolean' };
  }

  const [single] = parts;

  if (parts.length !== 1 || single === undefined) {
    throw new CmsSchemaError(`${where}: unions other than string literals are not supported (got \`${checker.typeToString(type)}\`)`); // prettier-ignore
  }

  if ((single.flags & ts.TypeFlags.String) !== 0) {
    return { type: 'string' };
  }

  if ((single.flags & ts.TypeFlags.Number) !== 0) {
    return { type: 'number' };
  }

  const element = arrayElementType(single, checker);

  if (element !== undefined) {
    return { items: typeToSchema(element, context), type: 'array' };
  }

  const indexed = checker.getIndexTypeOfType(single, ts.IndexKind.String);

  if (
    indexed !== undefined &&
    checker.getPropertiesOfType(single).length === 0
  ) {
    return { additionalProperties: typeToSchema(indexed, context), type: 'object' }; // prettier-ignore
  }

  throw new CmsSchemaError(`${where}: type \`${checker.typeToString(single)}\` has no JSON Schema mapping`); // prettier-ignore
};

const widgetSchema = (widget: string, where: string): JsonObject => {
  if (!CMS_WIDGETS.includes(widget)) {
    throw new CmsSchemaError(`${where}: unknown @cmsWidget \`${widget}\` (known: ${CMS_WIDGETS.join(', ')})`); // prettier-ignore
  }

  return { [CMS_WIDGET_KEYWORD]: widget };
};

interface MemberSchema {
  readonly isRequired: boolean;
  readonly name: string;
  readonly schema: JsonObject;
}

const memberSchema = (
  member: ts.PropertySignature,
  checker: ts.TypeChecker,
  interfaceName: string,
): MemberSchema => {
  const name = member.name.getText();
  const where = `${interfaceName}.${name}`;
  const tags = jsDocTags(member);

  if (tags.has('TJS-type')) {
    throw new CmsSchemaError(`${where}: @TJS-type is not supported; use @cmsWidget <name> for a widget and let the TypeScript type set \`type\``); // prettier-ignore
  }

  const widget = tags.get('cmsWidget')?.trim();
  const isChildren = widget === 'children';
  const type = checker.getTypeAtLocation(member);
  const base = isChildren ? { type: 'array' } : typeToSchema(type, { checker, where }); // prettier-ignore
  const extra: Record<string, JsonValue> = {};

  const description = tags.get('description');
  if (description !== undefined) extra['description'] = normalizeDescription(description); // prettier-ignore

  const defaultText = tags.get('default');
  if (defaultText !== undefined) extra['default'] = parseDefault(defaultText);

  for (const keyword of NUMERIC_KEYWORDS) {
    const text = tags.get(keyword);
    if (text === undefined) continue;

    const value = Number(text.trim());
    if (!Number.isFinite(value)) throw new CmsSchemaError(`${where}: @${keyword} must be a number`); // prettier-ignore

    extra[keyword] = value;
  }

  for (const keyword of STRING_KEYWORDS) {
    const text = tags.get(keyword);
    if (text !== undefined) extra[keyword] = text.trim();
  }

  const widgetPart = widget === undefined ? {} : widgetSchema(widget, where);
  const isOptional = member.questionToken !== undefined || type.isUnion() && type.types.some(isUndefinedType); // prettier-ignore

  return {
    isRequired: !isOptional && !isChildren,
    name,
    schema: { ...base, ...extra, ...widgetPart },
  };
};

const interfaceSchema = (
  declaration: ts.InterfaceDeclaration,
  checker: ts.TypeChecker,
  typename: string,
): JsonObject => {
  const interfaceName = declaration.name.text;
  const members = declaration.members.filter(ts.isPropertySignature);
  const schemas = members.map((member) => memberSchema(member, checker, interfaceName)); // prettier-ignore
  const required = schemas.filter((member) => member.isRequired).map((member) => member.name).sort(); // prettier-ignore
  const description = jsDocTags(declaration).get('description');
  const properties = Object.fromEntries(
    schemas.map((member) => [member.name, member.schema]),
  );

  const schema: Record<string, JsonValue> = {
    $comment: CMS_SCHEMAS_BANNER,
    $schema: 'http://json-schema.org/draft-07/schema#',
    additionalProperties: false,
    properties,
    required,
    title: typename,
    type: 'object',
  };

  if (description !== undefined) schema['description'] = normalizeDescription(description); // prettier-ignore

  const canonical = canonicalize(schema);

  return isJsonObject(canonical) ? canonical : {};
};

const findInterface = (
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
): ts.InterfaceDeclaration | undefined => {
  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol; // prettier-ignore

  return target.declarations?.find(ts.isInterfaceDeclaration);
};

const createProgram = (packageRoot: string): ts.Program => {
  const configPath = join(packageRoot, 'tsconfig.lib.json');
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new CmsSchemaError(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')); // prettier-ignore
      },
    },
  );

  if (parsed === undefined) {
    throw new CmsSchemaError(`Cannot read ${configPath}`);
  }

  return ts.createProgram({
    options: { ...parsed.options, composite: false, incremental: false, noEmit: true }, // prettier-ignore
    rootNames: parsed.fileNames,
  });
};

/** Generates the schema of every content block a package exports. */
export const generatePackageSchemas = (
  packageRoot: string,
): readonly CmsBlockSchema[] => {
  const program = createProgram(packageRoot);
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(resolve(packageRoot, 'src/index.ts'));
  const moduleSymbol = entry === undefined ? undefined : checker.getSymbolAtLocation(entry); // prettier-ignore

  if (moduleSymbol === undefined) {
    throw new CmsSchemaError(`${packageRoot}: no src/index.ts module`);
  }

  const exports = checker.getExportsOfModule(moduleSymbol);
  const byName = new Map(exports.map((symbol) => [symbol.getName(), symbol]));

  const blocks = exports.filter((symbol) => {
    const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol; // prettier-ignore
    const declaration = target.valueDeclaration;

    if (declaration === undefined) return false;

    return checker.getTypeOfSymbolAtLocation(target, declaration).getProperty('debug') !== undefined; // prettier-ignore
  });

  return blocks
    .map((symbol) => {
      const typename = symbol.getName();
      const propsSymbol = byName.get(`${typename}Props`);
      const declaration = propsSymbol === undefined ? undefined : findInterface(propsSymbol, checker); // prettier-ignore

      if (declaration === undefined) {
        throw new CmsSchemaError(`${typename}: a block needs an exported \`${typename}Props\` interface`); // prettier-ignore
      }

      const schema = interfaceSchema(declaration, checker, typename);

      return { schema, typename, version: schemaVersion(schema) };
    })
    .sort((left, right) => left.typename.localeCompare(right.typename));
};

const formatJson = async (
  filepath: string,
  value: JsonValue,
): Promise<string> => {
  const config = await prettier.resolveConfig(filepath);

  return prettier.format(JSON.stringify(value), { ...config, filepath });
};

/** The files a package's schemas folder should hold, by file name. */
export const renderSchemaFiles = async (
  schemasDir: string,
  blocks: readonly CmsBlockSchema[],
): Promise<ReadonlyMap<string, string>> => {
  const manifest: JsonObject = {
    $comment: CMS_SCHEMAS_BANNER,
    schemas: blocks.map((block) => {
      return { file: `${block.typename}.schema.json`, typename: block.typename, version: block.version }; // prettier-ignore
    }),
  };

  const files = await Promise.all([
    ...blocks.map(async (block) => {
      const name = `${block.typename}.schema.json`;

      return [
        name,
        await formatJson(join(schemasDir, name), block.schema),
      ] as const;
    }),
    (async () => {
      return [CMS_SCHEMAS_MANIFEST, await formatJson(join(schemasDir, CMS_SCHEMAS_MANIFEST), manifest)] as const; // prettier-ignore
    })(),
  ]);

  return new Map(files);
};

const readDir = (dir: string): ReadonlyMap<string, string> => {
  if (!existsSync(dir)) return new Map();

  const names = readdirSync(dir).filter((name) => name.endsWith('.json'));

  return new Map(
    names.map((name) => [name, readFileSync(join(dir, name), 'utf8')]),
  );
};

/** Names of files that differ between what is on disk and what should be. */
export const diffSchemaFiles = (
  actual: ReadonlyMap<string, string>,
  expected: ReadonlyMap<string, string>,
): readonly string[] => {
  const names = new Set([...actual.keys(), ...expected.keys()]);

  return [...names].filter((name) => actual.get(name) !== expected.get(name)).sort(); // prettier-ignore
};

const main = async (): Promise<number> => {
  const packageArg = flagValue('package');
  const isWrite = hasFlag('write');
  const isCheck = hasFlag('check');

  if (packageArg === undefined || isWrite === isCheck) {
    logger.fail('Usage: generate-cms-schemas.ts --package=<dir> (--write | --check)'); // prettier-ignore

    return 2;
  }

  const packageRoot = resolve(packageArg);
  const schemasDir = join(packageRoot, CMS_SCHEMAS_DIR);
  const label = relative(process.cwd(), schemasDir);
  const expected = await renderSchemaFiles(schemasDir, generatePackageSchemas(packageRoot)); // prettier-ignore
  const drift = diffSchemaFiles(readDir(schemasDir), expected);

  if (isCheck) {
    if (drift.length === 0) {
      logger.success(`${label}: ${expected.size - 1} CMS block schema(s) up to date`); // prettier-ignore

      return 0;
    }

    logger.fail(`${label}: ${drift.length} file(s) out of date: ${drift.join(', ')}`); // prettier-ignore
    logger.info(`Regenerate with: pnpm nx run <project>:cms-schemas:write`);

    return 1;
  }

  rmSync(schemasDir, { force: true, recursive: true });
  mkdirSync(schemasDir, { recursive: true });
  for (const [name, contents] of expected) {
    writeFileSync(join(schemasDir, name), contents);
  }

  logger.success(`${label}: wrote ${expected.size - 1} CMS block schema(s)`);

  return 0;
};

if (process.argv[1]?.endsWith('generate-cms-schemas.ts')) {
  try {
    process.exit(await main());
  } catch (error) {
    logger.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
