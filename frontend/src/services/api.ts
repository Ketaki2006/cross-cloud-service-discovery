import {
  ConsulStatusResponse,
  DiscoveryResponse,
  HealthResponse,
  RegisterServicePayload,
  CrossCloudPaymentResult,
  CrossCloudTelemetry,
  DashboardOverviewResponse,
  ConsulCatalogResponse,
  PaymentHealthCheckResponse,
  UserRecord,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function getApiBaseUrl(): string {
  return API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
}

export async function getApiOverview() {
  const res = await fetch(`${API_BASE}/api`);
  if (!res.ok) throw new Error(`API overview error: HTTP ${res.status}`);
  return res.json();
}

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  const res = await fetch(`${API_BASE}/api/dashboard/overview`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to load dashboard overview (HTTP ${res.status})`);
  }
  return res.json();
}

export async function getConsulStatus(): Promise<ConsulStatusResponse> {
  const res = await fetch(`${API_BASE}/api/consul/status`);
  return res.json();
}

export async function getConsulCatalog(): Promise<ConsulCatalogResponse> {
  const res = await fetch(`${API_BASE}/api/consul/catalog`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch Consul catalog (HTTP ${res.status})`);
  }
  return res.json();
}

export async function getPaymentServiceHealth(): Promise<PaymentHealthCheckResponse> {
  const res = await fetch(`${API_BASE}/api/consul/health/payment-service`);
  const data = await res.json();
  return data;
}

export async function getServices(): Promise<{ status: string; count: number; services: Record<string, any> }> {
  const res = await fetch(`${API_BASE}/api/services`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch services (HTTP ${res.status})`);
  }
  return res.json();
}

export async function registerService(payload: RegisterServicePayload) {
  const res = await fetch(`${API_BASE}/api/services/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || `Registration failed (HTTP ${res.status})`);
  }
  return data;
}

export async function deregisterService(id: string) {
  const res = await fetch(`${API_BASE}/api/services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || `Deregistration failed (HTTP ${res.status})`);
  }
  return data;
}

export async function discoverService(name: string, passingOnly = false): Promise<DiscoveryResponse> {
  const url = `${API_BASE}/api/services/${encodeURIComponent(name)}${passingOnly ? '?passing=true' : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Discovery failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getHealthChecks(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch health checks (HTTP ${res.status})`);
  }
  return res.json();
}

export async function probeServiceHealth(serviceId: string) {
  const res = await fetch(`${API_BASE}/api/services/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId }),
  });
  const data = await res.json();
  if (!res.ok && !data.status) {
    throw new Error(data.message || `Probe failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getUsers(): Promise<{ status: string; users: UserRecord[] }> {
  const res = await fetch(`${API_BASE}/api/users`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Failed to load users (HTTP ${res.status})`);
  }
  return data;
}

export async function payAsUser(
  userId: string,
  payload: { amount: number; currency: string; description: string }
): Promise<CrossCloudPaymentResult> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    const err: any = new Error(data.message || `Cross-cloud payment failed (HTTP ${res.status})`);
    err.responsePayload = data;
    err.httpStatus = res.status;
    throw err;
  }
  return data;
}

export async function getTelemetry(): Promise<CrossCloudTelemetry> {
  const res = await fetch(`${API_BASE}/api/telemetry`);
  return res.json();
}

export async function triggerCrossCloudPayment(
  userId = 'usr_101',
  amount = 10,
  currency = 'USD',
  description = 'Dashboard demo payment'
): Promise<CrossCloudPaymentResult> {
  return payAsUser(userId, { amount, currency, description });
}

export async function getCrossCloudTelemetry(): Promise<CrossCloudTelemetry> {
  return getTelemetry();
}

export async function injectPaymentFault() {
  const res = await fetch(`${API_BASE}/api/scenarios/inject-fault`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Fault injection failed (HTTP ${res.status})`);
  return data;
}

export async function restorePaymentHealth() {
  const res = await fetch(`${API_BASE}/api/scenarios/restore-health`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Recovery trigger failed (HTTP ${res.status})`);
  return data;
}
