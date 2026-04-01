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

## Optional follow-up (task 4 in plan)

After migration, consider ESLint `no-restricted-syntax` or CI grep for `toMatchSnapshot` under `__tests__` to prevent regressions.
