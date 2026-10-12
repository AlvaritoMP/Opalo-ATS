import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PublicComplementaryFicha } from './components/PublicComplementaryFicha';
import { PublicAssessments } from './components/PublicAssessments';
import { isPublicComplementaryFichaRoute } from './lib/complementaryFicha';
import { isPublicAssessmentsRoute } from './lib/assessments/publicRoute';
import { isLienzoRoute } from './lib/persuasion/popup';
import { PersuasionPopup } from './components/persuasion/PersuasionPopup';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const publicPruebas = isPublicAssessmentsRoute();
const publicFicha = !publicPruebas && isPublicComplementaryFichaRoute();
const lienzo = !publicPruebas && !publicFicha && isLienzoRoute();

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
    {publicPruebas ? <PublicAssessments /> : publicFicha ? <PublicComplementaryFicha /> : lienzo ? <PersuasionPopup /> : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
);
