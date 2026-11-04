import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getConsulStatus } from '../services/api';
import { ConsulStatusResponse } from '../types';

export const Sidebar: React.FC = () => {
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
    const interval = setInterval(checkStatus, 6000);
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

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-inverse-surface z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col">
        {/* Brand / Logo */}
        <div className="h-14 px-space-md flex items-center gap-space-sm bg-inverse-surface">
          <img
            alt="CrossCloud Registry Logo"
            className="h-8 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1W-4FDEw452upWPbwGsbUExFm_jlChbRJTj1WVjO-4hqlOXqQ5nsCDQPwyfkHZNhlFuY31p_KnftoNnil82OyLwJL3sAnEBBN2fcHbh1Jb8CCq6gcg3VKrHLLL0DYTJjxyzSDe65arQyImWDQMYRoX9g5rW3gUUXac5XTbLAGICmwFDDvFCyGxZKOvzZZvkrAlpzP0z2nef0pCXIvTl4IQrEGu2yRdZ7w5zQ7Fywm0QTMFX2UWfkinzMQ"
          />
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg font-semibold text-inverse-on-surface leading-tight tracking-tight">
              CrossCloud Registry
            </span>
            <span className="font-code-sm text-code-sm text-inverse-primary leading-none">
              Consul Engine v1.20.0
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-space-xs px-space-sm mt-space-md">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
                  isConnected ? 'bg-tertiary-fixed' : 'bg-error'
                }`}
              ></span>
            </span>
            <span
              className={`font-code-sm text-code-sm uppercase font-semibold ${
                isConnected ? 'text-tertiary-fixed' : 'text-error'
              }`}
            >
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <span className="font-code-sm text-code-sm text-inverse-on-surface/60">5s sync</span>
        </div>
        <div className="font-code-sm text-code-sm text-inverse-on-surface/70 truncate">
          Leader:{' '}
          <span className="text-inverse-on-surface font-code-sm text-code-sm">
            {consulInfo?.leader || 'consul-core-01'}
          </span>
        </div>
        <div className="font-code-sm text-code-sm text-inverse-on-surface/50">Datacenter: dc1</div>
      </div>
    </aside>
  );
};

