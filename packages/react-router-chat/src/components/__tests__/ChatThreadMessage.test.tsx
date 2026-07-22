import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ChatThreadMessage } from '../ChatThreadMessage';
import type { ChatMessage } from '../../types';

const renderMessage = (message: ChatMessage): RenderResult =>
  render(<ChatThreadMessage message={message} />);

describe('ChatThreadMessage Component', () => {
  test('renders an assistant turn with structured events as a timeline', () => {
    const component = renderMessage({
      body: 'flat fallback body',
      events: [{ kind: 'text', sortOrder: 0, text: 'structured answer' }],
      id: 'assistant-1',
      role: 'assistant',
    });

    expect(component.getByTestId('ChatTurnTimeline')).toBeInTheDocument();
    expect(component.getByText('structured answer')).toBeInTheDocument();
  });

  test('falls back to the flat body for an assistant message without events', () => {
    const component = renderMessage({
      body: 'plain assistant body',
      id: 'assistant-2',
      role: 'assistant',
    });

    expect(component.queryByTestId('ChatTurnTimeline')).not.toBeInTheDocument();
    expect(component.getByText('plain assistant body')).toBeInTheDocument();
  });

  test('falls back to the flat body when events is an empty array', () => {
    const component = renderMessage({
      body: 'still flat',
      events: [],
      id: 'assistant-3',
      role: 'assistant',
    });

    expect(component.queryByTestId('ChatTurnTimeline')).not.toBeInTheDocument();
    expect(component.getByText('still flat')).toBeInTheDocument();
  });

  test('renders a running indicator for a pending assistant turn with no content yet', () => {
    const component = renderMessage({
      body: '',
      id: 'assistant-pending',
      pending: true,
      role: 'assistant',
    });

    expect(
      component.getByTestId('ChatTurnTimeline-running'),
    ).toBeInTheDocument();
    expect(component.queryByText('(No content)')).not.toBeInTheDocument();
  });

  test('stops showing the running indicator once the pending turn has body text', () => {
    const component = renderMessage({
      body: 'first token',
      id: 'assistant-pending-2',
      pending: true,
      role: 'assistant',
    });

    expect(
      component.queryByTestId('ChatTurnTimeline-running'),
    ).not.toBeInTheDocument();
    expect(component.getByText('first token')).toBeInTheDocument();
  });

  test('never renders a timeline for a user message', () => {
    const component = renderMessage({
      body: 'a user question',
      id: 'user-1',
      role: 'user',
    });

    expect(component.queryByTestId('ChatTurnTimeline')).not.toBeInTheDocument();
    expect(component.getByText('a user question')).toBeInTheDocument();
  });
});
