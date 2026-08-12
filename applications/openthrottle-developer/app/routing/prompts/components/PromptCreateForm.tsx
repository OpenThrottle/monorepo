import * as React from 'react';
import {
  EditorWindow,
  PROMPT_TYPE_OPTIONS,
} from '@openthrottle/react-router-editor';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';
import { isPromptType } from '~/routing/prompts/utils/prompt-type-guards';
import type { UsePromptCreateFormResult } from '~/routing/prompts/hooks/usePromptCreateForm';

export interface PromptCreateFormProps {
  error: string | undefined;
  form: UsePromptCreateFormResult;
}

/**
 * @description Create-prompt form body (fields + markdown editor). Reads all
 * state and handlers from the `usePromptCreateForm` hook via `form`. Extracted
 * from the route Component per route-primitive-shape R4.
 */
export const PromptCreateForm = (
  props: PromptCreateFormProps,
): React.ReactElement => {
  const { error, form } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <div className="flex items-center gap-4 p-4">
        <a
          className="text-sm text-gray-400 transition-colors hover:text-white"
          href={PROMPTS_BASE_PATH}
        >
          ← Back to prompts
        </a>
        <h1 className="text-lg">Create New Prompt</h1>
      </div>

      <div className="flex items-center gap-4 p-4">
        {error && <span className="text-sm text-red-400">{error}</span>}

        <span className="text-xs text-gray-500">⌘S to save</span>
        <Button
          disabled={!form.canSubmit || form.isSubmitting}
          onClick={form.handleSubmit}
        >
          {form.isSubmitting ? 'Creating...' : 'Create Prompt'}
        </Button>
      </div>

      <div className="space-y-4 border-b border-gray-700 bg-gray-800/50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              onChange={(e) => form.setTitle(e.target.value)}
              placeholder="My Custom Prompt"
              required={true}
              type="text"
              value={form.title}
            />
          </div>

          <div>
            <Label htmlFor="promptType">Type *</Label>
            <Select
              aria-label="Prompt type"
              name="promptType"
              onValueChange={(value) => {
                if (isPromptType(value)) {
                  form.setPromptType(value);
                }
              }}
              value={form.promptType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Poll interval…" />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filePath">File Path (optional)</Label>
            <Input
              id="filePath"
              onChange={(e) => form.setFilePath(e.target.value)}
              placeholder=".cursor/rules/my-prompt.mdc"
              type="text"
              value={form.filePath}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="A brief description of this prompt"
              type="text"
              value={form.description}
            />
          </div>

          <div>
            <Label htmlFor="labels">Labels (comma-separated, optional)</Label>
            <Input
              id="labels"
              onChange={(e) => form.setLabels(e.target.value)}
              placeholder="coding, typescript, react"
              type="text"
              value={form.labels}
            />
          </div>
        </div>
      </div>

      <EditorWindow
        language="markdown"
        onChange={form.handleEditorChange}
        value={form.content}
        wrapperProps={{ className: 'flex-1' }}
      />
    </div>
  );
};
