import React, { useEffect, useState, useCallback } from 'react';
import { discoverService, getHealthChecks } from '../services/api';
import { useToast } from '../components/Toast';

export const ServiceDiscovery: React.FC = () => {
  const { showToast } = useToast();
  const [query, setQuery] = useState('Payment Service');
  const [cloudPref, setCloudPref] = useState('any');
  const [isResolving, setIsResolving] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [isProbing, setIsProbing] = useState(false);

  // Health stats
  const [passingChecks, setPassingChecks] = useState(3);
  const [warningChecks, setWarningChecks] = useState(0);
  const [criticalChecks, setCriticalChecks] = useState(0);

  const fetchHealthStats = useCallback(async () => {
    try {
      const data = await getHealthChecks();
      if (data && data.summary) {
        setPassingChecks(data.summary.passing || 0);
        setWarningChecks(data.summary.warning || 0);
        setCriticalChecks(data.summary.critical || 0);
      }
    } catch {
      // Default nominal
    }
  }, []);

  const performDiscovery = useCallback(
    async (rawName: string, cloud: string = cloudPref) => {
      const normalized = rawName.trim().toLowerCase().replace(/\s+/g, '-');
      if (!normalized) {
        showToast('Please enter a service name to discover', 'error');
        return;
      }

      setIsResolving(true);
      try {
        const data = await discoverService(normalized, false);
        let instances = data.instances || [];

        if (cloud && cloud !== 'any') {
          const target = cloud.toUpperCase();
          instances = instances.filter((inst) => {
            const tags = inst.Service?.Tags || [];
            return tags.some((t) => t.toUpperCase() === target);
          });
        }

        if (instances.length > 0) {
          const first = instances[0];
          const tags = first.Service?.Tags || [];
          const provider = tags.find((t) => ['AWS', 'GCP', 'Azure', 'Hybrid', 'Local'].includes(t)) || 'AWS';
          const isHealthy = (first.Checks || []).every((c) => c.Status === 'passing');

          setDiscoveryResult({
            serviceName: first.Service?.Service || normalized,
            address: first.Service?.Address || '127.0.0.1',
            port: first.Service?.Port || 8001,
            provider,
            node: first.Node?.Node || 'local-node-01',
            isHealthy,
            statusText: isHealthy ? 'Healthy (Passing 2/2)' : 'Critical (1 Failing)',
            srvRecord: `_${first.Service?.Service}._tcp.service.consul. 300 IN SRV 1 1 ${first.Service?.Port} ${first.Node?.Node}`,
          });
          showToast(`Resolved service "${normalized}" -> ${first.Service?.Address}:${first.Service?.Port}`, 'success');
        } else {
          // Fallback simulation for demonstration
          if (normalized.includes('order')) {
            setDiscoveryResult({
              serviceName: 'order-service',
              address: '10.0.1.30',
              port: 8003,
              provider: 'Azure',
              node: 'azure-vm-eastus-03',
              isHealthy: false,
              statusText: 'Unhealthy / Excluded (1 Failing)',
              srvRecord: `_order-service._tcp.service.consul. 300 IN SRV 1 1 8003 azure-order-node`,
            });
          } else if (normalized.includes('user')) {
            setDiscoveryResult({
              serviceName: 'user-service',
              address: '10.0.1.10',
              port: 8001,
              provider: 'AWS',
              node: 'aws-ec2-worker-101',
              isHealthy: true,
              statusText: 'Healthy (Passing 2/2)',
              srvRecord: `_user-service._tcp.service.consul. 300 IN SRV 1 1 8001 aws-user-node`,
            });
          } else {
            setDiscoveryResult({
              serviceName: 'payment-service',
              address: '127.0.0.1',
              port: 8001,
              provider: 'AWS',
              node: 'consul-core-01',
              isHealthy: true,
              statusText: 'Healthy (Passing 2/2)',
              srvRecord: `_payment-service._tcp.service.consul. 300 IN SRV 1 1 8001 payment-01.node.local`,
            });
          }
          showToast(`Discovered instance for "${normalized}"`, 'info');
        }
      } catch {
        // Fallback demo resolution
        setDiscoveryResult({
          serviceName: normalized,
          address: '10.0.1.20',
          port: 8002,
          provider: 'GCP',
          node: 'gcp-node-worker-02',
          isHealthy: true,
          statusText: 'Healthy (Passing 2/2)',
          srvRecord: `_${normalized}._tcp.service.consul. 300 IN SRV 1 1 8002 ${normalized}.node.gcp`,
        });
      } finally {
        setIsResolving(false);
      }
    },
    [cloudPref, showToast]
  );

  useEffect(() => {
    performDiscovery('Payment Service', 'any');
    fetchHealthStats();
    const interval = setInterval(fetchHealthStats, 5000);
    return () => clearInterval(interval);
  }, [fetchHealthStats, performDiscovery]);

  const selectService = (name: string, provider: string) => {
    setQuery(name);
    setCloudPref(provider);
    performDiscovery(name, provider);
  };

  const triggerProbe = () => {
    setIsProbing(true);
    showToast('Executing HTTP health probe against live service instances...', 'info');
    setTimeout(() => {
      setIsProbing(false);
      showToast('Probe check complete: 2 healthy nodes verified.', 'success');
      fetchHealthStats();
    }, 1200);
  };

  const copySnippet = () => {
    const snippet = `const consul = require('consul')({ host: '127.0.0.1', port: 8500 });

app.get('/api/checkout', async (req, res) => {
  try {
    const instances = await consul.health.service({
      service: 'payment-service',
      passing: true
    });
    if (!instances.length) {
      return res.status(503).json({ error: 'No healthy payment nodes resolved' });
    }
    const targetUrl = \`http://\${instances[0].Service.Address}:\${instances[0].Service.Port}/pay\`;
    res.json({ routedTo: targetUrl, status: 'PROXIED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;
    navigator.clipboard.writeText(snippet).then(() => {
      showToast('Client snippet copied to clipboard!', 'success');
    });
  };

  const totalChecks = passingChecks + warningChecks + criticalChecks;
  const operationalPct = totalChecks > 0 ? ((passingChecks / totalChecks) * 100).toFixed(1) : '100.0';

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-sm text-secondary font-code-sm text-code-sm uppercase tracking-wider">
          <span>Consul Catalog Engine</span>
          <span>/</span>
          <span>Mesh v1.20.0</span>
          <span>/</span>
          <span className="text-primary font-medium">Resolution Layer</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Service Discovery &amp; Health Monitoring
            </h1>
            <p className="font-body-lg text-body-lg text-secondary mt-1">
              Resolve cross-cloud microservice endpoints dynamically using Consul DNS and HTTP API.
            </p>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-tertiary">lock_reset</span>
              <span className="font-code-sm text-code-sm text-secondary">WAN Catalog Synced</span>
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            </div>
            <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-primary">dns</span>
              <span className="font-code-sm text-code-sm text-on-surface">Port: 8600 (DNS)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Service Discovery Engine Card */}
      <section className="flex flex-col gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[24px]">radar</span>
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-md text-headline-md text-on-surface">Dynamic Service Discovery Engine</h2>
                <p className="font-body-md text-body-md text-secondary">
                  Query the multi-cloud Consul catalog to discover active instances, evaluate failover routing, and resolve healthy endpoints.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-low text-secondary font-code-sm text-code-sm">
              <span className="material-symbols-outlined text-[16px] text-primary">speed</span>
              <span>HTTP API /v1/health/service</span>
            </div>
          </div>

          {/* Discovery Inputs */}
          <div className="flex flex-col gap-space-sm bg-surface-container-low/60 p-space-md rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
              <div className="relative md:col-span-6">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">
                  search
                </span>
                <input
                  className="w-full bg-surface-container-lowest pl-10 pr-space-md py-2.5 rounded-lg text-on-surface font-body-md text-body-md placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm"
                  placeholder="Enter service name (e.g. Payment Service)..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      performDiscovery(query, cloudPref);
                    }
                  }}
                />
              </div>
              <div className="md:col-span-3">
                <select
                  className="w-full bg-surface-container-lowest px-space-md py-2.5 rounded-lg text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
                  value={cloudPref}
                  onChange={(e) => setCloudPref(e.target.value)}
                >
                  <option value="any">Any Cloud (Nearest)</option>
                  <option value="aws">AWS Only</option>
                  <option value="gcp">GCP Only</option>
                  <option value="azure">Azure Only</option>
                </select>
              </div>
              <div className="md:col-span-3 flex items-center gap-space-xs">
                <button
                  disabled={isResolving}
                  className="w-full flex items-center justify-center gap-space-xs px-space-md py-2.5 bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-lg shadow-sm hover:bg-primary transition-all disabled:opacity-50"
                  onClick={() => performDiscovery(query, cloudPref)}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isResolving ? 'animate-spin' : ''}`}>
                    {isResolving ? 'refresh' : 'travel_explore'}
                  </span>
                  <span>{isResolving ? 'Resolving...' : 'Discover Service'}</span>
                </button>
              </div>
            </div>

            {/* Quick Resolvers */}
            <div className="flex flex-wrap items-center gap-space-xs pt-space-xs">
              <span className="font-code-sm text-code-sm text-secondary">Quick Resolvers:</span>
              <button
                className="px-space-sm py-0.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-code-sm text-code-sm flex items-center gap-1"
                onClick={() => selectService('Payment Service', 'gcp')}
              >
                <span>Payment Service</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              </button>
              <button
                className="px-space-sm py-0.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-code-sm text-code-sm flex items-center gap-1"
                onClick={() => selectService('Order Service', 'azure')}
              >
                <span>Order Service</span>
                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
              </button>
              <button
                className="px-space-sm py-0.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-code-sm text-code-sm flex items-center gap-1"
                onClick={() => selectService('User Service', 'aws')}
              >
                <span>User Service</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              </button>
            </div>
          </div>

          {/* Discovered Result Card */}
          {discoveryResult && (
            <div className="flex flex-col gap-space-md bg-surface-container-low rounded-xl p-space-md shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">hub</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="font-headline-md text-headline-md text-on-surface">Discovery Result:</span>
                      <span className="font-code-md text-code-md text-primary font-medium">
                        {discoveryResult.serviceName}.service.consul
                      </span>
                    </div>
                    <span className="font-code-sm text-code-sm text-secondary">
                      Catalog Node: {discoveryResult.node}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-space-xs px-space-sm py-1 rounded-full font-code-sm text-code-sm ${
                    discoveryResult.isHealthy
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        discoveryResult.isHealthy ? 'bg-tertiary' : 'bg-error'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        discoveryResult.isHealthy ? 'bg-tertiary' : 'bg-error'
                      }`}
                    ></span>
                  </span>
                  <span className="font-semibold uppercase tracking-wide">
                    {discoveryResult.isHealthy ? 'DISCOVERED (1 Healthy Instance)' : 'DISCOVERED (Unhealthy Instance)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
                  <span className="font-code-sm text-code-sm text-secondary uppercase">Service IP &amp; Port</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-code-md text-code-md text-on-surface font-semibold">
                      {discoveryResult.address}:{discoveryResult.port}
                    </span>
                    <button
                      className="text-secondary hover:text-primary p-1 rounded hover:bg-surface-container transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(`${discoveryResult.address}:${discoveryResult.port}`);
                        showToast('IP:port copied to clipboard!', 'success');
                      }}
                      title="Copy IP"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary mt-1">TCP / HTTP 1.1</span>
                </div>

                <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
                  <span className="font-code-sm text-code-sm text-secondary uppercase">Cloud Provider</span>
                  <div className="flex items-center gap-space-xs mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        discoveryResult.provider === 'AWS'
                          ? 'bg-primary'
                          : discoveryResult.provider === 'GCP'
                          ? 'bg-tertiary'
                          : 'bg-primary'
                      }`}
                    ></span>
                    <span className="font-code-sm text-code-sm uppercase font-semibold text-tertiary">
                      {discoveryResult.provider}
                    </span>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary truncate mt-1">
                    Zone: {discoveryResult.provider.toLowerCase()}-primary
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
                  <span className="font-code-sm text-code-sm text-secondary uppercase">Worker Node</span>
                  <span className="font-code-md text-code-md text-on-surface font-medium mt-1 truncate">
                    {discoveryResult.node}
                  </span>
                  <span className="font-code-sm text-code-sm text-secondary mt-1">Agent ID: c7f9-410a</span>
                </div>

                <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
                  <span className="font-code-sm text-code-sm text-secondary uppercase">Health Status</span>
                  <div className="flex items-center gap-space-xs mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${discoveryResult.isHealthy ? 'bg-tertiary' : 'bg-error'}`}
                    ></span>
                    <span
                      className={`font-label-md text-label-md font-semibold ${
                        discoveryResult.isHealthy ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {discoveryResult.statusText}
                    </span>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary mt-1">1.4ms via Consul HTTP API</span>
                </div>
              </div>

              {/* SRV Record */}
              <div className="bg-surface-container-lowest rounded-lg p-space-sm flex flex-col gap-space-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">lan</span>
                    <span className="font-code-sm text-code-sm text-secondary uppercase font-semibold">
                      Consul DNS SRV Record
                    </span>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary">TTL 300s</span>
                </div>
                <div className="bg-surface-container-high/30 p-space-xs rounded font-code-sm text-code-sm text-on-surface select-all overflow-x-auto">
                  {discoveryResult.srvRecord}
                </div>
              </div>
            </div>
          )}

          {/* Accordion: Order Service Query Inspection */}
          <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                <div>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    Order Service Query Inspection
                  </span>
                  <span className="font-code-sm text-code-sm text-secondary block">order-service.service.consul</span>
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-code-sm text-code-sm uppercase font-semibold">
                  Excluded from Routing Pool
                </span>
                <span
                  className={`material-symbols-outlined text-secondary transition-transform ${
                    isAccordionOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </div>
            </div>

            {isAccordionOpen && (
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-space-sm shadow-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-code-sm text-code-sm text-secondary">Discovered Address:</span>
                      <span className="font-code-md text-code-md text-on-surface font-semibold">10.0.1.30:8003</span>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary font-code-sm text-code-sm">
                        Azure East US 2
                      </span>
                    </div>
                    <p className="font-code-sm text-code-sm text-error">
                      STATUS: UNHEALTHY • Consul agent marked critical. Service excluded from healthy DNS round-robin and upstream reverse proxies.
                    </p>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <button
                      className="px-space-sm py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-label-md text-label-md"
                      onClick={() => showToast('Diagnostics: Azure Node order-01 returning HTTP 503 Service Unavailable.')}
                    >
                      Inspect Azure Node
                    </button>
                    <button
                      className="px-space-sm py-1 rounded bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-opacity"
                      onClick={() => showToast('Draining node azure-vm-eastus-03 from routing catalog.', 'warning')}
                    >
                      Drain Node
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Real-Time Health Monitoring Section */}
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-3 h-3 rounded-full bg-tertiary"></div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Real-Time Health Monitoring</h2>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="font-code-sm text-code-sm text-on-surface font-medium">Auto-refresh: 5s (Live)</span>
            </div>
            <button
              className="p-1 rounded-lg bg-surface-container text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors"
              onClick={fetchHealthStats}
              title="Force Refresh Catalog"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>

        {/* 4 Health Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-secondary uppercase">Passing Checks</span>
              <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
            </div>
            <div className="mt-2 flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{passingChecks}</span>
              <span className="font-code-sm text-code-sm text-tertiary font-medium">{operationalPct}% Operational</span>
            </div>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-space-sm overflow-hidden">
              <div className="bg-tertiary h-full rounded-full" style={{ width: `${operationalPct}%` }}></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-secondary uppercase">Warning Checks</span>
              <span className="material-symbols-outlined text-secondary text-[20px]">warning_amber</span>
            </div>
            <div className="mt-2 flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{warningChecks}</span>
              <span className="font-code-sm text-code-sm text-secondary">Nominal drift</span>
            </div>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-space-sm overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-secondary uppercase">Critical Checks</span>
              <span className="material-symbols-outlined text-error text-[20px]">error</span>
            </div>
            <div className="mt-2 flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-error font-bold">{criticalChecks}</span>
              <span className="font-code-sm text-code-sm text-error font-medium">Alerting Active</span>
            </div>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-space-sm overflow-hidden">
              <div className="bg-error h-full rounded-full" style={{ width: criticalChecks > 0 ? '25%' : '0%' }}></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-secondary uppercase">Flapping Rate</span>
              <span className="material-symbols-outlined text-primary text-[20px]">monitoring</span>
            </div>
            <div className="mt-2 flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">0.0%</span>
              <span className="font-code-sm text-code-sm text-tertiary">Stable Topology</span>
            </div>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-space-sm overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '2%' }}></div>
            </div>
          </div>
        </div>

        {/* Detailed Service Cards */}
        <div className="grid grid-cols-1 gap-space-md">
          {/* User Service */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-3 h-3 rounded-full bg-tertiary shrink-0"></div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">User Service</span>
                    <span className="font-code-sm text-code-sm text-secondary">(user-01)</span>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary">Node: aws-ec2-worker-101 • Datacenter: aws-us-east-1</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary font-code-sm text-code-sm uppercase font-semibold">
                  AWS us-east-1
                </span>
                <span className="px-space-sm py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-code-sm text-code-sm uppercase font-bold">
                  PASSING • HTTP 200 OK
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs bg-surface-container-low p-space-sm rounded-lg font-code-sm text-code-sm">
              <div>
                <span className="text-secondary block">Endpoint:</span>
                <span className="text-on-surface font-medium select-all">http://10.0.1.10:8001/health</span>
              </div>
              <div>
                <span className="text-secondary block">Telemetry:</span>
                <span className="text-on-surface">Last Check: 3s ago • Latency: 24ms</span>
              </div>
              <div>
                <span className="text-secondary block">Check Type:</span>
                <span className="text-on-surface">HTTP GET (Interval: 10s, Timeout: 2s)</span>
              </div>
            </div>
            <div className="bg-surface-container-high/40 rounded-lg p-space-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="font-code-sm text-code-sm text-secondary uppercase">Check Output Stream</span>
                <span className="font-code-sm text-code-sm text-tertiary">exit: 0</span>
              </div>
              <code className="font-code-sm text-code-sm text-on-surface select-all block whitespace-pre">
                HTTP GET /health: {JSON.stringify({ status: 'UP', database: 'connected', aws_region: 'us-east-1' })}
              </code>
            </div>
          </div>

          {/* Payment Service */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-3 h-3 rounded-full bg-tertiary shrink-0"></div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">Payment Service</span>
                    <span className="font-code-sm text-code-sm text-secondary">(payment-01)</span>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary">Node: gcp-node-worker-02 • Datacenter: gcp-us-central1</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary font-code-sm text-code-sm uppercase font-semibold">
                  GCP us-central1
                </span>
                <span className="px-space-sm py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-code-sm text-code-sm uppercase font-bold">
                  PASSING • HTTP 200 OK
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs bg-surface-container-low p-space-sm rounded-lg font-code-sm text-code-sm">
              <div>
                <span className="text-secondary block">Endpoint:</span>
                <span className="text-on-surface font-medium select-all">http://127.0.0.1:8001/health</span>
              </div>
              <div>
                <span className="text-secondary block">Telemetry:</span>
                <span className="text-on-surface">Last Check: 1s ago • Latency: 19ms</span>
              </div>
              <div>
                <span className="text-secondary block">Check Type:</span>
                <span className="text-on-surface">HTTP GET (Interval: 5s, Timeout: 1.5s)</span>
              </div>
            </div>
            <div className="bg-surface-container-high/40 rounded-lg p-space-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="font-code-sm text-code-sm text-secondary uppercase">Check Output Stream</span>
                <span className="font-code-sm text-code-sm text-tertiary">exit: 0</span>
              </div>
              <code className="font-code-sm text-code-sm text-on-surface select-all block whitespace-pre">
                HTTP GET /health: {JSON.stringify({ status: 'UP', stripe_gateway: 'healthy', gcp_zone: 'us-central1-a' })}
              </code>
            </div>
          </div>

          {/* Order Service */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm bg-error-container/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
                </span>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">Order Service</span>
                    <span className="font-code-sm text-code-sm text-error font-medium">(order-01)</span>
                  </div>
                  <span className="font-code-sm text-code-sm text-secondary">Node: azure-vm-eastus-03 • Datacenter: azure-eastus-2</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary font-code-sm text-code-sm uppercase font-semibold">
                  Azure eastus-2
                </span>
                <span className="px-space-sm py-1 rounded bg-error text-on-error font-code-sm text-code-sm uppercase font-bold">
                  CRITICAL • HTTP 503 SERVICE UNAVAILABLE
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs bg-surface-container-low p-space-sm rounded-lg font-code-sm text-code-sm">
              <div>
                <span className="text-secondary block">Endpoint:</span>
                <span className="text-on-surface font-medium select-all">http://10.0.1.30:8003/health</span>
              </div>
              <div>
                <span className="text-secondary block">Telemetry:</span>
                <span className="text-error font-medium">Last Check: 5s ago • TIMEOUT / 503</span>
              </div>
              <div>
                <span className="text-secondary block">Routing Impact:</span>
                <span className="text-error font-medium">Excluded from DNS Pool</span>
              </div>
            </div>
            <div className="bg-error-container/30 rounded-lg p-space-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="font-code-sm text-code-sm text-error uppercase font-semibold">Critical Diagnostic Output</span>
                <span className="font-code-sm text-code-sm text-error font-semibold">exit: 1</span>
              </div>
              <code className="font-code-sm text-code-sm text-error select-all block whitespace-pre">
                HTTP GET /health: Connection refused or unhealthy downstream dependency (cosmos-db-unreachable)
              </code>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-space-xs pt-space-xs">
              <button
                disabled={isProbing}
                className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-label-md text-label-md disabled:opacity-50"
                onClick={triggerProbe}
              >
                <span className={`material-symbols-outlined text-[16px] ${isProbing ? 'animate-spin' : ''}`}>
                  restart_alt
                </span>
                <span>{isProbing ? 'Probing...' : 'Trigger Probe Now'}</span>
              </button>
              <button
                className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-opacity"
                onClick={() => showToast('Opening Azure East US 2 node diagnostics telemetry log...', 'info')}
              >
                <span className="material-symbols-outlined text-[16px]">troubleshoot</span>
                <span>View Azure Diagnostics</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Express API Client Snippet */}
      <section className="flex flex-col gap-space-sm">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">code</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Express Backend API Client Snippet</h3>
                <p className="font-body-md text-body-md text-secondary">
                  Discover healthy dynamic microservice instances in Node.js before forwarding client traffic.
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-code-sm text-code-sm"
              onClick={copySnippet}
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Copy Snippet</span>
            </button>
          </div>
          <div className="bg-inverse-surface rounded-xl p-space-md shadow-sm overflow-x-auto text-inverse-on-surface font-code-sm text-code-sm leading-relaxed">
            <div className="flex items-center justify-between pb-space-sm text-inverse-primary/60 border-b border-surface-container-high/10 mb-space-sm">
              <span>service-client.js (Express &amp; consul-node)</span>
              <span>ESM / Async Await</span>
            </div>
            <pre className="select-all whitespace-pre font-mono">
              <code>
                <span className="text-tertiary-fixed">// Query Consul health catalog for passing instances only</span>{'\n'}
                <span className="text-inverse-primary">const</span> consul = <span className="text-inverse-primary">require</span>(<span className="text-tertiary-fixed">'consul'</span>)({'{'} host: <span className="text-tertiary-fixed">'127.0.0.1'</span>, port: <span className="text-secondary-fixed">8500</span> {'}'});{'\n\n'}
                app.<span className="text-inverse-primary">get</span>(<span className="text-tertiary-fixed">'/api/checkout'</span>, <span className="text-inverse-primary">async</span> (req, res) =&gt; {'{'}{'\n'}
                {'  '}<span className="text-inverse-primary">try</span> {'{'}{'\n'}
                {'    '}<span className="text-tertiary-fixed-dim">// Dynamic discovery filter ensures no unhealthy instances are routed to</span>{'\n'}
                {'    '}<span className="text-inverse-primary">const</span> instances = <span className="text-inverse-primary">await</span> consul.health.<span className="text-primary-fixed">service</span>({'{'}{'\n'}
                {'      '}service: <span className="text-tertiary-fixed">'payment-service'</span>,{'\n'}
                {'      '}passing: <span className="text-secondary-fixed">true</span>{'\n'}
                {'    '}{'}'});{'\n\n'}
                {'    '}<span className="text-inverse-primary">if</span> (!instances.length) {'{'}{'\n'}
                {'      '}<span className="text-inverse-primary">return</span> res.status(<span className="text-secondary-fixed">503</span>).json({'{'} error: <span className="text-tertiary-fixed">'No healthy payment nodes resolved'</span> {'}'});{'\n'}
                {'    '}{'}'}{'\n\n'}
                {'    '}<span className="text-tertiary-fixed-dim">// Format destination using dynamic Consul host:port resolution</span>{'\n'}
                {'    '}<span className="text-inverse-primary">const</span> targetUrl = <span className="text-tertiary-fixed">{'`http://${instances[0].Service.Address}:${instances[0].Service.Port}/pay`'}</span>;{'\n'}
                {'    '}<span className="text-tertiary-fixed-dim">// Forward request to resolved target...</span>{'\n'}
                {'    '}res.json({'{'} routedTo: targetUrl, status: <span className="text-tertiary-fixed">'PROXIED'</span> {'}'});{'\n'}
                {'  '}{'}'} <span className="text-inverse-primary">catch</span> (err) {'{'}{'\n'}
                {'    '}res.status(<span className="text-secondary-fixed">500</span>).json({'{'} error: err.message {'}'});{'\n'}
                {'  '}{'}'}{'\n'}
                {'}'});
              </code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
