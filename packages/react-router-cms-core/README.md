# @openthrottle/react-router-cms-core

Foundation library for the OpenThrottle CMS: content-model types (fragments, layouts, schemas),
Jotai editor-state atoms, fragment-tree and schema utils, drag-to-reorder primitives, the component
registry and page renderers, and the schema-driven fragment form. Consumed source-first by
`applications/openthrottle-cms`.

## Installation

This package is private to the monorepo. Depend on it from another workspace project:

**pnpm:**

```bash
pnpm add @openthrottle/react-router-cms-core@workspace:^ --filter <project>
```

## Usage

Reorder components need a `DndProvider` above them:

```tsx
import { ReorderGroup } from '@openthrottle/react-router-cms-core';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

<DndProvider backend={HTML5Backend}>
  <ReorderGroup
    className={undefined}
    getItemId={(item) => item.id}
    renderItem={(item) => item.title}
    source={{ items, kind: 'controlled', onReorder: setItems }}
  />
</DndProvider>;
```

Pass `{ defaultItems, kind: 'uncontrolled', onReorder: undefined }` to let the group own its order.

Find where a fragment sits in a layout:

```ts
import { getLayoutBreadcrumbs } from '@openthrottle/react-router-cms-core';

getLayoutBreadcrumbs({ fragmentUuid, layout }); // [{ typename, uuid }, …] below the root
```

Render a fragment tree as the live page. Unknown typenames render nothing:

```tsx
import {
  CORE_COMPONENTS,
  CoreRenderer,
  createComponentRegistry,
} from '@openthrottle/react-router-cms-core';

<CoreRenderer
  className={undefined}
  componentRegistry={CORE_COMPONENTS} // or createComponentRegistry(libraryComponents)
  fragments={fragments}
/>;
```

Register your own block by narrowing the stored properties into its props:

```tsx
import {
  readString,
  registerComponent,
} from '@openthrottle/react-router-cms-core';

const registry = createComponentRegistry({
  Quote: registerComponent(Quote, ({ properties }) => ({
    cite: readString(properties, 'cite', ''),
  })),
});
```

Edit a fragment against its schema. Fields write to `atomFragmentDraft`; submitting posts
`intent`, `fragment_uuid`, `properties` (the draft as JSON) and `typename` to the route action:

```tsx
import { CoreFormRenderer } from '@openthrottle/react-router-cms-core';

<CoreFormRenderer
  children={undefined} // pass the children field props to edit a `children` property
  className={undefined}
  fragmentUuid={fragment.uuid}
  intent="updateFragment"
  schema={schema} // parseCmsSchema(row) narrows a stored row
/>;
```

Preview with live draft edits: `CoreRendererDevelopment` (device frame from `atomSettings`,
`?debug=true` adds edit links on every fragment).

## Development

```bash
pnpm nx run @openthrottle/react-router-cms-core:lint
pnpm nx run @openthrottle/react-router-cms-core:typecheck
pnpm nx run @openthrottle/react-router-cms-core:test
```
