import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { SkillsIndexContentProps } from '../SkillsIndexContent';
import { SkillsIndexContent } from '../SkillsIndexContent';

describe('SkillsIndexContent Component', () => {
  const renderContent = (props: SkillsIndexContentProps) => {
    const Component = () => {
      return <SkillsIndexContent {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  test('should render the onboarding pitch instead of the table for a new user', async () => {
    const component = renderContent({ entries: [], tagVocabulary: [] });

    expect(
      await component.findByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.queryByTestId('SkillsTable')).not.toBeInTheDocument();
  });
});
