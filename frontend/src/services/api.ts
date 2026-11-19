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

export function getApiBaseUrl(): string {
  // 1. In browser environments where the page is served by the Gateway (e.g. port 3000 or anything other than Vite dev port 5173),
  // dynamically use window.location.origin. This guarantees that when opened at http://<AWS_PUBLIC_IP>:3000,
  // all API calls use http://<AWS_PUBLIC_IP>:3000 automatically, even if the AWS EC2 IP changed on reboot!
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')) {
    if (window.location.port !== '5173') {
      return window.location.origin;
    }
  }

  // 2. Explicit environment variable override (for dev proxy or standalone static hosting)
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    '';

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback to window origin or empty relative base
  return typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
}

async function apiRequest(path: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err: any) {
    const gatewayLabel = base || 'AWS Gateway';
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out connecting to AWS Gateway (${gatewayLabel}).`);
    }
    throw new Error(`Cannot reach AWS Gateway at ${gatewayLabel}.`);
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from Gateway (HTTP ${res.status})`);
  }
}

export async function getApiOverview() {
  const res = await apiRequest('/api');
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || `API overview error: HTTP ${res.status}`);
  return data;
}

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  const res = await apiRequest('/api/dashboard/overview');
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data.message || `Failed to load dashboard overview (HTTP ${res.status})`);
  }
  return data;
}

export async function getConsulStatus(): Promise<ConsulStatusResponse> {
  const res = await apiRequest('/api/consul/status');
  const data = await parseJsonSafe(res);
  if (!res.ok && typeof data.connected !== 'boolean') {
    throw new Error(data.message || `Consul status error: HTTP ${res.status}`);
  }
  return data;
}

export async function getConsulCatalog(): Promise<ConsulCatalogResponse> {
  const res = await apiRequest('/api/consul/catalog');
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data.message || `Failed to fetch Consul catalog (HTTP ${res.status})`);
  }
  return data;
}

export async function getPaymentServiceHealth(): Promise<PaymentHealthCheckResponse> {
  const res = await apiRequest('/api/consul/health/payment-service');
  return parseJsonSafe(res);
}

export async function getServices(): Promise<{ status: string; count: number; services: Record<string, any> }> {
  const res = await apiRequest('/api/services');
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data.message || `Failed to fetch services (HTTP ${res.status})`);
  }
  return data;
}

export async function registerService(payload: RegisterServicePayload) {
  const res = await apiRequest('/api/services/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || `Registration failed (HTTP ${res.status})`);
  }
  return data;
}

export async function deregisterService(id: string) {
  const res = await apiRequest(`/api/services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || `Deregistration failed (HTTP ${res.status})`);
  }
  return data;
}

export async function discoverService(name: string, passingOnly = false): Promise<DiscoveryResponse> {
  const url = `/api/services/${encodeURIComponent(name)}${passingOnly ? '?passing=true' : ''}`;
  const res = await apiRequest(url);
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data.message || `Discovery failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getHealthChecks(): Promise<HealthResponse> {
  const res = await apiRequest('/api/health');
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data.message || `Failed to fetch health checks (HTTP ${res.status})`);
  }
  return data;
}

export async function probeServiceHealth(serviceId: string) {
  const res = await apiRequest('/api/services/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok && !data.status) {
    throw new Error(data.message || `Probe failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getUsers(): Promise<{ status: string; users: UserRecord[] }> {
  const res = await apiRequest('/api/users');
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data.message || `Failed to load users (HTTP ${res.status})`);
  }
  return data;
}

export async function payAsUser(
  userId: string,
  payload: { amount: number; currency: string; description: string }
): Promise<CrossCloudPaymentResult> {
  const res = await apiRequest(`/api/users/${encodeURIComponent(userId)}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 12000);
  const data = await parseJsonSafe(res);
  if (!res.ok || data.status !== 'success') {
    const err: any = new Error(data.message || `Cross-cloud payment failed (HTTP ${res.status})`);
    err.responsePayload = data;
    err.httpStatus = res.status;
    throw err;
  }
  return data;
}

export async function getTelemetry(): Promise<CrossCloudTelemetry> {
  const res = await apiRequest('/api/telemetry');
  const data = await parseJsonSafe(res);
  if (!res.ok && !data.telemetry) {
    throw new Error(data.message || `Failed to load telemetry (HTTP ${res.status})`);
  }
  return data;
}

export async function triggerCrossCloudPayment(
  userId = 'usr_101',
  amount = 10,
  currency = 'USD',
  description = 'Dashboard demo payment'
): Promise<CrossCloudPaymentResult> {
  return payAsUser(userId, { amount, currency, description });
}

export async function injectPaymentFault() {
  const res = await apiRequest('/api/scenarios/inject-fault', { method: 'POST' });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || `Fault injection failed (HTTP ${res.status})`);
  return data;
}

export async function restorePaymentHealth() {
  const res = await apiRequest('/api/scenarios/restore-health', { method: 'POST' });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || `Recovery trigger failed (HTTP ${res.status})`);
  return data;
}

export async function getScenarioStatus() {
  const res = await apiRequest('/api/scenarios/status');
  return parseJsonSafe(res);
}
