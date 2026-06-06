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
});
