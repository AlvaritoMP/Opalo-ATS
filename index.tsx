import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PublicComplementaryFicha } from './components/PublicComplementaryFicha';
import { PublicAssessments } from './components/PublicAssessments';
import { isPublicComplementaryFichaRoute } from './lib/complementaryFicha';
import { isPublicAssessmentsRoute } from './lib/assessments/publicRoute';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const publicPruebas = isPublicAssessmentsRoute();
const publicFicha = !publicPruebas && isPublicComplementaryFichaRoute();

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
    {publicPruebas ? <PublicAssessments /> : publicFicha ? <PublicComplementaryFicha /> : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
);
