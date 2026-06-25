import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { default as Route, loader } from '../_layout.mail.inbox.$id';

describe('routes/_layout.mail.inbox.$id.tsx', () => {
  test('should render MessageDetail', () => {
    const RoutesStub = createRoutesStub([
      { Component: (props: any) => <Route {...props} />, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('MessageDetail')).toBeInTheDocument();
  });

  describe('loader', () => {
    test('throws a 404 Response for an unknown message id', async () => {
      const args: Parameters<typeof loader>[0] = {
        context: {},
        params: { id: 'does-not-exist' },
        request: new Request('http://localhost/mail/inbox/does-not-exist'),
      };

      const thrown = await loader(args).then(
        () => null,
        (error: unknown) => error,
      );

      expect(thrown).toBeInstanceOf(Response);
      if (!(thrown instanceof Response)) {
        throw new Error('Expected loader to throw a Response');
      }
      expect(thrown.status).toBe(404);
    });
  });
});
