import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getConsulCatalog,
  getConsulStatus,
  registerService,
  deregisterService,
  probeServiceHealth,
  getApiBaseUrl,
} from '../services/api';
import { ConsulCatalogEntry, ConsulStatusResponse } from '../types';
import { useToast } from '../components/Toast';

export const ServiceRegistry: React.FC = () => {
  const { showToast } = useToast();
  const [services, setServices] = useState<ConsulCatalogEntry[]>([]);
  const [consulInfo, setConsulInfo] = useState<ConsulStatusResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegCard, setShowRegCard] = useState(false);
  const [inspectItem, setInspectItem] = useState<ConsulCatalogEntry | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);

  // Registration Form fields
  const [name, setName] = useState('payment-service');
  const [id, setId] = useState('payment-service-azure-2');
  const [provider, setProvider] = useState('AZURE');
  const [ip, setIp] = useState('10.8.0.2');
  const [port, setPort] = useState('8001');
  const [healthPath, setHealthPath] = useState('/health');
  const [intervalPolicy, setIntervalPolicy] = useState('10s/3s');
  const [tags, setTags] = useState('AZURE, central-india');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catalogRes, statusRes] = await Promise.all([
        getConsulCatalog(),
        getConsulStatus().catch(() => null),
      ]);
      setServices(catalogRes.instances || []);
      setConsulInfo(statusRes);
      setLoadError(null);
    } catch (err: any) {
      setServices([]);
      setLoadError(err.message || 'Unable to retrieve Consul catalog via backend API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    const timer = setInterval(loadServices, 10000);
    return () => clearInterval(timer);
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    let list = [...services];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filterProvider !== 'ALL') {
      list = list.filter((s) => s.provider.toUpperCase() === filterProvider.toUpperCase());
    }

    if (filterStatus !== 'ALL') {
      list = list.filter((s) => s.healthStatus === filterStatus);
    }

    if (sortBy === 'port-asc') {
      list.sort((a, b) => a.port - b.port);
    } else if (sortBy === 'ip-asc') {
      list.sort((a, b) => a.address.localeCompare(b.address));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [services, searchQuery, filterProvider, filterStatus, sortBy]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const [interval, timeout] = intervalPolicy.split('/');

    try {
      await registerService({
        name: name.trim(),
        id: id.trim(),
        provider,
        address: ip.trim(),
        port: Number(port),
        checkPath: healthPath.startsWith('/') ? healthPath.trim() : '/' + healthPath.trim(),
        interval: interval ? interval.trim() : '10s',
        timeout: timeout ? timeout.trim() : '3s',
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      showToast(`Service "${name}" (${id}) registered with Consul successfully!`, 'success');
      setFormFeedback({
        message: `Service ${id} registered with Consul catalog.`,
        type: 'success',
      });
      await loadServices();
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
      setFormFeedback({
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeregister = async (item: ConsulCatalogEntry) => {
    if (!window.confirm(`Are you sure you want to deregister "${item.id}" from Consul?`)) return;

    try {
      await deregisterService(item.id);
      showToast(`Service "${item.id}" deregistered from Consul successfully!`, 'success');
      await loadServices();
    } catch (err: any) {
      showToast(err.message || 'Deregistration failed', 'error');
    }
  };

  const handleBackendProbe = async (serviceId: string) => {
    setProbingId(serviceId);
    try {
      const res = await probeServiceHealth(serviceId);
      if (res.status === 'PASSING') {
        showToast(`Probe PASSING (${res.httpStatus}) for ${serviceId} in ${res.latencyMs}ms`, 'success');
      } else {
        showToast(`Probe CRITICAL for ${serviceId}: ${res.error || `HTTP ${res.httpStatus}`}`, 'error');
      }
      await loadServices();
    } catch (err: any) {
      showToast(`Probe error: ${err.message}`, 'error');
    } finally {
      setProbingId(null);
    }
  };

  const exportConsulJSON = () => {
    const jsonStr = JSON.stringify(filteredServices, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consul-catalog-export-${Date.now()}.json`;
    a.click();
    showToast('Live Consul catalog exported as JSON file', 'success');
  };

  const copyRegistrationCode = () => {
    const code = `// Register service securely through Express API Gateway
await fetch('${getApiBaseUrl()}/api/services/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'payment-service',
    id: 'payment-service-azure-1',
    provider: 'AZURE',
    address: '10.8.0.2',
    port: 8001,
    checkPath: '/health',
    interval: '10s',
    tags: ['AZURE', 'central-india']
  })
});`;

    navigator.clipboard.writeText(code).then(() => {
      showToast('Registration snippet copied to clipboard!', 'success');
    });
  };

  const passingCount = services.filter((s) => s.healthStatus === 'PASSING').length;
  const globalHealthPct = services.length > 0 ? Math.round((passingCount / services.length) * 100) : null;

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-space-lg w-full max-w-[1720px] mx-auto pb-space-xl">
        {/* Header / Stats Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="font-code-sm text-code-sm uppercase tracking-wider text-primary font-semibold">
                Consul Catalog API
              </span>
              <span className="text-outline-variant font-code-sm text-code-sm">•</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                Datacenter: {consulInfo?.connected ? consulInfo.datacenter : 'Unavailable'}
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Service Registry &amp; Catalog
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
              Live catalog fetched via backend proxy from Consul <code>/v1/catalog/services</code> and <code>/v1/health/service/:name</code>.
            </p>
          </div>

          {/* Operational Metrics */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md">
              <div className="flex flex-col">
                <span className="font-code-sm text-code-sm text-secondary uppercase">Registered Nodes</span>
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  {loadError ? 'Unknown' : `${services.length} Services`}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md">
              <div className="flex flex-col">
                <span className="font-code-sm text-code-sm text-secondary uppercase">Passing Health</span>
                <span className={`font-headline-md text-headline-md font-bold ${globalHealthPct === 100 ? 'text-tertiary' : globalHealthPct === null ? 'text-secondary' : 'text-error'}`}>
                  {globalHealthPct !== null ? `${globalHealthPct}% (${passingCount}/${services.length})` : 'Unknown'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
            </div>

            <button
              className="bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg px-space-md py-space-sm rounded-lg shadow-sm flex items-center gap-space-xs transition-colors"
              onClick={() => setShowRegCard(!showRegCard)}
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Register New Service</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {loadError && (
          <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex items-center gap-2 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>
              <strong>Consul Catalog Unavailable:</strong> {loadError}
            </span>
          </div>
        )}

        {/* Collapsible Registration Section */}
        {showRegCard && (
          <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-space-md mb-space-md bg-surface-container-low px-space-md py-space-sm rounded-lg">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">app_registration</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface">
                    Register Service Instance with Consul
                  </span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">
                    Dispatches payload via <code>POST {getApiBaseUrl()}/api/services/register</code> → Consul Agent API
                  </span>
                </div>
              </div>
              <button
                className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors self-end lg:self-auto"
                onClick={() => setShowRegCard(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form className="flex flex-col gap-space-lg" onSubmit={handleRegisterSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Service Name *</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface"
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Service ID *</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface"
                    required
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Cloud Provider *</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="AWS">AWS (Amazon Web Services)</option>
                    <option value="AZURE">AZURE (Microsoft Azure)</option>
                    <option value="GCP">GCP (Google Cloud Platform)</option>
                    <option value="LOCAL">Local Host</option>
                  </select>
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">IP Address *</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface"
                    required
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Port *</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface"
                    max={65535}
                    min={1}
                    required
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Health-Check Path *</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface"
                    required
                    type="text"
                    value={healthPath}
                    onChange={(e) => setHealthPath(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Interval / Timeout</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface"
                    value={intervalPolicy}
                    onChange={(e) => setIntervalPolicy(e.target.value)}
                  >
                    <option value="10s/3s">10s interval / 3s timeout</option>
                    <option value="5s/2s">5s interval / 2s timeout</option>
                    <option value="30s/5s">30s interval / 5s timeout</option>
                  </select>
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface">Tags (comma-separated)</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm">
                <button
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg px-space-lg py-space-sm rounded-lg shadow-sm flex items-center gap-space-xs transition-colors disabled:opacity-50"
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>{isSubmitting ? 'Registering...' : 'Register Service'}</span>
                </button>
              </div>

              {formFeedback && (
                <div
                  className={`rounded-lg p-space-sm flex items-center justify-between ${
                    formFeedback.type === 'error'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container text-tertiary'
                  }`}
                >
                  <span className="font-code-sm text-code-sm">{formFeedback.message}</span>
                  <button
                    className="text-on-surface-variant font-code-sm text-code-sm"
                    onClick={() => setFormFeedback(null)}
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </form>
          </section>
        )}

        {/* Main Registry Table Card */}
        <section className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col">
          {/* Filter Toolbar */}
          <div className="p-space-md bg-surface-container-low flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-space-sm w-full xl:w-auto flex-1">
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[18px]">search</span>
                <input
                  className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest rounded-lg font-body-md text-body-md text-on-surface"
                  placeholder="Filter name, ID, IP, or tag..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="px-3 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface"
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
              >
                <option value="ALL">Provider: All Clouds</option>
                <option value="AWS">AWS</option>
                <option value="AZURE">AZURE</option>
                <option value="GCP">GCP</option>
                <option value="Local">Local</option>
              </select>

              <select
                className="px-3 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Health: All States</option>
                <option value="PASSING">PASSING Only</option>
                <option value="CRITICAL">CRITICAL Only</option>
                <option value="WARNING">WARNING Only</option>
                <option value="UNKNOWN">UNKNOWN Only</option>
              </select>

              <select
                className="px-3 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">Sort: Default</option>
                <option value="port-asc">Sort: Port</option>
                <option value="ip-asc">Sort: IP Address</option>
                <option value="name-asc">Sort: Service Name</option>
              </select>
            </div>

            <div className="flex items-center gap-space-xs self-end xl:self-auto">
              <button
                className="bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-sm py-1.5 rounded-lg shadow-sm flex items-center gap-1.5"
                onClick={exportConsulJSON}
              >
                <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
                <span>Export JSON</span>
              </button>
              <button
                className="bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-sm py-1.5 rounded-lg shadow-sm flex items-center gap-1.5"
                onClick={loadServices}
              >
                <span className={`material-symbols-outlined text-[16px] text-tertiary ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                <span>Refresh Catalog</span>
              </button>
            </div>
          </div>

          {/* Registry Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-code-sm text-code-sm uppercase text-secondary font-semibold">
                  <th className="py-3 px-space-md">Service Name</th>
                  <th className="py-3 px-space-md">Service ID</th>
                  <th className="py-3 px-space-md">Cloud Provider</th>
                  <th className="py-3 px-space-md">IP &amp; Port</th>
                  <th className="py-3 px-space-md">Tags</th>
                  <th className="py-3 px-space-md">Health Status</th>
                  <th className="py-3 px-space-md">Last Check Result</th>
                  <th className="py-3 px-space-md text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-secondary">
                      {isLoading
                        ? 'Loading Consul catalog services...'
                        : loadError
                        ? 'Cannot load services while Consul catalog is unreachable.'
                        : 'No services match current filters in Consul catalog.'}
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((item) => {
                    const isPassing = item.healthStatus === 'PASSING';
                    const isCritical = item.healthStatus === 'CRITICAL';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isCritical ? 'bg-error-container/10 hover:bg-error-container/20' : 'hover:bg-surface-container-low/60'
                        }`}
                      >
                        <td className="py-3 px-space-md">
                          <div className="flex flex-col">
                            <span className="font-label-lg text-label-lg font-semibold text-on-surface">{item.name}</span>
                            <span className="font-code-sm text-code-sm text-secondary">Node: {item.node} ({item.datacenter})</span>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          <span className="font-code-sm text-code-sm bg-surface-container px-2 py-0.5 rounded text-on-surface select-all">
                            {item.id}
                          </span>
                        </td>
                        <td className="py-3 px-space-md">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-surface-container-high text-on-surface">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            {item.provider} ({item.region})
                          </span>
                        </td>
                        <td className="py-3 px-space-md font-code-md text-code-md text-on-surface select-all">
                          {item.address}:{item.port}
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.tags.map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-container-low font-code-sm text-[11px] text-secondary">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          {isPassing ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm bg-tertiary-fixed text-on-tertiary-fixed-variant font-semibold">
                              <span className="w-2 h-2 rounded-full bg-tertiary"></span> PASSING
                            </span>
                          ) : isCritical ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm bg-error-container text-on-error-container font-semibold">
                              <span className="w-2 h-2 rounded-full bg-error"></span> CRITICAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm bg-surface-container text-secondary font-semibold">
                              <span className="w-2 h-2 rounded-full bg-outline"></span> {item.healthStatus}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-space-md">
                          <span className="font-code-sm text-[11px] text-on-surface-variant block max-w-[220px] truncate" title={item.lastCheckOutput}>
                            {item.lastCheckOutput}
                          </span>
                        </td>
                        <td className="py-3 px-space-md text-right">
                          <div className="flex items-center justify-end gap-space-xs">
                            <button
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                              onClick={() => setInspectItem(item)}
                              title="Inspect Consul Details"
                            >
                              <span className="material-symbols-outlined text-[18px]">manage_search</span>
                            </button>
                            <button
                              disabled={probingId === item.id}
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                              onClick={() => handleBackendProbe(item.id)}
                              title="Run Live Backend Health Probe"
                            >
                              <span className={`material-symbols-outlined text-[18px] ${probingId === item.id ? 'animate-spin' : ''}`}>
                                network_ping
                              </span>
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                              onClick={() => handleDeregister(item)}
                              title="Deregister from Consul"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Inspection Modal */}
        {inspectItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm">
            <div className="bg-surface-container-lowest rounded-xl max-w-xl w-full p-space-lg shadow-xl flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-sm bg-surface-container-low px-space-md py-space-sm rounded-lg">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
                  <span className="font-headline-md text-headline-md text-on-surface">Consul Service Inspection</span>
                </div>
                <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setInspectItem(null)}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-space-sm font-code-sm text-code-sm">
                <div className="flex justify-between py-1.5 bg-surface-container-low px-3 rounded">
                  <span className="text-secondary">Service ID:</span>
                  <span className="text-on-surface font-semibold">{inspectItem.id}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-surface-container px-3 rounded">
                  <span className="text-secondary">Health Status:</span>
                  <span className="font-semibold">{inspectItem.healthStatus}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-surface-container-low px-3 rounded">
                  <span className="text-secondary">Healthy Discovery Pool:</span>
                  <span className="font-semibold">
                    {inspectItem.excludedFromDiscovery ? 'Excluded (?passing=true skips)' : 'Included'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 bg-surface-container px-3 rounded">
                  <span className="text-secondary">Tags:</span>
                  <span className="text-on-surface">{JSON.stringify(inspectItem.tags)}</span>
                </div>
                <div className="bg-inverse-surface text-inverse-on-surface p-3 rounded font-mono text-[11px] break-all whitespace-pre-wrap">
                  {inspectItem.lastCheckOutput}
                </div>
              </div>
              <div className="flex justify-end gap-space-sm">
                <button
                  className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md"
                  onClick={() => setInspectItem(null)}
                >
                  Close
                </button>
                <button
                  className="px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1"
                  onClick={() => handleBackendProbe(inspectItem.id)}
                >
                  <span className="material-symbols-outlined text-[16px]">network_ping</span>
                  <span>Execute Live Probe</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Code Snippet Section */}
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-on-surface">Backend Registration Proxy Snippet</h3>
            <button
              className="bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-sm py-1 rounded-lg flex items-center gap-1"
              onClick={copyRegistrationCode}
            >
              <span className="material-symbols-outlined text-[16px] text-primary">content_copy</span>
              <span>Copy Snippet</span>
            </button>
          </div>
          <pre className="bg-inverse-surface rounded-xl p-space-md overflow-x-auto text-inverse-on-surface font-code-sm text-code-sm">
            <code>{`POST ${getApiBaseUrl()}/api/services/register -> PUT /v1/agent/service/register (Consul on AWS)`}</code>
          </pre>
        </section>
      </div>
    </div>
  );
};
