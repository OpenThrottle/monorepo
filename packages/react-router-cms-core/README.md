# @openthrottle/react-router-cms-core

Foundation library for the OpenThrottle CMS: content-model types (fragments, layouts, schemas),
Jotai editor-state atoms, fragment-tree utils and drag-to-reorder primitives. Consumed source-first
by `applications/openthrottle-cms`.

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

## Development

```bash
pnpm nx run @openthrottle/react-router-cms-core:lint
pnpm nx run @openthrottle/react-router-cms-core:typecheck
pnpm nx run @openthrottle/react-router-cms-core:test
```
