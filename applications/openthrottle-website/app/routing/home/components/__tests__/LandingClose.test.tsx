import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { LANDING_CLOSE } from '~/routing/home/data/data.landing';
import { LandingClose } from '../LandingClose';

describe('LandingClose Component', () => {
  test('renders copy, CTAs, and the terminal snippet from data', () => {
    const component = render(<LandingClose />);

    expect(component.getByTestId('LandingClose')).toBeInTheDocument();
    expect(component.getByText(LANDING_CLOSE.title)).toBeInTheDocument();
    expect(component.getByText(LANDING_CLOSE.lede)).toBeInTheDocument();
    expect(
      component.getByText('cd monorepo && ./scripts/setup.sh'),
    ).toBeInTheDocument();

    expect(
      component.getByRole('link', { name: LANDING_CLOSE.ctas.secondary.label }),
    ).toHaveAttribute('href', LANDING_CLOSE.ctas.secondary.href);
  });

  test('defaults the clone CTA to the data href', () => {
    const component = render(<LandingClose />);

    expect(
      component.getByRole('link', { name: LANDING_CLOSE.ctas.primary.label }),
    ).toHaveAttribute('href', LANDING_CLOSE.ctas.primary.href);
  });

  test('overrides lede and clone href from props', () => {
    const component = render(
      <LandingClose introduction="Spin it up locally" repo="acme/widgets" />,
    );

    expect(component.getByText('Spin it up locally')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: LANDING_CLOSE.ctas.primary.label }),
    ).toHaveAttribute('href', 'https://github.com/acme/widgets');
  });
});
