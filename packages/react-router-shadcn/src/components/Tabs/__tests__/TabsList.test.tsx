import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Tabs } from '../Tabs';
import { TabsContent } from '../TabsContent';
import { TabsList } from '../TabsList';
import type { TabsListProps } from '../TabsList';
import { TabsTrigger } from '../TabsTrigger';

describe('TabsList Component', () => {
  test('renders tab list with trigger inside Tabs context', () => {
    const props: TabsListProps = {};

    render(
      <Tabs defaultValue="a">
        <TabsList {...props}>
          <TabsTrigger value="a">Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Body</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Tab' })).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
