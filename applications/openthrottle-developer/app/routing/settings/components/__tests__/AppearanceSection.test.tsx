import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearanceSection } from '../AppearanceSection';
import type { AppearanceSectionProps } from '../AppearanceSection';

describe('AppearanceSection Component', () => {
  let component: RenderResult;
  let props: AppearanceSectionProps;

  beforeEach(() => {
    props = {
      children: <p>Section body</p>,
      description: 'How the portal looks.',
      id: 'color-scheme',
      title: 'Color scheme',
    };

    component = render(<AppearanceSection {...props} />);
  });

  test('renders the title, description, and children', () => {
    expect(component.getByText('Color scheme')).toBeInTheDocument();
    expect(component.getByText('How the portal looks.')).toBeInTheDocument();
    expect(component.getByText('Section body')).toBeInTheDocument();
  });

  test('exposes the section id for registry-driven assertions', () => {
    expect(component.getByTestId('AppearanceSection')).toHaveAttribute(
      'data-section-id',
      'color-scheme',
    );
  });

  test('omits the description element when no description is given', () => {
    component.unmount();
    const withoutDescription = render(
      <AppearanceSection id="palette" title="Palette">
        <p>Body</p>
      </AppearanceSection>,
    );

    expect(
      withoutDescription.queryByText('How the portal looks.'),
    ).not.toBeInTheDocument();
  });
});
