import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocumentUploadProgress } from '../DocumentUploadProgress';

describe('DocumentUploadProgress Component', () => {
  test('renders nothing when idle', () => {
    const Component = () => <DocumentUploadProgress state={{ kind: 'idle' }} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { queryByTestId } = render(<RoutesStub />);

    expect(queryByTestId('DocumentUploadProgress')).toBeNull();
  });

  test('renders busy status when parsing', () => {
    const Component = () => (
      <DocumentUploadProgress
        state={{ kind: 'busy', message: 'Parsing…', value: 50 }}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId, getByText } = render(<RoutesStub />);

    expect(getByTestId('DocumentUploadProgress')).toBeInTheDocument();
    expect(getByText('Parsing…')).toBeInTheDocument();
  });
});
