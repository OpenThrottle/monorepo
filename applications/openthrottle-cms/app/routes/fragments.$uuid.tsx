import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@openthrottle/react-router-shadcn';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { Provider } from 'jotai';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import type { Route } from '@/app/routes/+types/fragments.$uuid';
import {
  CmsFragmentChildCandidatesDocument,
  CmsFragmentDetailDocument,
} from '~/__generated__/graphql';
import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import { SITE_TITLE } from '~/global/config/settings';
import { CMS_FRAGMENT_DETAIL_FIELDS } from '~/global/data/data.cms-detail-fields';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { requireRecord } from '~/global/utils/requireRecord';
import { FragmentEditor } from '~/routing/fragments/components/FragmentEditor';
import { FragmentPreview } from '~/routing/fragments/components/FragmentPreview';
import {
  FRAGMENT_DETAIL_COPY,
  FRAGMENT_EDITOR_UNAVAILABLE_COPY,
} from '~/routing/fragments/data/data.copy';
import type { FragmentActionResult } from '~/routing/fragments/types/fragment-action';
import type { FragmentChildPicker } from '~/routing/fragments/types/fragment-children';
import {
  readChildPickerQuery,
  toChildPickerPaging,
  toChildTypenames,
} from '~/routing/fragments/utils/fragment-child-picker';
import { runFragmentAction } from '~/routing/fragments/utils/runFragmentAction.server';
import { toCmsFragmentEditorRecords } from '~/routing/fragments/utils/to-cms-records';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    return (
      match.loaderData?.cmsFragment.name ?? FRAGMENT_DETAIL_COPY.fallbackName
    );
  },
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const result = await fetchPublicGraphql(CmsFragmentDetailDocument, {
    uuid: args.params.uuid,
  });
  const cmsFragment = requireRecord(result.cmsFragment, 'Fragment');
  const editor = toCmsFragmentEditorRecords(cmsFragment);
  const isContainer = editor.ok && editor.value.hasChildren;
  const query = readChildPickerQuery(new URL(args.request.url).searchParams);
  // Only a container can take children, so only it pays for the candidate page.
  const variables = { ...toChildPickerPaging(query), typename: query.typename };
  const candidates = isContainer
    ? await fetchPublicGraphql(CmsFragmentChildCandidatesDocument, variables)
    : undefined;
  const taken = new Set([
    cmsFragment.uuid,
    ...(cmsFragment.children ?? []).map((child) => child.uuid),
  ]);
  const childPicker: FragmentChildPicker = {
    candidates: (candidates?.cmsFragments.items ?? []).filter(
      (candidate) => !taken.has(candidate.uuid),
    ),
    hasNextPage: candidates?.cmsFragments.hasNextPage ?? false,
    page: query.page,
    typename: query.typename,
    typenames: toChildTypenames(candidates?.cmsSchemas.items ?? []),
  };

  return { childPicker, cmsFragment, editor };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const name =
    args.loaderData?.cmsFragment.name ?? FRAGMENT_DETAIL_COPY.fallbackName;

  return [{ title: `${name} | Fragments | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { childPicker, cmsFragment, editor } = loaderData;

  // Hooks

  // Setup
  const isContainer = editor.ok && editor.value.hasChildren;

  // Handlers

  // Markup
  const unavailable = !editor.ok && (
    <Alert variant="destructive">
      <AlertTitle>{FRAGMENT_EDITOR_UNAVAILABLE_COPY.title}</AlertTitle>
      <AlertDescription>
        {FRAGMENT_EDITOR_UNAVAILABLE_COPY[editor.reason]}
      </AlertDescription>
    </Alert>
  );
  // Keyed by uuid: each fragment gets its own Jotai store, so no draft leaks across navigation.
  const editorForm = editor.ok && (
    <Provider key={cmsFragment.uuid}>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <FragmentEditor
          childPicker={childPicker}
          className={undefined}
          records={editor.value}
          result={actionData}
        />
        <FragmentPreview
          className="xl:sticky xl:top-4"
          records={editor.value}
        />
      </div>
    </Provider>
  );
  // cms-core's children list drags with react-dnd but mounts no provider of its own.
  const draggableForm = (
    <DndProvider backend={HTML5Backend}>{editorForm}</DndProvider>
  );
  const form = isContainer ? draggableForm : editorForm;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title={cmsFragment.name}
        />
        <GlobalDetailList
          className={undefined}
          fields={CMS_FRAGMENT_DETAIL_FIELDS}
          record={cmsFragment}
        />

        <GlobalHeading
          className="mt-8 mb-4"
          heading="h2"
          icon={BookOpenIcon}
          title={FRAGMENT_DETAIL_COPY.editorHeading}
        />
        {unavailable}
        {form}
      </div>
    </GlobalScreen>
  );
}

export const action = async (
  args: Route.ActionArgs,
): Promise<FragmentActionResult> => {
  return runFragmentAction(args.request, args.params.uuid);
};

export const ErrorBoundary = GlobalErrorBoundary;
