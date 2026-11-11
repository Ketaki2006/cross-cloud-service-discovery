import React, { useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden">
          <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <div className="md:pl-64 transition-all min-w-0">
            <Header onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
            <main className="relative pt-14 w-full max-w-full min-h-screen bg-surface px-3 sm:px-space-lg py-space-lg overflow-x-hidden">
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
