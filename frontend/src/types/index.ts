export interface ServiceRecord {
  id: string;
  name: string;
  serviceName?: string;
  provider: 'AWS' | 'GCP' | 'Azure' | 'Hybrid' | 'Local' | string;
  providerRegion?: string;
  address: string;
  port: number;
  status: 'Healthy' | 'Unhealthy' | 'passing' | 'critical' | 'warning';
  healthUrl?: string;
  healthPath?: string;
  version?: string;
  tags?: string[];
  isSample: boolean;
}

export interface ConsulStatusResponse {
  status: string;
  connected: boolean;
  consulUrl: string;
  leader: string;
  timestamp?: string;
  message?: string;
  error?: string;
}

export interface HealthCheckItem {
  Node: string;
  CheckID: string;
  Name: string;
  Status: 'passing' | 'warning' | 'critical';
  Notes: string;
  Output: string;
  ServiceID: string;
  ServiceName: string;
  ServiceTags: string[];
}

export interface HealthResponse {
  status: string;
  totalChecks: number;
  summary: {
    passing: number;
    warning: number;
    critical: number;
  };
  checks: HealthCheckItem[];
}

export interface RegisterServicePayload {
  name: string;
  id: string;
  provider: string;
  address: string;
  port: number;
  checkPath: string;
  interval?: string;
  timeout?: string;
  tags?: string[];
}

export interface DiscoveredInstance {
  Node: {
    Node: string;
    Address: string;
    Datacenter?: string;
  };
  Service: {
    ID: string;
    Service: string;
    Tags: string[];
    Address: string;
    Port: number;
  };
  Checks: Array<{
    CheckID: string;
    Name: string;
    Status: string;
    Output: string;
  }>;
}

export interface DiscoveryResponse {
  status: string;
  service: string;
  totalInstances: number;
  passingInstances: number;
  passingOnly?: boolean;
  instances: DiscoveredInstance[];
  message?: string;
}

export interface CrossCloudPaymentResult {
  status: string;
  crossCloud: boolean;
  source: {
    service: string;
    cloud: string;
    port: number;
    user: { id: string; name: string };
  };
  discoveredTarget: {
    service: string;
    instanceId: string;
    cloud: string;
    address: string;
    port: number;
    url: string;
  };
  latencyMs: number;
  payment: {
    status: string;
    transactionId: string;
    userId: string;
    amount: number;
    currency: string;
    description: string;
    service: string;
    cloud: string;
    processedAt: string;
    message: string;
  };
  timestamp: string;
}

export interface CrossCloudTelemetry {
  status: string;
  service: string;
  cloud: string;
  telemetry: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequest: {
      timestamp: string;
      status: string;
      userId: string;
      amount: number;
      sourceCloud: string;
      targetCloud: string;
      targetAddress: string;
      transactionId?: string;
      latencyMs?: number;
      error?: string;
    } | null;
    recentHistory: Array<{
      timestamp: string;
      status: string;
      userId: string;
      amount: number;
      sourceCloud: string;
      targetCloud: string;
      targetAddress: string;
      transactionId?: string;
      latencyMs?: number;
      error?: string;
    }>;
  };
}

