# openthrottle-cms — agent notes

CMS editor and renderer (React Router v8): fragments, layouts and blocks stored in the `cms`
database and rendered through `CoreRenderer` from `@openthrottle/react-router-cms-core`.

## Invariants & gotchas

- **Classes typed into CMS content only work if they are safelisted.** A block's `className` is
  data in the `cms` database, so Tailwind's source scan never sees it and a utility no checked-in
  file mentions is not generated. `app/styles.css` imports
  `@openthrottle/react-router-shadcn/src/theme-safelist.css`, which forces the theme-token color
  utilities (`bg-`, `text-`, `border-`, `ring-`, `outline-`, `fill-`, `stroke-`, `divide-`,
  `placeholder-`, `decoration-`, `accent-`, `caret-`, plus `hover:` on `bg`/`text`/`border`).
  Anything else an author types (spacing, layout, opacity modifiers, gradients) silently does
  nothing until it is added to a safelist. The theme list is generated in react-router-shadcn —
  see that package's [AGENTS.md](../../packages/react-router-shadcn/AGENTS.md).
