import {
  atomFragmentDraft,
  CoreFormRenderer,
} from '@openthrottle/react-router-cms-core';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { useHydrateAtoms } from 'jotai/utils';
import * as React from 'react';
import { Link, useLocation } from 'react-router';

import { getSignInHref } from '~/routing/auth/utils/auth-redirect';
import { FragmentChildAdd } from '~/routing/fragments/components/FragmentChildAdd';
import { FragmentChildCreate } from '~/routing/fragments/components/FragmentChildCreate';
import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import { useFragmentChildren } from '~/routing/fragments/hooks/useFragmentChildren';
import type { FragmentActionResult } from '~/routing/fragments/types/fragment-action';
import type { FragmentChildPicker } from '~/routing/fragments/types/fragment-children';
import { toCmsFormIssues } from '~/routing/fragments/utils/fragment-action';
import type { CmsFragmentEditorRecords } from '~/routing/fragments/utils/to-cms-records';

export interface FragmentEditorProps {
  /** The child picker's page and filter; only used when the schema has a children field. */
  readonly childPicker: FragmentChildPicker;
  readonly className: string | undefined;
  readonly records: CmsFragmentEditorRecords;
  /** The route action's last result, if any. */
  readonly result: FragmentActionResult | undefined;
}

/**
 * @description The schema-driven edit form for one fragment: its name, a pane per schema property
 * (a container's children too) and the last save's outcome. Seeds `atomFragmentDraft` with the
 * stored properties on mount, so render it inside a Jotai `Provider` keyed by the fragment uuid:
 * another fragment then gets a fresh store and never inherits this one's draft.
 */
export const FragmentEditor = (
  props: FragmentEditorProps,
): React.ReactElement => {
  const { childPicker, className, records, result } = props;
  const { children, draft, fragment, hasChildren, schema } = records;

  // Hooks
  const location = useLocation();
  useHydrateAtoms(new Map([[atomFragmentDraft, draft]]));
  const childBindings = useFragmentChildren({
    addHref: `#${fragment.uuid}-add-child`,
    children,
  });

  // Setup
  const addChildId = `${fragment.uuid}-add-child`;
  const createChildId = `${fragment.uuid}-create-child`;
  const nameId = `${fragment.uuid}-name`;
  const failed = result?.ok === false ? result : undefined;
  const issues = failed ? toCmsFormIssues(failed.issues) : undefined;
  const saved = result?.ok === true ? result : undefined;
  const signInHref = getSignInHref(`${location.pathname}${location.search}`);

  // Handlers

  // Markup
  const issueItems = failed?.issues.map((issue) => {
    const path = issue.path === '' ? FRAGMENT_EDITOR_COPY.rootPath : issue.path;

    return (
      <li key={`${issue.path}:${issue.message}`}>
        <code>{path}</code> {issue.message}
      </li>
    );
  });
  const failure = failed && (
    <Alert className="mx-4 mt-4 w-auto" variant="destructive">
      <AlertTitle>{FRAGMENT_EDITOR_COPY.issuesTitle}</AlertTitle>
      <AlertDescription>
        <p>
          {failed.message}{' '}
          {failed.requiresSignIn && (
            <Link className="font-medium underline" to={signInHref}>
              {FRAGMENT_EDITOR_COPY.signIn}
            </Link>
          )}
        </p>
        <ul className="list-disc pl-4">{issueItems}</ul>
      </AlertDescription>
    </Alert>
  );
  const savedNotice = saved && (
    <p className="text-muted-foreground mx-4 mt-4 text-sm" role="status">
      {FRAGMENT_EDITOR_COPY.savedByIntent[saved.intent]}
    </p>
  );
  const header = (
    <>
      {failure}
      {savedNotice}
      <div className="m-4 grid gap-2">
        <Label htmlFor={nameId}>{FRAGMENT_EDITOR_COPY.nameLabel}</Label>
        <Input defaultValue={fragment.name} id={nameId} name="name" />
      </div>
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('rounded-md border', className)}
      data-testid="FragmentEditor"
    >
      <CoreFormRenderer
        children={hasChildren ? childBindings : undefined}
        className={undefined}
        fragmentUuid={fragment.uuid}
        header={header}
        intent={FRAGMENT_INTENT.UPDATE}
        issues={issues}
        schema={schema}
      />
      {hasChildren && (
        <>
          <FragmentChildAdd
            className={undefined}
            id={addChildId}
            picker={childPicker}
          />
          <FragmentChildCreate
            className={undefined}
            id={createChildId}
            typenames={childPicker.typenames}
          />
        </>
      )}
    </div>
  );
};
