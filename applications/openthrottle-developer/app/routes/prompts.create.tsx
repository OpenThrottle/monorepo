import * as React from 'react';
import { redirect, useFetcher } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  EditorWindow,
  PROMPT_TYPE_OPTIONS,
  PROMPT_TYPE_VALUES,
} from '@openthrottle/react-router-editor';
import type { PromptType } from '@openthrottle/react-router-editor';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
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
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  CreatePromptDocument,
  CustomPromptType,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  PROMPTS_BASE_PATH,
  PROMPTS_DEFAULT_CONTENT,
} from '~/routing/prompts/config';
import type { CreateCustomPromptInput } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/prompts.create';

type HandleData = Route.ComponentProps['loaderData'];

const isPromptType = (value: string): value is PromptType =>
  PROMPT_TYPE_VALUES.some((candidate) => candidate === value);

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create Prompt',
  links: (_match) => [{ children: 'Prompts', to: '/prompts' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create Prompt | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const fetcher = useFetcher();
  const [content, setContent] = React.useState(PROMPTS_DEFAULT_CONTENT);
  const [description, setDescription] = React.useState('');
  const [filePath, setFilePath] = React.useState('');
  const [labels, setLabels] = React.useState('');
  const [promptType, setPromptType] = React.useState<PromptType>('prompts');
  const [title, setTitle] = React.useState('');

  // Setup
  const isSubmitting = fetcher.state === 'submitting';
  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  // Handlers
  const handleEditorChange = (value: string | undefined): void => {
    setContent(value ?? '');
  };

  const handleSubmit = React.useCallback((): void => {
    if (!canSubmit || isSubmitting) return;

    const formData = new FormData();

    formData.set('title', title.trim());
    formData.set('content', content);
    formData.set('promptType', promptType);

    if (description.trim()) {
      formData.set('description', description.trim());
    }

    if (labels.trim()) {
      formData.set('labels', labels.trim());
    }

    if (filePath.trim()) {
      formData.set('filePath', filePath.trim());
    }

    fetcher.submit(formData, { method: 'post' });
  }, [
    canSubmit,
    content,
    description,
    fetcher,
    filePath,
    isSubmitting,
    labels,
    promptType,
    title,
  ]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="max-w-5xl-- flex h-full w-full flex-col gap-4 md:gap-8 lg:gap-12">
      <div
      // className="h-full flex flex-col items-center justify-between p-4 border-b border-gray-700 bg-gray-900"
      >
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
          {/* Error message */}
          {actionData?.error && (
            <span className="text-sm text-red-400">{actionData.error}</span>
          )}

          <span className="text-xs text-gray-500">⌘S to save</span>
          <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Creating...' : 'Create Prompt'}
          </Button>
        </div>

        {/* Form fields */}
        <div className="space-y-4 border-b border-gray-700 bg-gray-800/50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Custom Prompt"
                required={true}
                type="text"
                value={title}
              />
            </div>

            {/* Type */}
            <div>
              <Label htmlFor="promptType">Type *</Label>
              <Select
                aria-label="Prompt type"
                name="promptType"
                onValueChange={(value) => {
                  if (isPromptType(value)) {
                    setPromptType(value);
                  }
                }}
                value={promptType}
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

            {/* File Path */}
            <div>
              <Label htmlFor="filePath">File Path (optional)</Label>
              <Input
                id="filePath"
                onChange={(e) => setFilePath(e.target.value)}
                placeholder=".cursor/rules/my-prompt.mdc"
                type="text"
                value={filePath}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Description */}
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this prompt"
                type="text"
                value={description}
              />
            </div>

            {/* Labels */}
            <div>
              <Label htmlFor="labels">Labels (comma-separated, optional)</Label>
              <Input
                id="labels"
                onChange={(e) => setLabels(e.target.value)}
                placeholder="coding, typescript, react"
                type="text"
                value={labels}
              />
            </div>
          </div>
        </div>

        {/* Editor */}
        <EditorWindow
          language="markdown"
          onChange={handleEditorChange}
          value={content}
          wrapperProps={{ className: 'flex-1' }}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const content = formData.get('content');
  const description = formData.get('description');
  const filePath = formData.get('filePath');
  const labelsRaw = formData.get('labels');
  const promptType = formData.get('promptType');
  const title = formData.get('title');

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Content is required.' };
  }

  if (typeof promptType !== 'string') {
    return { error: 'Prompt type is required.' };
  }

  const labels =
    typeof labelsRaw === 'string' && labelsRaw.trim()
      ? labelsRaw
          .split(',')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : [];

  try {
    const input: CreateCustomPromptInput = {
      content,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : undefined,
      filePath:
        typeof filePath === 'string' && filePath.trim()
          ? filePath.trim()
          : undefined,
      labels,
      promptType: CustomPromptType.Prompts,
      title: title.trim(),
    };

    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePromptDocument,
      { input },
    );

    if (!result.createCustomPrompt) {
      return { error: 'Failed to create prompt.' };
    }

    const newPromptId = result.createCustomPrompt.id;
    return redirect(`${PROMPTS_BASE_PATH}/${encodeURIComponent(newPromptId)}`);
  } catch {
    return { error: 'Failed to create prompt.' };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
