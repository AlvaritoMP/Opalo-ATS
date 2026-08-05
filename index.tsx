import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PublicComplementaryFicha } from './components/PublicComplementaryFicha';
import { isPublicComplementaryFichaRoute } from './lib/complementaryFicha';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const publicFicha = isPublicComplementaryFichaRoute();

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      {publicFicha ? <PublicComplementaryFicha /> : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
);
