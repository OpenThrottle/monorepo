# @openthrottle/react-router-editor

Monaco-based editor components for managing custom AI prompts in OpenThrottle applications.

## Features

- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Tab Management**: Drag-and-drop reorderable tabs with keyboard shortcuts
- **File Sidebar**: Browsable file tree with search and filter capabilities
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

File tree sidebar showing filtered files based on search and type selection.

### `<EditorWindow />`

Monaco editor wrapper with sensible defaults for prompt editing.

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

## Peer Dependencies

- `react` ^19.0.0
- `react-router` ^7.1.3
- `@openthrottle/react-router-utils` workspace:\*
