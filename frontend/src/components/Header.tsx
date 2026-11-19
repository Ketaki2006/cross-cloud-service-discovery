import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, getDashboardOverview } from '../services/api';
import { DashboardOverviewResponse } from '../types';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

function resolveMode(overview: DashboardOverviewResponse | null): 'REMOTE' | 'LOCAL' | null {
  if (!overview) return null;
  if (overview.deploymentMode?.mode) return overview.deploymentMode.mode;
  const hasRemoteIndicator = Boolean(
    overview.wireguard?.hostInterfaceDetected ||
      overview.wireguard?.status === 'CONNECTED' ||
      overview.azurePaymentService?.address?.startsWith('10.8.0.') ||
      (overview.consul?.datacenter && overview.consul.datacenter !== 'dc1')
  );
  return hasRemoteIndicator ? 'REMOTE' : 'LOCAL';
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const refreshHeader = async () => {
      try {
        const data = await getDashboardOverview();
        if (!active) return;
        setOverview(data);
        setApiReachable(true);
      } catch {
        if (!active) return;
        setOverview(null);
        setApiReachable(false);
      }
    };

    refreshHeader();
    const interval = setInterval(refreshHeader, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const datacenter =
    apiReachable === false
      ? 'Disconnected'
      : overview?.consul?.connected
      ? overview.consul.datacenter || 'connected'
      : 'Unavailable';

  const wgStatus = apiReachable === false ? 'UNKNOWN' : overview?.wireguard?.status || 'UNKNOWN';
  const mode = apiReachable === false ? null : resolveMode(overview);
  const isVpnActive = Boolean(
    apiReachable &&
      (overview?.wireguard?.active ?? (wgStatus === 'CONNECTED' && overview?.wireguard?.hostInterfaceDetected !== false))
  );
  const isPaymentCritical = Boolean(apiReachable && overview?.azurePaymentService?.status === 'CRITICAL');
  const apiUrlLabel = getApiBaseUrl();

  const vpnPillText =
    apiReachable === null
      ? 'checking...'
      : apiReachable === false
      ? 'DISCONNECTED'
      : isVpnActive
      ? overview?.wireguard?.handshakeAgeSeconds !== null && overview?.wireguard?.handshakeAgeSeconds !== undefined
        ? `CONNECTED (${overview.wireguard.handshakeAgeSeconds}s)`
        : 'CONNECTED'
      : wgStatus === 'DEGRADED'
      ? 'DEGRADED'
      : wgStatus === 'STALE_HANDSHAKE'
      ? 'STALE HANDSHAKE'
      : wgStatus === 'NO_HANDSHAKE'
      ? 'NO HANDSHAKE'
      : wgStatus === 'UNVERIFIED'
      ? 'UNVERIFIED'
      : mode === 'LOCAL' || wgStatus === 'INACTIVE'
      ? 'INACTIVE (Local)'
      : 'UNKNOWN';

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
          <span
            className={`font-code-sm text-code-sm font-medium truncate max-w-[90px] sm:max-w-[140px] ${
              apiReachable === false ? 'text-error' : 'text-primary'
            }`}
          >
            {apiReachable === null ? 'checking...' : datacenter}
          </span>
        </div>
        {mode && (
          <div
            className={`hidden md:flex items-center gap-1 px-space-sm py-space-xs rounded-lg font-code-sm text-code-sm font-semibold ${
              mode === 'REMOTE'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                : 'bg-secondary-container text-on-secondary-container'
            }`}
            title={overview?.deploymentMode?.reason || `Connected to ${datacenter}`}
          >
            <span>{mode === 'REMOTE' ? 'REMOTE AWS' : 'LOCAL MODE'}</span>
          </div>
        )}
        <div
          className={`hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg ${
            isVpnActive
              ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
              : apiReachable === false || ['DEGRADED', 'STALE_HANDSHAKE', 'NO_HANDSHAKE', 'UNVERIFIED'].includes(wgStatus)
              ? 'bg-error-container text-on-error-container'
              : 'bg-surface-container text-on-surface-variant'
          }`}
          title={overview?.wireguard?.detail || 'Gateway unreachable'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isVpnActive ? 'vpn_lock' : 'link_off'}
          </span>
          <span className="font-code-sm text-code-sm font-medium">
            VPN: {vpnPillText}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-space-sm md:gap-space-md shrink-0">
        <div
          className={`hidden lg:flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg ${
            apiReachable === false
              ? 'bg-error-container text-on-error-container'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
          title={`Backend API Gateway: ${apiUrlLabel}${overview?.consul?.nodeName ? ` (Node: ${overview.consul.nodeName})` : ''}`}
        >
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          <span className="font-code-sm text-code-sm truncate max-w-[230px]">
            Gateway: {apiReachable === false ? `OFFLINE (${apiUrlLabel})` : overview?.gateway?.hostname || overview?.consul?.nodeName || apiUrlLabel}
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
          className={`relative p-2 rounded-lg transition-colors ${
            isPaymentCritical
              ? 'bg-error-container text-on-error-container'
              : 'hover:bg-surface-container text-on-surface-variant'
          }`}
          title={
            isPaymentCritical
              ? 'Critical: Azure Payment Service failing health check'
              : 'Consul discovery status'
          }
        >
          <span className="material-symbols-outlined text-[20px]">
            {isPaymentCritical ? 'warning' : 'notifications'}
          </span>
          {isPaymentCritical && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error animate-ping"></span>
          )}
        </button>

        <div className="flex items-center gap-space-xs pl-2 bg-surface-container-low/50 py-1 px-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-label-md text-label-md font-bold">
            CC
          </div>
          <span className="hidden md:inline font-label-md text-label-md text-on-surface font-medium">
            {mode === 'REMOTE' ? 'AWS ↔ Azure' : apiReachable === false ? 'Disconnected' : 'Operator'}
          </span>
        </div>
      </div>
    </header>
  );
};
