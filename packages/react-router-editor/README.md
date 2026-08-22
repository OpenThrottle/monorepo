# @openthrottle/react-router-editor

Monaco-based editor components for managing custom AI prompts in OpenThrottle applications.

## Features

- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Tab Management**: Drag-and-drop reorderable tabs with keyboard shortcuts
- **File Sidebar**: Browsable flat file list with search and filter capabilities
- **Prompt Type Filtering**: Filter files by type (agents, commands, prompts, skills)
- **Jotai State Management**: Global editor state with derived atoms for filtering
- **React Router Integration**: Navigation-aware file opening and URL sync

## Installation

The package is already included in the monorepo workspace. Import components from:

```ts
import { Editor, useEditor } from '@openthrottle/react-router-editor';
```

## Components

### `<Editor />`

Main editor component combining toolbar, tabs, editor window, and sidebar.

```tsx
<Editor
  basePath="/prompts"
  title="Custom Prompts"
  value={content}
  onChange={(value) => setContent(value)}
  language="markdown"
/>
```

### `<EditorToolbar />`

Toolbar with search input, type filter dropdown, and new file button.

### `<EditorTabs />`

Container for open file tabs with drag-and-drop reordering.

### `<EditorSidebar />`

Sidebar showing a flat list of filtered files based on search and type selection.

### `<EditorWindow />`

Monaco editor wrapper with sensible defaults for prompt editing.

`value` is the content of the **currently active file only** — it is not an
aggregate of every open tab. When editing multiple files (the tab model in
`atom.editor.ts`), you must also pass `path` (the active file's unique path)
so Monaco keys one text model per file. Swapping `value` without `path` reuses
a single shared model, which causes the undo/redo stack, cursor, and scroll
state to bleed across tabs. Change `value` and `path` together whenever the
active tab changes:

```tsx
<EditorWindow
  path={activeFile.filename}
  value={content}
  onChange={(next) => setContent(next)}
  language="markdown"
/>
```

### `<EditorNewFileForm />`

Modal form for creating new prompt files with type selection.

## Hooks

### `useEditor(options?)`

Hook for interacting with the editor state.

```ts
const {
  editor, // Current editor state
  filteredFiles, // Files filtered by search/type
  openFile, // Open a file in a new tab
  closeFile, // Close a tab
  setFiles, // Set the file list
  setSearchQuery, // Update search filter
  setSelectedType, // Update type filter
} = useEditor({ basePath: '/prompts' });
```

## Configuration

### Prompt Types

```ts
import {
  PROMPT_TYPES,
  PROMPT_TYPE_OPTIONS,
} from '@openthrottle/react-router-editor';

// PROMPT_TYPES.AGENTS = 'agents'
// PROMPT_TYPES.COMMANDS = 'commands'
// PROMPT_TYPES.PROMPTS = 'prompts'
// PROMPT_TYPES.SKILLS = 'skills'
```

### Editor Defaults

The editor ships with sensible defaults for markdown/prompt editing:

- Dark theme (`vs-dark`)
- Word wrap enabled
- Minimap disabled
- 2-space tab size
- Font size 14px

## Data Types

```ts
interface EditorFile {
  readonly directory: string;
  readonly filename: string;
  readonly id?: string;
  readonly labels?: readonly string[];
  readonly language: EditorLanguage;
  readonly promptType?: PromptType;
}

interface EditorAtom {
  readonly filename: string | undefined;
  readonly files: readonly EditorFile[];
  readonly isLoading: boolean;
  readonly searchQuery: string;
  readonly selectedType: PromptType | undefined;
  readonly tabIndex: number;
  readonly tabs: readonly EditorFile[];
}
```

## Self-hosting Monaco (no CDN)

By default `@monaco-editor/react` lazy-loads the Monaco bundle and its language
workers from the public `cdn.jsdelivr.net` CDN at runtime. That breaks
air-gapped / offline deployments and is a supply-chain surface (a CDN
compromise would inject arbitrary code into the editor).

This package vendors `monaco-editor` as a direct dependency and exposes
`configureEditorLoader()`, which points the loader at the local module instead.
Call it **once on the client** before any editor mounts — for example from a
root client entry or a top-level `useEffect`. **You** import `monaco-editor` and
hand the module to it:

```tsx
import { configureEditorLoader } from '@openthrottle/react-router-editor';

// e.g. in your app's client entry / root client loader
void import('monaco-editor').then(configureEditorLoader);
```

It is idempotent and a no-op on the server.

> **Why the caller supplies the module.** Vite emits a worker bundle for every
> `new Worker(new URL('*.worker.js', import.meta.url))` it finds while walking an
> import, and it does so during transform — _before_ tree-shaking. When this
> package imported `monaco-editor` itself, Monaco's four language workers
> (**8.66 MB**) were emitted into the client build of every consuming app, even
> apps that never render an editor and never called this function. Passing the
> module in keeps that cost with the app that opts in.

### Workers (Vite consumers)

`configureEditorLoader()` handles the main Monaco bundle. To also keep the
language **workers** off the CDN, configure `MonacoEnvironment` in the
consuming Vite app's client entry using Vite's `?worker` imports:

```ts
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new JsonWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};
```

## Peer Dependencies

- `react` ^19.0.0
- `react-router` ^7.1.3
- `@openthrottle/react-router-utils` workspace:\*
