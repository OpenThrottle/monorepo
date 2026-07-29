import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineErrors } from '@openthrottle/react-router-shadcn';

describe('InlineErrors', () => {
  it('renders nothing when every entry is filtered out', () => {
    const { container } = render(
      <InlineErrors errors={[null, undefined, false, '']} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
