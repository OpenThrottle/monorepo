import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The select-value-children rule: a `SelectValue` inside a `Select` given a
 * `value` or `defaultValue` must render the selected label as its children.
 *
 * Radix fills a childless `SelectValue` from the matching `SelectItem`, which
 * only mounts on the client, so the trigger is blank in the server-rendered
 * HTML until hydration. Passing the label (`<SelectValue>{label}</SelectValue>`)
 * puts it in the SSR markup; the placeholder still shows while the label is
 * `undefined`.
 *
 * Matched by JSX name, as `@openthrottle/react-router-shadcn` exports them, so a
 * renamed import is not seen. Descent stops at a nested `Select`, which owns
 * its own `SelectValue`. A `Select` with neither prop is uncontrolled and
 * starts on its placeholder, so it is not reported.
 *
 * There is no autofix: the label has to be looked up from the same data the
 * items render.
 */

type MessageIds = 'childless';

const VALUE_PROPS: ReadonlySet<string> = new Set(['defaultValue', 'value']);

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

/**
 * @description The element's plain JSX name (`Select`), or `undefined` for a
 * member (`SelectPrimitive.Root`) or namespaced name.
 */
const elementName = (node: TSESTree.JSXElement): string | undefined => {
  const { name } = node.openingElement;
  return name.type === AST_NODE_TYPES.JSXIdentifier ? name.name : undefined;
};

/**
 * @description Whether the opening element carries a `value` or `defaultValue`
 * attribute. A spread could carry one too, but is not inspected.
 */
const hasValueProp = (node: TSESTree.JSXElement): boolean => {
  return node.openingElement.attributes.some((attribute) => {
    return (
      attribute.type === AST_NODE_TYPES.JSXAttribute &&
      attribute.name.type === AST_NODE_TYPES.JSXIdentifier &&
      VALUE_PROPS.has(attribute.name.name)
    );
  });
};

/**
 * @description Whether the element renders nothing between its tags:
 * self-closing, or only whitespace text.
 */
const isChildless = (node: TSESTree.JSXElement): boolean => {
  return node.children.every((child) => {
    return child.type === AST_NODE_TYPES.JSXText && child.value.trim() === '';
  });
};

/**
 * @description Every `SelectValue` element under `node`, not descending into a
 * nested `Select`.
 */
const findSelectValues = (
  node: TSESTree.JSXElement | TSESTree.JSXFragment,
): TSESTree.JSXElement[] => {
  return node.children.flatMap((child) => {
    if (child.type === AST_NODE_TYPES.JSXFragment) {
      return findSelectValues(child);
    }
    if (child.type !== AST_NODE_TYPES.JSXElement) {
      return [];
    }
    const name = elementName(child);
    if (name === 'SelectValue') {
      return [child];
    }
    if (name === 'Select') {
      return [];
    }
    return findSelectValues(child);
  });
};

export const selectValueChildren = createRule<[], MessageIds>({
  create(context) {
    return {
      JSXElement(node): void {
        if (elementName(node) !== 'Select' || !hasValueProp(node)) {
          return;
        }
        for (const selectValue of findSelectValues(node)) {
          if (isChildless(selectValue)) {
            context.report({
              messageId: 'childless',
              node: selectValue.openingElement,
            });
          }
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Require a SelectValue under a valued Select to render the selected label as children.`,
    },
    messages: {
      childless: `Pass the selected label as children: \`<SelectValue>{label}</SelectValue>\`. Radix fills a childless SelectValue only after hydration, so the server HTML shows an empty trigger. Compute the label in \`// Setup\` from the data the items render; leave it \`undefined\` to keep the placeholder.`,
    },
    schema: [],
    type: 'problem',
  },
  name: 'select-value-children',
});
