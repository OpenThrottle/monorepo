import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ComingSoon } from '../ComingSoon';
import type { ComingSoonProps } from '../ComingSoon';

describe('ComingSoon Component', () => {
  let component: RenderResult;
  let props: ComingSoonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ComingSoon {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.getByTestId('ComingSoon')).toBeInTheDocument();
  });

  test('should show default title and message', () => {
    expect(component.getByText('Coming soon')).toBeInTheDocument();
    expect(component.getByText("We're working on it.")).toBeInTheDocument();
  });

  test('should show custom title and message when provided', () => {
    component.rerender(
      <ComingSoon message="This feature is in progress." title="On the way" />,
    );
    expect(component.getByText('On the way')).toBeInTheDocument();
    expect(
      component.getByText('This feature is in progress.'),
    ).toBeInTheDocument();
  });
});
