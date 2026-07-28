import '@testing-library/jest-dom';

/**
 * @description This package is pure state/logic (no component rendering), so the
 * jsdom environment only needs to exist for the atom's localStorage-backed
 * storage. No Radix/ResizeObserver stubs are required here.
 */
