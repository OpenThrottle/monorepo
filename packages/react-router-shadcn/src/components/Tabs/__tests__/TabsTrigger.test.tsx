import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Tabs } from '../Tabs';
import { TabsContent } from '../TabsContent';
import { TabsList } from '../TabsList';
import { TabsTrigger } from '../TabsTrigger';
import type { TabsTriggerProps } from '../TabsTrigger';

describe('TabsTrigger Component', () => {
  test('renders tab trigger inside Tabs context', () => {
    const props: TabsTriggerProps = { value: 'a' };

    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger {...props}>Label</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Label' })).toBeInTheDocument();
  });
});
