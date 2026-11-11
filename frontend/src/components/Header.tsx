import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, getDashboardOverview } from '../services/api';
import { DashboardOverviewResponse } from '../types';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const refreshHeader = async () => {
      try {
        const data = await getDashboardOverview();
        setOverview(data);
        setApiReachable(true);
      } catch {
        setApiReachable(false);
      }
    };
    refreshHeader();
    const interval = setInterval(refreshHeader, 10000);
    return () => clearInterval(interval);
  }, []);

  const datacenter = overview?.consul?.connected
    ? overview.consul.datacenter || 'connected'
    : 'Unavailable';

  const wgStatus = overview?.wireguard?.status || 'UNKNOWN';
  const isPaymentCritical = overview?.azurePaymentService?.status === 'CRITICAL';
  const apiUrlLabel = getApiBaseUrl();

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-3 sm:px-space-lg gap-2 overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-space-sm min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container shrink-0"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
        <div className="flex items-center gap-1.5 px-2 sm:px-space-sm py-1 rounded-lg bg-surface-container-low min-w-0">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0">hub</span>
          <span className="hidden sm:inline font-label-md text-label-md text-on-surface font-medium">Datacenter:</span>
          <span className="font-code-sm text-code-sm text-primary font-medium truncate max-w-[90px] sm:max-w-[140px]">
            {apiReachable === null ? 'checking...' : datacenter}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container">
          <span className="material-symbols-outlined text-secondary text-[16px]">vpn_lock</span>
          <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">
            VPN: {wgStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-space-sm md:gap-space-md shrink-0">
        <div
          className="hidden lg:flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low text-on-surface-variant"
          title={`Backend API Gateway: ${apiUrlLabel}`}
        >
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          <span className="font-code-sm text-code-sm truncate max-w-[210px]">
            Gateway: {apiUrlLabel}
          </span>
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              apiReachable === null
                ? 'bg-outline'
                : apiReachable
                ? 'bg-tertiary-container'
                : 'bg-error'
            }`}
          ></span>
        </div>

        <button
          onClick={() => navigate('/service-discovery')}
          className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface text-on-surface-variant hover:text-on-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors"
          title="Go to Service Discovery Lookup"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="hidden sm:inline font-label-md text-label-md">Discover</span>
        </button>

        <button
          onClick={() => navigate('/health-monitoring')}
          className="relative p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          title={
            isPaymentCritical
              ? 'Alert: Azure Payment Service is CRITICAL — click to inspect'
              : 'View Health Monitoring'
          }
        >
          <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
          {isPaymentCritical && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error animate-ping"></span>
          )}
        </button>

        <div className="flex items-center gap-space-sm pl-space-xs">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">cloud_sync</span>
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="font-label-md text-label-md font-medium text-on-surface leading-tight">AWS ↔ Azure</span>
            <span className="font-code-sm text-code-sm text-secondary leading-tight">Mesh Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
};
