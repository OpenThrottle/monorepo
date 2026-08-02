import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RULES_COPY } from '../../data/data.copy';
import { RulesIntroduction } from '../RulesIntroduction';
import type { RulesIntroductionProps } from '../RulesIntroduction';

describe('RulesIntroduction Component', () => {
  let component: RenderResult;
  let props: RulesIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <RulesIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render page heading and description from RULES_COPY', () => {
    expect(component.getByTestId('RulesIntroduction')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        level: 1,
        name: RULES_COPY.pageTitle,
      }),
    ).toBeInTheDocument();
    expect(component.getByText(RULES_COPY.pageDescription)).toBeInTheDocument();
  });
});
