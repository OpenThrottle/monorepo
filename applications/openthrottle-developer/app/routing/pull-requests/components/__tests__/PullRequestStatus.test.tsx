import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestStatus } from '../PullRequestStatus';
import type { PullRequestStatusProps } from '../PullRequestStatus';

describe('PullRequestStatus Component', () => {
  let component: RenderResult;
  let props: PullRequestStatusProps;

  describe('when state is open', () => {
    beforeEach(() => {
      props = { state: 'open' };
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('exposes open in screen reader text', () => {
      expect(component.getByText('open')).toHaveClass('sr-only');
    });
  });

  describe('when state is closed', () => {
    beforeEach(() => {
      props = { state: 'closed' };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('exposes closed in screen reader text', () => {
      expect(component.getByText('closed')).toHaveClass('sr-only');
    });
  });

  describe('when state is merged', () => {
    beforeEach(() => {
      props = { state: 'merged' };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('exposes merged in screen reader text', () => {
      expect(component.getByText('merged')).toHaveClass('sr-only');
    });
  });

  describe('when state is draft', () => {
    beforeEach(() => {
      props = { state: 'draft' };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('exposes draft in screen reader text', () => {
      expect(component.getByText('draft')).toHaveClass('sr-only');
    });
  });

  describe('when state is reopened', () => {
    beforeEach(() => {
      props = { state: 'reopened' };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('exposes reopened in screen reader text', () => {
      expect(component.getByText('reopened')).toHaveClass('sr-only');
    });
  });

  describe('when state is syncing', () => {
    beforeEach(() => {
      props = { state: 'syncing' };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('exposes syncing in screen reader text', () => {
      expect(component.getByText('syncing')).toHaveClass('sr-only');
    });
  });

  describe('when state is unknown', () => {
    beforeEach(() => {
      props = { state: 'unknown' };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestStatus {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('still exposes the raw state for assistive tech', () => {
      expect(component.getByText('unknown')).toHaveClass('sr-only');
    });
  });
});
