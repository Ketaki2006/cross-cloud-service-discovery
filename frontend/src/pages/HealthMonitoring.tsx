import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  getConsulCatalog,
  getPaymentServiceHealth,
  probeServiceHealth,
  injectPaymentFault,
  restorePaymentHealth,
} from '../services/api';
import {
  ConsulCatalogEntry,
  PaymentHealthCheckResponse,
  HealthState,
} from '../types';
import { useToast } from '../components/Toast';

export const HealthMonitoring: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<ConsulCatalogEntry[]>([]);
  const [paymentHealth, setPaymentHealth] = useState<PaymentHealthCheckResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [filterCat, setFilterCat] = useState<'all' | 'aws' | 'azure' | 'gcp' | 'failing'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedService, setSelectedService] = useState<ConsulCatalogEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProbingId, setIsProbingId] = useState<string | null>(null);
  const [lastProbeResult, setLastProbeResult] = useState<{
    serviceId: string;
    status: string;
    httpStatus: number;
    latencyMs: number;
    output: string;
  } | null>(null);
  const [faultActionLoading, setFaultActionLoading] = useState(false);

  const fetchHealthData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [catalogRes, paymentRes] = await Promise.all([
        getConsulCatalog(),
        getPaymentServiceHealth().catch(() => null),
      ]);

      const entries = catalogRes.instances || [];
      setItems(entries);
      setPaymentHealth(paymentRes);
      setLoadError(null);
      setLastUpdated(new Date().toLocaleTimeString());

      setSelectedService((prev) => {
        if (!prev && entries.length > 0) return entries[0];
        if (prev) {
          const updated = entries.find((e) => e.id === prev.id);
          return updated || (entries.length > 0 ? entries[0] : null);
        }
        return null;
      });
    } catch (err: any) {
      setItems([]);
      setLoadError(err.message || 'Unable to retrieve health checks from Consul backend.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const pingSingleService = async (item: ConsulCatalogEntry) => {
    setIsProbingId(item.id);
    try {
      const res = await probeServiceHealth(item.id);
      setLastProbeResult({
        serviceId: item.id,
        status: res.status,
        httpStatus: res.httpStatus,
        latencyMs: res.latencyMs,
        output: JSON.stringify(res.data || res.error || {}),
      });
      if (res.status === 'PASSING') {
        showToast(`${item.name} probe PASSING (HTTP ${res.httpStatus}, ${res.latencyMs}ms)`, 'success');
      } else {
        showToast(`${item.name} probe CRITICAL (HTTP ${res.httpStatus || 'ERR'})`, 'error');
      }
      await fetchHealthData();
    } catch (err: any) {
      showToast(`Probe error: ${err.message}`, 'error');
    } finally {
      setIsProbingId(null);
    }
  };

  const handleInjectFault = async () => {
    setFaultActionLoading(true);
    try {
      const res = await injectPaymentFault();
      showToast(res.message || 'Fault injected (HTTP 503). Consul will mark CRITICAL within 10s.', 'info');
      await fetchHealthData();
    } catch (err: any) {
      showToast(`Fault injection error: ${err.message}`, 'error');
    } finally {
      setFaultActionLoading(false);
    }
  };

  const handleRestoreHealth = async () => {
    setFaultActionLoading(true);
    try {
      const res = await restorePaymentHealth();
      showToast(res.message || 'Payment Service restored (HTTP 200). Consul will recover to PASSING.', 'success');
      await fetchHealthData();
    } catch (err: any) {
      showToast(`Recovery error: ${err.message}`, 'error');
    } finally {
      setFaultActionLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let list = [...items];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.address.toLowerCase().includes(q)
      );
    }

    if (filterCat === 'aws') {
      list = list.filter((i) => i.provider.toLowerCase() === 'aws');
    } else if (filterCat === 'azure') {
      list = list.filter((i) => i.provider.toLowerCase() === 'azure');
    } else if (filterCat === 'gcp') {
      list = list.filter((i) => i.provider.toLowerCase() === 'gcp');
    } else if (filterCat === 'failing') {
      list = list.filter((i) => i.healthStatus === 'CRITICAL' || i.healthStatus === 'WARNING' || i.healthStatus === 'UNKNOWN');
    }

    return list;
  }, [items, searchFilter, filterCat]);

  const total = loadError ? null : items.length;
  const passingCount = loadError ? null : items.filter((i) => i.healthStatus === 'PASSING').length;
  const criticalCount = loadError ? null : items.filter((i) => i.healthStatus === 'CRITICAL' || i.healthStatus === 'WARNING').length;
  const slaPct =
    total !== null && total > 0 && passingCount !== null
      ? ((passingCount / total) * 100).toFixed(1)
      : total === 0
      ? '0.0'
      : null;

  const paymentState: HealthState = paymentHealth?.healthState || 'UNKNOWN';

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm text-secondary font-code-sm text-code-sm uppercase tracking-wider">
            <span>Consul Fault Monitoring</span>
            <span>/</span>
            <span className="text-primary font-medium">10s Active Probes</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Service Health &amp; Fault Monitoring
          </h1>
          <p className="font-body-lg text-body-lg text-secondary mt-1">
            Real-time Consul health checks for Azure Payment Service and AWS workloads, including discovery pool exclusion status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={fetchHealthData}
            className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg transition-colors shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}>
              cached
            </span>
            <span>Refresh Consul Checks</span>
          </button>
          <div className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container shadow-sm">
            <span className="font-code-sm text-code-sm text-on-surface">
              {lastUpdated ? `Last Poll: ${lastUpdated}` : 'Waiting for check...'}
            </span>
          </div>
        </div>
      </div>

      {/* Backend Offline / Error Alert */}
      {loadError && (
        <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex items-center gap-2 font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-[20px]">cloud_off</span>
          <span>
            <strong>Health State UNKNOWN:</strong> {loadError}
          </span>
        </div>
      )}

      {/* Critical Exclusion Warning Banner for Azure Payment Service */}
      {paymentHealth && paymentState === 'CRITICAL' && (
        <div className="p-space-md rounded-xl bg-error-container text-on-error-container border border-error/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-start sm:items-center gap-2 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[22px] shrink-0">warning</span>
            <div>
              <strong>CRITICAL: Azure Payment Service Failure Detected (HTTP 503)</strong>
              <p className="mt-0.5">
                Consul health check failed. Service is automatically <strong>excluded from healthy service discovery</strong> (<code>/v1/health/service/payment-service?passing</code> returns 0 instances) until recovery.
              </p>
            </div>
          </div>
          <button
            disabled={faultActionLoading}
            onClick={handleRestoreHealth}
            className="px-3 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-label-md text-label-md font-semibold shrink-0 hover:opacity-90 disabled:opacity-50"
          >
            Restore Health (200 OK)
          </button>
        </div>
      )}

      {/* 4 Live Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Azure Payment Status
              </span>
              <div className="mt-1">
                <span
                  className={`text-headline-lg font-headline-lg font-bold ${
                    paymentState === 'PASSING'
                      ? 'text-tertiary'
                      : paymentState === 'CRITICAL'
                      ? 'text-error'
                      : 'text-secondary'
                  }`}
                >
                  {paymentState}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
          </div>
          <div className="mt-4 text-body-sm font-body-sm text-on-surface-variant">
            {paymentHealth?.excludedFromDiscovery
              ? 'Excluded from ?passing discovery'
              : paymentState === 'PASSING'
              ? 'Active in ?passing discovery'
              : 'Health status unavailable'}
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Passing Services
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-tertiary">{passingCount ?? '—'}</span>
                <span className="text-label-lg font-label-lg text-tertiary font-semibold">Passing</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </div>
          <div className="mt-4 text-body-sm font-body-sm text-on-surface-variant">
            Out of {total ?? '—'} registered service(s)
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Critical / Failing
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-error">{criticalCount ?? '—'}</span>
                <span className="text-label-lg font-label-lg text-error font-semibold">Critical</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
          </div>
          <div className="mt-4 text-body-sm font-body-sm text-on-surface-variant">
            {criticalCount && criticalCount > 0 ? 'Failover isolation active' : 'No failing services'}
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Healthy Discovery Ratio
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-on-surface">
                  {slaPct !== null ? `${slaPct}%` : 'Unknown'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">ecg_heart</span>
            </div>
          </div>
          <div className="mt-4 w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full bg-tertiary-container transition-all duration-500"
              style={{ width: `${slaPct || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Fault Injection / Recovery Test Controls (manual operator actions only) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Fault Injection &amp; Recovery Verification</h2>
          <p className="font-body-sm text-body-sm text-secondary">
            Trigger HTTP 503 failure or 200 OK recovery on Payment Service (resolved via Consul) to test Consul detection and discovery isolation.
          </p>
        </div>
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            disabled={faultActionLoading}
            onClick={handleInjectFault}
            className="px-3 py-2 rounded-lg bg-error-container text-on-error-container hover:opacity-90 font-label-md text-label-md font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">report</span>
            <span>Simulate 503 Failure</span>
          </button>
          <button
            disabled={faultActionLoading}
            onClick={handleRestoreHealth}
            className="px-3 py-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant hover:opacity-90 font-label-md text-label-md font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">healing</span>
            <span>Restore 200 OK</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column: Health Table */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-md bg-surface-container-low/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">monitor_heart</span>
                <h2 className="text-headline-md font-headline-md text-on-surface">Registered Service Health Checks</h2>
              </div>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm"
                  placeholder="Filter checks..."
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="px-space-md py-2.5 bg-surface-container-low/80 flex flex-wrap items-center gap-2">
              {(['all', 'aws', 'azure', 'gcp', 'failing'] as const).map((cat) => (
                <button
                  key={cat}
                  className={`px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium transition-colors ${
                    filterCat === cat
                      ? cat === 'failing'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                  onClick={() => setFilterCat(cat)}
                >
                  {cat === 'all'
                    ? `All (${items.length})`
                    : cat === 'failing'
                    ? `Failing (${criticalCount ?? 0})`
                    : `${cat.toUpperCase()} (${items.filter((i) => i.provider.toLowerCase() === cat).length})`}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-code-sm text-code-sm uppercase tracking-wider">
                    <th className="py-3 px-space-md font-semibold">Service</th>
                    <th className="py-3 px-space-md font-semibold">Cloud / Region</th>
                    <th className="py-3 px-space-md font-semibold">IP &amp; Port</th>
                    <th className="py-3 px-space-md font-semibold">Status</th>
                    <th className="py-3 px-space-md font-semibold">Discovery Pool</th>
                    <th className="py-3 px-space-md font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm font-body-sm">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-secondary">
                        {loadError
                          ? 'Unable to display checks while Consul is unreachable.'
                          : 'No health checks match current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isPassing = item.healthStatus === 'PASSING';
                      const isCritical = item.healthStatus === 'CRITICAL';
                      const isSelected = selectedService?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-surface-container-low/50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-surface-container-low' : ''
                          }`}
                          onClick={() => setSelectedService(item)}
                        >
                          <td className="py-3.5 px-space-md">
                            <div className="font-label-lg text-label-lg font-semibold text-on-surface">{item.name}</div>
                            <div className="font-code-sm text-code-sm text-outline">{item.id}</div>
                          </td>
                          <td className="py-3.5 px-space-md font-code-sm text-code-sm">
                            {item.provider} ({item.region})
                          </td>
                          <td className="py-3.5 px-space-md font-code-sm text-code-sm text-on-surface">
                            {item.address}:{item.port}
                          </td>
                          <td className="py-3.5 px-space-md">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${
                                isPassing
                                  ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                                  : isCritical
                                  ? 'bg-error-container text-on-error-container'
                                  : 'bg-surface-container text-secondary'
                              }`}
                            >
                              {item.healthStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-space-md font-code-sm text-code-sm">
                            {item.excludedFromDiscovery ? (
                              <span className="text-error font-semibold">Excluded</span>
                            ) : (
                              <span className="text-tertiary font-semibold">Active (?passing)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-space-md text-right">
                            <button
                              disabled={isProbingId === item.id}
                              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-code-sm font-code-sm font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                pingSingleService(item);
                              }}
                            >
                              {isProbingId === item.id ? 'Probing...' : 'Probe'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Probe Inspector */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {selectedService ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Consul Check Inspector</h3>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                    {selectedService.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${
                      selectedService.healthStatus === 'PASSING'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        : selectedService.healthStatus === 'CRITICAL'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container text-secondary'
                    }`}
                  >
                    {selectedService.healthStatus}
                  </span>
                </div>
                <span className="font-code-sm text-code-sm text-secondary">
                  {selectedService.id} • {selectedService.provider} ({selectedService.region})
                </span>
              </div>

              <button
                disabled={isProbingId === selectedService.id}
                className="w-full flex items-center justify-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors disabled:opacity-50"
                onClick={() => pingSingleService(selectedService)}
              >
                <span className={`material-symbols-outlined text-[18px] ${isProbingId === selectedService.id ? 'animate-spin' : ''}`}>
                  sensors
                </span>
                <span>{isProbingId === selectedService.id ? 'Executing Live Probe...' : 'Run Manual HTTP Probe'}</span>
              </button>

              {lastProbeResult && lastProbeResult.serviceId === selectedService.id && (
                <div className="p-2.5 rounded-lg bg-surface-container-low font-code-sm text-code-sm">
                  <div className="font-semibold text-on-surface">
                    Manual Probe: {lastProbeResult.status} (HTTP {lastProbeResult.httpStatus}, {lastProbeResult.latencyMs}ms)
                  </div>
                </div>
              )}

              <div className="bg-inverse-surface rounded-lg p-space-sm font-code-sm text-code-sm text-inverse-on-surface">
                <div className="flex items-center justify-between pb-1 text-inverse-primary/60">
                  <span>Last Consul Check Output</span>
                </div>
                <code className="select-all block break-all whitespace-pre-wrap font-mono mt-1 text-[11px]">
                  {selectedService.lastCheckOutput}
                </code>
              </div>

              <div className="flex flex-col gap-1.5 font-code-sm text-code-sm">
                <div className="flex justify-between py-1 bg-surface-container-low px-2 rounded">
                  <span className="text-secondary">Check ID:</span>
                  <span className="text-on-surface font-semibold truncate max-w-[180px]">{selectedService.lastCheckId}</span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container px-2 rounded">
                  <span className="text-secondary">Probe Endpoint:</span>
                  <span className="text-on-surface truncate max-w-[180px]">
                    {selectedService.healthUrl || `${selectedService.address}:${selectedService.port}`}
                  </span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container-low px-2 rounded">
                  <span className="text-secondary">Discovery Inclusion:</span>
                  <span className={selectedService.excludedFromDiscovery ? 'text-error font-semibold' : 'text-tertiary font-semibold'}>
                    {selectedService.excludedFromDiscovery ? 'Excluded' : 'Included (?passing)'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center text-secondary">
              Select a service from the health table to inspect Consul probe details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
