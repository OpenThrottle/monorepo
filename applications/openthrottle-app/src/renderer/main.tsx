import './styles.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { ConnectionScreen } from './components/ConnectionScreen.tsx';
import { CONNECTION_COPY } from './data/data.copy.ts';

const container = document.getElementById('root');
const bridge = window.openthrottleShell;
const buildScreen = (): React.ReactElement => {
  if (bridge === undefined) {
    return <p>{CONNECTION_COPY.missingBridge}</p>;
  }

  return <ConnectionScreen bridge={bridge} />;
};

if (container !== null) {
  createRoot(container).render(
    <React.StrictMode>{buildScreen()}</React.StrictMode>,
  );
}
