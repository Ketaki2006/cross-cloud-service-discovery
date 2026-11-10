import {
  ConsulStatusResponse,
  DiscoveryResponse,
  HealthResponse,
  RegisterServicePayload,
  CrossCloudPaymentResult,
  CrossCloudTelemetry,
} from '../types';

const API_BASE = '';

export async function getApiOverview() {
  const res = await fetch(`${API_BASE}/api`);
  if (!res.ok) throw new Error(`API overview error: HTTP ${res.status}`);
  return res.json();
}

export async function getConsulStatus(): Promise<ConsulStatusResponse> {
  const res = await fetch(`${API_BASE}/api/consul/status`);
  return res.json();
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

export async function triggerCrossCloudPayment(
  userId = 'usr_101',
  amount = 150,
  currency = 'USD'
): Promise<CrossCloudPaymentResult> {
  const res = await fetch(`${API_BASE}/api/cross-cloud/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, currency }),
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || `Cross-cloud payment failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getCrossCloudTelemetry(): Promise<CrossCloudTelemetry> {
  const res = await fetch(`${API_BASE}/api/cross-cloud/telemetry`);
  return res.json();
}

