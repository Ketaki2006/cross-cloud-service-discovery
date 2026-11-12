import React, { useEffect, useState, useCallback } from 'react';
import {
  getDashboardOverview,
  getConsulCatalog,
  getUsers,
  payAsUser,
  deregisterService,
  probeServiceHealth,
  getApiBaseUrl,
} from '../services/api';
import {
  DashboardOverviewResponse,
  ConsulCatalogEntry,
  CrossCloudPaymentResult,
  UserRecord,
  HealthState,
} from '../types';
import { useToast } from '../components/Toast';
import { RegisterServiceModal } from '../components/RegisterServiceModal';

function getHealthBadgeStyle(status: HealthState | string) {
  switch (status) {
    case 'PASSING':
    case 'CONNECTED':
      return {
        bg: 'bg-tertiary-fixed',
        text: 'text-on-tertiary-fixed-variant',
        dot: 'bg-tertiary',
      };
    case 'CRITICAL':
    case 'UNAVAILABLE':
    case 'DEGRADED':
      return {
        bg: 'bg-error-container',
        text: 'text-on-error-container',
        dot: 'bg-error',
      };
    case 'WARNING':
      return {
        bg: 'bg-secondary-container',
        text: 'text-on-secondary-container',
        dot: 'bg-primary',
      };
    case 'INACTIVE':
    default:
      return {
        bg: 'bg-surface-container',
        text: 'text-secondary',
        dot: 'bg-outline',
      };
  }
}

export const Dashboard: React.FC = () => {
  const { showToast } = useToast();

  // Live API states (no hardcoded healthy defaults)
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<ConsulCatalogEntry[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'aws' | 'azure' | 'gcp'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Payment Simulator state
  const [selectedUserId, setSelectedUserId] = useState('usr_101');
  const [paymentAmount, setPaymentAmount] = useState('10');
  const [paymentCurrency, setPaymentCurrency] = useState('USD');
  const [paymentDescription, setPaymentDescription] = useState('Dashboard demo payment');
  const [isPaying, setIsPaying] = useState(false);
  const [lastPaymentResult, setLastPaymentResult] = useState<CrossCloudPaymentResult | null>(null);
  const [lastPaymentError, setLastPaymentError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [overviewData, catalogData, usersData] = await Promise.all([
        getDashboardOverview(),
        getConsulCatalog().catch(() => null),
        getUsers().catch(() => null),
      ]);
      setOverview(overviewData);
      setOverviewError(null);
      if (catalogData && catalogData.instances) {
        setCatalogEntries(catalogData.instances);
      } else {
        setCatalogEntries([]);
      }
      if (usersData && Array.isArray(usersData.users) && usersData.users.length > 0) {
        setUsers(usersData.users);
      }
    } catch (err: any) {
      setOverviewError(err.message || 'Unable to reach Express Backend API');
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(fetchAllData, 10000);
    return () => clearInterval(timer);
  }, [fetchAllData]);

  const handleSyncMesh = async () => {
    setIsSyncing(true);
    await fetchAllData();
    showToast('Dashboard synchronized with Consul and User Service APIs.', 'info');
    setTimeout(() => setIsSyncing(false), 500);
  };

  const handleExecutePayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const numericAmount = Number(paymentAmount);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Enter a valid positive payment amount.', 'error');
      return;
    }

    setIsPaying(true);
    setLastPaymentError(null);

    try {
      const res = await payAsUser(selectedUserId, {
        amount: numericAmount,
        currency: paymentCurrency,
        description: paymentDescription.trim() || 'Dashboard demo payment',
      });
      setLastPaymentResult(res);
      showToast(
        `Payment ${res.payment.transactionId} completed via ${res.discoveredTarget.address}:${res.discoveredTarget.port} (${res.latencyMs}ms)`,
        'success'
      );
      await fetchAllData();
    } catch (err: any) {
      const msg = err.message || 'Cross-cloud payment request failed';
      setLastPaymentError(msg);
      showToast(msg, 'error');
      await fetchAllData();
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeregister = async (serviceId: string) => {
    if (!window.confirm(`Deregister "${serviceId}" from Consul catalog?`)) return;
    try {
      await deregisterService(serviceId);
      showToast(`Service "${serviceId}" deregistered from Consul.`, 'success');
      await fetchAllData();
    } catch (err: any) {
      showToast(`Deregistration failed: ${err.message}`, 'error');
    }
  };

  const handleLiveProbe = async (serviceId: string) => {
    showToast(`Executing backend HTTP probe for "${serviceId}"...`, 'info');
    try {
      const res = await probeServiceHealth(serviceId);
      if (res.status === 'PASSING') {
        showToast(`Probe PASSING: ${res.targetUrl} -> HTTP ${res.httpStatus} (${res.latencyMs}ms)`, 'success');
      } else {
        showToast(`Probe CRITICAL: ${res.targetUrl} -> ${res.error || `HTTP ${res.httpStatus}`}`, 'error');
      }
      await fetchAllData();
    } catch (err: any) {
      showToast(`Probe error: ${err.message}`, 'error');
    }
  };

  const copyApiCurl = () => {
    const baseUrl = getApiBaseUrl();
    const cmd = `curl -X POST ${baseUrl}/api/users/${selectedUserId}/pay -H "Content-Type: application/json" -d '{"amount":10,"currency":"USD","description":"Dashboard demo payment"}'`;
    navigator.clipboard.writeText(cmd).then(() => {
      showToast('Cross-cloud payment cURL copied to clipboard!', 'success');
    });
  };

  // Extracted safe status values (never assuming healthy or remote VPN!)
  const awsStatus: HealthState = overview?.awsUserService?.status || 'UNKNOWN';
  const azureStatus: HealthState = overview?.azurePaymentService?.status || 'UNKNOWN';
  const consulStatus = overview?.consul?.connected ? 'PASSING' : overview ? 'UNAVAILABLE' : 'UNKNOWN';
  const wgStatus = overview?.wireguard?.status || 'UNKNOWN';
  const isRemoteMode = overview?.deploymentMode?.mode === 'REMOTE';
  const isLocalMode = overview?.deploymentMode?.mode === 'LOCAL';
  const isVpnActive = Boolean(overview?.wireguard?.active || wgStatus === 'CONNECTED');
  const userAddress = overview?.awsUserService?.address || overview?.architecture?.aws?.address || '127.0.0.1';
  const paymentAddress = overview?.azurePaymentService?.address || overview?.architecture?.azure?.address || (isRemoteMode ? '10.8.0.2' : '127.0.0.1');

  const totalReq = overview?.telemetry?.totalRequests;
  const successReq = overview?.telemetry?.successfulRequests;
  const failedReq = overview?.telemetry?.failedRequests;
  const latestLatency = overview?.telemetry?.lastRequest?.latencyMs;
  const recentHistory = overview?.telemetry?.recentHistory || [];

  const filteredServices = catalogEntries.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.provider.toLowerCase() === activeFilter.toLowerCase();
  });

  const awsBadge = getHealthBadgeStyle(awsStatus);
  const azureBadge = getHealthBadgeStyle(azureStatus);
  const consulBadge = getHealthBadgeStyle(consulStatus);
  const wgBadge = getHealthBadgeStyle(wgStatus);

  return (
    <div className="flex flex-col w-full gap-space-lg min-w-0">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-space-xs mb-1">
            <span
              className={`font-code-sm text-code-sm px-2.5 py-0.5 rounded-full font-semibold ${
                !overview
                  ? 'bg-surface-container text-secondary'
                  : isRemoteMode
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              {!overview
                ? 'Detecting Mode...'
                : isRemoteMode
                ? 'REMOTE MODE • AWS ↔ Azure WireGuard Mesh'
                : 'LOCAL MODE • Loopback Simulation (127.0.0.1)'}
            </span>
            <span className="font-code-sm text-code-sm text-secondary">
              ● Datacenter: {overview?.consul?.connected ? overview.consul.datacenter : 'Unavailable'}
            </span>
            {overview?.timestamp && (
              <span className="font-code-sm text-code-sm text-secondary">
                • Updated: {new Date(overview.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Cross-Cloud Service Discovery Registry
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {isLocalMode
              ? 'Running local microservices and Consul on 127.0.0.1 loopback (no active WireGuard tunnel or remote cloud traffic).'
              : 'Live multi-cloud telemetry connecting AWS EC2 (User Service) and Azure VM (Payment Service) via Consul & WireGuard VPN.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-space-sm self-start md:self-auto">
          <button
            onClick={handleSyncMesh}
            className="flex items-center gap-1.5 px-3 sm:px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-all shadow-sm active:scale-95"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-primary transition-transform duration-500 ${
                isSyncing ? 'rotate-180' : ''
              }`}
            >
              sync
            </span>
            <span className="font-label-md sm:font-label-lg text-label-md sm:text-label-lg font-medium">Refresh Live Status</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="font-label-md sm:font-label-lg text-label-md sm:text-label-lg font-medium">Register Service</span>
          </button>
        </div>
      </div>

      {/* Explicit Local vs Remote Mode Distinction Banner */}
      {isLocalMode && (
        <div className="p-space-md rounded-xl bg-secondary-container text-on-secondary-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-primary/20">
          <div className="flex items-start sm:items-center gap-2 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[20px] shrink-0">computer</span>
            <span>
              <strong>Local Simulation Mode Active (No VPN):</strong> Gateway, Consul, User Service (<code>{userAddress}:{overview?.awsUserService?.port || 8002}</code>), and Payment Service (<code>{paymentAddress}:{overview?.azurePaymentService?.port || 8001}</code>) are running locally on loopback. To inspect the remote AWS (<code>10.8.0.1</code>) ↔ Azure (<code>10.8.0.2</code>) cluster, open the dashboard hosted on AWS EC2.
            </span>
          </div>
        </div>
      )}

      {/* API Error Alert Banner */}
      {overviewError && (
        <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[20px]">cloud_off</span>
            <span>
              <strong>Backend API Unavailable:</strong> {overviewError}. Service statuses are marked Unknown until backend connectivity is restored.
            </span>
          </div>
        </div>
      )}

      {/* Azure Exclusion Warning when Payment Service is CRITICAL */}
      {overview?.azurePaymentService?.excludedFromDiscovery && overview?.azurePaymentService?.registered && (
        <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-error/30">
          <div className="flex items-start sm:items-center gap-2 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[20px] shrink-0">warning</span>
            <span>
              <strong>Consul Health Alert:</strong> Azure Payment Service (<code>{overview.azurePaymentService.serviceId}</code>) is currently <strong>{azureStatus}</strong> and automatically excluded from healthy discovery (<code>?passing</code>). Cross-cloud payments will fail gracefully until recovery.
            </span>
          </div>
        </div>
      )}

      {/* Top 4 Live Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Card 1: AWS User Service Status */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm relative overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-[22px]">cloud</span>
            </div>
            <span className={`font-code-sm text-code-sm font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${awsBadge.bg} ${awsBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${awsBadge.dot}`}></span> {awsStatus}
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">
              {isLocalMode ? 'User Service (Local)' : 'AWS User Service'}
            </div>
            <div className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold">
              {awsStatus === 'PASSING' ? 'Online' : awsStatus === 'UNKNOWN' ? 'Unknown' : 'Unavailable'}
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex flex-wrap items-center justify-between gap-1 text-on-surface-variant font-code-sm text-code-sm">
            <span>{isLocalMode ? userAddress : overview?.architecture?.aws?.region || 'us-east-1'} • :{overview?.awsUserService?.port || 8002}</span>
            <span className="text-primary font-medium">
              {overview?.awsUserService?.latencyMs !== undefined ? `${overview.awsUserService.latencyMs}ms probe` : 'No probe'}
            </span>
          </div>
        </div>

        {/* Card 2: Azure Payment Service Status */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm relative overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <span className={`font-code-sm text-code-sm font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${azureBadge.bg} ${azureBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${azureBadge.dot}`}></span> {azureStatus}
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">
              {isLocalMode ? 'Payment Service (Local)' : 'Azure Payment Service'}
            </div>
            <div className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold">
              {azureStatus === 'PASSING' ? 'Healthy' : azureStatus === 'CRITICAL' ? 'Critical (503)' : 'Unknown'}
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex flex-wrap items-center justify-between gap-1 text-on-surface-variant font-code-sm text-code-sm">
            <span className="truncate max-w-[140px]">
              {isLocalMode ? paymentAddress : overview?.azurePaymentService?.region || 'Central India'} • :{overview?.azurePaymentService?.port || 8001}
            </span>
            <span
              className={`font-medium ${
                !overview || !overview.azurePaymentService?.registered
                  ? 'text-secondary'
                  : overview.azurePaymentService.excludedFromDiscovery
                  ? 'text-error'
                  : 'text-tertiary'
              }`}
            >
              {!overview
                ? 'Checking...'
                : !overview.azurePaymentService?.registered
                ? 'Not registered'
                : overview.azurePaymentService.excludedFromDiscovery
                ? 'Excluded'
                : 'Discoverable'}
            </span>
          </div>
        </div>

        {/* Card 3: Consul Registry & Network / WireGuard VPN */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm relative overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-[22px]">{isVpnActive ? 'vpn_lock' : 'lan'}</span>
            </div>
            <span className={`font-code-sm text-code-sm font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${consulBadge.bg} ${consulBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${consulBadge.dot}`}></span> Consul: {consulStatus}
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">
              {isLocalMode ? 'Network Mode (Local)' : 'WireGuard VPN Mesh'}
            </div>
            <div className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold flex flex-wrap items-center gap-2">
              <span className="truncate">{isLocalMode ? 'No VPN Tunnel' : wgStatus}</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full font-code-sm text-code-sm font-medium ${wgBadge.bg} ${wgBadge.text}`}>
                {isVpnActive ? 'UDP 51820' : isLocalMode ? 'Loopback' : wgStatus}
              </span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex flex-wrap items-center justify-between gap-1 text-on-surface-variant font-code-sm text-code-sm">
            <span>
              {isRemoteMode
                ? `${overview?.wireguard?.awsWgIp || '10.8.0.1'} ↔ ${overview?.wireguard?.azureWgIp || '10.8.0.2'}`
                : `${userAddress} ↔ ${paymentAddress}`}
            </span>
            <span className="text-primary font-medium truncate max-w-[90px]">
              {overview?.consul?.datacenter || '—'}
            </span>
          </div>
        </div>

        {/* Card 4: Payment Telemetry & Latency */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm relative overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-[22px]">monitoring</span>
            </div>
            <span className="font-code-sm text-code-sm font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
              {latestLatency !== undefined ? `Latest: ${latestLatency}ms` : 'No txns yet'}
            </span>
          </div>
          <div className="mt-space-md">
            <div className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">Cross-Cloud Requests</div>
            <div className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold flex items-baseline gap-2">
              <span>{totalReq ?? '—'}</span>
              <span className="font-body-sm text-body-sm text-secondary font-normal">Total</span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-code-sm text-code-sm">
            <span className="text-tertiary font-semibold">{successReq ?? 0} Success</span>
            <span className="text-error font-semibold">{failedReq ?? 0} Failed</span>
          </div>
        </div>
      </div>

      {/* Cloud Architecture Visualization (AWS EC2 <-> WireGuard <-> Azure VM) */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Cross-Cloud Architecture &amp; Communication Path
            </h2>
          </div>
          <span className="font-code-sm text-code-sm text-secondary">
            {overview?.wireguard?.detail || 'Inspecting live topology...'}
          </span>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-md">
          {/* Interactive Pipeline Step Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-space-sm items-center">
            {/* AWS EC2 / Local User Service Node */}
            <div className="lg:col-span-4 rounded-xl bg-surface-container-low p-space-md border border-surface-container-high flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">cloud</span>
                  <div>
                    <div className="font-label-lg text-label-lg font-bold text-on-surface">
                      {isLocalMode ? 'Local User Service Node' : 'AWS EC2 Node'}
                    </div>
                    <div className="font-code-sm text-code-sm text-secondary">
                      {isLocalMode ? 'Host: localhost (127.0.0.1)' : `Region: ${overview?.architecture?.aws?.region || 'us-east-1'}`}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${awsBadge.bg} ${awsBadge.text}`}>
                  {awsStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1 font-code-sm text-code-sm">
                <div className="bg-surface-container-lowest p-2 rounded">
                  <span className="text-secondary block text-[11px]">User Service</span>
                  <span className="text-on-surface font-semibold">Port {overview?.awsUserService?.port || 8002}</span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded">
                  <span className="text-secondary block text-[11px]">
                    {isRemoteMode && overview?.wireguard?.awsWgIp ? 'WireGuard IP' : 'Endpoint IP'}
                  </span>
                  <span className="text-on-surface font-semibold">
                    {isRemoteMode ? (overview?.wireguard?.awsWgIp || userAddress) : userAddress}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded col-span-2 flex justify-between">
                  <span className="text-secondary">Consul Server (:8500):</span>
                  <span className="text-primary font-semibold">
                    {overview?.consul?.connected ? `Active (${overview.consul.datacenter})` : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            {/* WireGuard VPN / Loopback Discovery Path */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center p-space-sm rounded-xl bg-surface-container-low/60 text-center gap-1.5">
              <div className="flex items-center gap-1 font-code-sm text-code-sm font-semibold text-primary">
                <span className={`material-symbols-outlined text-[18px] ${isPaying ? 'animate-spin' : ''}`}>
                  {isPaying ? 'sync' : isVpnActive ? 'vpn_key' : 'lan'}
                </span>
                <span>{isRemoteMode ? 'WireGuard Tunnel' : 'Local Loopback (No VPN)'}</span>
              </div>
              <div className="w-full flex items-center justify-center gap-1 my-1">
                <span className={`h-1 flex-1 rounded-full ${isPaying ? 'bg-primary animate-pulse' : isVpnActive ? 'bg-tertiary' : 'bg-outline-variant'}`}></span>
                <span className={`px-2 py-0.5 rounded font-code-sm text-[11px] font-bold ${wgBadge.bg} ${wgBadge.text}`}>
                  {isPaying ? 'ROUTING PAYMENT...' : isVpnActive ? 'UDP 51820' : isLocalMode ? '127.0.0.1' : wgStatus}
                </span>
                <span className={`h-1 flex-1 rounded-full ${isPaying ? 'bg-primary animate-pulse' : isVpnActive ? 'bg-tertiary' : 'bg-outline-variant'}`}></span>
              </div>
              <div className="font-code-sm text-[11px] text-secondary">
                Consul Discovery → {overview?.azurePaymentService?.registered ? `${paymentAddress}:${overview?.azurePaymentService?.port || 8001}` : 'Not registered'}
              </div>
            </div>

            {/* Azure VM / Local Payment Node */}
            <div className="lg:col-span-4 rounded-xl bg-surface-container-low p-space-md border border-surface-container-high flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">cloud_queue</span>
                  <div>
                    <div className="font-label-lg text-label-lg font-bold text-on-surface">
                      {isLocalMode ? 'Local Payment Service Node' : 'Azure VM Node'}
                    </div>
                    <div className="font-code-sm text-code-sm text-secondary">
                      {isLocalMode ? 'Host: localhost (127.0.0.1)' : `Region: ${overview?.azurePaymentService?.region || 'Central India'}`}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${azureBadge.bg} ${azureBadge.text}`}>
                  {azureStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1 font-code-sm text-code-sm">
                <div className="bg-surface-container-lowest p-2 rounded">
                  <span className="text-secondary block text-[11px]">Payment Service</span>
                  <span className="text-on-surface font-semibold">Port {overview?.azurePaymentService?.port || 8001}</span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded">
                  <span className="text-secondary block text-[11px]">
                    {isRemoteMode && paymentAddress.startsWith('10.8.0.') ? 'WireGuard IP' : 'Endpoint IP'}
                  </span>
                  <span className="text-on-surface font-semibold">
                    {overview?.azurePaymentService?.registered ? paymentAddress : 'Unregistered'}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded col-span-2 flex justify-between">
                  <span className="text-secondary">Service ID:</span>
                  <span className="text-on-surface font-semibold truncate max-w-[170px]">
                    {overview?.azurePaymentService?.serviceId || 'Not registered'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exact Communication Path Flow Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low font-code-sm text-code-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">User</span>
            <span className="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>
            <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-medium">
              {isLocalMode ? 'Local User Service (:8002)' : 'AWS User Service (:8002)'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>
            <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-medium">Consul Discovery (:8500)</span>
            <span className="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>
            <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-medium">
              {isVpnActive ? 'WireGuard VPN' : isLocalMode ? '127.0.0.1 Loopback' : 'Transport Inactive'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>
            <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-medium">
              {isLocalMode ? 'Local Payment Service (:8001)' : 'Azure Payment Service (:8001)'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-tertiary">arrow_forward</span>
            <span className="font-semibold text-tertiary">Transaction Response</span>
          </div>
        </div>
      </div>

      {/* Functional Cross-Cloud Payment Simulator */}
      <div className="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-primary/20 min-w-0 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/60">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center text-primary overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-[24px]">sync_alt</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {isLocalMode ? 'Simulated Cross-Cloud Payment Flow' : 'Cross-Cloud Payment Simulator'}
              </h2>
              <p className="font-body-sm text-body-sm text-secondary">
                Dispatches <code>POST /api/users/:id/pay</code> to {isLocalMode ? 'Local User Service' : 'AWS User Service'}, which discovers Payment Service via Consul.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleExecutePayment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-space-sm mt-space-md items-end">
          <div className="lg:col-span-3 flex flex-col gap-1">
            <label className="font-code-sm text-code-sm text-secondary">User ID</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-code-sm text-code-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {users.length > 0 ? (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} — {u.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="usr_101">usr_101 — Ketaki</option>
                  <option value="usr_102">usr_102 — Alex Chen</option>
                </>
              )}
            </select>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-1">
            <label className="font-code-sm text-code-sm text-secondary">Amount</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-code-sm text-code-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-1">
            <label className="font-code-sm text-code-sm text-secondary">Currency</label>
            <select
              value={paymentCurrency}
              onChange={(e) => setPaymentCurrency(e.target.value)}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-code-sm text-code-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-1">
            <label className="font-code-sm text-code-sm text-secondary">Description</label>
            <input
              type="text"
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              placeholder="Dashboard demo payment"
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-body-sm text-body-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isPaying}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${isPaying ? 'animate-spin' : ''}`}>
                {isPaying ? 'progress_activity' : 'send'}
              </span>
              <span>{isPaying ? 'Paying...' : 'Pay'}</span>
            </button>
          </div>
        </form>

        {/* Live Payment Error Result */}
        {lastPaymentError && (
          <div className="mt-space-md p-space-sm rounded-lg bg-error-container text-on-error-container flex items-center gap-2 font-code-sm text-code-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span><strong>Payment Error:</strong> {lastPaymentError}</span>
          </div>
        )}

        {/* Live Payment Success Result (all required fields) */}
        {lastPaymentResult && !lastPaymentError && (
          <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low border border-tertiary/30 flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-tertiary font-label-lg text-label-lg font-bold">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Cross-Cloud Payment Response ({lastPaymentResult.status.toUpperCase()})</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-code-sm text-code-sm font-semibold">
                Latency: {lastPaymentResult.latencyMs} ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-code-sm text-code-sm">
              <div className="bg-surface-container-lowest p-2 rounded">
                <span className="text-secondary block text-[11px]">Transaction ID</span>
                <span className="text-on-surface font-semibold select-all">{lastPaymentResult.payment.transactionId}</span>
              </div>
              <div className="bg-surface-container-lowest p-2 rounded">
                <span className="text-secondary block text-[11px]">Route</span>
                <span className="text-primary font-semibold">
                  {lastPaymentResult.source.cloud} → {lastPaymentResult.discoveredTarget.cloud}
                </span>
              </div>
              <div className="bg-surface-container-lowest p-2 rounded">
                <span className="text-secondary block text-[11px]">Discovered Service ID</span>
                <span className="text-on-surface font-semibold">{lastPaymentResult.discoveredTarget.instanceId}</span>
              </div>
              <div className="bg-surface-container-lowest p-2 rounded">
                <span className="text-secondary block text-[11px]">Discovered Endpoint</span>
                <span className="text-on-surface font-semibold">
                  {lastPaymentResult.discoveredTarget.address}:{lastPaymentResult.discoveredTarget.port}
                </span>
              </div>
              <div className="bg-surface-container-lowest p-2 rounded">
                <span className="text-secondary block text-[11px]">Amount &amp; Time</span>
                <span className="text-on-surface font-semibold">
                  {lastPaymentResult.payment.amount} {lastPaymentResult.payment.currency} • {new Date(lastPaymentResult.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Monitoring Section (GET /api/telemetry) */}
      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-sm min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-space-xs border-b border-surface-container">
          <div className="min-w-0">
            <h2 className="font-headline-md text-headline-md text-on-surface">Transaction Telemetry</h2>
            <p className="font-body-sm text-body-sm text-secondary">
              Live data retrieved from <code>GET /api/telemetry</code> on {isLocalMode ? 'Local User Service' : 'AWS User Service'}.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low text-secondary font-code-sm text-code-sm">
            <span className="material-symbols-outlined text-[16px] shrink-0">memory</span>
            <span className="break-words">{overview?.telemetry?.storageNote || 'In-memory telemetry (resets when User Service restarts)'}</span>
          </span>
        </div>

        {recentHistory.length === 0 ? (
          <div className="py-6 text-center text-secondary font-body-sm text-body-sm bg-surface-container-low/40 rounded-lg">
            No transactions recorded in memory yet. Use the Payment Simulator above to execute a live cross-cloud transaction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-code-sm text-code-sm">
              <thead>
                <tr className="bg-surface-container-low text-secondary uppercase">
                  <th className="py-2 px-3 rounded-l-lg">Status</th>
                  <th className="py-2 px-3">Transaction ID / Error</th>
                  <th className="py-2 px-3">Route</th>
                  <th className="py-2 px-3">Target Address</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Latency</th>
                  <th className="py-2 px-3 text-right rounded-r-lg">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((tx, idx) => {
                  const isOk = tx.status === 'SUCCESS';
                  return (
                    <tr key={`${tx.timestamp}-${idx}`} className="hover:bg-surface-container-low/50">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                            isOk
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-on-surface font-medium select-all">
                        {tx.transactionId || tx.error || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-primary font-semibold">
                        {tx.sourceCloud} → {tx.targetCloud || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-on-surface">{tx.targetAddress || '—'}</td>
                      <td className="py-2.5 px-3 text-on-surface">
                        {tx.amount} {tx.currency || 'USD'}
                      </td>
                      <td className="py-2.5 px-3 text-on-surface">
                        {tx.latencyMs !== undefined ? `${tx.latencyMs}ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-secondary">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom 2-Column Section: Live Consul Catalog & Live Mesh Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg min-w-0">
        {/* Left Column: Registered Cross-Cloud Services */}
        <div className="lg:col-span-8 flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Consul Service Registry</h2>
              <p className="font-body-sm text-body-sm text-secondary">
                Live records resolved via <code>GET /v1/catalog/services</code> &amp; health checks
              </p>
            </div>
            <div className="inline-flex flex-wrap p-1 rounded-lg bg-surface-container-low">
              {(['all', 'aws', 'azure', 'gcp'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1 rounded-md font-code-sm text-code-sm font-medium transition-all ${
                    activeFilter === tab
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                  onClick={() => setActiveFilter(tab)}
                >
                  {tab === 'all'
                    ? `All (${catalogEntries.length})`
                    : `${tab.toUpperCase()} (${catalogEntries.filter((s) => s.provider.toLowerCase() === tab).length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto mt-space-sm">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-secondary font-code-sm text-code-sm uppercase">
                  <th className="py-2.5 px-3 rounded-l-lg">Service Name</th>
                  <th className="py-2.5 px-3">Service ID</th>
                  <th className="py-2.5 px-3">Cloud</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Health Status</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-secondary">
                      {overview?.consul?.connected
                        ? `No live services registered under "${activeFilter.toUpperCase()}" in Consul catalog.`
                        : 'Consul catalog unavailable. Verify Consul daemon is running on AWS backend.'}
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => {
                    const badge = getHealthBadgeStyle(s.healthStatus);
                    return (
                      <tr key={s.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3 font-label-lg text-label-lg font-semibold text-on-surface">{s.name}</td>
                        <td className="py-3 px-3 font-code-sm text-code-sm text-secondary select-all">{s.id}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container font-medium text-on-surface">
                            {s.provider}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-code-sm text-code-sm text-on-surface select-all">{s.address}</td>
                        <td className="py-3 px-3 font-code-sm text-code-sm text-secondary">{s.port}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold ${badge.bg} ${badge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span> {s.healthStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="px-2 py-1 rounded bg-surface-container text-primary font-code-sm text-code-sm hover:bg-surface-container-high transition-colors"
                              onClick={() => handleLiveProbe(s.id)}
                            >
                              Probe
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
        </div>

        {/* Right Column: Live Consul Health & Telemetry Log */}
        <div className="lg:col-span-4 flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Live Mesh Events</h2>
            </div>
            <span className="font-code-sm text-code-sm text-secondary">Real-Time</span>
          </div>

          <div className="flex flex-col gap-space-md mt-space-sm">
            {catalogEntries.length === 0 && recentHistory.length === 0 ? (
              <div className="p-space-sm rounded-lg bg-surface-container-low text-secondary font-body-sm text-body-sm text-center">
                No active health or transaction events observed yet.
              </div>
            ) : (
              <>
                {catalogEntries.map((entry) => (
                  <div key={`ev-${entry.id}`} className="flex items-start gap-space-sm">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        entry.healthStatus === 'PASSING'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {entry.healthStatus === 'PASSING' ? 'check_circle' : 'priority_high'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-code-sm text-code-sm font-semibold text-on-surface truncate">
                        {entry.name} ({entry.provider}) — {entry.healthStatus}
                      </span>
                      <p className="font-code-sm text-[11px] text-secondary break-all line-clamp-2 mt-0.5">
                        {entry.lastCheckOutput}
                      </p>
                    </div>
                  </div>
                ))}

                {recentHistory.slice(0, 3).map((tx, idx) => (
                  <div key={`tx-${idx}`} className="flex items-start gap-space-sm">
                    <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-code-sm text-code-sm font-semibold text-primary">
                        {tx.sourceCloud} → {tx.targetCloud} ({tx.status})
                      </span>
                      <span className="font-code-sm text-[11px] text-secondary truncate">
                        {tx.transactionId || tx.error} • {tx.latencyMs ?? 0}ms
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Gateway API Helper Card */}
      <div className="rounded-xl bg-inverse-surface text-inverse-on-surface p-space-md shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md min-w-0 overflow-hidden">
        <div className="flex items-start gap-space-sm max-w-2xl min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high/20 flex items-center justify-center text-tertiary-fixed shrink-0 mt-0.5 overflow-hidden">
            <span className="material-symbols-outlined text-[22px]">developer_board</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label-lg text-label-lg font-semibold text-inverse-on-surface">
                Secure Backend Proxy Active
              </span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-code-sm text-code-sm">
                Consul Port 8500 Shielded
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-inverse-on-surface/80 mt-1">
              Browser communicates strictly with the Express Gateway, which proxies Consul catalog &amp; AWS-to-Azure calls securely without exposing port 8500 publicly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-xs w-full md:w-auto bg-surface-container-high/10 p-2 rounded-lg justify-between shrink-0 min-w-0 max-w-full">
          <code className="font-code-sm text-code-sm text-inverse-primary truncate min-w-0 flex-1">
            POST /api/users/{selectedUserId}/pay
          </code>
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-code-sm text-code-sm hover:bg-primary transition-colors shrink-0"
            onClick={copyApiCurl}
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            <span>Copy cURL</span>
          </button>
        </div>
      </div>

      <RegisterServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAllData}
      />
    </div>
  );
};
