import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChatMessageBody } from '../ChatMessageBody';
import type { ChatMessageBodyProps } from '../ChatMessageBody';

describe('ChatMessageBody Component', () => {
  let component: RenderResult;
  let props: ChatMessageBodyProps;

  const renderBody = (p: ChatMessageBodyProps): RenderResult => {
    const Comp = () => <ChatMessageBody {...p} />;
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { body: 'Hello', role: 'user' };
    component = renderBody(props);
  });

  describe('when role is user', () => {
    test('should render plain text', () => {
      expect(component.getByText('Hello')).toBeInTheDocument();
      expect(component.queryByRole('code')).not.toBeInTheDocument();
    });
  });

  describe('when role is assistant', () => {
    beforeEach(() => {
      props = { body: '**bold**', role: 'assistant' };
      component = renderBody(props);
    });

    test('should render via Markdown', () => {
      expect(component.getByText('**bold**')).toBeInTheDocument();
      expect(component.getByRole('code')).toBeInTheDocument();
    });
  });

  describe('when role is system', () => {
    beforeEach(() => {
      props = { body: 'Notice', role: 'system' };
      component = renderBody(props);
    });

    test('should render via Markdown', () => {
      expect(component.getByText('Notice')).toBeInTheDocument();
      expect(component.getByRole('code')).toBeInTheDocument();
    });
  });

  describe('when body is empty or whitespace', () => {
    test('should show empty fallback for blank body', () => {
      component = renderBody({ body: '', role: 'assistant' });
      expect(component.getByText('(No content)')).toBeInTheDocument();
    });

    test('should show empty fallback for whitespace-only body', () => {
      component = renderBody({ body: '   \n  ', role: 'user' });
      expect(component.getByText('(No content)')).toBeInTheDocument();
    });
  });

  // XSS / HTML-injection regression. Assistant/system bodies are untrusted
  // (server LLM output + persisted history). The body MUST be rendered as
  // literal text, never injected as live DOM. This guards the current escaped
  // renderer and will fail loudly if a future real Markdown renderer enables
  // raw HTML without sanitization.
  describe('when an untrusted body contains HTML injection payloads', () => {
    const SCRIPT_PAYLOAD = '<script>window.__xss = true;</script>';
    const IMG_PAYLOAD = '<img src=x onerror="window.__xss = true">';

    for (const role of ['assistant', 'system'] as const) {
      describe(`role ${role}`, () => {
        test('should render a <script> payload as literal text, not a live element', () => {
          component = renderBody({ body: SCRIPT_PAYLOAD, role });

          expect(component.getByText(SCRIPT_PAYLOAD)).toBeInTheDocument();
          expect(
            component.container.querySelector('script'),
          ).not.toBeInTheDocument();
        });

        test('should render an <img onerror> payload as literal text, not a live element', () => {
          component = renderBody({ body: IMG_PAYLOAD, role });

          expect(component.getByText(IMG_PAYLOAD)).toBeInTheDocument();
          expect(
            component.container.querySelector('img'),
          ).not.toBeInTheDocument();
        });
      });
    }
  });
});
