import { render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../index';

describe('SelectScrollDownButton Component', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });
  });

  afterEach(() => {
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
    delete (HTMLElement.prototype as { scrollTop?: number }).scrollTop;
  });

  test('should render inside SelectContent when the viewport can scroll', async () => {
    const Component = () => (
      <Select defaultOpen={true}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 20 }, (_, index) => (
            <SelectItem key={index} value={String(index)}>
              Option {index}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    await waitFor(() => {
      const scrollControls = document.body.querySelectorAll(
        '.flex.cursor-default.items-center.justify-center.py-1',
      );
      expect(scrollControls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
