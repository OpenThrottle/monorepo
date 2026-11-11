import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { LogicParams } from '../LogicParams';

const renderAt = (url: string, children: React.ReactNode) => {
  const Component = () => {
    return (
      <LogicParams param="variant" value="b">
        {children}
      </LogicParams>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[url]} />);
};

describe('LogicParams', () => {
  describe('when the param matches', () => {
    test('renders the first child', () => {
      const component = renderAt('/?variant=b', [
        <p key="match">match</p>,
        <p key="fallback">fallback</p>,
      ]);

      expect(component.getByText('match')).toBeInTheDocument();
      expect(component.queryByText('fallback')).toBeNull();
    });
  });

  describe('when the param does not match', () => {
    test('renders the second child', () => {
      const component = renderAt('/?variant=a', [
        <p key="match">match</p>,
        <p key="fallback">fallback</p>,
      ]);

      expect(component.getByText('fallback')).toBeInTheDocument();
      expect(component.queryByText('match')).toBeNull();
    });

    test('renders nothing without a fallback', () => {
      const component = renderAt('/', <p>match</p>);

      expect(component.queryByText('match')).toBeNull();
    });
  });
});
