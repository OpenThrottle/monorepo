import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { WorkspaceEditorPresenceHints } from '../WorkspaceEditorPresenceHints';
import type { WorkspaceEditorPresenceHintsProps } from '../WorkspaceEditorPresenceHints';
import type { GetEditorPresenceQuery } from '~/__generated__/graphql';

type PresenceEntry =
  GetEditorPresenceQuery['editorPresence']['editors'][number];

const buildPresence = (
  editors: readonly PresenceEntry[],
  trusted = true,
): GetEditorPresenceQuery['editorPresence'] => ({
  editors: [...editors],
  scannedAt: '2026-08-28T00:00:00.000Z',
  trusted,
});

const renderHints = (
  props: WorkspaceEditorPresenceHintsProps,
): RenderResult => {
  const Component = () => <WorkspaceEditorPresenceHints {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('WorkspaceEditorPresenceHints Component', () => {
  test('shows a quiet affirmative for an installed editor', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
      ]),
    });

    const hint = component.getByTestId('WorkspaceEditorPresenceHint-CURSOR');

    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent('Cursor');
    expect(hint).toHaveTextContent('detected');
    expect(hint).toHaveAttribute('data-presence', 'INSTALLED');
  });

  test('shows an advisory for a not-found editor that says it can still be enabled', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.NotFound,
        },
      ]),
    });

    const hint = component.getByTestId('WorkspaceEditorPresenceHint-VSCODE');

    expect(hint).toHaveTextContent('Visual Studio Code');
    expect(hint).toHaveTextContent('not detected');
    expect(hint).toHaveAttribute('data-presence', 'NOT_FOUND');
    // The reassurance is the point: this must not read as an error or a blocker.
    expect(component.getByText(/You can still enable it/i)).toBeInTheDocument();
  });

  test('omits only the unknown entries from a mixed set', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.Unknown,
        },
      ]),
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceHint-CURSOR'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHint-VSCODE'),
    ).not.toBeInTheDocument();
  });

  test('gives detected and not-detected genuinely distinct treatments', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.NotFound,
        },
      ]),
    });

    const installed = component.getByTestId(
      'WorkspaceEditorPresenceHint-CURSOR',
    );
    const notFound = component.getByTestId(
      'WorkspaceEditorPresenceHint-VSCODE',
    );

    // Distinct machine-readable state…
    expect(installed).toHaveAttribute('data-presence', 'INSTALLED');
    expect(notFound).toHaveAttribute('data-presence', 'NOT_FOUND');

    // …distinct visual weight — the whole chip dims rather than only its icon…
    expect(notFound.className).toContain('opacity-80');
    expect(installed.className).not.toContain('opacity-80');

    // …and distinct accessible text, so status is never carried by color alone.
    expect(
      component.getByText('Cursor was detected on this machine'),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        'Visual Studio Code was not detected on this machine',
      ),
    ).toBeInTheDocument();
  });

  test('never renders an interactive control, so it cannot gate anything', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
        {
          editor: WorkspaceEditorId.Vscode,
          presence: EditorPresenceState.NotFound,
        },
      ]),
    });

    const hints = component.getByTestId('WorkspaceEditorPresenceHints');

    expect(hints.querySelectorAll('button')).toHaveLength(0);
    expect(hints.querySelectorAll('input')).toHaveLength(0);
  });
});

// The three outcomes the component must hold apart. Collapsing any two of them is the
// bug this suite exists to prevent: "we found nothing" and "we cannot see your machine"
// are different claims, and "the query failed" is not a claim at all.
describe('WorkspaceEditorPresenceHints outcomes', () => {
  test('query failed (null) — renders NOTHING, not even the note', () => {
    const component = renderHints({ presence: null });

    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceUntrusted'),
    ).not.toBeInTheDocument();
  });

  test('untrusted probe — says so plainly and shows no chips', () => {
    const component = renderHints({
      presence: buildPresence(
        [
          {
            editor: WorkspaceEditorId.Cursor,
            presence: EditorPresenceState.Unknown,
          },
          {
            editor: WorkspaceEditorId.Vscode,
            presence: EditorPresenceState.Unknown,
          },
        ],
        false,
      ),
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceUntrusted'),
    ).toHaveTextContent(/can’t inspect this machine/i);
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHint-CURSOR'),
    ).not.toBeInTheDocument();
  });

  test('all-unknown despite a trusted flag — treated as untrusted, since nothing was claimed', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Unknown,
        },
      ]),
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceUntrusted'),
    ).toBeInTheDocument();
  });

  test('no editors returned at all — same honest note, no empty row', () => {
    const component = renderHints({ presence: buildPresence([]) });

    expect(
      component.getByTestId('WorkspaceEditorPresenceUntrusted'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceHints'),
    ).not.toBeInTheDocument();
  });

  test('trusted with a real claim — chips, and no untrusted note', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Claude,
          presence: EditorPresenceState.Installed,
        },
      ]),
    });

    expect(
      component.getByTestId('WorkspaceEditorPresenceHints'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('WorkspaceEditorPresenceUntrusted'),
    ).not.toBeInTheDocument();
  });

  test('does not surface scannedAt — the probe is per page load, so a timestamp is noise', () => {
    const component = renderHints({
      presence: buildPresence([
        {
          editor: WorkspaceEditorId.Cursor,
          presence: EditorPresenceState.Installed,
        },
      ]),
    });

    expect(component.queryByText(/2026/)).not.toBeInTheDocument();
  });
});
