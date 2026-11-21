import { cleanup, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { RULE_PREVIEW_PATH } from '~/routing/rules/config/rule-preview';
import type { RulePreviewState } from '~/routing/rules/types';

import { RuleFormPreview } from '../RuleFormPreview';

const form = {
  actionType: 'inject-task',
  environment: 'any',
  projectId: 'any',
  repositoryId: 'any',
  status: 'any',
  tagAll: ['spike'],
};

const renderPreview = (
  state: RulePreviewState,
  environment = 'any',
): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => {
    return <RuleFormPreview form={{ ...form, environment }} />;
  };
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { loader: () => state, path: RULE_PREVIEW_PATH },
  ]);

  return render(<RoutesStub />);
};

const ready = (truncated: boolean): RulePreviewState => {
  return {
    kind: 'ready',
    preview: {
      cap: 500,
      environment: null,
      evaluated: 500,
      matched: [],
      matchedCount: 7,
      nonMatching: [],
      specificity: 1,
      truncated,
    },
  };
};

describe('RuleFormPreview', () => {
  afterEach(() => {
    cleanup();
  });

  test('summarises matches once the dry run resolves', async () => {
    const component = renderPreview(ready(false));

    expect(
      await component.findByTestId('RuleFormPreviewSummary'),
    ).toHaveTextContent('7');
    expect(
      component.queryByTestId('RuleFormPreviewTruncated'),
    ).not.toBeInTheDocument();
  });

  test('says so when the scan was truncated', async () => {
    const component = renderPreview(ready(true));

    expect(
      await component.findByTestId('RuleFormPreviewTruncated'),
    ).toBeInTheDocument();
  });

  test('surfaces a failed dry run as an alert', async () => {
    const component = renderPreview({ kind: 'error', message: 'down' });

    expect(await component.findByRole('alert')).toHaveTextContent('down');
  });

  test('notes that an environment-qualified rule matches nothing yet', async () => {
    const component = renderPreview(ready(false), 'ci');

    await component.findByTestId('RuleFormPreviewSummary');
    expect(
      component.getByTestId('RuleFormPreviewEnvironmentNote'),
    ).toBeInTheDocument();
  });

  test('has no environment note for an unqualified rule', async () => {
    const component = renderPreview(ready(false));

    await component.findByTestId('RuleFormPreviewSummary');
    expect(
      component.queryByTestId('RuleFormPreviewEnvironmentNote'),
    ).not.toBeInTheDocument();
  });
});
