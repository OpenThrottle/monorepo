# Component shape — shadcn primitive variant

The **variant** of the [component primitive shape](./component-primitive-shape.md)
that applies to `packages/react-router-shadcn`. The base standard scopes this
package **out** (as vendored primitives); this document is the separate standard
it is instead held to, tracked in OT plan
`Bring react-router-shadcn into the component-shape standard` (`01b63487`).

> **Why a variant at all?** The base template (single `export const Foo` +
> single `export interface FooProps` + the six markers) assumes one authored
> component per file. shadcn primitives are structurally different: measured on
> disk (2026-07-31) the package is **153 component files, 66 `React.forwardRef`,
> 122 multi-export** (compound families such as a `Card` with its `CardHeader` /
> `CardTitle` / `CardContent` / `CardFooter` parts), **9 `cva`**. A compound cva
> primitive can't honor "one component per file" or a single `FooProps` — so we
> keep the parts of the base shape that _do_ apply and define precise rules for
> the parts that don't.

## Owner decisions (the human gate — resolved 2026-07-31)

This variant was defined under a human gate. The three gated calls:

1. **Export/typing style → Authored (Style A).** Standardize on
   `React.forwardRef` + a **hand-written, exported `export interface *Props`** +
   a **named `export const`** + `displayName`, as in `Button.tsx` / `Badge.tsx`.
   We do **not** standardize on the raw shadcn idiom (`function Foo` +
   inline `React.ComponentProps<…>` + a trailing `export { … }` block, as in
   `Avatar.tsx` / `Card.tsx`). The `*Props` interface **may and should compose**
   `React.ComponentProps<…>` and cva `VariantProps<…>` — Style A is about the
   _named exported interface + named const + forwardRef + displayName_ envelope,
   not about hand-typing every prop.
2. **Markers → keep all six.** Every exported primitive part carries the full
   six-marker body (`// Hooks` … `// 🔌 Short Circuit`) in order, same whitespace
   contract as the base standard. No reduced set.
3. **Re-sync → capped-divergence.** We keep an upstream re-sync contract and
   **bound** how far we customize so a `shadcn` re-sync stays a tractable manual
   merge. We do **not** declare the files fully owned / drop the registry
   contract. See [Re-sync policy](#re-sync-policy-capped-divergence).

## The canonical shapes

Three shapes cover the package. All three are **Style A** and carry the six
markers.

### A. Single-export primitive (`cva` or plain)

The direct analogue of the base shape. `Button.tsx` / `Badge.tsx` are the
reference implementations.

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const fooVariants = cva('…base classes…', {
  defaultVariants: { variant: 'default' },
  variants: { variant: { default: '…' } },
});

type BaseProps = React.ComponentPropsWithoutRef<'div'>;
type FooVariants = VariantProps<typeof fooVariants>;

export interface FooProps extends BaseProps, FooVariants {
  asChild?: boolean;
}

export const Foo = React.forwardRef<HTMLDivElement, FooProps>(
  (props, ref): React.ReactElement => {
    const { asChild = false, className, variant = 'default', ...rest } = props;

    // Hooks

    // Setup
    const Component = asChild ? SlotPrimitive.Slot : 'div';

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <Component
        className={cn(fooVariants({ variant }), className)}
        data-slot="foo"
        ref={ref}
        {...rest}
      />
    );
  },
);

Foo.displayName = 'Foo';
```

- `cva` config is declared at module top, above the props types. `buttonVariants`
  is exported when consumers use it (`export const buttonVariants`); an internal
  variant object stays unexported.
- No `cva`? Drop the `fooVariants` block; `FooProps` still `extends BaseProps`.

### B. Compound family — single file (multi-export)

A family of small, tightly-coupled parts (`Card` + `CardHeader` + …) that are
always imported together. Each part is a **full Style-A primitive** — named
`export const`, its own exported `*Props`, `forwardRef`, `displayName`, and the
six markers. The file exports the whole family.

```tsx
export interface CardProps extends React.ComponentPropsWithoutRef<'div'> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks
    // Setup
    // Handlers
    // Markup
    // Life Cycle
    // 🔌 Short Circuit

    return (
      <div
        className={cn('…', className)}
        data-slot="card"
        ref={ref}
        {...rest}
      />
    );
  },
);
Card.displayName = 'Card';

export interface CardHeaderProps extends React.ComponentPropsWithoutRef<'div'> {}
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  CardHeaderProps
>(/* … */);
CardHeader.displayName = 'CardHeader';
// … CardTitle, CardDescription, CardContent, CardFooter …
```

- **No trailing `export { … }` re-export block.** Every symbol is exported at its
  declaration (`export const`, `export interface`). The base standard forbids the
  raw shadcn `export { Card, CardHeader, … }` footer.
- Named exports only. No default export.

### C. Compound family — `index` folder

When a family is large enough that a single file breaks the size cap (see
[VR6](#vr6--file-size-cap-per-file-not-per-family)), it splits into an `index`
folder — one part per file (`Accordion/AccordionItem.tsx`,
`Accordion/AccordionTrigger.tsx`, …) with an `index.tsx` barrel that re-exports
the parts. Each part file is shape B with a single primitive. `Accordion/`,
`AlertDialog/`, `Select/`, `Command/` are already this shape.

## Rules (normative) — the variant ruleset

The base rules R1–R7 apply as amended below. Same stable ids, prefixed `V` for
"variant" where the meaning changes; unprefixed ids carry over unchanged.

### VR1 — Every exported primitive part pairs a named `const` with an exported `*Props`

- Each exported primitive is `export const Part = React.forwardRef<…>(…)` **and**
  `export interface PartProps` — `PartProps` is the part name + `Props`.
- The interface **must** be a named, exported `interface` (not an inline type,
  `type` alias, or bare generic). It **should** compose the DOM props and variants
  it forwards: `interface CardProps extends React.ComponentPropsWithoutRef<'div'>`,
  `interface BadgeProps extends BaseProps, BadgeVariants`. An empty
  `extends`-only interface is fine (`interface CardProps extends …<'div'> {}`) —
  its presence is the point, exactly as in the base standard.
- A part with no extra props still declares the interface (may be empty-body).
- **Union-props exception:** a radix primitive whose props are a union (e.g.
  `ToggleGroup`'s single-vs-multiple `Root` props) cannot be an
  `interface extends` (TS2312). Such a part uses an exported **`type`** alias
  (`export type PartProps = React.ComponentPropsWithoutRef<…> & …`) instead;
  VR1 accepts an exported `type <Part>Props` as well as an `interface`.

### VR2 — Explicit `forwardRef` signature and return type

- `React.forwardRef<TElement, PartProps>((props, ref): React.ReactElement => …)`.
- Return type is explicit (`React.ReactElement`, or `… | null` when the part can
  short-circuit). Never inferred.
- **`displayName` is required** on every `forwardRef` part
  (`Card.displayName = 'Card'`) — the ref envelope has no inferred name.
- Prefer `forwardRef` here (unlike the base standard's React-19 "ref as a prop"
  preference) — it is the shadcn idiom and keeps re-sync diffs small. Parts that
  genuinely take no `ref` may be a plain `export const` Style-A component, but
  still carry `*Props` + markers.

### R3 — The six markers, in order, with the fixed whitespace

Unchanged from the base standard, applied to **each part's** render body. All six
markers, in order, exact whitespace, `// 🔌 Short Circuit` verbatim, kept even
when empty. This is owner decision #2: **no reduced marker set.**

### VR4 — Hoist file-scope helpers/data/config; `cva`/`cn` are the allowed exceptions

R4 applies — module-scope helpers, data, and config move to sibling
`utils/` / `data/` / `config/`. Two shadcn-specific exceptions stay in-file:

- **`cva` variant config** (`fooVariants = cva(…)`) stays at module top in the
  primitive's file — it is the primitive's style contract, colocated by
  convention, and re-sync expects it there.
- **`cn`** is imported from `../utils/cn` (already hoisted). Do not redefine it.

### VR5 — One primitive **family** per file or folder

R5 relaxes: a file/folder holds **one primitive family**, which **may
multi-export** its parts (shape B/C). It must **not** mix unrelated families
(don't put `Tooltip` parts in the `Card` file). One family = one file, or one
`index` folder when it outgrows the cap.

### VR6 — File-size cap (per file, not per family)

R6's 210-line cap applies **per file**. A single-file compound family that
exceeds it is the trigger to split into an `index` folder (shape C) — that is the
intended fix here, in place of "extract a hook." The cap counts physical lines as
in the base standard.

### R7 — UI-focused; extract logic into hooks

Applies to any **genuinely-authored logic component** that lives in the package
(e.g. `Combobox`, `MultiSelect`, `DataTable` carry real state/handlers). Pure
pass-through primitives have no logic to extract; the marker body stays (mostly
empty) per decision #2. Where a primitive does carry stateful behavior, extract a
`use<Name>` hook into a sibling `hooks/` folder as in the base standard.

## File & folder naming

- **PascalCase filenames** (`Button.tsx`, `Card.tsx`) and PascalCase `index`
  folders (`Accordion/`). This is an accepted, capped divergence from the
  registry's kebab-case single files (see re-sync policy).
- Single file until [VR6](#vr6--file-size-cap-per-file-not-per-family) forces an
  `index` folder; then one part per file + an `index.tsx` barrel.
- `data-slot="<kebab-part>"` on each part's root element (already the shadcn
  convention — keep it; it is the shadcn analogue of the base standard's
  `data-testid`).

## Re-sync policy (capped-divergence)

We keep a re-sync contract with the upstream shadcn registry. A re-sync is a
**manual merge** (our layout already diverges), kept tractable by **bounding**
the divergence to a fixed, documented set. `components.json` is retained and
updated to reflect our layout so the mapping is discoverable.

**Allowed (capped) divergences** — the only ways our copies may differ from
upstream:

1. **Filename case + structure:** PascalCase files; compound families in
   PascalCase `index` folders instead of kebab single files.
2. **Shape envelope:** the Style-A rewrite (forwardRef + exported `*Props` +
   named const + `displayName` + six markers + no trailing `export {}` block).
3. **Documented functional customizations** — each must carry an inline comment
   explaining the intentional divergence so re-sync doesn't silently revert it.
   Example already in-tree: `Badge`'s fixed-palette `color` variants (a
   deliberate, versioned public contract, commented as such).

**Not allowed:** silent behavioral drift from upstream (uncommented className or
prop changes), renaming a primitive's public API, or dropping a part a consumer
imports — these make re-sync unmergeable.

**Re-sync runbook** (applied when pulling an upstream update for a primitive):

1. Pull the upstream registry file for the primitive into a scratch location.
2. Diff against our copy, ignoring the allowed divergences (1) and (2) above.
3. Port genuine upstream changes (new props, a11y fixes, class updates) onto our
   Style-A copy by hand; re-apply the shape.
4. Preserve every documented customization (3); if upstream now conflicts with
   one, escalate to the owner — do not silently drop either side.
5. Run the primitive-profile enforcers (task 2) + the package tests.

## Scope

Applies to `packages/react-router-shadcn/src/components/**/*.tsx`, **excluding**
the permanent artifact exclusions shared with the base standard:

- `**/__tests__/**`, `**/*.test.tsx`
- `**/dist/**`, `**/__generated__/**`
- `**/*.stories.tsx`, `**/*.example.tsx`

Utilities under `packages/react-router-shadcn/src/utils/**` (e.g. `cn`) are not
components and are out of scope for the component shape.

## Opt-out — last resort

Same single escape hatch as the base standard — a file-top pragma with a written
reason, expected near-zero use:

```tsx
/* component-shape: opt-out — <written reason> */
```

## How this is enforced

Enforcement is **live and hard** — the `react-router-shadcn` package is fully at
spec, so the primitive profile runs at `error` and regressions block the build.
The enforcers from OT `0f0528ff` were **extended with a "primitive" profile**
rather than duplicated:

- **ESLint** `openthrottle/component-primitive-shape` runs the `primitive`
  profile — allows multi-export families (relaxes R5 → VR5), requires
  `forwardRef` + `displayName` + an exported `*Props` (interface, or `type` for
  union-props primitives) per part (VR1/VR2), enforces R3 markers, and bans the
  trailing `export {}` re-export block (VR5). It is set to `error` in **both**
  `packages/react-router-shadcn/eslint.config.ts` (the `nx lint` / package-cwd
  path) and the base `@tools/dotfiles` config scoped to
  `**/packages/react-router-shadcn/**/*.tsx` (the lint-staged / root-cwd path) —
  both are needed because ESLint resolves flat-config globs relative to the
  config's base path, which differs between the two run contexts. `max-lines`
  (VR6) is **off** for the package — a few compound families (e.g. `Avatar`) sit
  over 210 by design; the audit reports them instead of failing.
- **Audit** `pnpm run audit:component-shape:shadcn` scans the package for the
  variant dimensions; `:shadcn:strict` gates on the structural VRs (VR1/VR2/VR5)
  and runs in `check:local` / CI so drift blocks merges. VR6 (over-cap) stays
  report-only there too.

Both share the scope globs + opt-out pragma with the base enforcers, and
RuleTester + audit unit tests pin the primitive profile (forwardRef,
multi-export, cva, and the `type`-alias VR1 case).

## Ownership & authoring (adding or updating a shadcn component)

These files are **owned** — we install and control them. To add or change one so
it lands already-conformant:

1. **Adding a new primitive.** Pull it from the shadcn registry into a scratch
   location, then author it here in Style A: PascalCase filename (or an `index`
   folder when the family is large — see [VR5](#vr5--one-primitive-family-per-file-or-folder)),
   each exported part as a `forwardRef` primitive with its exported `*Props`, the
   six markers, `displayName`, and no trailing `export {}` block. Add
   `export * from './components/<Name>'` to `src/index.ts`. Run
   `nx lint` + `nx typecheck` + `nx test` on the package — the rule will flag any
   gap before commit.
2. **Updating an existing primitive** (an upstream fix, a new variant): follow
   the [Re-sync runbook](#re-sync-policy-capped-divergence). Keep the change
   inside the allowed-divergence set; comment any intentional functional
   divergence so a later re-sync won't silently revert it.
3. **A part that genuinely can't conform** (a third-party primitive that doesn't
   forward a ref, e.g. a `vaul`/react-day-picker root): keep it a plain Style-A
   `export const` (still `*Props` + markers, no `forwardRef`/`displayName`), with
   a one-line comment saying why — do **not** reach for the opt-out pragma for
   this; the pragma is only for the genuinely-impossible file.

Never hand-edit `dist/`, `__generated__/`, or a test file to satisfy the rule —
those are out of scope. Prefer fixing the source shape over an opt-out.

## Related

- Base standard: [component-primitive-shape.md](./component-primitive-shape.md)
  (OT `0f0528ff`).
- This variant's plan: OT `01b63487` — tasks 2 (extend enforcers) → 3 (pilot
  Avatar/Badge/Blockquote) → 4 (bulldoze compound/forwardRef families) → 5 (flip
  enforcement ON + document ownership/re-sync).
