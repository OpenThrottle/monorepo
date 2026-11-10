import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_TELEMETRY_SCOPE_DOC_HREF,
} from '../../data/data.skill-usage-copy';
import { SkillUsageNotMeasured } from '../SkillUsageNotMeasured';

describe('SkillUsageNotMeasured Component', () => {
  test('links the muted label to the telemetry scope doc', () => {
    const component = render(
      <SkillUsageNotMeasured className={undefined} title="why" />,
    );
    const link = component.getByRole('link', {
      name: SKILL_USAGE_COPY.notMeasured,
    });

    expect(link).toHaveAttribute('href', SKILL_USAGE_TELEMETRY_SCOPE_DOC_HREF);
    expect(link).toHaveAttribute('title', 'why');
  });

  test('passes the caller className last', () => {
    const component = render(
      <SkillUsageNotMeasured className="custom-class" title="why" />,
    );

    expect(component.getByTestId('skill-usage-not-measured')).toHaveClass(
      'custom-class',
    );
  });
});
