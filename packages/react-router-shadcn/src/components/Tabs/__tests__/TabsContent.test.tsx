import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Tabs } from '../Tabs';
import type { TabsContentProps } from '../TabsContent';
import { TabsContent } from '../TabsContent';
import { TabsList } from '../TabsList';
import { TabsTrigger } from '../TabsTrigger';

describe('TabsContent Component', () => {
  test('renders tab panel content inside Tabs context', () => {
    const props: TabsContentProps = { value: 'a' };

    const component = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Tab</TabsTrigger>
        </TabsList>
        <TabsContent {...props}>Panel body</TabsContent>
      </Tabs>,
    );

    expect(component.getByRole('tabpanel')).toHaveTextContent('Panel body');
  });
});
