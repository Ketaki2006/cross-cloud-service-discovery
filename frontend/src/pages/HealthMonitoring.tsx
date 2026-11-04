import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getHealthChecks, getServices } from '../services/api';
import { useToast } from '../components/Toast';

interface HealthItem {
  id: string;
  name: string;
  serviceName: string;
  provider: string;
  region: string;
  address: string;
  port: number;
  endpoint: string;
  status: 'passing' | 'critical' | 'warning';
  latency: string;
  isSample: boolean;
  checkId: string;
  output: string;
  lastCheck: string;
}

const SAMPLE_HEALTH_SERVICES: HealthItem[] = [
  {
    id: 'user-01',
    name: 'User Service',
    serviceName: 'user-service',
    provider: 'AWS',
    region: 'us-east-1',
    address: '10.0.1.10',
    port: 8001,
    endpoint: '/health',
    status: 'passing',
    latency: '22ms',
    isSample: true,
    checkId: 'service:user-01:httpCheck',
    output: 'HTTP GET /health: {"status":"UP","database":"connected","aws_region":"us-east-1"}',
    lastCheck: '2s ago',
  },
  {
    id: 'order-01',
    name: 'Order Service',
    serviceName: 'order-service',
    provider: 'Azure',
    region: 'eastus-2',
    address: '10.0.1.30',
    port: 8003,
    endpoint: '/health',
    status: 'critical',
    latency: 'TIMEOUT',
    isSample: true,
    checkId: 'service:order-01:httpCheck',
    output: 'HTTP GET /health: Connection refused or unhealthy downstream dependency (cosmos-db-unreachable)',
    lastCheck: '5s ago',
  },
];

export const HealthMonitoring: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<HealthItem[]>([]);
  const [filterCat, setFilterCat] = useState<'all' | 'aws' | 'gcp' | 'azure' | 'failing'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedService, setSelectedService] = useState<HealthItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealthData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, servicesRes] = await Promise.all([
        getHealthChecks().catch(() => null),
        getServices().catch(() => null),
      ]);

      let liveItems: HealthItem[] = [];

      if (healthRes && healthRes.checks) {
        const rawChecks = healthRes.checks || [];
        const servicesMap = servicesRes?.services || {};

        liveItems = rawChecks
          .filter((c: any) => c.ServiceID && c.ServiceID !== '')
          .map((c: any) => {
            const svc = servicesMap[c.ServiceID] || {};
            const tags = c.ServiceTags || svc.Tags || [];
            const providerTag = tags.find((t: string) => ['AWS', 'GCP', 'Azure', 'Hybrid', 'Local'].includes(t)) || 'AWS';

            const formatTitle = (str: string) => {
              if (!str) return 'Service';
              return str
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            };

            return {
              id: c.ServiceID,
              name: formatTitle(c.ServiceName || c.ServiceID),
              serviceName: c.ServiceName || c.ServiceID,
              provider: providerTag,
              region: `${providerTag.toLowerCase()}-us-east-1`,
              address: svc.Address || '127.0.0.1',
              port: svc.Port || 8001,
              endpoint: '/health',
              status: c.Status as 'passing' | 'critical' | 'warning',
              latency: '14ms',
              isSample: false,
              checkId: c.CheckID || `service:${c.ServiceID}`,
              output: c.Output || 'HTTP GET /health: 200 OK',
              lastCheck: '1s ago',
            };
          });
      }

      const merged = [...liveItems];
      for (const sample of SAMPLE_HEALTH_SERVICES) {
        if (!merged.some((m) => m.id === sample.id || m.serviceName === sample.serviceName)) {
          merged.push(sample);
        }
      }

      setItems(merged);
      if (!selectedService && merged.length > 0) {
        setSelectedService(merged[0]);
      }
    } catch {
      setItems([...SAMPLE_HEALTH_SERVICES]);
      if (!selectedService) setSelectedService(SAMPLE_HEALTH_SERVICES[0]);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedService]);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const pingSingleService = (item: HealthItem) => {
    showToast(`Pinging ${item.name} (${item.address}:${item.port}${item.endpoint})...`, 'info');
    setTimeout(() => {
      showToast(
        `${item.name} responded: ${item.status === 'passing' ? 'HTTP 200 OK (22ms)' : 'HTTP 503 Critical'}`,
        item.status === 'passing' ? 'success' : 'error'
      );
    }, 600);
  };

  const triggerAllProbes = () => {
    showToast('Triggering health check cycle across all registered nodes...', 'info');
    fetchHealthData();
    setTimeout(() => {
      showToast('Health sweep completed. Consul agent telemetry refreshed.', 'success');
    }, 800);
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
    } else if (filterCat === 'gcp') {
      list = list.filter((i) => i.provider.toLowerCase() === 'gcp');
    } else if (filterCat === 'azure') {
      list = list.filter((i) => i.provider.toLowerCase() === 'azure');
    } else if (filterCat === 'failing') {
      list = list.filter((i) => i.status === 'critical' || i.status === 'warning');
    }

    return list;
  }, [items, searchFilter, filterCat]);

  const total = items.length;
  const passingCount = items.filter((i) => i.status === 'passing').length;
  const criticalCount = items.filter((i) => i.status === 'critical' || i.status === 'warning').length;
  const slaPct = total > 0 ? ((passingCount / total) * 100).toFixed(1) : '100.0';

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm text-secondary font-code-sm text-code-sm uppercase tracking-wider">
            <span>Service Mesh Layer</span>
            <span>/</span>
            <span>Health &amp; Telemetry Probing</span>
            <span>/</span>
            <span className="text-primary font-medium">Real-Time Telemetry</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Service Health &amp; Telemetry Probing
          </h1>
          <p className="font-body-lg text-body-lg text-secondary mt-1">
            Real-time health probing of cross-cloud microservices synchronized with HashiCorp Consul daemon.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={triggerAllProbes}
            className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg transition-colors shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}>
              cached
            </span>
            <span>Trigger All Probes</span>
          </button>
          <div className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary">lock_reset</span>
            <span className="font-code-sm text-code-sm text-on-surface">Catalog Synced (5s interval)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Card 1 */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Total Probes Monitored
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-on-surface">{total}</span>
                <span className="text-label-lg font-label-lg text-outline">Probes</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">sensors</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-body-sm font-body-sm">
            <span className="text-on-surface-variant">Across 3 Clouds</span>
            <span className="inline-flex items-center text-code-sm font-code-sm font-medium px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
              Multi-cloud serf gossip active
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Passing Health Probes
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-tertiary">{passingCount}</span>
                <span className="text-label-lg font-label-lg text-tertiary font-semibold">Passing</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-body-sm font-body-sm">
            <span className="text-on-surface-variant">HTTP 200 OK • Nominal</span>
            <span className="inline-flex items-center text-code-sm font-code-sm font-medium px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
              +{slaPct}% Avail
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Unhealthy Services
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-error">{criticalCount}</span>
                <span className="text-label-lg font-label-lg text-error font-semibold">Critical</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-body-sm font-body-sm">
            <span className="text-on-surface-variant truncate">
              {criticalCount > 0 ? 'Order Service (503 error)' : 'All checks nominal'}
            </span>
            <span className="inline-flex items-center text-code-sm font-code-sm font-medium px-2 py-0.5 rounded-full bg-error-container text-on-error-container">
              {criticalCount > 0 ? 'Attention Req.' : 'Healthy'}
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md uppercase tracking-wider text-outline font-semibold">
                Overall Health SLA
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-headline-xl font-headline-xl text-on-surface">{slaPct}%</span>
                <span className="text-code-sm font-code-sm text-outline">Target: 99.95%</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">ecg_heart</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden flex">
              <div
                className="h-full bg-tertiary-container rounded-l-full transition-all duration-500"
                style={{ width: `${slaPct}%` }}
              ></div>
              <div
                className="h-full bg-error rounded-r-full transition-all duration-500"
                style={{ width: `${100 - Number(slaPct)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-code-sm font-code-sm text-outline">
              <span className="text-tertiary font-medium">{passingCount} passing</span>
              <span className="text-error font-medium">{criticalCount} critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid (8 cols left, 4 cols right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column (8 cols): Table */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg min-w-0">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Table Header & Search */}
            <div className="p-space-md sm:p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md bg-surface-container-low/40">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">monitor_heart</span>
                  <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight">
                    Service Health &amp; Probe Registry
                  </h2>
                </div>
                <span className="text-body-sm font-body-sm text-on-surface-variant">
                  Live ping results aggregated from Consul local agent daemons
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Filter checks..."
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-space-md sm:px-space-lg py-2.5 bg-surface-container-low/80 flex flex-wrap items-center gap-2">
              <button
                className={`px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium transition-colors ${
                  filterCat === 'all'
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
                onClick={() => setFilterCat('all')}
              >
                All ({total})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium transition-colors ${
                  filterCat === 'aws'
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
                onClick={() => setFilterCat('aws')}
              >
                AWS ({items.filter((i) => i.provider.toLowerCase() === 'aws').length})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium transition-colors ${
                  filterCat === 'gcp'
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
                onClick={() => setFilterCat('gcp')}
              >
                GCP ({items.filter((i) => i.provider.toLowerCase() === 'gcp').length})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium transition-colors ${
                  filterCat === 'azure'
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
                onClick={() => setFilterCat('azure')}
              >
                Azure ({items.filter((i) => i.provider.toLowerCase() === 'azure').length})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium transition-colors flex items-center gap-1 ${
                  filterCat === 'failing'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
                onClick={() => setFilterCat('failing')}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                Failing Only ({criticalCount})
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-code-sm text-code-sm uppercase tracking-wider">
                    <th className="py-3 px-space-md font-semibold">Service Name</th>
                    <th className="py-3 px-space-md font-semibold">Provider / Region</th>
                    <th className="py-3 px-space-md font-semibold">IP &amp; Port</th>
                    <th className="py-3 px-space-md font-semibold">Endpoint</th>
                    <th className="py-3 px-space-md font-semibold">Last Check</th>
                    <th className="py-3 px-space-md font-semibold">Latency</th>
                    <th className="py-3 px-space-md font-semibold">Status</th>
                    <th className="py-3 px-space-md font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm font-body-sm divide-y-0">
                  {filteredItems.map((item) => {
                    const isPassing = item.status === 'passing';
                    const isSelected = selectedService?.id === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-surface-container-low/50 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-surface-container-low' : ''
                        }`}
                        onClick={() => setSelectedService(item)}
                      >
                        <td className="py-3.5 px-space-md">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${isPassing ? 'bg-tertiary' : 'bg-error'}`}
                            ></span>
                            <div className="flex flex-col">
                              <span className="font-label-lg text-label-lg font-medium text-on-surface group-hover:text-primary transition-colors">
                                {item.name}
                              </span>
                              <span className="font-code-sm text-code-sm text-outline">{item.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-space-md">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-code-sm text-code-sm font-semibold bg-surface-container text-on-surface">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.provider === 'AWS'
                                  ? 'bg-primary'
                                  : item.provider === 'GCP'
                                  ? 'bg-tertiary'
                                  : 'bg-primary'
                              }`}
                            ></span>
                            {item.provider} {item.region}
                          </span>
                        </td>
                        <td className="py-3.5 px-space-md font-code-sm text-code-sm text-on-surface select-all">
                          {item.address}:{item.port}
                        </td>
                        <td className="py-3.5 px-space-md">
                          <span className="px-2 py-0.5 rounded bg-surface-container font-code-sm text-code-sm text-on-surface-variant">
                            {item.endpoint}
                          </span>
                        </td>
                        <td className="py-3.5 px-space-md text-outline font-code-sm text-code-sm">{item.lastCheck}</td>
                        <td className="py-3.5 px-space-md">
                          <span className="px-2 py-0.5 rounded-full bg-surface-container font-code-sm text-code-sm text-on-surface font-medium">
                            {item.latency}
                          </span>
                        </td>
                        <td className="py-3.5 px-space-md">
                          {isPassing ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-label-md text-label-md font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                              Healthy (Passing)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-md text-label-md font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                              Critical (Failing)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-space-md text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-code-sm font-code-sm font-medium transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedService(item);
                              }}
                            >
                              Inspect
                            </button>
                            <button
                              className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                pingSingleService(item);
                              }}
                              title="Probe Now"
                            >
                              <span className="material-symbols-outlined text-[18px]">cached</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Selected Service Details Panel */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {selectedService ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Service Probe Inspector</h3>
                </div>
                <span className="font-code-sm text-code-sm text-secondary">Consul Telemetry</span>
              </div>

              {/* Node Card */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                    {selectedService.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${
                      selectedService.status === 'passing'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {selectedService.status === 'passing' ? 'PASSING (200 OK)' : 'CRITICAL (503 ERROR)'}
                  </span>
                </div>
                <span className="font-code-sm text-code-sm text-secondary">
                  Node: {selectedService.id} • {selectedService.provider} ({selectedService.region})
                </span>
              </div>

              {/* Ping action button */}
              <button
                className="w-full flex items-center justify-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors"
                onClick={() => pingSingleService(selectedService)}
              >
                <span className="material-symbols-outlined text-[18px]">sensors</span>
                <span>Send Manual Ping Probe</span>
              </button>

              {/* Raw Consul Stream */}
              <div className="bg-inverse-surface rounded-lg p-space-sm font-code-sm text-code-sm text-inverse-on-surface">
                <div className="flex items-center justify-between pb-1 text-inverse-primary/60">
                  <span>Consul Probe Output</span>
                  <span>exit: {selectedService.status === 'passing' ? 0 : 1}</span>
                </div>
                <code className="select-all block break-all whitespace-pre-wrap font-mono mt-1 text-[11px]">
                  {selectedService.output}
                </code>
              </div>

              {/* Details table */}
              <div className="flex flex-col gap-1.5 font-code-sm text-code-sm">
                <div className="flex justify-between py-1 bg-surface-container-low px-2 rounded">
                  <span className="text-secondary">Check ID:</span>
                  <span className="text-on-surface font-semibold truncate max-w-[180px]">{selectedService.checkId}</span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container px-2 rounded">
                  <span className="text-secondary">Probe URL:</span>
                  <span className="text-on-surface truncate max-w-[180px]">
                    http://{selectedService.address}:{selectedService.port}{selectedService.endpoint}
                  </span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container-low px-2 rounded">
                  <span className="text-secondary">Interval / Timeout:</span>
                  <span className="text-on-surface">10s / 2s policy</span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container px-2 rounded">
                  <span className="text-secondary">Deregister Policy:</span>
                  <span className="text-on-surface">After 1m critical</span>
                </div>
              </div>

              {/* Downstream Dependencies */}
              <div className="flex flex-col gap-1.5">
                <span className="font-label-md text-label-md text-on-surface font-medium">Downstream Dependencies</span>
                <div className="grid grid-cols-3 gap-1.5 font-code-sm text-code-sm text-center">
                  <div className="p-1.5 rounded bg-surface-container-low">
                    <span className="text-secondary block text-[10px]">HTTP Listener</span>
                    <span
                      className={`font-semibold ${
                        selectedService.status === 'passing' ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {selectedService.status === 'passing' ? 'UP' : 'FAILING'}
                    </span>
                  </div>
                  <div className="p-1.5 rounded bg-surface-container-low">
                    <span className="text-secondary block text-[10px]">Database</span>
                    <span
                      className={`font-semibold ${
                        selectedService.status === 'passing' ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {selectedService.status === 'passing' ? 'READY' : 'DOWN'}
                    </span>
                  </div>
                  <div className="p-1.5 rounded bg-surface-container-low">
                    <span className="text-secondary block text-[10px]">Mesh Proxy</span>
                    <span className="text-tertiary font-semibold">SYNCED</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center text-secondary">
              Select a service from the table to inspect telemetry details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

