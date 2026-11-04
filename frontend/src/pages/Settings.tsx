import React, { useState, useEffect } from 'react';
import { getConsulStatus, getApiOverview } from '../services/api';
import { useToast } from '../components/Toast';

export const Settings: React.FC = () => {
  const { showToast } = useToast();

  // Test states
  const [consulTestStatus, setConsulTestStatus] = useState<string>('Latency: 1.4ms • Leader reachable');
  const [consulTestLoading, setConsulTestLoading] = useState(false);

  const [apiTestStatus, setApiTestStatus] = useState<string>('Active • Listening on :3000');
  const [apiTestLoading, setApiTestLoading] = useState(false);

  // Preference states
  const [pollingInterval, setPollingInterval] = useState('5s');
  const [logLevel, setLogLevel] = useState('info');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [compactRows, setCompactRows] = useState(false);

  useEffect(() => {
    const savedPolling = localStorage.getItem('cc_polling_interval');
    if (savedPolling) setPollingInterval(savedPolling);

    const savedLogLevel = localStorage.getItem('cc_log_level');
    if (savedLogLevel) setLogLevel(savedLogLevel);
  }, []);

  const handleTestConsul = async () => {
    setConsulTestLoading(true);
    setConsulTestStatus('Probing Consul leader...');
    const start = Date.now();

    try {
      const data = await getConsulStatus();
      const latency = Date.now() - start;
      if (data.connected) {
        setConsulTestStatus(`Latency: ${latency}ms • Leader ${data.leader} reachable`);
        showToast(`Consul connected (${latency}ms) - Leader: ${data.leader}`, 'success');
      } else {
        setConsulTestStatus('Consul daemon is offline. Run: consul agent -dev');
        showToast('Consul daemon is offline. Run: consul agent -dev', 'error');
      }
    } catch (err: any) {
      setConsulTestStatus(`Error: ${err.message}`);
      showToast(`Consul test failed: ${err.message}`, 'error');
    } finally {
      setConsulTestLoading(false);
    }
  };

  const handleTestApi = async () => {
    setApiTestLoading(true);
    setApiTestStatus('Testing Express API...');
    const start = Date.now();

    try {
      const data = await getApiOverview();
      const latency = Date.now() - start;
      if (data.status === 'running') {
        setApiTestStatus(`HTTP 200 OK (${latency}ms) — Express :${data.port} responsive`);
        showToast(`Express API v${data.version || '1.0.0'} online on port ${data.port} (${latency}ms)`, 'success');
      } else {
        setApiTestStatus('API returned non-running status');
      }
    } catch (err: any) {
      setApiTestStatus(`API unreachable: ${err.message}`);
      showToast(`Express API unreachable: ${err.message}`, 'error');
    } finally {
      setApiTestLoading(false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem('cc_polling_interval', pollingInterval);
    localStorage.setItem('cc_log_level', logLevel);
    showToast('Configuration preferences saved to local storage.', 'success');
  };

  const resetPreferences = () => {
    setPollingInterval('5s');
    setLogLevel('info');
    setEnableNotifications(true);
    setCompactRows(false);
    localStorage.removeItem('cc_polling_interval');
    localStorage.removeItem('cc_log_level');
    showToast('Settings reset to system default values.', 'info');
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm text-secondary font-code-sm text-code-sm uppercase tracking-wider">
            <span>Control Plane</span>
            <span>/</span>
            <span>Configuration &amp; Agents</span>
            <span>/</span>
            <span className="text-primary font-medium">Cluster Parameters</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Mesh Settings &amp; Agent Configuration
          </h1>
          <p className="font-body-lg text-body-lg text-secondary mt-1">
            Manage HashiCorp Consul local agent connectivity, Express backend routes, and UI telemetry preferences.
          </p>
        </div>
        <button
          onClick={savePreferences}
          className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg transition-colors shadow-sm self-start lg:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Save Changes</span>
        </button>
      </div>

      {/* 2 Main Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Card 1: Consul Agent */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">dns</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface">HashiCorp Consul Agent</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">Local Server Daemon</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-low text-tertiary font-code-sm text-code-sm font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-tertiary-container"></span>
                Active • Dev Cluster dc1
              </span>
            </div>

            <div className="flex flex-col gap-space-sm mt-space-xs">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between">
                  <span>Consul HTTP API Endpoint</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant font-normal">Port: 8500</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    readOnly
                    type="text"
                    value="http://localhost:8500"
                  />
                  <button
                    className="absolute right-2 p-1 text-on-surface-variant hover:text-primary transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText('http://localhost:8500');
                      showToast('Consul URL copied to clipboard!', 'success');
                    }}
                    title="Copy URL"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">Datacenter ID</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md"
                    readOnly
                    type="text"
                    value="dc1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">Raft RPC Port</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md"
                    readOnly
                    type="text"
                    value="8300"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface font-medium">Serf LAN / WAN Gossip</label>
                <div className="flex items-center gap-space-sm p-2 rounded-lg bg-surface-container-low font-code-sm text-code-sm text-on-surface">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">sensors</span>
                  <span>Port: 8301 (LAN Serf) • Port: 8302 (WAN Serf)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-md border-t border-surface-container mt-space-md">
            <button
              disabled={consulTestLoading}
              onClick={handleTestConsul}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${consulTestLoading ? 'animate-spin' : ''}`}>
                network_ping
              </span>
              <span>Test Connection</span>
            </button>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container text-on-surface font-code-sm text-code-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
              <span>{consulTestStatus}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Express Application API */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface">Express Application API</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">Node.js Gateway Router</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-low text-tertiary font-code-sm text-code-sm font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-tertiary-container"></span>
                Active • Listening on :3000
              </span>
            </div>

            <div className="flex flex-col gap-space-sm mt-space-xs">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between">
                  <span>Backend API Base URL</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant font-normal">Mount: /api</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    readOnly
                    type="text"
                    value="http://localhost:3000/api"
                  />
                  <button
                    className="absolute right-2 p-1 text-on-surface-variant hover:text-primary transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText('http://localhost:3000/api');
                      showToast('API URL copied to clipboard!', 'success');
                    }}
                    title="Copy URL"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    API Gateway / CORS Origins
                  </label>
                  <span className="font-code-sm text-code-sm text-secondary">Access-Control-Allow-Origin</span>
                </div>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-md text-code-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  readOnly
                  type="text"
                  value="http://localhost:3000, http://127.0.0.1:8500, http://localhost:5173"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface font-medium">Registered Route Handlers</span>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-surface-container-low">
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    GET /api/services
                  </span>
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    GET /api/services/:name
                  </span>
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    GET /api/health
                  </span>
                  <span className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-lowest text-primary">
                    POST /api/services/register
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-md border-t border-surface-container mt-space-md">
            <button
              disabled={apiTestLoading}
              onClick={handleTestApi}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${apiTestLoading ? 'animate-spin' : ''}`}>
                terminal
              </span>
              <span>Test Express API</span>
            </button>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container text-on-surface font-code-sm text-code-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
              <span>{apiTestStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Local UI & Polling Preferences */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Client Telemetry &amp; Polling Preferences</h3>
              <p className="font-body-sm text-body-sm text-secondary">
                Configure browser-side polling rates, telemetry log levels, and local UI rendering preferences.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Option 1: Polling */}
          <div className="flex flex-col gap-1.5 p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium">Catalog Polling Interval</span>
            <select
              className="w-full px-3 py-1.5 rounded bg-surface-container-lowest font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(e.target.value)}
            >
              <option value="1s">1 second (High Frequency)</option>
              <option value="5s">5 seconds (Standard Production)</option>
              <option value="10s">10 seconds (Low Overhead)</option>
              <option value="30s">30 seconds (Power Saver)</option>
            </select>
            <span className="font-code-sm text-code-sm text-secondary">Frequency of Consul sync fetch</span>
          </div>

          {/* Option 2: Log Level */}
          <div className="flex flex-col gap-1.5 p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium">Console Log Level</span>
            <select
              className="w-full px-3 py-1.5 rounded bg-surface-container-lowest font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
            >
              <option value="debug">DEBUG (Verbose tracing)</option>
              <option value="info">INFO (Operational messages)</option>
              <option value="warn">WARN (Warnings only)</option>
              <option value="error">ERROR (Failures only)</option>
            </select>
            <span className="font-code-sm text-code-sm text-secondary">Client telemetry verbosity</span>
          </div>

          {/* Option 3: Notifications */}
          <div className="flex flex-col justify-between p-space-sm rounded-lg bg-surface-container-low">
            <div>
              <span className="font-label-md text-label-md text-on-surface font-medium block">Desktop Notifications</span>
              <span className="font-code-sm text-code-sm text-secondary">Alert on critical state transition</span>
            </div>
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

          {/* Option 4: Compact Rows */}
          <div className="flex flex-col justify-between p-space-sm rounded-lg bg-surface-container-low">
            <div>
              <span className="font-label-md text-label-md text-on-surface font-medium block">Compact Table Rows</span>
              <span className="font-code-sm text-code-sm text-secondary">Reduce vertical table padding</span>
            </div>
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
            className="px-space-md py-2 rounded-lg bg-surface-container text-secondary hover:text-on-surface font-label-lg text-label-lg transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={savePreferences}
            className="px-space-md py-2 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary-container transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </section>
    </div>
  );
};

