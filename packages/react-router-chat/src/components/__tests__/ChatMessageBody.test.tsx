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
    test('should render plain text, not Markdown', () => {
      expect(component.getByText('Hello')).toBeInTheDocument();
      // User bodies bypass the Markdown renderer entirely.
      expect(
        component.queryByTestId('MarkdownRenderer'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when role is assistant', () => {
    beforeEach(() => {
      props = { body: '**bold**', role: 'assistant' };
      component = renderBody(props);
    });

    test('should parse the body as Markdown', async () => {
      // The renderer is loaded lazily, so wait for it before asserting on its
      // output — until then the Suspense fallback shows the raw body.
      await component.findByTestId('MarkdownRenderer');

      // The renderer parses Markdown, so `**bold**` becomes a <strong> — not
      // the literal asterisks the old escaped renderer produced.
      const strong = component.container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong).toHaveTextContent('bold');
      expect(component.queryByText('**bold**')).not.toBeInTheDocument();
      expect(component.getByTestId('MarkdownRenderer')).toBeInTheDocument();
    });
  });

  describe('when role is system', () => {
    beforeEach(() => {
      props = { body: 'Notice', role: 'system' };
      component = renderBody(props);
    });

    test('should render the body through Markdown', async () => {
      expect(
        await component.findByTestId('MarkdownRenderer'),
      ).toBeInTheDocument();
      expect(component.getByText('Notice')).toBeInTheDocument();
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
  // (server LLM output + persisted history). The Markdown renderer parses
  // CommonMark (`format: 'md'`) with no `rehype-raw`, so embedded raw HTML is
  // dropped rather than injected as live DOM. These tests fail loudly if a
  // future swap re-enables raw HTML without sanitization.
  describe('when an untrusted body contains HTML injection payloads', () => {
    const SCRIPT_PAYLOAD = '<script>window.__xss = true;</script>';
    const IMG_PAYLOAD = '<img src=x onerror="window.__xss = true">';

    for (const role of ['assistant', 'system'] as const) {
      describe(`role ${role}`, () => {
        test('should not inject a live <script> element', async () => {
          component = renderBody({ body: SCRIPT_PAYLOAD, role });
          // Await the lazy renderer first: asserting absence before it mounts
          // would pass no matter what the renderer does with the payload.
          await component.findByTestId('MarkdownRenderer');

          expect(
            component.container.querySelector('script'),
          ).not.toBeInTheDocument();
        });

        test('should not inject a live <img onerror> element', async () => {
          component = renderBody({ body: IMG_PAYLOAD, role });
          await component.findByTestId('MarkdownRenderer');

          expect(
            component.container.querySelector('img'),
          ).not.toBeInTheDocument();
        });
      });
    }
  });
});
