import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PublicComplementaryFicha } from './components/PublicComplementaryFicha';
import { PublicAssessments } from './components/PublicAssessments';
import { isPublicComplementaryFichaRoute } from './lib/complementaryFicha';
import { isPublicAssessmentsRoute } from './lib/assessments/publicRoute';
import { isPublicShortlistRoute } from './lib/shortlists';
import { isLienzoRoute } from './lib/persuasion/popup';
import { PersuasionPopup } from './components/persuasion/PersuasionPopup';
import { PublicShortlist } from './components/PublicShortlist';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const publicPruebas = isPublicAssessmentsRoute();
const publicFicha = !publicPruebas && isPublicComplementaryFichaRoute();
const publicSala = !publicPruebas && !publicFicha && isPublicShortlistRoute();
const lienzo = !publicPruebas && !publicFicha && !publicSala && isLienzoRoute();

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
    {publicPruebas ? <PublicAssessments /> : publicFicha ? <PublicComplementaryFicha /> : publicSala ? <PublicShortlist /> : lienzo ? <PersuasionPopup /> : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
);
