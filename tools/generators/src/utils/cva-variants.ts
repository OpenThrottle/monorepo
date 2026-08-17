/**
 * Static extraction of a `cva()` variant map from component source.
 *
 * Why static rather than importing the component and reading its variants:
 * `cva()` returns a bare class-building function and exposes NOTHING about its
 * variant map at runtime, so there is no object to introspect. Deriving story
 * `argTypes` at runtime silently yields empty selects. The map only exists in
 * the source text, so that is what we read.
 */

/** One `cva` variant group, e.g. `size` with `['default', 'lg', …]`. */
export interface CvaVariantGroup {
  readonly options: readonly string[];
  readonly propName: string;
}

const QUOTES = new Set(['"', "'", '`']);

/**
 * Returns the index just past the string literal starting at `start`, honouring
 * backslash escapes. Template-literal `${…}` interpolations are not traversed —
 * a cva class string never opens a brace-bearing expression, and treating the
 * literal as opaque is what keeps brace counting honest.
 */
const skipStringLiteral = (source: string, start: number): number => {
  const quote = source[start];
  let index = start + 1;

  while (index < source.length) {
    const character = source[index];

    if (character === '\\') {
      index += 2;
      continue;
    }

    if (character === quote) {
      return index + 1;
    }

    index += 1;
  }

  return index;
};

/**
 * Removes line and block comments, leaving string literals untouched.
 *
 * Not cosmetic: `Badge.tsx` keeps a commented-out copy of its whole `variant`
 * map beneath the live one, and without this every option is extracted twice.
 * Done in the same literal-aware pass as brace matching so a `//` inside a
 * class string is not mistaken for a comment.
 */
const stripComments = (source: string): string => {
  let output = '';
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (QUOTES.has(character)) {
      const end = skipStringLiteral(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (character === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index);
      index = newline === -1 ? source.length : newline;
      continue;
    }

    if (character === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close === -1 ? source.length : close + 2;
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
};

/**
 * Given the index of an opening `{`, returns the index of its matching `}`,
 * skipping over string literals so braces inside class strings (or inside a
 * Tailwind arbitrary-variant selector) cannot unbalance the count. Returns -1
 * when unbalanced.
 */
const findMatchingBrace = (source: string, open: number): number => {
  let depth = 0;
  let index = open;

  while (index < source.length) {
    const character = source[index];

    if (QUOTES.has(character)) {
      index = skipStringLiteral(source, index);
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }

    index += 1;
  }

  return -1;
};

/**
 * Collects the keys declared directly inside an object-literal body — bare
 * identifiers and quoted keys alike (`icon-lg` must be quoted, `lg` need not
 * be). Nested objects are stepped over so only depth-1 keys are returned.
 */
const readTopLevelKeys = (body: string): string[] => {
  const keys: string[] = [];
  let depth = 0;
  let index = 0;

  while (index < body.length) {
    const character = body[index];

    if (QUOTES.has(character)) {
      const end = skipStringLiteral(body, index);

      if (depth === 0) {
        const raw = body.slice(index + 1, end - 1);
        const after = body.slice(end).match(/^\s*:/);

        if (after) {
          keys.push(raw);
        }
      }

      index = end;
      continue;
    }

    if (character === '{' || character === '[' || character === '(') {
      depth += 1;
      index += 1;
      continue;
    }

    if (character === '}' || character === ']' || character === ')') {
      depth -= 1;
      index += 1;
      continue;
    }

    if (depth === 0) {
      const identifier = body.slice(index).match(/^([A-Za-z_$][\w$]*)\s*:/);

      if (identifier) {
        keys.push(identifier[1]);
        index += identifier[0].length;
        continue;
      }
    }

    index += 1;
  }

  return keys;
};

/**
 * Returns the body (brace-exclusive) of the object literal assigned to `key`
 * within `source`, or undefined when absent.
 */
const readObjectValue = (source: string, key: string): string | undefined => {
  const declaration = new RegExp(`(?:^|[\\s,{])${key}\\s*:\\s*\\{`, 'm');
  const match = declaration.exec(source);

  if (!match) {
    return undefined;
  }

  const open = source.indexOf('{', match.index + match[0].length - 1);
  const close = findMatchingBrace(source, open);

  return close === -1 ? undefined : source.slice(open + 1, close);
};

/**
 * Prop types that carry `children`, so a generated matrix can label each cell
 * instead of rendering a row of empty boxes.
 */
const CHILDREN_BEARING_TYPES =
  /\bchildren\b|ComponentPropsWithoutRef|ComponentProps\b|PropsWithChildren|[A-Za-z]*HTMLAttributes/;

/**
 * HTML void elements take no children — `<input>{'x'}</input>` is a React
 * runtime error, not merely a type error. A component whose props are declared
 * off one of these (`React.ComponentProps<'input'>`) is therefore childless no
 * matter what the generic prop-type match above suggests.
 */
const VOID_ELEMENT_PROPS =
  /ComponentProps(?:WithoutRef|WithRef)?<\s*'(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)'\s*>/;

/**
 * @public
 * @description Whether the component's props plausibly accept `children`.
 * A heuristic on the source text — the alternative is a full type-check, which
 * is far more machinery than a scaffold warrants. When it guesses wrong the
 * generated story fails typecheck loudly and the fix is deleting one label.
 */
export const acceptsChildren = (rawSource: string): boolean => {
  const source = stripComments(rawSource);

  return (
    !VOID_ELEMENT_PROPS.test(source) && CHILDREN_BEARING_TYPES.test(source)
  );
};

/**
 * @public
 * @description Extracts the `variants` groups from the first `cva(...)` call in
 * `source`. Returns an empty array for components with no `cva` map — plenty of
 * primitives in the package are plain wrappers, and that is not an error.
 */
export const extractCvaVariants = (
  rawSource: string,
): readonly CvaVariantGroup[] => {
  const source = stripComments(rawSource);
  const cvaIndex = source.indexOf('cva(');

  if (cvaIndex === -1) {
    return [];
  }

  const variantsBody = readObjectValue(source.slice(cvaIndex), 'variants');

  if (variantsBody === undefined) {
    return [];
  }

  return readTopLevelKeys(variantsBody)
    .map((propName) => {
      const optionsBody = readObjectValue(variantsBody, propName);
      const options = optionsBody ? readTopLevelKeys(optionsBody) : [];

      return { options, propName };
    })
    .filter((group) => group.options.length > 0);
};
