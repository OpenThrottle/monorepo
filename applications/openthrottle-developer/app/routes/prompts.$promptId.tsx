import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Editor } from '@openthrottle/react-router-editor';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetPromptDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';
import { PromptDetailMetadataPanel } from '~/routing/prompts/components/PromptDetailMetadataPanel';
import { usePromptEditor } from '~/routing/prompts/hooks/usePromptEditor';
import { runPromptDetailAction } from '~/routing/prompts/actions/promptId';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/prompts.$promptId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.prompt.title ?? 'Prompt Details',
  links: (_match) => [{ children: 'Prompts', to: '/prompts' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const promptId = args.params.promptId;

  if (!promptId) {
    throw new Response('Missing prompt id', { status: 400 });
  }

  const decodedId = decodeURIComponent(promptId);

  const { customPrompt } = await executeGraphqlWithAuth(
    args.request,
    GetPromptDocument,
    { id: decodedId },
  );

  if (!customPrompt) {
    throw new Response('Prompt not found', { status: 404 });
  }

  return { prompt: customPrompt };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title = args.loaderData?.prompt?.title ?? 'Edit prompt';
  return [{ title: `${title} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { prompt } = loaderData;

  // Hooks
  const {
    content,
    handleDelete,
    handleEditorChange,
    handleSave,
    handleWriteToFileSystem,
    isDirty,
    isSubmitting,
    language,
    statusText,
  } = usePromptEditor(prompt, actionData);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex h-full flex-1 flex-col">
      {/* Header with prompt info and actions */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <a
            className="text-sm text-gray-400 transition-colors hover:text-white"
            href={PROMPTS_BASE_PATH}
          >
            ← Back to prompts
          </a>
          <h1 className="text-lg">{prompt.title}</h1>
          <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
            {prompt.promptType}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          {statusText && (
            <span
              className={`text-sm ${
                actionData?.error
                  ? 'text-red-400'
                  : isDirty
                    ? 'text-yellow-400'
                    : 'text-gray-400'
              }`}
            >
              {statusText}
            </span>
          )}

          {/* Keyboard hint */}
          <span className="text-xs text-gray-500">⌘S to save</span>

          {prompt.filePath && (
            <Button disabled={isSubmitting} onClick={handleWriteToFileSystem}>
              Write to File
            </Button>
          )}

          <Button disabled={!isDirty || isSubmitting} onClick={handleSave}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>

          <Button
            disabled={isSubmitting}
            onClick={handleDelete}
            variant="destructive"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* <div className="p-4"> */}
      <PromptDetailMetadataPanel
        contentLength={content.length}
        debugContent={content}
        prompt={prompt}
      />
      {/* </div> */}

      {/* Editor */}
      <Editor
        basePath={PROMPTS_BASE_PATH}
        language={language}
        onChange={handleEditorChange}
        // showSidebar={false}
        // showTabs={false}
        // showToolbar={false}
        value={content}
        wrapperProps={{ className: 'flex-1' }}
      />
    </GlobalScreen>
  );
}

export const action = (args: Route.ActionArgs) => runPromptDetailAction(args);

export const ErrorBoundary = GlobalErrorBoundary;
