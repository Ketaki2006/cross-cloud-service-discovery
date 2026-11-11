import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getConsulStatus } from '../services/api';
import { ConsulStatusResponse } from '../types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const [consulInfo, setConsulInfo] = useState<ConsulStatusResponse | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getConsulStatus();
        setConsulInfo(res);
      } catch {
        setConsulInfo(null);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { to: '/', label: 'Overview', icon: 'grid_view' },
    { to: '/service-registry', label: 'Service Registry', icon: 'dns' },
    { to: '/service-discovery', label: 'Service Discovery', icon: 'radar' },
    { to: '/health-monitoring', label: 'Health Monitoring', icon: 'monitor_heart' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const isConnected = consulInfo?.connected ?? false;
  const statusLabel = consulInfo === null ? 'UNKNOWN' : isConnected ? 'CONNECTED' : 'UNAVAILABLE';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-inverse-surface/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-inverse-surface z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand / Logo */}
          <div className="h-14 px-space-md flex items-center justify-between bg-inverse-surface">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg font-semibold text-inverse-on-surface leading-tight tracking-tight">
                  CrossCloud Registry
                </span>
                <span className="font-code-sm text-code-sm text-inverse-primary leading-none">
                  Consul {consulInfo?.version && consulInfo.version !== 'Unknown' ? `v${consulInfo.version}` : 'Mesh Agent'}
                </span>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1 text-inverse-on-surface/70 hover:text-inverse-on-surface"
                aria-label="Close navigation"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>

          {/* Navigation items */}
          <nav className="flex flex-col gap-space-xs px-space-sm mt-space-md">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-space-sm px-space-sm py-space-xs transition-colors bg-primary-container text-on-primary-container font-label-lg rounded-lg shadow-sm'
                    : 'flex items-center gap-space-sm px-space-sm py-space-xs text-inverse-on-surface/80 hover:bg-surface-container-high/10 hover:text-inverse-on-surface rounded-lg transition-colors font-label-lg text-label-lg'
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Cluster Footer Info */}
        <div className="p-space-sm m-space-sm rounded-lg bg-surface-container-high/10 flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-tertiary-fixed' : consulInfo === null ? 'bg-outline' : 'bg-error'
                  }`}
                ></span>
              </span>
              <span
                className={`font-code-sm text-code-sm uppercase font-semibold ${
                  isConnected ? 'text-tertiary-fixed' : consulInfo === null ? 'text-inverse-on-surface/60' : 'text-error'
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <span className="font-code-sm text-code-sm text-inverse-on-surface/60">10s sync</span>
          </div>
          <div className="font-code-sm text-code-sm text-inverse-on-surface/70 truncate">
            Leader:{' '}
            <span className="text-inverse-on-surface font-code-sm text-code-sm">
              {isConnected ? consulInfo?.leader || 'Elected' : 'Unavailable'}
            </span>
          </div>
          <div className="font-code-sm text-code-sm text-inverse-on-surface/50 truncate">
            Datacenter: {isConnected && consulInfo?.datacenter ? consulInfo.datacenter : 'Unknown'}
          </div>
        </div>
      </aside>
    </>
  );
};
