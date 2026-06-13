# Replacing Jest/Vitest DOM snapshots in `__tests__`

Use this when migrating `expect(...).toMatchSnapshot()` / `toMatchInlineSnapshot()` and deleting `__snapshots__/*.snap` files. Prefer [Testing Library queries](https://testing-library.com/docs/queries/about#priority) that match what users perceive.

## Anti-pattern to remove

```ts
test('should render', () => {
  expect(component.baseElement).toMatchSnapshot();
});
```

Full-DOM snapshots break on unrelated markup/CSS changes and rarely encode intent.

## Query priority (stable refactors)

1. **Role + accessible name** — `getByRole('button', { name: 'Submit' })`, `getByRole('heading', { name: /pricing/i })`.
2. **Label** — `getByLabelText('Email')` for form fields.
3. **Text** — `getByText`, `getByTextContent` for copy users see.
4. **`data-testid`** — use for regions without a better hook (e.g. card root), not for every leaf node.

Prefer `screen` from `@testing-library/react` when it simplifies access after `render`.

## Patterns by test type

### 1. Static layout / marketing / global chrome

**Assert:** landmark regions, primary headings, nav links and `href`, footer links, buttons.

```ts
expect(screen.getByRole('contentinfo')).toBeInTheDocument();
expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
  'href',
  '/legal/privacy-policy',
);
```

### 2. Forms (Remix/React Router)

**Assert:** form presence, labeled fields, input `name`/`type`, submit control, and **outcomes** (validation message, `role="alert"`, success copy) per state.

`ContactForm` already follows this style (see `applications/openthrottle-website/app/routing/contact/components/__tests__/ContactForm.test.tsx`):

- `getByTestId` for the form root when needed.
- `getByLabelText` / `getByRole('textbox', { name: ... })` and `toHaveAttribute('name', ...)`.
- `getByRole('button', { name: 'Submit' })`.
- Nested `describe` for `actionData` / error path → `getByRole('alert')` + exact message.

Remove the redundant `toMatchSnapshot()` once those assertions exist.

### 3. Cards, tables, and variant props

**Assert:** visible title/body, links and `href` (and hash fragments), optional sections absent/present per variant.

Use `within(card)` scoped queries when multiple cards exist. If the component exposes stable `data-testid`s for links (e.g. `SearchTaskCard-planLink`), assert `href` and text inside that subtree.

```ts
const planLink = screen.getByTestId('SearchTaskCard-planLink');
expect(planLink).toHaveAttribute('href', '/plans/plan-123');
expect(within(planLink).getByText('My Plan')).toBeInTheDocument();
```

When a `describe` block already fully covers behavior (e.g. plan-only vs plan+task), **drop** the extra snapshot test in that block; duplicate snapshots add no value.

### 4. Async updates

Use `userEvent` for interactions, **`findBy*`** or `waitFor` for DOM that appears after async work:

```ts
expect(await screen.findByText('Loaded')).toBeInTheDocument();
```

### 5. Router-wrapped renders

Many tests use `createRoutesStub` + `render(<RoutesStub />)`. Keep that setup; run queries against the same `render` result or `screen` — no change to routing pattern, only to assertions.

## One shared “smoke” example (presentational)

Replace a single “should render” snapshot with a few role/text checks that encode the product’s contract:

```ts
test('exposes primary actions and headline', () => {
  expect(
    screen.getByRole('heading', { level: 1, name: /…/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute(
    'href',
    '/signup',
  );
});
```

Tune the selectors to each component; avoid asserting on entire `baseElement` HTML.

## Copy / text assertions (de-brittling)

Specs that assert sentence-length UI copy with a duplicated literal break on every
wording change even when behavior is unchanged — training developers to treat red
specs as noise. Pick the right tool by what is actually under test:

### Behavior / structure — assert the contract, not the prose

For empty states, cards, toolbars, etc. the contract is usually a landmark, heading,
or action, **not** the body sentence. Assert those and drop the descriptive copy:

```ts
// brittle: breaks if the description is reworded
expect(
  component.getByText('Create your first prompt to get started.'),
).toBeInTheDocument();

// stable: the action link is the real contract
const link = component.getByRole('link', { name: 'New prompt' });
expect(link).toHaveAttribute('href', '/prompts/create');
```

### When the copy IS the contract — single-source it in `data/data.copy.ts`

Error and empty-state messages users must read are part of the contract, so keep
asserting them — but don't duplicate the literal. Put the string in the area's
`data/data.copy.ts`; the component renders that constant and the spec imports the
**same** one. A wording change then updates exactly one place and every spec follows
automatically. (Components stay limited to exporting the component + its props — copy
does not live in the component file.)

```ts
// app/routing/projects/data/data.copy.ts
export const PROJECT_NOT_FOUND_COPY = {
  description: `The project you’re looking for doesn’t exist or was removed.`,
  title: `Project not found`,
} as const;
```

```tsx
// ProjectNotFound.tsx
import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';
// <EmptyTitle>{PROJECT_NOT_FOUND_COPY.title}</EmptyTitle>
// <EmptyDescription>{PROJECT_NOT_FOUND_COPY.description}</EmptyDescription>
```

```ts
// ProjectNotFound.test.tsx — and ANY other spec that renders this state
import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';

expect(
  component.getByRole('heading', { name: PROJECT_NOT_FOUND_COPY.title }),
).toBeInTheDocument();
expect(
  component.getByText(PROJECT_NOT_FOUND_COPY.description),
).toBeInTheDocument();
```

Notes:

- Keep the copy in `data/data.copy.ts`, not co-located in the component: the component
  imports it (a real cross-module use reachable from a route entry), so Knip sees it as
  used with no `@publicApi` tag needed — and the component file stays limited to its
  component + props.
- Worked examples in `openthrottle-developer`: `ProjectNotFound`, `PlanTaskNotFound`,
  `SkillsEmpty`, `PromptsEmpty` (and the `projects.$projectId` route spec, which
  imports `PROJECT_NOT_FOUND_COPY` rather than re-typing the sentence).
- Spot-check after refactoring: change a value in `data.copy.ts` and run the suite —
  only fixtures that still hard-code the literal should break; constant-bound specs
  stay green.
- Copy that comes from **data** (seeded skill descriptions, fixtures) should assert
  against the fixture object the test already defines, not a re-typed literal.
- Don't write a dedicated spec for a pure hardcoded data file (`data.copy.ts`, a
  static list): a test that re-states its literals is a tautology and a
  change-detector, and the consuming component/route spec already covers usage. Spec
  a data file only when it has logic or an invariant worth guarding (derivation,
  parsing, filtering, uniqueness, "every entry is a valid URL") — and assert the rule,
  not the values. See [coding/component-data-boundaries.mdc](mdc:.agents/rules/coding/component-data-boundaries.mdc).

## Optional follow-up (task 4 in plan)

After migration, consider ESLint `no-restricted-syntax` or CI grep for `toMatchSnapshot` under `__tests__` to prevent regressions.
