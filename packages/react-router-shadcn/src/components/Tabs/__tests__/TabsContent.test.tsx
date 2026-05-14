import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Tabs } from '../Tabs';
import { TabsContent } from '../TabsContent';
import type { TabsContentProps } from '../TabsContent';
import { TabsList } from '../TabsList';
import { TabsTrigger } from '../TabsTrigger';

describe('TabsContent Component', () => {
  test('should render inside Tabs', () => {
    const props: TabsContentProps = { value: 'a' };

    const { baseElement } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Tab</TabsTrigger>
        </TabsList>
        <TabsContent {...props}>Panel</TabsContent>
      </Tabs>,
    );

    expect(baseElement).toMatchSnapshot();
  });
});
