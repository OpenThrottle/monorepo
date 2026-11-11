import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { Carousel } from '../../components/Carousel/Carousel';
import { useCarousel } from '../useCarousel';

describe('useCarousel', () => {
  describe('inside a Carousel', () => {
    test('returns the carousel context', () => {
      const wrapper = (props: {
        readonly children: React.ReactNode;
      }): React.ReactElement => {
        return <Carousel>{props.children}</Carousel>;
      };

      const { result } = renderHook(() => useCarousel(), { wrapper });

      expect(result.current.orientation).toBe('horizontal');
      expect(typeof result.current.scrollNext).toBe('function');
      expect(typeof result.current.scrollPrev).toBe('function');
    });
  });

  describe('outside a Carousel', () => {
    test('throws', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => renderHook(() => useCarousel())).toThrow(
        'useCarousel must be used within a <Carousel />.',
      );
      consoleError.mockRestore();
    });
  });
});
