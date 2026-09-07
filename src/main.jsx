import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import WeddingSite from './pages/WeddingSite.jsx';
import WeddingAdmin from './pages/WeddingAdmin.jsx';
import { initializeMicrosoftAuth } from './services/weddingExcel.js';
import './styles.css';

const render = () => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><HashRouter><Routes><Route path="/" element={<WeddingSite />} /><Route path="/admin" element={<WeddingAdmin />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></HashRouter></React.StrictMode>,
);

initializeMicrosoftAuth().catch(() => {}).finally(render);
