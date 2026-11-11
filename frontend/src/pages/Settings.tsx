import React, { useState, useEffect, useCallback } from 'react';
import {
  getConsulStatus,
  getApiOverview,
  getDashboardOverview,
  getApiBaseUrl,
} from '../services/api';
import { ConsulStatusResponse, DashboardOverviewResponse } from '../types';
import { useToast } from '../components/Toast';

export const Settings: React.FC = () => {
  const { showToast } = useToast();

  // Live infrastructure states (never assumed healthy!)
  const [consulStatus, setConsulStatus] = useState<ConsulStatusResponse | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [consulTestStatus, setConsulTestStatus] = useState<string>('Checking Consul status...');
  const [consulTestLoading, setConsulTestLoading] = useState(false);

  const [apiTestStatus, setApiTestStatus] = useState<string>('Checking Gateway API...');
  const [apiTestLoading, setApiTestLoading] = useState(false);

  // Preference states
  const [pollingInterval, setPollingInterval] = useState('10s');
  const [logLevel, setLogLevel] = useState('info');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [compactRows, setCompactRows] = useState(false);

  const handleTestConsul = useCallback(async (silent = false) => {
    setConsulTestLoading(true);
    const start = Date.now();
    try {
      const data = await getConsulStatus();
      setConsulStatus(data);
      const latency = Date.now() - start;
      if (data.connected) {
        setConsulTestStatus(`Connected (${latency}ms) • Leader ${data.leader}`);
        if (!silent) showToast(`Consul connected (${latency}ms) — Datacenter: ${data.datacenter}`, 'success');
      } else {
        setConsulTestStatus('Unavailable — Consul agent offline');
        if (!silent) showToast('Consul agent is offline or unreachable.', 'error');
      }
    } catch (err: any) {
      setConsulStatus(null);
      setConsulTestStatus(`Unavailable: ${err.message}`);
      if (!silent) showToast(`Consul test failed: ${err.message}`, 'error');
    } finally {
      setConsulTestLoading(false);
    }
  }, [showToast]);

  const handleTestApi = useCallback(async (silent = false) => {
    setApiTestLoading(true);
    const start = Date.now();
    try {
      const [apiData, ovData] = await Promise.all([
        getApiOverview(),
        getDashboardOverview().catch(() => null),
      ]);
      if (ovData) setOverview(ovData);
      const latency = Date.now() - start;
      if (apiData.status === 'running') {
        setApiTestStatus(`HTTP 200 OK (${latency}ms) • Express Gateway :${apiData.port}`);
        if (!silent) showToast(`Express Gateway v${apiData.version || '1.1.0'} online (${latency}ms)`, 'success');
      } else {
        setApiTestStatus('API returned non-running status');
      }
    } catch (err: any) {
      setApiTestStatus(`Unavailable: ${err.message}`);
      if (!silent) showToast(`Express Gateway unreachable: ${err.message}`, 'error');
    } finally {
      setApiTestLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const savedPolling = localStorage.getItem('cc_polling_interval');
    if (savedPolling) setPollingInterval(savedPolling);

    const savedLogLevel = localStorage.getItem('cc_log_level');
    if (savedLogLevel) setLogLevel(savedLogLevel);

    handleTestConsul(true);
    handleTestApi(true);
  }, [handleTestConsul, handleTestApi]);

  const savePreferences = () => {
    localStorage.setItem('cc_polling_interval', pollingInterval);
    localStorage.setItem('cc_log_level', logLevel);
    showToast('Configuration preferences saved to local storage.', 'success');
  };

  const resetPreferences = () => {
    setPollingInterval('10s');
    setLogLevel('info');
    setEnableNotifications(true);
    setCompactRows(false);
    localStorage.removeItem('cc_polling_interval');
    localStorage.removeItem('cc_log_level');
    showToast('Settings reset to defaults.', 'info');
  };

  const gatewayBaseUrl = `${getApiBaseUrl()}/api`;

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm text-secondary font-code-sm text-code-sm uppercase tracking-wider">
            <span>Control Plane</span>
            <span>/</span>
            <span className="text-primary font-medium">Cluster &amp; Mesh Diagnostics</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Mesh Settings &amp; Architecture Diagnostics
          </h1>
          <p className="font-body-lg text-body-lg text-secondary mt-1">
            Inspect HashiCorp Consul connectivity on AWS EC2, Express backend gateway proxy, and cross-cloud VPN status.
          </p>
        </div>
        <button
          onClick={savePreferences}
          className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg transition-colors shadow-sm self-start lg:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Save Preferences</span>
        </button>
      </div>

      {/* 2 Main Diagnostic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Card 1: Consul Server on AWS EC2 */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">dns</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface">HashiCorp Consul Server</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">Shielded on AWS Loopback / WireGuard</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full font-code-sm text-code-sm font-semibold ${
                  consulStatus?.connected
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${consulStatus?.connected ? 'bg-tertiary' : 'bg-error'}`}></span>
                {consulStatus?.connected ? `Active • ${consulStatus.datacenter}` : 'Unavailable'}
              </span>
            </div>

            <div className="flex flex-col gap-space-sm mt-space-xs">
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">Datacenter ID</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md"
                    readOnly
                    type="text"
                    value={consulStatus?.connected ? consulStatus.datacenter || 'Unknown' : 'Unavailable'}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">Node Name</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md"
                    readOnly
                    type="text"
                    value={consulStatus?.connected ? consulStatus.nodeName || 'Unknown' : 'Unavailable'}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface font-medium">WireGuard Cross-Cloud Tunnel</label>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low font-code-sm text-code-sm text-on-surface">
                  <span>
                    AWS ({overview?.wireguard?.awsWgIp || '10.8.0.1'}) ↔ Azure ({overview?.wireguard?.azureWgIp || '10.8.0.2'}) • UDP 51820
                  </span>
                  <span className="font-semibold text-primary">{overview?.wireguard?.status || 'UNKNOWN'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-low/70 font-code-sm text-[11px] text-secondary">
                Security Note: Consul HTTP port 8500 is NOT exposed publicly. All frontend calls traverse the Express Backend proxy.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-md border-t border-surface-container mt-space-md">
            <button
              disabled={consulTestLoading}
              onClick={() => handleTestConsul(false)}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${consulTestLoading ? 'animate-spin' : ''}`}>
                network_ping
              </span>
              <span>Test Consul</span>
            </button>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container text-on-surface font-code-sm text-code-sm">
              <span>{consulTestStatus}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Express Backend Gateway */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface">Express Backend Gateway</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">API Proxy &amp; SPA Host</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full font-code-sm text-code-sm font-semibold ${
                  overview
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                    : 'bg-surface-container text-secondary'
                }`}
              >
                {overview ? 'Online' : 'Checking...'}
              </span>
            </div>

            <div className="flex flex-col gap-space-sm mt-space-xs">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface font-medium">Gateway API Base URL</label>
                <div className="relative flex items-center">
                  <input
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md"
                    readOnly
                    type="text"
                    value={gatewayBaseUrl}
                  />
                  <button
                    className="absolute right-2 p-1 text-on-surface-variant hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(gatewayBaseUrl);
                      showToast('Gateway API URL copied!', 'success');
                    }}
                    title="Copy URL"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface font-medium">Active Proxy Endpoints</span>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-surface-container-low">
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    GET /api/dashboard/overview
                  </span>
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    GET /api/consul/catalog
                  </span>
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    POST /api/users/:id/pay
                  </span>
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    GET /api/telemetry
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-md border-t border-surface-container mt-space-md">
            <button
              disabled={apiTestLoading}
              onClick={() => handleTestApi(false)}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${apiTestLoading ? 'animate-spin' : ''}`}>
                terminal
              </span>
              <span>Test Express Gateway</span>
            </button>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container text-on-surface font-code-sm text-code-sm">
              <span>{apiTestStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">UI Polling Preferences</h3>
              <p className="font-body-sm text-body-sm text-secondary">
                Configure client-side polling intervals and alert behavior.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="flex flex-col gap-1.5 p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium">Catalog Polling Interval</span>
            <select
              className="w-full px-3 py-1.5 rounded bg-surface-container-lowest font-body-sm text-body-sm text-on-surface"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(e.target.value)}
            >
              <option value="5s">5 seconds</option>
              <option value="10s">10 seconds (Default)</option>
              <option value="30s">30 seconds</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium">Console Log Level</span>
            <select
              className="w-full px-3 py-1.5 rounded bg-surface-container-lowest font-body-sm text-body-sm text-on-surface"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
            >
              <option value="debug">DEBUG</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>
          </div>

          <div className="flex flex-col justify-between p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium block">Toast Alerts</span>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableNotifications}
                onChange={(e) => setEnableNotifications(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="font-body-sm text-body-sm text-on-surface">Enable Alerts</span>
            </label>
          </div>

          <div className="flex flex-col justify-between p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium block">Compact Tables</span>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compactRows}
                onChange={(e) => setCompactRows(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="font-body-sm text-body-sm text-on-surface">Compact View</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-space-sm pt-space-xs">
          <button
            onClick={resetPreferences}
            className="px-space-md py-2 rounded-lg bg-surface-container text-secondary hover:text-on-surface font-label-lg text-label-lg"
          >
            Reset Defaults
          </button>
          <button
            onClick={savePreferences}
            className="px-space-md py-2 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary-container"
          >
            Save Preferences
          </button>
        </div>
      </section>
    </div>
  );
};
