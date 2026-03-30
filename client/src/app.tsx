import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ScanPage from './pages/ScanPage/ScanPage';
import ReviewPage from './pages/ReviewPage/ReviewPage';
import AuthPage from './pages/AuthPage/AuthPage';
import TemplatePage from './pages/TemplatePage/TemplatePage';
import SendPage from './pages/SendPage/SendPage';
import LogPage from './pages/LogPage/LogPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ScanPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/template" element={<TemplatePage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/log" element={<LogPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
