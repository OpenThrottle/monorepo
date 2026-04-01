import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TypeMultiSelect } from '../TypeMultiSelect';
import type { TypeMultiSelectProps } from '../TypeMultiSelect';

describe('TypeMultiSelect Component', () => {
  let component: RenderResult;
  let props: TypeMultiSelectProps;

  beforeEach(() => {
    props = {
      'data-testid': 'TypeMultiSelect',
      onChange: vi.fn(),
      value: [],
    };

    const Component = () => <TypeMultiSelect {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid', () => {
    expect(component.getByTestId('TypeMultiSelect')).toBeInTheDocument();
  });

  test('should show "Type…" as trigger label when no value selected', () => {
    expect(component.getByRole('combobox')).toHaveTextContent('Type…');
  });

  describe('when compact and values are selected', () => {
    beforeEach(() => {
      cleanup();
      props = {
        compact: true,
        'data-testid': 'TypeMultiSelect',
        onChange: vi.fn(),
        value: ['AGENTS', 'SKILLS'],
      };

      const Component = () => <TypeMultiSelect {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should show count in trigger label', () => {
      expect(component.getByRole('combobox')).toHaveTextContent('Type (2)');
    });
  });

  describe('when not compact and values are selected', () => {
    beforeEach(() => {
      cleanup();
      props = {
        compact: false,
        'data-testid': 'TypeMultiSelect',
        onChange: vi.fn(),
        value: ['AGENTS'],
      };

      const Component = () => <TypeMultiSelect {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should show badges for selected values', () => {
      expect(component.getByText('Agents')).toBeInTheDocument();
    });
  });
});
