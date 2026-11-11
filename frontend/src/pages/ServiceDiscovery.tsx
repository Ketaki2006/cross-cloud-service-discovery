import React, { useEffect, useState, useCallback } from 'react';
import {
  discoverService,
  getHealthChecks,
  getPaymentServiceHealth,
  getConsulCatalog,
} from '../services/api';
import {
  ConsulCatalogEntry,
  PaymentHealthCheckResponse,
} from '../types';
import { useToast } from '../components/Toast';

interface ResolvedResult {
  serviceName: string;
  instances: Array<{
    id: string;
    name: string;
    address: string;
    port: number;
    provider: string;
    node: string;
    datacenter: string;
    tags: string[];
    status: string;
    isHealthy: boolean;
    srvRecord: string;
    checkOutput: string;
  }>;
  passingOnly: boolean;
  queriedAt: string;
}

export const ServiceDiscovery: React.FC = () => {
  const { showToast } = useToast();
  const [query, setQuery] = useState('payment-service');
  const [cloudPref, setCloudPref] = useState('any');
  const [passingOnly, setPassingOnly] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<ResolvedResult | null>(null);

  // Payment-service specific Consul passing vs all comparison
  const [paymentHealth, setPaymentHealth] = useState<PaymentHealthCheckResponse | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<ConsulCatalogEntry[]>([]);

  // Live Consul aggregated health stats
  const [passingChecks, setPassingChecks] = useState<number | null>(null);
  const [warningChecks, setWarningChecks] = useState<number | null>(null);
  const [criticalChecks, setCriticalChecks] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveMetadata = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, payRes, catRes] = await Promise.all([
        getHealthChecks().catch(() => null),
        getPaymentServiceHealth().catch(() => null),
        getConsulCatalog().catch(() => null),
      ]);
      if (healthRes?.summary) {
        setPassingChecks(healthRes.summary.passing);
        setWarningChecks(healthRes.summary.warning);
        setCriticalChecks(healthRes.summary.critical);
      } else {
        setPassingChecks(null);
        setWarningChecks(null);
        setCriticalChecks(null);
      }
      if (payRes) setPaymentHealth(payRes);
      if (catRes?.instances) setCatalogEntries(catRes.instances);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const performDiscovery = useCallback(
    async (rawName: string, cloud: string = cloudPref, filterPassing: boolean = passingOnly) => {
      const normalized = rawName.trim().toLowerCase().replace(/\s+/g, '-');
      if (!normalized) {
        showToast('Please enter a service name to discover', 'error');
        return;
      }

      setIsResolving(true);
      setDiscoveryError(null);
      try {
        const data = await discoverService(normalized, filterPassing);
        let rawList = data.instances || [];

        if (cloud && cloud !== 'any') {
          const target = cloud.toUpperCase();
          rawList = rawList.filter((inst: any) => {
            const tags = inst.tags || inst.Service?.Tags || [];
            return tags.some((t: string) => String(t).toUpperCase() === target);
          });
        }

        const mapped = rawList.map((inst: any) => {
          const svcName = inst.name || inst.Service?.Service || normalized;
          const svcId = inst.id || inst.Service?.ID || 'unknown';
          const address = inst.address || inst.Service?.Address || inst.Node?.Address || 'unknown';
          const port = inst.port || inst.Service?.Port || 0;
          const tags: string[] = inst.tags || inst.Service?.Tags || [];
          const provider =
            inst.provider ||
            tags.find((t) => ['AWS', 'AZURE', 'GCP', 'LOCAL', 'HYBRID'].includes(String(t).toUpperCase())) ||
            'Unknown';
          const node = inst.node || inst.Node?.Node || 'unknown';
          const datacenter = inst.datacenter || inst.Node?.Datacenter || 'unknown';
          const checks = inst.checks || inst.Checks || [];
          const statusRaw = inst.status || (checks.every((c: any) => (c.status || c.Status) === 'passing') ? 'passing' : 'critical');
          const isHealthy = String(statusRaw).toLowerCase() === 'passing';
          const firstCheck = checks[0] || {};

          return {
            id: svcId,
            name: svcName,
            address,
            port,
            provider: provider.toUpperCase(),
            node,
            datacenter,
            tags,
            status: statusRaw.toUpperCase(),
            isHealthy,
            srvRecord: `_${svcName}._tcp.service.${datacenter}.consul. 300 IN SRV 1 1 ${port} ${node}`,
            checkOutput: firstCheck.output || firstCheck.Output || 'No check output recorded',
          };
        });

        setDiscoveryResult({
          serviceName: normalized,
          instances: mapped,
          passingOnly: filterPassing,
          queriedAt: new Date().toLocaleTimeString(),
        });

        if (mapped.length > 0) {
          showToast(`Consul resolved ${mapped.length} instance(s) for "${normalized}"`, 'success');
        } else {
          showToast(
            filterPassing
              ? `No healthy (?passing=true) instances found for "${normalized}"`
              : `No registered instances found for "${normalized}"`,
            'info'
          );
        }
      } catch (err: any) {
        setDiscoveryResult(null);
        setDiscoveryError(err.message || 'Consul discovery query failed.');
        showToast(err.message || 'Discovery failed', 'error');
      } finally {
        setIsResolving(false);
      }
    },
    [cloudPref, passingOnly, showToast]
  );

  useEffect(() => {
    performDiscovery('payment-service', 'any', false);
    fetchLiveMetadata();
    const interval = setInterval(fetchLiveMetadata, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveMetadata, performDiscovery]);

  const selectQuickResolver = (svcName: string, provider: string) => {
    setQuery(svcName);
    setCloudPref(provider);
    performDiscovery(svcName, provider, passingOnly);
  };

  const copySnippet = () => {
    const snippet = `// Dynamic Cross-Cloud Discovery on AWS User Service
const consulUrl = process.env.CONSUL_URL || 'http://localhost:8500';
const res = await axios.get(\`\${consulUrl}/v1/health/service/payment-service?passing=true\`);
const instances = res.data || [];
if (!instances.length) throw new Error('No healthy payment-service instance in Consul');

const target = instances[0].Service;
const paymentUrl = \`http://\${target.Address}:\${target.Port}/api/payments/process\`;
await axios.post(paymentUrl, { userId: 'usr_101', amount: 10, currency: 'USD' });`;

    navigator.clipboard.writeText(snippet).then(() => {
      showToast('Cross-cloud discovery snippet copied to clipboard!', 'success');
    });
  };

  const totalChecks =
    passingChecks !== null && warningChecks !== null && criticalChecks !== null
      ? passingChecks + warningChecks + criticalChecks
      : null;
  const operationalPct =
    totalChecks && passingChecks !== null ? ((passingChecks / totalChecks) * 100).toFixed(1) : null;

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-sm text-secondary font-code-sm text-code-sm uppercase tracking-wider">
          <span>Consul Discovery Engine</span>
          <span>/</span>
          <span className="text-primary font-medium">/v1/health/service</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Dynamic Service Discovery Explorer
            </h1>
            <p className="font-body-lg text-body-lg text-secondary mt-1">
              Query live instances via backend Consul proxy and inspect healthy discovery exclusion in real time.
            </p>
          </div>
          <button
            onClick={fetchLiveMetadata}
            className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md self-start lg:self-auto"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh Discovery State</span>
          </button>
        </div>
      </div>

      {/* Dynamic Service Discovery Query Box */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
        <div className="flex flex-col gap-space-sm bg-surface-container-low/60 p-space-md rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
            <div className="relative md:col-span-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">
                search
              </span>
              <input
                className="w-full bg-surface-container-lowest pl-10 pr-space-md py-2.5 rounded-lg text-on-surface font-body-md text-body-md placeholder:text-secondary shadow-sm"
                placeholder="Enter service name (e.g. payment-service)..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    performDiscovery(query, cloudPref, passingOnly);
                  }
                }}
              />
            </div>

            <div className="md:col-span-2">
              <select
                className="w-full bg-surface-container-lowest px-space-sm py-2.5 rounded-lg text-on-surface font-body-md text-body-md shadow-sm"
                value={cloudPref}
                onChange={(e) => setCloudPref(e.target.value)}
              >
                <option value="any">Any Cloud</option>
                <option value="aws">AWS Only</option>
                <option value="azure">AZURE Only</option>
                <option value="gcp">GCP Only</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-2 bg-surface-container-lowest px-3 py-2.5 rounded-lg shadow-sm">
              <input
                id="passing-only-toggle"
                type="checkbox"
                checked={passingOnly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPassingOnly(checked);
                  performDiscovery(query, cloudPref, checked);
                }}
                className="w-4 h-4 text-primary rounded"
              />
              <label htmlFor="passing-only-toggle" className="font-code-sm text-code-sm text-on-surface cursor-pointer">
                ?passing only
              </label>
            </div>

            <div className="md:col-span-3">
              <button
                disabled={isResolving}
                className="w-full flex items-center justify-center gap-space-xs px-space-md py-2.5 bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-lg shadow-sm hover:bg-primary transition-all disabled:opacity-50"
                onClick={() => performDiscovery(query, cloudPref, passingOnly)}
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
              className="px-space-sm py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-code-sm text-code-sm flex items-center gap-1.5"
              onClick={() => selectQuickResolver('payment-service', 'any')}
            >
              <span>payment-service (Azure)</span>
            </button>
            <button
              className="px-space-sm py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-code-sm text-code-sm flex items-center gap-1.5"
              onClick={() => selectQuickResolver('user-service', 'any')}
            >
              <span>user-service (AWS)</span>
            </button>
          </div>
        </div>

        {/* Discovery Error */}
        {discoveryError && (
          <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex items-center gap-2 font-code-sm text-code-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{discoveryError}</span>
          </div>
        )}

        {/* Discovered Results */}
        {discoveryResult && !discoveryError && (
          <div className="flex flex-col gap-space-md bg-surface-container-low rounded-xl p-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-headline-md text-on-surface">
                  Query: <code className="text-primary">{discoveryResult.serviceName}</code>
                </span>
                <span className="font-code-sm text-code-sm text-secondary">
                  ({discoveryResult.passingOnly ? '?passing=true filter active' : 'All registered states'})
                </span>
              </div>
              <span className="font-code-sm text-code-sm text-secondary">
                Resolved {discoveryResult.instances.length} instance(s) at {discoveryResult.queriedAt}
              </span>
            </div>

            {discoveryResult.instances.length === 0 ? (
              <div className="p-space-md rounded-lg bg-surface-container-lowest text-center text-secondary font-body-sm text-body-sm">
                {discoveryResult.passingOnly
                  ? `0 passing instances returned for "${discoveryResult.serviceName}". If registered and failing, Consul excludes it from ?passing queries.`
                  : `No registered instances found for "${discoveryResult.serviceName}" in Consul.`}
              </div>
            ) : (
              <div className="flex flex-col gap-space-sm">
                {discoveryResult.instances.map((inst) => (
                  <div key={inst.id} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-headline-md text-headline-md text-on-surface font-semibold">
                          {inst.name} <span className="font-code-sm text-secondary font-normal">({inst.id})</span>
                        </div>
                        <div className="font-code-sm text-code-sm text-secondary">
                          Node: {inst.node} • Datacenter: {inst.datacenter}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${
                          inst.isHealthy
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm font-code-sm text-code-sm">
                      <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-secondary block text-[11px]">Address &amp; Port</span>
                          <span className="text-on-surface font-semibold select-all">
                            {inst.address}:{inst.port}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${inst.address}:${inst.port}`);
                            showToast('Endpoint copied to clipboard!', 'success');
                          }}
                          className="text-secondary hover:text-primary"
                          title="Copy endpoint"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                      </div>
                      <div className="bg-surface-container-low p-2.5 rounded-lg">
                        <span className="text-secondary block text-[11px]">Cloud Provider</span>
                        <span className="text-primary font-semibold">{inst.provider}</span>
                      </div>
                      <div className="bg-surface-container-low p-2.5 rounded-lg">
                        <span className="text-secondary block text-[11px]">Tags</span>
                        <span className="text-on-surface truncate block">{inst.tags.join(', ') || 'None'}</span>
                      </div>
                    </div>

                    <div className="bg-surface-container-high/30 p-2 rounded font-code-sm text-code-sm text-on-surface overflow-x-auto">
                      DNS SRV: {inst.srvRecord}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Service ?passing Exclusion Comparison Box */}
        {paymentHealth && (
          <div
            className={`rounded-xl p-space-md flex flex-col gap-space-xs ${
              paymentHealth.excludedFromDiscovery
                ? 'bg-error-container/30 border border-error/30'
                : 'bg-surface-container-low'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[20px] ${paymentHealth.excludedFromDiscovery ? 'text-error' : 'text-tertiary'}`}>
                  {paymentHealth.excludedFromDiscovery ? 'warning' : 'verified_user'}
                </span>
                <span className="font-headline-md text-headline-md text-on-surface">
                  Azure Payment Service Discovery Gate (<code>/v1/health/service/payment-service?passing</code>)
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${
                  paymentHealth.healthState === 'PASSING'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                    : paymentHealth.healthState === 'CRITICAL'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container text-secondary'
                }`}
              >
                {paymentHealth.healthState}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Registered: <strong>{paymentHealth.totalRegistered}</strong> • Passing Discovery Pool: <strong>{paymentHealth.passingCount}</strong>
              {paymentHealth.excludedFromDiscovery && paymentHealth.totalRegistered > 0 && (
                <span className="text-error font-semibold ml-2">
                  — Excluded from healthy discovery! AWS User Service will safely reject transactions until Azure Payment Service recovers.
                </span>
              )}
            </p>
          </div>
        )}
      </section>

      {/* Live Health Metrics Summary & Dynamic Catalog Cards */}
      <section className="flex flex-col gap-space-md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <span className="font-label-md text-label-md text-secondary uppercase">Passing Checks</span>
            <div className="mt-2 font-headline-xl text-headline-xl text-on-surface font-bold">
              {passingChecks ?? 'Unknown'}
            </div>
          </div>
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <span className="font-label-md text-label-md text-secondary uppercase">Warning Checks</span>
            <div className="mt-2 font-headline-xl text-headline-xl text-on-surface font-bold">
              {warningChecks ?? 'Unknown'}
            </div>
          </div>
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <span className="font-label-md text-label-md text-secondary uppercase">Critical Checks</span>
            <div className="mt-2 font-headline-xl text-headline-xl text-error font-bold">
              {criticalChecks ?? 'Unknown'}
            </div>
          </div>
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <span className="font-label-md text-label-md text-secondary uppercase">Healthy Ratio</span>
            <div className="mt-2 font-headline-xl text-headline-xl text-on-surface font-bold">
              {operationalPct !== null ? `${operationalPct}%` : 'Unknown'}
            </div>
          </div>
        </div>

        {/* Live Catalog Instances Cards */}
        <div className="grid grid-cols-1 gap-space-md">
          {catalogEntries.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-md text-center text-secondary font-body-sm text-body-sm">
              No live instances reported in Consul catalog.
            </div>
          ) : (
            catalogEntries.map((entry) => (
              <div key={entry.id} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">{entry.name}</span>
                    <span className="font-code-sm text-code-sm text-secondary ml-2">({entry.id})</span>
                    <div className="font-code-sm text-code-sm text-secondary">
                      Node: {entry.node} • Datacenter: {entry.datacenter} • Provider: {entry.provider} ({entry.region})
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${
                      entry.healthStatus === 'PASSING'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {entry.healthStatus}
                  </span>
                </div>
                <div className="bg-surface-container-low p-2 rounded font-code-sm text-code-sm text-on-surface break-all">
                  Endpoint: {entry.address}:{entry.port} • Check Output: {entry.lastCheckOutput}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Discovery Code Snippet */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">AWS User Service Discovery Logic</h3>
            <p className="font-body-sm text-body-sm text-secondary">
              How AWS User Service dynamically queries Consul for Azure Payment Service before routing HTTP traffic.
            </p>
          </div>
          <button
            className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container text-on-surface font-code-sm text-code-sm"
            onClick={copySnippet}
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            <span>Copy Snippet</span>
          </button>
        </div>
        <pre className="bg-inverse-surface rounded-xl p-space-md overflow-x-auto text-inverse-on-surface font-code-sm text-code-sm">
          <code>{`const res = await axios.get(\`\${CONSUL_URL}/v1/health/service/payment-service?passing=true\`);
const target = res.data[0].Service; // e.g. 10.8.0.2:8001 (WireGuard IP)
await axios.post(\`http://\${target.Address}:\${target.Port}/api/payments/process\`, payload);`}</code>
        </pre>
      </section>
    </div>
  );
};
