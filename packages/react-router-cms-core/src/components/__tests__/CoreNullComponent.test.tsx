import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { CoreNullComponent } from '../CoreNullComponent';

describe('CoreNullComponent', () => {
  test('renders nothing, children included', () => {
    const component = render(
      <CoreNullComponent properties={{}}>
        <p>child</p>
      </CoreNullComponent>,
    );

    expect(component.container).toBeEmptyDOMElement();
  });
});
