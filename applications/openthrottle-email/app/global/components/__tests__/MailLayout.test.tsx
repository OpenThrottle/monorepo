import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MailLayout } from '../MailLayout';
import type { MailLayoutProps } from '../MailLayout';

describe('MailLayout Component', () => {
  let component: RenderResult;
  let props: MailLayoutProps;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: '',
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
      writable: true,
    });
    props = { children: <div>Child content</div> };

    const Component = () => <MailLayout {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders layout shell with toolbar/sidebar and children', () => {
    expect(component.getByTestId('MailLayout')).toBeInTheDocument();
    expect(component.getAllByTestId('MailSidebar').length).toBeGreaterThan(0);
    expect(component.getByTestId('MailToolbar')).toBeInTheDocument();
    expect(component.getByText('Child content')).toBeInTheDocument();
  });
});
