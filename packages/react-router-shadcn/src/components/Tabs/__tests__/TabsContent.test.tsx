import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Tabs } from '../Tabs';
import { TabsContent } from '../TabsContent';
import type { TabsContentProps } from '../TabsContent';
import { TabsList } from '../TabsList';
import { TabsTrigger } from '../TabsTrigger';

describe('TabsContent Component', () => {
  test('renders tab panel content inside Tabs context', () => {
    const props: TabsContentProps = { value: 'a' };

    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Tab</TabsTrigger>
        </TabsList>
        <TabsContent {...props}>Panel body</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel body');
  });
});
