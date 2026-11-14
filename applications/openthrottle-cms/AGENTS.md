# openthrottle-cms — agent notes

CMS editor and renderer (React Router v8): fragments, layouts and blocks stored in the `cms`
database and rendered through `CoreRenderer` from `@openthrottle/react-router-cms-core`.

## Invariants & gotchas

- **Classes typed into CMS content only work if they are safelisted.** A block's `className` is
  data in the `cms` database, so Tailwind's source scan never sees it and a utility no checked-in
  file mentions is not generated. `app/styles.css` imports two generated safelists:
  - `@openthrottle/react-router-shadcn/src/theme-safelist.css` forces the theme-token color
    utilities (`bg-`, `text-`, `border-`, `ring-`, `outline-`, `fill-`, `stroke-`, `divide-`,
    `placeholder-`, `decoration-`, `accent-`, `caret-`, plus `hover:` on `bg`/`text`/`border`) —
    see that package's [AGENTS.md](../../packages/react-router-shadcn/AGENTS.md).
  - `@openthrottle/react-router-cms-core/src/cms-safelist.css` forces common non-theme utilities:
    spacing (`p*`/`m*`/`gap*`/`space-*` on the scale `0,1,2,3,4,6,8,10,12,16,20,24,32`, plus
    `m*-auto`), typography, layout (display, flex/grid, `md:`/`lg:` layout), radius, borders,
    shadows and `opacity-*`. Edit `src/data/data.cms-safelist.ts` in that package and regenerate
    with `pnpm nx run @openthrottle/react-router-cms-core:test -- -u buildCmsSafelist`.

  Anything else (an off-scale step like `p-5`, opacity modifiers like `bg-primary/20`, gradients)
  silently does nothing. Measure a new group's gzip cost before adding it — OT plan `8d73baa9`
  task 1 has the method and the numbers (the current two lists cost ≈ +6.4KB gz together).
