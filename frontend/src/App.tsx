import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { ServiceRegistry } from './pages/ServiceRegistry';
import { ServiceDiscovery } from './pages/ServiceDiscovery';
import { HealthMonitoring } from './pages/HealthMonitoring';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-surface text-on-surface">
          <Sidebar />
          <div className="pl-64">
            <Header />
            <main className="relative pt-14 w-full min-h-screen bg-surface px-space-lg py-space-lg">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/service-registry" element={<ServiceRegistry />} />
                <Route path="/service-discovery" element={<ServiceDiscovery />} />
                <Route path="/health-monitoring" element={<HealthMonitoring />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;

