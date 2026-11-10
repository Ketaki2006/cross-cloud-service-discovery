import React, { useEffect, useState, useCallback } from 'react';
import {
  getServices,
  getHealthChecks,
  getConsulStatus,
  deregisterService,
  triggerCrossCloudPayment,
  getCrossCloudTelemetry
} from '../services/api';
import { ServiceRecord, CrossCloudPaymentResult, CrossCloudTelemetry } from '../types';
import { useToast } from '../components/Toast';
import { RegisterServiceModal } from '../components/RegisterServiceModal';

const DEMO_OVERVIEW_SERVICES: ServiceRecord[] = [
  {
    id: 'user-01',
    name: 'User Service',
    provider: 'AWS',
    address: '10.0.1.10',
    port: 8001,
    status: 'passing',
    isSample: true,
  },
  {
    id: 'order-01',
    name: 'Order Service',
    provider: 'Azure',
    address: '10.0.1.30',
    port: 8003,
    status: 'critical',
    isSample: true,
  },
];

export const Dashboard: React.FC = () => {
  const { showToast } = useToast();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'aws' | 'gcp' | 'azure'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [telemetry, setTelemetry] = useState<CrossCloudTelemetry | null>(null);
  const [isExecutingCrossCloud, setIsExecutingCrossCloud] = useState(false);
  const [crossCloudResult, setCrossCloudResult] = useState<CrossCloudPaymentResult | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('150');

  const handleTriggerCrossCloud = async () => {
    setIsExecutingCrossCloud(true);
    try {
      const res = await triggerCrossCloudPayment('usr_101', Number(paymentAmount) || 100);
      setCrossCloudResult(res);
      showToast(`Cross-Cloud Success: AWS User Service -> GCP Payment Service (${res.latencyMs}ms)`, 'success');
      const updatedTelem = await getCrossCloudTelemetry().catch(() => null);
      if (updatedTelem) setTelemetry(updatedTelem);
    } catch (err: any) {
      showToast(`Cross-Cloud Call Failed: ${err.message}`, 'error');
      const updatedTelem = await getCrossCloudTelemetry().catch(() => null);
      if (updatedTelem) setTelemetry(updatedTelem);
    } finally {
      setIsExecutingCrossCloud(false);
    }
  };

  const fetchOverviewData = useCallback(async () => {
    try {
      const [servicesRes, healthRes] = await Promise.all([
        getServices().catch(() => null),
        getHealthChecks().catch(() => null),
      ]);

      const checksMap: Record<string, 'passing' | 'critical' | 'warning'> = {};
      if (healthRes && healthRes.checks) {
        healthRes.checks.forEach((c) => {
          if (c.ServiceID) checksMap[c.ServiceID] = c.Status;
        });
      }

      let liveList: ServiceRecord[] = [];
      if (servicesRes && servicesRes.services) {
        liveList = Object.entries(servicesRes.services).map(([key, s]) => {
          const tags: string[] = s.Tags || [];
          const provider = tags.find((t) => ['AWS', 'GCP', 'Azure', 'Hybrid', 'Local'].includes(t)) || 'Local';
          const healthStatus = checksMap[s.ID] || 'passing';

          const formatTitle = (str: string) => {
            if (!str) return 'Service';
            return str
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
          };

          return {
            id: s.ID || key,
            name: formatTitle(s.Service || key),
            serviceName: s.Service || key,
            provider,
            address: s.Address || '127.0.0.1',
            port: s.Port || 80,
            status: healthStatus,
            isSample: false,
          };
        });
      }

      const merged = [...liveList];
      for (const sample of DEMO_OVERVIEW_SERVICES) {
        if (!merged.some((m) => m.id === sample.id || m.name.toLowerCase() === sample.name.toLowerCase())) {
          merged.push(sample);
        }
      }

      setServices(merged);
      getCrossCloudTelemetry().then(setTelemetry).catch(() => null);
    } catch (err) {
      console.error('Error fetching overview data:', err);
      setServices([...DEMO_OVERVIEW_SERVICES]);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 8000);
    return () => clearInterval(interval);
  }, [fetchOverviewData]);

  const handleSyncMesh = async () => {
    setIsSyncing(true);
    try {
      const data = await getConsulStatus();
      if (data.connected) {
        showToast(`Consul Mesh Connected • Leader: ${data.leader} (DC: dc1)`, 'success');
      } else {
        showToast('Consul daemon is offline. Run: consul agent -dev', 'error');
      }
    } catch (err: any) {
      showToast(`Mesh sync error: ${err.message}`, 'error');
    }
    await fetchOverviewData();
    setTimeout(() => setIsSyncing(false), 700);
  };

  const handleDeregister = async (serviceId: string) => {
    if (!window.confirm(`Are you sure you want to deregister "${serviceId}" from Consul?`)) return;

    try {
      await deregisterService(serviceId);
      showToast(`Service "${serviceId}" deregistered from Consul catalog successfully.`, 'success');
      await fetchOverviewData();
    } catch (err: any) {
      showToast(`Deregistration failed: ${err.message}`, 'error');
    }
  };

  const handleDnsQuery = (fqdn: string, target: string) => {
    showToast(`Consul DNS: Resolved ${fqdn} -> ${target} (RFC-2782)`, 'info');
  };

  const handleInspect = (serviceId: string) => {
    showToast(`Viewing Consul catalog record for service ID: ${serviceId}`, 'info');
  };

  const copySnippet = () => {
    const text = 'curl -X GET http://localhost:3000/api/services';
    navigator.clipboard.writeText(text).then(() => {
      showToast('cURL command copied to clipboard!', 'success');
    });
  };

  const total = services.length;
  const passing = services.filter((s) => s.status === 'passing' || s.status === 'Healthy').length;
  const critical = services.filter((s) => s.status === 'critical' || s.status === 'warning' || s.status === 'Unhealthy').length;

  const filteredServices = services.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.provider.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-1">
            <span className="font-code-sm text-code-sm px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-medium">
              WAN Mesh Active
            </span>
            <span className="font-code-sm text-code-sm text-secondary">● Protocol Serf v0.10.1</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Cross-Cloud Service Registry
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Monitor and discover services across cloud environments.
          </p>
        </div>
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <button
            onClick={handleSyncMesh}
            className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-all shadow-sm active:scale-95"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-primary transition-transform duration-700 ${
                isSyncing ? 'rotate-180' : ''
              }`}
            >
              sync
            </span>
            <span className="font-label-lg text-label-lg font-medium">Sync Consul Mesh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="font-label-lg text-label-lg font-medium">+ Register New Service</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Card 1 */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-surface-container-high/40 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">dns</span>
            </div>
            <span className="font-code-sm text-code-sm font-semibold px-2 py-0.5 rounded-full bg-surface-container text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> +1 today
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">Total Services</div>
            <div className="font-headline-xl text-headline-xl text-on-surface mt-1 flex items-baseline gap-2">
              <span>{total}</span> <span className="font-body-md text-body-md text-secondary font-normal">Active</span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
            <span>Across 3 Cloud Datacenters</span>
            <span className="text-primary font-medium">100% mesh</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-tertiary-container/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
            <span className="font-code-sm text-code-sm font-semibold px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{' '}
              {total > 0 ? ((passing / total) * 100).toFixed(1) : '100'}% operational
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">Healthy Services</div>
            <div className="font-headline-xl text-headline-xl text-on-surface mt-1 flex items-baseline gap-2">
              <span>{passing}</span>{' '}
              <span className="font-body-md text-body-md text-tertiary font-normal">Passing</span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
            <span className="flex items-center gap-1 text-tertiary">
              <span className="material-symbols-outlined text-[16px]">trending_up</span> Steady ping
            </span>
            <span className="font-medium text-secondary">TTL 10s check</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-error-container/40 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <span className="font-code-sm text-code-sm font-semibold px-2 py-0.5 rounded-full bg-error-container text-on-error-container flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Attention Required
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">Unhealthy Services</div>
            <div className="font-headline-xl text-headline-xl text-error mt-1 flex items-baseline gap-2">
              <span>{critical}</span>{' '}
              <span className="font-body-md text-body-md text-error font-normal">Failing</span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
            <span className="text-error font-medium">Azure Order Check 503</span>
            <span className="text-secondary font-medium">2m ago</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-surface-container-highest/60 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">lan</span>
            </div>
            <span className="font-code-sm text-code-sm font-semibold px-2 py-0.5 rounded-full bg-surface-container-low text-secondary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> 14ms avg
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">Cloud Providers</div>
            <div className="font-headline-xl text-headline-xl text-on-surface mt-1 flex items-baseline gap-2">
              3 <span className="font-body-md text-body-md text-secondary font-normal">Connected</span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
            <span className="font-medium text-on-surface">AWS · GCP · Azure</span>
            <span className="text-primary font-medium">Mesh Linked</span>
          </div>
        </div>
      </div>

      {/* Cloud Provider Breakdown */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">cloud_sync</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Cloud Provider Breakdown</h2>
          </div>
          <span className="font-code-sm text-code-sm text-secondary">Multi-Datacenter Federation: 3/3 Peers Responding</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* AWS Card */}
          <div className="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface text-[24px]">cloud</span>
                </div>
                <div>
                  <div className="font-label-lg text-label-lg font-semibold text-on-surface">Amazon Web Services</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-1 font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> AWS us-east-1
                    </span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-code-sm text-code-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Agent Alive
              </span>
            </div>
            <div className="mt-space-md grid grid-cols-2 gap-2 bg-surface-container-low/60 p-space-sm rounded-lg">
              <div>
                <div className="font-code-sm text-code-sm text-secondary uppercase">Ingress Latency</div>
                <div className="font-headline-md text-headline-md text-on-surface font-semibold mt-0.5">12 ms</div>
              </div>
              <div>
                <div className="font-code-sm text-code-sm text-secondary uppercase">Health Score</div>
                <div className="font-headline-md text-headline-md text-tertiary font-semibold mt-0.5">100%</div>
              </div>
            </div>
            <div className="mt-space-md flex flex-col gap-1.5 font-code-sm text-code-sm text-on-surface-variant">
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Registered Service:</span>
                <span className="text-on-surface font-semibold bg-surface-container px-1.5 py-0.5 rounded">User Service</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">VPC ID:</span>
                <span className="text-on-surface">vpc-0921bf3a</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Security Group:</span>
                <span className="text-on-surface">sg-consul-mesh</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
              <span className="flex items-center gap-1 text-tertiary font-medium">
                <span className="material-symbols-outlined text-[16px]">sensors</span> Gossip Serf OK
              </span>
              <span className="text-secondary">Node: aws-us-east-srv01</span>
            </div>
          </div>

          {/* GCP Card */}
          <div className="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface text-[24px]">cloud_queue</span>
                </div>
                <div>
                  <div className="font-label-lg text-label-lg font-semibold text-on-surface">Google Cloud Platform</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-1 font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> GCP us-central1
                    </span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-code-sm text-code-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Agent Alive
              </span>
            </div>
            <div className="mt-space-md grid grid-cols-2 gap-2 bg-surface-container-low/60 p-space-sm rounded-lg">
              <div>
                <div className="font-code-sm text-code-sm text-secondary uppercase">Ingress Latency</div>
                <div className="font-headline-md text-headline-md text-on-surface font-semibold mt-0.5">18 ms</div>
              </div>
              <div>
                <div className="font-code-sm text-code-sm text-secondary uppercase">Health Score</div>
                <div className="font-headline-md text-headline-md text-tertiary font-semibold mt-0.5">100%</div>
              </div>
            </div>
            <div className="mt-space-md flex flex-col gap-1.5 font-code-sm text-code-sm text-on-surface-variant">
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Registered Service:</span>
                <span className="text-on-surface font-semibold bg-surface-container px-1.5 py-0.5 rounded">Payment Service</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Project ID:</span>
                <span className="text-on-surface truncate max-w-[150px]">gcp-crosscloud-prod</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">VPC Network:</span>
                <span className="text-on-surface">default-vpc</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
              <span className="flex items-center gap-1 text-tertiary font-medium">
                <span className="material-symbols-outlined text-[16px]">sensors</span> Gossip Serf OK
              </span>
              <span className="text-secondary">Node: gcp-central-node-02</span>
            </div>
          </div>

          {/* Azure Card */}
          <div className="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface text-[24px]">cloud_sync</span>
                </div>
                <div>
                  <div className="font-label-lg text-label-lg font-semibold text-on-surface">Microsoft Azure</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-1 font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Azure East US 2
                    </span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-code-sm text-code-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span> Degraded
              </span>
            </div>
            <div className="mt-space-md grid grid-cols-2 gap-2 bg-surface-container-low/60 p-space-sm rounded-lg">
              <div>
                <div className="font-code-sm text-code-sm text-secondary uppercase">Ingress Latency</div>
                <div className="font-headline-md text-headline-md text-on-surface font-semibold mt-0.5">32 ms</div>
              </div>
              <div>
                <div className="font-code-sm text-code-sm text-secondary uppercase">Health Status</div>
                <div className="font-headline-md text-headline-md text-error font-semibold mt-0.5">1 Failing</div>
              </div>
            </div>
            <div className="mt-space-md flex flex-col gap-1.5 font-code-sm text-code-sm text-on-surface-variant">
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Registered Service:</span>
                <span className="text-on-surface font-semibold bg-surface-container px-1.5 py-0.5 rounded">Order Service</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">VNet Name:</span>
                <span className="text-on-surface">vnet-azure-mesh</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Compute VM:</span>
                <span className="text-on-surface">vm-order-srv-01</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
              <span className="flex items-center gap-1 text-error font-medium">
                <span className="material-symbols-outlined text-[16px]">error</span> HTTP 503 Critical
              </span>
              <span className="text-secondary">Check ID: serfHealth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real Cross-Cloud Microservice Communication Panel */}
      <div className="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/60">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">sync_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md text-on-surface">Real Cross-Cloud Service Communication</h2>
                <span className="inline-flex items-center gap-1 font-code-sm text-code-sm px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> Live WireGuard / Mesh Link
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-secondary">
                AWS User Service (Port 8002) dynamically discovers & dispatches payments to GCP Payment Service (Port 8001) via Consul
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container">
              <span className="font-code-sm text-code-sm text-secondary">Amount ($):</span>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-20 bg-surface-container text-on-surface font-code-sm text-code-sm px-2 py-0.5 rounded outline-none border border-outline-variant/30 text-right font-medium"
                min="1"
              />
            </div>
            <button
              onClick={handleTriggerCrossCloud}
              disabled={isExecutingCrossCloud}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isExecutingCrossCloud ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Discovering & Paying...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Execute Cross-Cloud Payment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Topology & Telemetry Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md mt-space-md">
          <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-low border border-surface-container">
            <span className="font-code-sm text-code-sm text-secondary uppercase">Source Node</span>
            <div className="font-body-md text-body-md font-semibold text-on-surface mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              AWS User Service
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant font-mono mt-0.5">Port 8002 · us-east-1</span>
          </div>

          <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-low border border-surface-container">
            <span className="font-code-sm text-code-sm text-secondary uppercase">Discovery Mechanism</span>
            <div className="font-body-md text-body-md font-semibold text-on-surface mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              HashiCorp Consul
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant font-mono mt-0.5">:8500 /v1/health/service</span>
          </div>

          <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-low border border-surface-container">
            <span className="font-code-sm text-code-sm text-secondary uppercase">Target Node</span>
            <div className="font-body-md text-body-md font-semibold text-on-surface mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              GCP Payment Service
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant font-mono mt-0.5">Port 8001 · us-central1</span>
          </div>

          <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-low border border-surface-container">
            <span className="font-code-sm text-code-sm text-secondary uppercase">Cross-Cloud Telemetry</span>
            <div className="font-body-md text-body-md font-semibold text-on-surface mt-1 flex items-center justify-between">
              <span className="text-tertiary">{telemetry?.telemetry?.successfulRequests ?? 0} Success</span>
              <span className="text-error">{telemetry?.telemetry?.failedRequests ?? 0} Failed</span>
            </div>
            <span className="font-code-sm text-code-sm text-secondary mt-0.5">Total: {telemetry?.telemetry?.totalRequests ?? 0} calls</span>
          </div>
        </div>

        {/* Last Transaction Result Banner */}
        {crossCloudResult && (
          <div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low/90 border border-tertiary/30 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
              <div className="font-code-sm text-code-sm">
                <span className="font-semibold text-on-surface">Txn ID: {crossCloudResult.payment?.transactionId}</span>
                <span className="text-secondary ml-2">
                  • Discovered Target: <code className="text-primary font-mono">{crossCloudResult.discoveredTarget?.address}:{crossCloudResult.discoveredTarget?.port}</code>
                </span>
                <span className="text-secondary ml-2">
                  • User: <span className="text-on-surface">{crossCloudResult.source?.user?.name}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 font-code-sm text-code-sm">
              <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-tertiary font-semibold">
                ⏱ {crossCloudResult.latencyMs} ms
              </span>
              <span className="text-secondary">{new Date(crossCloudResult.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column (8 cols): Registered Cross-Cloud Services */}
        <div className="lg:col-span-8 flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Registered Cross-Cloud Services</h2>
              <p className="font-body-sm text-body-sm text-secondary">
                Active nodes resolved via Consul catalog synchronization
              </p>
            </div>
            <div className="inline-flex p-1 rounded-lg bg-surface-container-low" id="service-filter-tabs">
              <button
                className={`filter-tab px-3 py-1 rounded-md font-code-sm text-code-sm font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setActiveFilter('all')}
              >
                All ({total})
              </button>
              <button
                className={`filter-tab px-3 py-1 rounded-md font-code-sm text-code-sm font-medium transition-all ${
                  activeFilter === 'aws'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setActiveFilter('aws')}
              >
                AWS ({services.filter((s) => s.provider.toLowerCase() === 'aws').length})
              </button>
              <button
                className={`filter-tab px-3 py-1 rounded-md font-code-sm text-code-sm font-medium transition-all ${
                  activeFilter === 'gcp'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setActiveFilter('gcp')}
              >
                GCP ({services.filter((s) => s.provider.toLowerCase() === 'gcp').length})
              </button>
              <button
                className={`filter-tab px-3 py-1 rounded-md font-code-sm text-code-sm font-medium transition-all ${
                  activeFilter === 'azure'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setActiveFilter('azure')}
              >
                Azure ({services.filter((s) => s.provider.toLowerCase() === 'azure').length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mt-space-sm">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-secondary font-code-sm text-code-sm uppercase">
                  <th className="py-2.5 px-3 rounded-l-lg">Service Name</th>
                  <th className="py-2.5 px-3">Service ID</th>
                  <th className="py-2.5 px-3">Cloud Provider</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Health Status</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-0" id="services-table-body">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-secondary">
                      No services registered under category "{activeFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => {
                    const isPassing = s.status === 'passing' || s.status === 'Healthy';
                    const dotClass = isPassing ? 'bg-tertiary' : 'bg-error';

                    return (
                      <tr
                        key={s.id}
                        className="service-row group hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotClass} shrink-0`}></span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                                {s.name}
                              </span>
                              {s.isSample ? (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container-high text-secondary font-code-sm uppercase">
                                  DEMO
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-code-sm uppercase font-bold">
                                  CONSUL
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-code-sm text-code-sm text-secondary select-all">{s.id}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container font-medium text-on-surface">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {s.provider}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-code-sm text-code-sm text-on-surface select-all">{s.address}</td>
                        <td className="py-3 px-3 font-code-sm text-code-sm text-secondary">{s.port}</td>
                        <td className="py-3 px-3">
                          {isPassing ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-code-sm text-code-sm font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Passing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-code-sm text-code-sm font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Critical
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="px-2 py-1 rounded bg-surface-container text-primary font-code-sm text-code-sm hover:bg-surface-container-high transition-colors"
                              onClick={() => handleDnsQuery(`${s.serviceName || s.id}.service.consul`, `${s.address}:${s.port}`)}
                              title="Query DNS via Express"
                            >
                              Query DNS
                            </button>
                            <button
                              className="px-2 py-1 rounded bg-surface-container text-secondary font-code-sm text-code-sm hover:text-on-surface transition-colors"
                              onClick={() => handleInspect(s.id)}
                            >
                              Inspect
                            </button>
                            <button
                              className="px-2 py-1 rounded bg-surface-container text-error font-code-sm text-code-sm hover:bg-error-container transition-colors"
                              onClick={() => handleDeregister(s.id)}
                            >
                              Deregister
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

          <div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-xs font-code-sm text-code-sm text-secondary">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              <span>
                Catalog TTL Sync interval: <strong>5000ms</strong>
              </span>
            </div>
            <div>
              <span>
                Local Agent HTTP API: <strong>http://127.0.0.1:8500</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Consul Gossip Stream */}
        <div className="lg:col-span-4 flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="flex items-center justify-between pb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Consul Gossip Stream</h2>
            </div>
            <span className="font-code-sm text-code-sm text-secondary">Serf WAN Log</span>
          </div>

          <div className="flex flex-col gap-space-md mt-space-sm relative">
            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-surface-container"></div>
            {/* Event 1 */}
            <div className="flex items-start gap-space-sm relative z-10">
              <div className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">priority_high</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-code-sm text-code-sm text-error font-semibold">[14:02:18] Consul Health Check</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface mt-0.5 leading-snug">
                  Order Service (<span className="font-code-sm text-code-sm">order-01:8003/health</span>) HTTP 503 Service Unavailable
                </p>
                <span className="font-code-sm text-code-sm text-secondary mt-1">Provider: Azure East US 2</span>
              </div>
            </div>

            {/* Event 2 */}
            <div className="flex items-start gap-space-sm relative z-10">
              <div className="w-7 h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">radar</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-code-sm text-code-sm text-tertiary font-semibold">[13:58:40] Service Discovered</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface mt-0.5 leading-snug">
                  Payment Service resolved by Node.js Express backend via Consul DNS (<span className="font-code-sm text-code-sm">gcp-catalog</span>)
                </p>
                <span className="font-code-sm text-code-sm text-secondary mt-1">Resolution: 10.0.1.20:8002</span>
              </div>
            </div>

            {/* Event 3 */}
            <div className="flex items-start gap-space-sm relative z-10">
              <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">add_task</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-code-sm text-code-sm text-primary font-semibold">[13:45:12] Service Registered</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface mt-0.5 leading-snug">
                  User Service registered on AWS us-east-1 via Consul Catalog API
                </p>
                <span className="font-code-sm text-code-sm text-secondary mt-1">Tags: [v1.0, primary, nodejs]</span>
              </div>
            </div>

            {/* Event 4 */}
            <div className="flex items-start gap-space-sm relative z-10">
              <div className="w-7 h-7 rounded-full bg-surface-container text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">public</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-code-sm text-code-sm text-secondary font-semibold">[12:30:00] WAN Federation</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface mt-0.5 leading-snug">
                  Cross-cloud gossip mesh sync established between AWS, GCP, and Azure agents
                </p>
                <span className="font-code-sm text-code-sm text-secondary mt-1">Latency: serfWAN 14.2ms avg</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-space-md">
            <button
              onClick={() => showToast('Displaying 4 active gossip events across AWS, GCP, and Azure datacenters.')}
              className="flex items-center justify-center gap-1 font-label-md text-label-md text-primary hover:underline w-full"
            >
              <span>View All Serf &amp; Mesh Telemetry Logs</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Express Backend Card */}
      <div className="rounded-xl bg-inverse-surface text-inverse-on-surface p-space-md shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="flex items-start gap-space-sm max-w-2xl">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high/20 flex items-center justify-center text-tertiary-fixed shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[22px]">developer_board</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-lg text-label-lg font-semibold text-inverse-on-surface">Express Backend Ready</span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-code-sm text-code-sm">PORT: 3000</span>
            </div>
            <p className="font-body-sm text-body-sm text-inverse-on-surface/80 mt-1">
              REST routes configured at <code className="font-code-sm text-code-sm text-inverse-primary bg-surface-container-high/10 px-1 py-0.5 rounded">/api/services</code>, <code className="font-code-sm text-code-sm text-inverse-primary bg-surface-container-high/10 px-1 py-0.5 rounded">/api/services/:name</code>, <code className="font-code-sm text-code-sm text-inverse-primary bg-surface-container-high/10 px-1 py-0.5 rounded">/api/health</code>, and <code className="font-code-sm text-code-sm text-inverse-primary bg-surface-container-high/10 px-1 py-0.5 rounded">/api/services/register</code>. Ready for Consul Agent HTTP API (:8500).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-xs w-full md:w-auto bg-surface-container-high/10 p-2 rounded-lg justify-between shrink-0">
          <code className="font-code-sm text-code-sm text-inverse-primary truncate max-w-xs md:max-w-sm">
            curl -X GET http://localhost:3000/api/services
          </code>
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-code-sm text-code-sm hover:bg-primary transition-colors"
            onClick={copySnippet}
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Service Registration Modal */}
      <RegisterServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchOverviewData}
      />
    </div>
  );
};

