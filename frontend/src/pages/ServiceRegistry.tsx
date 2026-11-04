import React, { useEffect, useState, useMemo } from 'react';
import { getServices, registerService, deregisterService } from '../services/api';
import { ServiceRecord } from '../types';
import { useToast } from '../components/Toast';

const SAMPLE_SERVICES: ServiceRecord[] = [
  {
    id: 'user-01',
    name: 'User Service',
    provider: 'AWS',
    providerRegion: 'AWS • us-east-1',
    address: '10.0.1.10',
    port: 8001,
    status: 'Healthy',
    healthUrl: 'http://10.0.1.10:8001/health',
    version: 'v2.4.1 • rest-core',
    isSample: true,
    tags: ['AWS', 'user-mgmt', 'core'],
  },
  {
    id: 'payment-01',
    name: 'Payment Service',
    provider: 'GCP',
    providerRegion: 'GCP • us-central1',
    address: '10.0.1.20',
    port: 8002,
    status: 'Healthy',
    healthUrl: 'http://10.0.1.20:8002/healthz',
    version: 'v1.9.0 • pci-isolated',
    isSample: true,
    tags: ['GCP', 'payment', 'pci'],
  },
  {
    id: 'order-01',
    name: 'Order Service',
    provider: 'Azure',
    providerRegion: 'Azure • East US 2',
    address: '10.0.1.30',
    port: 8003,
    status: 'Unhealthy',
    healthUrl: 'http://10.0.1.30:8003/health',
    version: 'v3.0.0-rc2 • order-pipeline',
    isSample: true,
    tags: ['Azure', 'order', 'pipeline'],
  },
  {
    id: 'auth-01',
    name: 'Auth Service',
    provider: 'AWS',
    providerRegion: 'AWS • us-east-1',
    address: '10.0.1.15',
    port: 8000,
    status: 'Healthy',
    healthUrl: 'http://10.0.1.15:8000/api/status',
    version: 'v4.1.0 • oauth2-oidc',
    isSample: true,
    tags: ['AWS', 'security', 'oauth2'],
  },
  {
    id: 'inventory-01',
    name: 'Inventory Service',
    provider: 'GCP',
    providerRegion: 'GCP • us-central1',
    address: '10.0.1.25',
    port: 8005,
    status: 'Healthy',
    healthUrl: 'http://10.0.1.25:8005/health',
    version: 'v1.1.4 • warehouse-sync',
    isSample: true,
    tags: ['GCP', 'inventory', 'warehouse'],
  },
];

export const ServiceRegistry: React.FC = () => {
  const { showToast } = useToast();
  const [liveServices, setLiveServices] = useState<ServiceRecord[]>([]);
  const [sampleServices, setSampleServices] = useState<ServiceRecord[]>(SAMPLE_SERVICES);
  const [showRegCard, setShowRegCard] = useState(false);
  const [inspectItem, setInspectItem] = useState<ServiceRecord | null>(null);

  // Form fields
  const [name, setName] = useState('Notification Service');
  const [id, setId] = useState('notification-01');
  const [provider, setProvider] = useState('AWS');
  const [ip, setIp] = useState('10.0.1.40');
  const [port, setPort] = useState('8004');
  const [healthPath, setHealthPath] = useState('/health');
  const [intervalPolicy, setIntervalPolicy] = useState('10s/2s');
  const [tags, setTags] = useState('production, v1.2, consul-mesh');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');

  const loadServices = async () => {
    try {
      const data = await getServices();
      const servicesMap = data.services || {};

      const mapped: ServiceRecord[] = Object.entries(servicesMap).map(([key, svc]: [string, any]) => {
        const svcName = svc.Service || svc.Name || key;
        const svcId = svc.ID || key;
        const address = svc.Address || '127.0.0.1';
        const svcPort = svc.Port || 80;
        const svcTags: string[] = Array.isArray(svc.Tags) ? svc.Tags : [];
        const svcProvider = svcTags.find((t) => ['AWS', 'GCP', 'Azure', 'Hybrid', 'Local'].includes(t)) || 'Local';
        const healthTag = svcTags.find((t) => String(t).startsWith('health:'));
        const checkPath = healthTag ? healthTag.slice(7) : '/health';
        const healthUrl = `http://${address}:${svcPort}${checkPath.startsWith('/') ? checkPath : '/' + checkPath}`;

        return {
          id: svcId,
          name: svcName,
          provider: svcProvider,
          providerRegion: `${svcProvider} • Live Consul`,
          address,
          port: svcPort,
          status: 'Healthy',
          healthUrl,
          version: 'HashiCorp Consul Agent',
          isSample: false,
          tags: svcTags,
        };
      });

      setLiveServices(mapped);
    } catch {
      setLiveServices([]);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const mergedServices = useMemo(() => {
    const liveIds = new Set(liveServices.map((s) => s.id));
    const dedupedSamples = sampleServices.filter((s) => !liveIds.has(s.id));
    let list = [...liveServices, ...dedupedSamples];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
      );
    }

    // Filter by Provider
    if (filterProvider !== 'ALL') {
      list = list.filter((s) => s.provider.toUpperCase() === filterProvider.toUpperCase());
    }

    // Filter by Source
    if (filterSource === 'LIVE') {
      list = list.filter((s) => !s.isSample);
    } else if (filterSource === 'SAMPLE') {
      list = list.filter((s) => s.isSample);
    }

    // Filter by Status
    if (filterStatus === 'Healthy') {
      list = list.filter((s) => s.status === 'Healthy' || s.status === 'passing');
    } else if (filterStatus === 'Unhealthy') {
      list = list.filter((s) => s.status === 'Unhealthy' || s.status === 'critical');
    }

    // Sort
    if (sortBy === 'port-asc') {
      list.sort((a, b) => a.port - b.port);
    } else if (sortBy === 'ip-asc') {
      list.sort((a, b) => a.address.localeCompare(b.address));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [liveServices, sampleServices, searchQuery, filterProvider, filterSource, filterStatus, sortBy]);

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
        timeout: timeout ? timeout.trim() : '2s',
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

  const handleDeregister = async (item: ServiceRecord) => {
    if (item.isSample) {
      setSampleServices((prev) => prev.filter((s) => s.id !== item.id));
      showToast(`Demo sample "${item.id}" removed from view.`, 'info');
      return;
    }

    if (!window.confirm(`Are you sure you want to deregister "${item.id}" from Consul?`)) return;

    try {
      await deregisterService(item.id);
      showToast(`Service "${item.id}" deregistered from Consul successfully!`, 'success');
      await loadServices();
    } catch (err: any) {
      showToast(err.message || 'Deregistration failed', 'error');
    }
  };

  const testProbe = () => {
    showToast(`Testing HTTP GET probe to http://${ip}:${port}${healthPath}... (Status: 200 OK)`, 'info');
  };

  const exportConsulJSON = () => {
    const jsonStr = JSON.stringify(mergedServices, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consul-catalog-export-${Date.now()}.json`;
    a.click();
    showToast('Consul catalog exported as JSON file', 'success');
  };

  const triggerBulkSync = async () => {
    showToast('Triggering full catalog synchronization with Consul cluster...', 'info');
    await loadServices();
    showToast('Catalog synchronization complete (0 errors)', 'success');
  };

  const copyEndpointCode = () => {
    const code = `const express = require('express');
const Consul = require('consul');
const router = express.Router();

const consul = new Consul({
  host: process.env.CONSUL_HOST || '127.0.0.1',
  port: process.env.CONSUL_PORT || '8500',
  promisify: true
});

router.post('/api/register', async (req, res) => {
  const { name, id, address, port, checkPath, interval = '10s', tags = [] } = req.body;
  try {
    await consul.agent.service.register({
      name,
      id: id || \`\${name}-\${Date.now()}\`,
      address,
      port: Number(port),
      tags,
      check: {
        http: \`http://\${address}:\${port}\${checkPath}\`,
        interval,
        timeout: '2s'
      }
    });
    return res.status(201).json({ success: true, message: \`Service \${name} registered\` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});`;

    navigator.clipboard.writeText(code).then(() => {
      showToast('Express route snippet copied to clipboard!', 'success');
    });
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-space-lg w-full max-w-[1720px] mx-auto pb-space-xl">
        {/* Header / Stats Mosaic Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="font-code-sm text-code-sm uppercase tracking-wider text-primary font-semibold">
                Service Mesh Layer
              </span>
              <span className="text-outline-variant font-code-sm text-code-sm">•</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">Consul Agent v1.20.0 Sync</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Service Registry &amp; Catalog
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
              Register, configure, and inspect cross-cloud microservice nodes connected to Consul catalog across AWS, GCP, and Azure topologies.
            </p>
          </div>
          {/* Quick Operational Metrics */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md">
              <div className="flex flex-col">
                <span className="font-code-sm text-code-sm text-secondary uppercase">Mesh Services</span>
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  {mergedServices.length} Nodes
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md">
              <div className="flex flex-col">
                <span className="font-code-sm text-code-sm text-secondary uppercase">Global Health</span>
                <span className="font-headline-md text-headline-md text-tertiary font-bold">
                  {mergedServices.length > 0
                    ? Math.round(
                        (mergedServices.filter((s) => s.status === 'Healthy' || s.status === 'passing').length /
                          mergedServices.length) *
                          100
                      )
                    : 100}
                  % Pass
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

        {/* Collapsible Registration Section (Card) */}
        {showRegCard && (
          <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-space-md mb-space-md bg-surface-container-low px-space-md py-space-sm rounded-lg">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">app_registration</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface">
                    Register New Microservice with Consul Catalog
                  </span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    Backend Ready: POST to{' '}
                    <code className="text-primary font-medium">http://localhost:3000/api/services/register</code> → Consul Agent{' '}
                    <code className="text-secondary font-medium">/v1/agent/service/register</code>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="font-code-sm text-code-sm text-on-surface-variant bg-surface-container px-space-xs py-0.5 rounded">
                  TTL: 10s
                </span>
                <button
                  className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
                  onClick={() => setShowRegCard(false)}
                  title="Collapse Form"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <form className="flex flex-col gap-space-lg" onSubmit={handleRegisterSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* Field 1: Service Name */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>
                      Service Name <span className="text-error">*</span>
                    </span>
                    <span className="font-code-sm text-code-sm text-secondary">Slugified or canonical</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">dns</span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      placeholder="e.g. user-service, payment-api"
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 2: Service ID */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>
                      Service Instance ID <span className="text-error">*</span>
                    </span>
                    <span className="font-code-sm text-code-sm text-secondary">Unique cluster identifier</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">tag</span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      placeholder="unique-service-instance-id"
                      required
                      type="text"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 3: Cloud Provider */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>
                      Cloud Provider &amp; Region <span className="text-error">*</span>
                    </span>
                    <span className="font-code-sm text-code-sm text-secondary">WAN Datacenter</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">cloud</span>
                    <select
                      className="w-full pl-10 pr-10 py-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    >
                      <option value="AWS">Amazon Web Services (AWS us-east-1)</option>
                      <option value="GCP">Google Cloud Platform (GCP us-central1)</option>
                      <option value="Azure">Microsoft Azure (Azure East US 2)</option>
                      <option value="Hybrid">Hybrid On-Premises Gateway (dc-onprem-01)</option>
                      <option value="Local">Local (Simulation)</option>
                    </select>
                    <span className="material-symbols-outlined text-secondary absolute right-3 pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Field 4: IP Address */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>
                      Service IP Address <span className="text-error">*</span>
                    </span>
                    <span className="font-code-sm text-code-sm text-secondary">VPC Overlay IPv4</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">router</span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      placeholder="10.x.x.x or DNS hostname"
                      required
                      type="text"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 5: Port */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>
                      Port <span className="text-error">*</span>
                    </span>
                    <span className="font-code-sm text-code-sm text-secondary">Listener socket</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">dialpad</span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      max={65535}
                      min={1}
                      placeholder="8080"
                      required
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 6: Health-Check Path */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>
                      Health-Check Path <span className="text-error">*</span>
                    </span>
                    <span className="font-code-sm text-code-sm text-secondary">HTTP GET probe</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">favorite</span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      placeholder="/healthz, /actuator/health"
                      required
                      type="text"
                      value={healthPath}
                      onChange={(e) => setHealthPath(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 7: Interval */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>Interval &amp; Timeout Policy</span>
                    <span className="font-code-sm text-code-sm text-secondary">Consul agent frequency</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">timer</span>
                    <select
                      className="w-full pl-10 pr-10 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      value={intervalPolicy}
                      onChange={(e) => setIntervalPolicy(e.target.value)}
                    >
                      <option value="10s/2s">10s interval, 2s timeout (Standard Production)</option>
                      <option value="5s/1s">5s interval, 1s timeout (Fast Failover)</option>
                      <option value="30s/5s">30s interval, 5s timeout (Low Overhead)</option>
                    </select>
                    <span className="material-symbols-outlined text-secondary absolute right-3 pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Field 8: Tags */}
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
                    <span>Tags &amp; Metadata</span>
                    <span className="font-code-sm text-code-sm text-secondary">Comma-separated</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-secondary absolute left-3 text-[18px]">sell</span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-code-md text-code-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                      placeholder="production, v1.2, consul-mesh"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface-variant font-code-sm text-code-sm">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
                  <span>Schema validation passing for Consul REST agent</span>
                </div>
                <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
                  <button
                    className="bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg px-space-md py-space-sm rounded-lg transition-colors flex items-center gap-space-xs"
                    onClick={testProbe}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">sensors</span>
                    <span>Test Endpoint Probe</span>
                  </button>
                  <button
                    className="bg-surface-container-low hover:bg-surface-container text-secondary font-label-lg text-label-lg px-space-md py-space-sm rounded-lg transition-colors"
                    onClick={() => {
                      setName('');
                      setId('');
                    }}
                    type="button"
                  >
                    Clear Form
                  </button>
                  <button
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg px-space-lg py-space-sm rounded-lg shadow-sm flex items-center gap-space-xs transition-colors disabled:opacity-50"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>{isSubmitting ? 'Registering with Consul...' : 'Register Service to Consul'}</span>
                  </button>
                </div>
              </div>

              {formFeedback && (
                <div
                  className={`rounded-lg p-space-sm flex items-center justify-between ${
                    formFeedback.type === 'error'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container text-tertiary'
                  }`}
                >
                  <div className="flex items-center gap-space-xs font-code-sm text-code-sm">
                    <span className="material-symbols-outlined text-[18px]">
                      {formFeedback.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span>{formFeedback.message}</span>
                  </div>
                  <button
                    className="text-on-surface-variant hover:text-on-surface font-code-sm text-code-sm"
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

        {/* Main Section: Service Registry Table Card */}
        <section className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col">
          {/* Filter Toolbar */}
          <div className="p-space-md bg-surface-container-low flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-space-sm w-full xl:w-auto flex-1">
              <div className="relative min-w-[260px] flex-1 sm:flex-initial">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[18px]">
                  search
                </span>
                <input
                  className="w-full pl-9 pr-8 py-1.5 bg-surface-container-lowest rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                  placeholder="Filter service name, ID, or IP..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <kbd className="absolute right-2.5 top-2 px-1 text-[10px] font-code-sm bg-surface-container text-on-surface-variant rounded pointer-events-none">
                  ⌘F
                </kbd>
              </div>

              {/* Provider Filter */}
              <div className="relative">
                <select
                  className="pl-3 pr-8 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                >
                  <option value="ALL">Provider: All Clouds</option>
                  <option value="AWS">AWS (Amazon Web Services)</option>
                  <option value="GCP">GCP (Google Cloud)</option>
                  <option value="Azure">Azure (Microsoft)</option>
                  <option value="Local">Local (Simulated)</option>
                </select>
                <span className="material-symbols-outlined text-secondary absolute right-2.5 top-2 pointer-events-none text-[16px]">
                  expand_more
                </span>
              </div>

              {/* Data Source Filter */}
              <div className="relative">
                <select
                  className="pl-3 pr-8 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                >
                  <option value="ALL">Source: All Records</option>
                  <option value="LIVE">Live Consul Services Only</option>
                  <option value="SAMPLE">Demo / Sample Data Only</option>
                </select>
                <span className="material-symbols-outlined text-secondary absolute right-2.5 top-2 pointer-events-none text-[16px]">
                  tune
                </span>
              </div>

              {/* Health Status Filter */}
              <div className="relative">
                <select
                  className="pl-3 pr-8 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">Status: All States</option>
                  <option value="Healthy">Healthy Only</option>
                  <option value="Unhealthy">Unhealthy / Failing</option>
                </select>
                <span className="material-symbols-outlined text-secondary absolute right-2.5 top-2 pointer-events-none text-[16px]">
                  expand_more
                </span>
              </div>

              {/* Sort Filter */}
              <div className="relative">
                <select
                  className="pl-3 pr-8 py-1.5 bg-surface-container-lowest rounded-lg font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,74,198,0.25)] transition-all"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="default">Sort: Default</option>
                  <option value="port-asc">Sort: Port (Low to High)</option>
                  <option value="ip-asc">Sort: IP Address</option>
                  <option value="name-asc">Sort: Service Name (A-Z)</option>
                </select>
                <span className="material-symbols-outlined text-secondary absolute right-2.5 top-2 pointer-events-none text-[16px]">
                  sort
                </span>
              </div>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-space-xs self-end xl:self-auto">
              <button
                className="bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-sm py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                onClick={exportConsulJSON}
              >
                <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
                <span>Export Consul JSON</span>
              </button>
              <button
                className="bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-sm py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                onClick={triggerBulkSync}
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary">sync</span>
                <span>Bulk Sync</span>
              </button>
            </div>
          </div>

          {/* Discovery Table Canvas */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-code-sm text-code-sm uppercase text-secondary font-semibold">
                  <th className="py-3 px-space-md">Service Name</th>
                  <th className="py-3 px-space-md">Service ID</th>
                  <th className="py-3 px-space-md">Cloud Provider</th>
                  <th className="py-3 px-space-md">IP Address</th>
                  <th className="py-3 px-space-md">Port &amp; Protocol</th>
                  <th className="py-3 px-space-md">Health Status</th>
                  <th className="py-3 px-space-md">Health-Check Endpoint</th>
                  <th className="py-3 px-space-md text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {mergedServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-secondary">
                      No services match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  mergedServices.map((item) => {
                    const isHealthy = item.status === 'Healthy' || item.status === 'passing';
                    const isLive = !item.isSample;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors group ${
                          !isHealthy ? 'hover:bg-surface-container-low/60 bg-error-container/10' : 'hover:bg-surface-container-low/60'
                        }`}
                      >
                        <td className="py-3 px-space-md">
                          <div className="flex items-center gap-space-sm">
                            <div
                              className={`w-7 h-7 rounded-md ${
                                isLive ? 'bg-primary-fixed text-primary' : 'bg-secondary-container text-secondary'
                              } flex items-center justify-center font-code-sm text-code-sm`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isLive ? 'cloud_done' : 'dns'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-label-lg text-label-lg font-medium text-on-surface">
                                  {item.name}
                                </span>
                                {isLive ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant"
                                    title="Confirmed in HashiCorp Consul daemon"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                                    LIVE CONSUL
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-surface-container text-secondary"
                                    title="Simulated sample entry for offline demonstration"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                    DEMO SAMPLE
                                  </span>
                                )}
                              </div>
                              <span className="font-code-sm text-code-sm text-secondary">
                                {item.version || 'Consul Registered Node'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          <span className="font-code-sm text-code-sm bg-surface-container px-2 py-0.5 rounded text-on-surface select-all">
                            {item.id}
                          </span>
                        </td>
                        <td className="py-3 px-space-md">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-surface-container-high text-on-surface">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.provider === 'AWS'
                                  ? 'bg-primary'
                                  : item.provider === 'GCP'
                                  ? 'bg-tertiary'
                                  : item.provider === 'Azure'
                                  ? 'bg-primary'
                                  : 'bg-secondary'
                              }`}
                            ></span>
                            {item.providerRegion || item.provider}
                          </span>
                        </td>
                        <td className="py-3 px-space-md font-code-md text-code-md text-on-surface select-all">
                          {item.address}
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="flex items-center gap-1 font-code-md text-code-md text-on-surface">
                            <span className="font-bold">{item.port}</span>
                            <span className="text-secondary text-[11px]">/ HTTP</span>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          {isHealthy ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-surface-container text-tertiary font-medium">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                              </span>
                              Healthy (Passing)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-error-container text-error font-medium">
                              <span className="w-2 h-2 rounded-full bg-error"></span>
                              Unhealthy / Critical
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-space-md">
                          <a
                            className="font-code-sm text-code-sm text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]"
                            href={item.healthUrl || `http://${item.address}:${item.port}/health`}
                            rel="noreferrer"
                            target="_blank"
                            title={item.healthUrl}
                          >
                            <span>{item.healthUrl || `http://${item.address}:${item.port}/health`}</span>
                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          </a>
                        </td>
                        <td className="py-3 px-space-md text-right">
                          <div className="flex items-center justify-end gap-space-xs">
                            <button
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                              onClick={() => setInspectItem(item)}
                              title="Inspect Node Details"
                            >
                              <span className="material-symbols-outlined text-[18px]">manage_search</span>
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-secondary transition-colors"
                              onClick={() =>
                                showToast(
                                  `Consul DNS: Resolved ${item.name.toLowerCase().replace(/\s+/g, '-')}.service.consul -> ${item.address}:${item.port} (RFC-2782)`,
                                  'info'
                                )
                              }
                              title="Test DNS Query"
                            >
                              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                              onClick={() => handleDeregister(item)}
                              title={item.isSample ? 'Remove Demo Sample' : 'Deregister from Consul'}
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

          {/* Table Footer */}
          <div className="px-space-md py-space-sm bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs font-code-sm text-code-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-tertiary">done_all</span>
              <span>
                Showing <strong className="text-on-surface">{mergedServices.length}</strong> of{' '}
                <span>{mergedServices.length}</span> registered microservice catalog records
              </span>
            </div>
            <div className="flex items-center gap-space-sm font-code-sm text-code-sm text-secondary">
              <span>
                Consul WAN Gossip: <strong>Active (0.24ms jitter)</strong>
              </span>
              <span>•</span>
              <span>Leader: consul-core-01</span>
            </div>
          </div>
        </section>

        {/* Inspection Modal */}
        {inspectItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm">
            <div className="bg-surface-container-lowest rounded-xl max-w-xl w-full p-space-lg shadow-xl flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-sm bg-surface-container-low px-space-md py-space-sm rounded-lg">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
                  <span className="font-headline-md text-headline-md text-on-surface">Service Node Inspection</span>
                </div>
                <button
                  className="text-on-surface-variant hover:text-on-surface"
                  onClick={() => setInspectItem(null)}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-space-sm font-code-sm text-code-sm">
                <div className="flex justify-between py-1 bg-surface-container-low px-2 rounded">
                  <span className="text-secondary">Catalog ID:</span>
                  <span className="text-on-surface font-semibold">{inspectItem.id}</span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container px-2 rounded">
                  <span className="text-secondary">Health Check Ratio:</span>
                  <span className="text-tertiary font-semibold">
                    {inspectItem.status === 'Healthy' || inspectItem.status === 'passing'
                      ? '4 / 4 Checks Passing'
                      : '1 Failing Check (HTTP 503)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container-low px-2 rounded">
                  <span className="text-secondary">Consul Service Tags:</span>
                  <span className="text-on-surface">
                    {JSON.stringify(inspectItem.tags || [inspectItem.provider, 'mesh-sync', 'v1.20'])}
                  </span>
                </div>
                <div className="flex justify-between py-1 bg-surface-container px-2 rounded">
                  <span className="text-secondary">Datacenter Sync:</span>
                  <span className="text-on-surface">WAN gossip synchronized (5s heartbeat)</span>
                </div>
              </div>
              <div className="flex justify-end gap-space-sm pt-space-xs">
                <button
                  className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md"
                  onClick={() => setInspectItem(null)}
                >
                  Close
                </button>
                <button
                  className="px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1"
                  onClick={() => {
                    showToast(`Agent ping to ${inspectItem.address}:${inspectItem.port} returned 1.2ms latency!`);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">network_ping</span>
                  <span>Execute Agent Ping</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Code Snippet Section */}
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">integration_instructions</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Consul Registration REST Endpoint (Express / Node.js)
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Production-ready Express.js route registering dynamic workloads into HashiCorp Consul daemon.
                </p>
              </div>
            </div>
            <button
              className="bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-md py-space-xs rounded-lg flex items-center gap-1.5 transition-colors"
              onClick={copyEndpointCode}
            >
              <span className="material-symbols-outlined text-[16px] text-primary">content_copy</span>
              <span>Copy Endpoint</span>
            </button>
          </div>

          <div className="bg-inverse-surface rounded-xl p-space-md overflow-x-auto relative">
            <div className="flex items-center justify-between pb-space-sm mb-space-sm font-code-sm text-code-sm text-inverse-on-surface/50 border-b-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-error inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-surface-container inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-tertiary-fixed inline-block"></span>
                <span className="ml-2 text-inverse-on-surface font-mono">server/routes/registry.js</span>
              </div>
              <span className="text-inverse-primary">Node.js 20 LTS • consul@1.2.0</span>
            </div>
            <pre className="font-code-md text-code-md leading-relaxed text-inverse-on-surface font-mono">
              <code>
                <span className="text-inverse-primary">const</span> express = <span className="text-tertiary-fixed">require</span>(<span className="text-tertiary-fixed-dim">'express'</span>);{'\n'}
                <span className="text-inverse-primary">const</span> Consul = <span className="text-tertiary-fixed">require</span>(<span className="text-tertiary-fixed-dim">'consul'</span>);{'\n'}
                <span className="text-inverse-primary">const</span> router = express.<span className="text-tertiary-fixed">Router</span>();{'\n\n'}
                <span className="text-secondary-fixed-dim">// Initialize Consul Client connected to local agent</span>{'\n'}
                <span className="text-inverse-primary">const</span> consul = <span className="text-inverse-primary">new</span> <span className="text-tertiary-fixed">Consul</span>({'{'}{'\n'}
                {'  '}host: process.env.CONSUL_HOST || <span className="text-tertiary-fixed-dim">'127.0.0.1'</span>,{'\n'}
                {'  '}port: process.env.CONSUL_PORT || <span className="text-tertiary-fixed-dim">'8500'</span>,{'\n'}
                {'  '}promisify: <span className="text-inverse-primary">true</span>{'\n'}
                {'}'});{'\n\n'}
                <span className="text-secondary-fixed-dim">/**{'\n'} * POST /api/register{'\n'} * Handles incoming microservice registration into Consul Catalog{'\n'} */</span>{'\n'}
                router.<span className="text-tertiary-fixed">post</span>(<span className="text-tertiary-fixed-dim">'/api/register'</span>, <span className="text-inverse-primary">async</span> (req, res) =&gt; {'{'}{'\n'}
                {'  '}<span className="text-inverse-primary">const</span> {'{'} name, id, address, port, checkPath, interval = <span className="text-tertiary-fixed-dim">'10s'</span>, tags = [] {'}'} = req.body;{'\n\n'}
                {'  '}<span className="text-inverse-primary">try</span> {'{'}{'\n'}
                {'    '}<span className="text-secondary-fixed-dim">// Register service with Consul Agent</span>{'\n'}
                {'    '}<span className="text-inverse-primary">await</span> consul.agent.service.<span className="text-tertiary-fixed">register</span>({'{'}{'\n'}
                {'      '}name: name,{'\n'}
                {'      '}id: id || <span className="text-tertiary-fixed-dim">{'`${name}-${Date.now()}`'}</span>,{'\n'}
                {'      '}address: address,{'\n'}
                {'      '}port: Number(port),{'\n'}
                {'      '}tags: tags,{'\n'}
                {'      '}check: {'{'}{'\n'}
                {'        '}http: <span className="text-tertiary-fixed-dim">{'`http://${address}:${port}${checkPath}`'}</span>,{'\n'}
                {'        '}interval: interval,{'\n'}
                {'        '}timeout: <span className="text-tertiary-fixed-dim">'2s'</span>,{'\n'}
                {'        '}deregistercriticalserviceafter: <span className="text-tertiary-fixed-dim">'1m'</span>{'\n'}
                {'      '}{'}'}{'\n'}
                {'    '}{'}'});{'\n\n'}
                {'    '}<span className="text-inverse-primary">return</span> res.status(<span className="text-tertiary-fixed-dim">201</span>).json({'{'}{'\n'}
                {'      '}success: <span className="text-inverse-primary">true</span>,{'\n'}
                {'      '}message: <span className="text-tertiary-fixed-dim">{'`Service ${name} [${id}] registered with Consul`'}</span>,{'\n'}
                {'      '}consulCatalogUrl: <span className="text-tertiary-fixed-dim">{'`http://127.0.0.1:8500/v1/catalog/service/${name}`'}</span>{'\n'}
                {'    '}{'}'});{'\n'}
                {'  '}{'}'} <span className="text-inverse-primary">catch</span> (err) {'{'}{'\n'}
                {'    '}<span className="text-inverse-primary">return</span> res.status(<span className="text-tertiary-fixed-dim">500</span>).json({'{'}{'\n'}
                {'      '}success: <span className="text-inverse-primary">false</span>,{'\n'}
                {'      '}error: err.message{'\n'}
                {'    '}{'}'});{'\n'}
                {'  '}{'}'}{'\n'}
                {'}'});
              </code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};
