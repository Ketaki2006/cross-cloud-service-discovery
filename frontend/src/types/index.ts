export type HealthState = 'PASSING' | 'CRITICAL' | 'WARNING' | 'UNKNOWN';

export interface ServiceRecord {
  id: string;
  name: string;
  serviceName?: string;
  provider: 'AWS' | 'AZURE' | 'GCP' | 'Hybrid' | 'Local' | string;
  providerRegion?: string;
  region?: string;
  address: string;
  port: number;
  status: 'Healthy' | 'Unhealthy' | 'passing' | 'critical' | 'warning' | 'unknown' | HealthState;
  healthStatus?: HealthState;
  healthUrl?: string;
  healthPath?: string;
  version?: string;
  tags?: string[];
  node?: string;
  datacenter?: string;
  excludedFromDiscovery?: boolean;
  lastCheckId?: string;
  lastCheckOutput?: string;
  isSample: boolean;
}

export interface ConsulStatusResponse {
  status: string;
  connected: boolean;
  consulUrl: string;
  leader: string | null;
  datacenter?: string | null;
  nodeName?: string | null;
  version?: string | null;
  latencyMs?: number;
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
  id?: string;
  name?: string;
  address?: string;
  port?: number;
  tags?: string[];
  provider?: string;
  node?: string;
  datacenter?: string;
  status?: string;
  checks?: Array<{
    checkId?: string;
    checkID?: string;
    name: string;
    status: string;
    output: string;
  }>;
  Node?: {
    Node: string;
    Address: string;
    Datacenter?: string;
  };
  Service?: {
    ID: string;
    Service: string;
    Tags: string[];
    Address: string;
    Port: number;
  };
  Checks?: Array<{
    CheckID: string;
    Name: string;
    Status: string;
    Output: string;
  }>;
}

export interface DiscoveryResponse {
  status: string;
  service?: string;
  serviceName?: string;
  totalInstances: number;
  passingInstances?: number;
  passingOnly?: boolean;
  instances: DiscoveredInstance[];
  message?: string;
}

export interface ConsulCatalogEntry {
  id: string;
  name: string;
  provider: string;
  region: string;
  address: string;
  port: number;
  tags: string[];
  node: string;
  datacenter: string;
  healthStatus: HealthState;
  excludedFromDiscovery: boolean;
  lastCheckId: string;
  lastCheckOutput: string;
  checkPath: string;
  healthUrl: string | null;
}

export interface ConsulCatalogResponse {
  status: string;
  count: number;
  catalogNames: string[];
  instances: ConsulCatalogEntry[];
  timestamp: string;
}

export interface PaymentHealthCheckResponse {
  status: string;
  serviceName: string;
  healthState: HealthState;
  totalRegistered: number;
  passingCount: number;
  excludedFromDiscovery: boolean;
  instances: Array<{
    id: string;
    name: string;
    provider: string;
    address: string;
    port: number;
    tags: string[];
    node: string;
    datacenter: string;
    healthStatus: HealthState;
    excludedFromDiscovery: boolean;
    lastCheckId: string;
    lastCheckOutput: string;
    checks: any[];
  }>;
  passingInstances: any[];
  checkedAt: string;
  message?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  tier: string;
  balance: number;
}

export interface CrossCloudTransactionRecord {
  timestamp: string;
  status: string;
  userId: string;
  amount: number;
  currency?: string;
  description?: string;
  sourceCloud: string;
  targetCloud: string;
  discoveredServiceId?: string;
  targetAddress?: string;
  transactionId?: string;
  latencyMs?: number;
  error?: string;
}

export interface CrossCloudPaymentResult {
  status: string;
  crossCloud: boolean;
  source: {
    service: string;
    cloud: string;
    region?: string;
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
    region?: string;
    processedAt: string;
    message: string;
  };
  timestamp: string;
}

export interface CrossCloudTelemetry {
  status: string;
  service: string;
  cloud: string;
  region?: string;
  persistence?: string;
  storageNote?: string;
  error?: string;
  telemetry: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequest: CrossCloudTransactionRecord | null;
    recentHistory: CrossCloudTransactionRecord[];
  };
}

export interface DashboardOverviewResponse {
  status: string;
  timestamp: string;
  gateway?: {
    hostname: string;
    port: number;
    consulTarget: string;
    userServiceTarget: string;
  };
  deploymentMode?: {
    mode: 'LOCAL' | 'REMOTE';
    isRemote: boolean;
    vpnActive: boolean;
    label: string;
    reason: string;
  };
  consul: {
    status: 'PASSING' | 'UNAVAILABLE';
    connected: boolean;
    leader: string | null;
    datacenter: string | null;
    nodeName?: string;
    version?: string;
    latencyMs?: number;
    error?: string;
  };
  awsUserService: {
    status: HealthState;
    reachable: boolean;
    cloud: string;
    region: string;
    address?: string;
    registeredAddress?: string | null;
    port: number;
    uptimeSeconds?: number | null;
    latencyMs?: number;
    checks?: Record<string, string> | null;
    timestamp?: string;
    error?: string;
  };
  azurePaymentService: {
    status: HealthState;
    registered: boolean;
    excludedFromDiscovery: boolean;
    serviceId?: string;
    serviceName?: string;
    cloud: string;
    region: string;
    address?: string;
    port?: number;
    tags?: string[];
    datacenter?: string;
    passingCount?: number;
    totalCount?: number;
    lastCheckOutput?: string;
    error?: string;
  };
  wireguard: {
    active?: boolean;
    status: 'CONNECTED' | 'DEGRADED' | 'INACTIVE' | 'NO_HANDSHAKE' | 'STALE_HANDSHAKE' | 'UNVERIFIED' | 'UNKNOWN';
    detail: string;
    awsWgIp: string | null;
    azureWgIp: string | null;
    configuredAwsWgIp?: string;
    configuredAzureWgIp?: string;
    port: number | null;
    hostInterfaceDetected: boolean;
    handshakeVerified?: boolean;
    handshakeRecent?: boolean;
    handshakeAgeSeconds?: number | null;
    latestHandshakeAt?: string | null;
    rxBytes?: number | null;
    txBytes?: number | null;
    peerEndpoint?: string | null;
  };
  telemetry: {
    available: boolean;
    persistence: string;
    storageNote: string;
    totalRequests: number | null;
    successfulRequests: number | null;
    failedRequests: number | null;
    lastRequest: CrossCloudTransactionRecord | null;
    recentHistory: CrossCloudTransactionRecord[];
    error?: string;
  };
  architecture: {
    aws: { provider: string; region: string; address?: string; wgIp: string | null; userPort: number; consulPort: number };
    azure: { provider: string; region: string; address?: string; wgIp: string | null; paymentPort: number };
  };
}
