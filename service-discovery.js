/**
 * Cross-Cloud Service Discovery Controller
 * Interacts with Express API (http://localhost:3000) and Consul catalog.
 */

let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const queryInput = document.getElementById('serviceQueryInput');
  const cloudSelect = document.getElementById('cloudPreferenceSelect');
  const discoverBtn = document.getElementById('discoverBtn');

  if (discoverBtn) {
    discoverBtn.addEventListener('click', () => {
      const query = queryInput ? queryInput.value.trim() : 'payment-service';
      const cloud = cloudSelect ? cloudSelect.value : 'any';
      performDiscovery(query, cloud);
    });
  }

  if (queryInput) {
    queryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = queryInput.value.trim();
        const cloud = cloudSelect ? cloudSelect.value : 'any';
        performDiscovery(query, cloud);
      }
    });
  }

  // Initial load
  const initialQuery = queryInput && queryInput.value.trim() ? queryInput.value.trim() : 'Payment Service';
  const initialCloud = cloudSelect ? cloudSelect.value : 'any';
  performDiscovery(initialQuery, initialCloud);
  fetchLiveHealthTelemetry();

  // Auto-refresh live health every 5s
  autoRefreshTimer = setInterval(fetchLiveHealthTelemetry, 5000);
});

/**
 * Normalizes input name for Consul service lookup
 */
function normalizeServiceName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Quick resolver selection
 */
function selectService(name, provider) {
  const input = document.getElementById('serviceQueryInput');
  const select = document.getElementById('cloudPreferenceSelect');
  if (input) input.value = name;
  if (select) select.value = provider;
  performDiscovery(name, provider);
}

/**
 * Main discovery caller
 */
async function performDiscovery(rawName, cloudPref = 'any') {
  const normalized = normalizeServiceName(rawName);
  const resultCard = document.getElementById('paymentResultCard');
  const discoverBtn = document.getElementById('discoverBtn');

  if (!normalized) {
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast('Please enter a service name to discover', 'error');
    }
    return;
  }

  if (discoverBtn) {
    discoverBtn.classList.add('opacity-80');
    discoverBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span><span>Resolving...</span>';
  }

  try {
    const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
    const res = await fetch(`${apiBase}/api/services/${encodeURIComponent(normalized)}`);
    const data = await res.json();

    if (discoverBtn) {
      discoverBtn.classList.remove('opacity-80');
      discoverBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">travel_explore</span><span>Discover Service</span>';
    }

    if (!res.ok) {
      renderDiscoveryError(data.message || `Discovery failed with HTTP ${res.status}`);
      return;
    }

    let instances = data.instances || [];

    // Filter by cloud provider if requested
    if (cloudPref && cloudPref !== 'any') {
      const targetCloud = cloudPref.toUpperCase();
      instances = instances.filter(i => (i.provider || '').toUpperCase().includes(targetCloud) || (i.tags || []).some(t => t.toUpperCase().includes(targetCloud)));
    }

    if (instances.length === 0) {
      // Check if it exists across all clouds or completely missing
      const totalAllClouds = (data.instances || []).length;
      renderEmptyState(rawName, normalized, cloudPref, totalAllClouds);
    } else {
      renderDiscoveredInstances(rawName, normalized, instances);
    }
  } catch (err) {
    if (discoverBtn) {
      discoverBtn.classList.remove('opacity-80');
      discoverBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">travel_explore</span><span>Discover Service</span>';
    }
    renderDiscoveryError(`Cannot reach Express API or Consul daemon: ${err.message}`);
  }
}

/**
 * Render successfully discovered instances in resultCard
 */
function renderDiscoveredInstances(rawName, normalized, instances) {
  const container = document.getElementById('paymentResultCard');
  if (!container) return;

  const primary = instances[0];
  const isHealthy = primary.status === 'passing';
  const statusColor = isHealthy ? 'tertiary' : (primary.status === 'warning' ? 'secondary' : 'error');
  const statusBadge = isHealthy 
    ? `DISCOVERED (${instances.length} Healthy ${instances.length === 1 ? 'Instance' : 'Instances'})` 
    : `DISCOVERED (${primary.status.toUpperCase()})`;

  const tags = (primary.tags || []).join(', ') || 'production, http';
  const checkSummary = (primary.checks && primary.checks.length > 0)
    ? primary.checks.map(c => `${c.name}: ${c.status} (${c.output || 'OK'})`).join(' | ')
    : 'Agent health check active';

  const srvRecord = `_${normalized}._tcp.service.consul. 300 IN SRV 1 1 ${primary.port} ${primary.node}.node.consul`;

  container.className = 'flex flex-col gap-space-md bg-surface-container-low rounded-xl p-space-md shadow-sm transition-all';
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-high/40 pb-3">
      <div class="flex items-center gap-space-sm">
        <div class="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
          <span class="material-symbols-outlined text-[22px]">hub</span>
        </div>
        <div>
          <div class="flex items-center gap-space-xs">
            <span class="font-headline-md text-headline-md text-on-surface">Discovery Result:</span>
            <span class="font-code-md text-code-md text-primary font-bold">${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(normalized) : normalized}.service.consul</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-surface-container text-secondary font-code-sm">Catalog Verified</span>
          </div>
          <span class="font-code-sm text-code-sm text-secondary">Node: ${primary.node || 'consul-core-01'} • Datacenter: ${primary.datacenter || 'dc1'}</span>
        </div>
      </div>
      <div class="flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-${statusColor}-fixed text-on-${statusColor}-fixed font-code-sm text-code-sm shadow-sm">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-${statusColor} opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-${statusColor}"></span>
        </span>
        <span class="font-semibold uppercase tracking-wide">${statusBadge}</span>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm">
      <div class="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
        <span class="font-code-sm text-code-sm text-secondary uppercase font-semibold">Resolved IP & Port</span>
        <div class="flex items-center justify-between mt-1">
          <span class="font-code-md text-code-md text-on-surface font-bold select-all">${primary.address}:${primary.port}</span>
          <button class="text-secondary hover:text-primary p-1 rounded hover:bg-surface-container transition-colors" onclick="navigator.clipboard.writeText('${primary.address}:${primary.port}'); if(window.APP_CONFIG) window.APP_CONFIG.showToast('Copied ${primary.address}:${primary.port}');" title="Copy Address">
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
          </button>
        </div>
        <span class="font-code-sm text-code-sm text-secondary mt-1">TCP / HTTP 1.1</span>
      </div>

      <div class="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
        <span class="font-code-sm text-code-sm text-secondary uppercase font-semibold">Cloud Provider</span>
        <div class="flex items-center gap-space-xs mt-1">
          <span class="w-2 h-2 rounded-full bg-tertiary"></span>
          <span class="font-code-sm text-code-sm uppercase font-bold text-on-surface">${primary.provider || 'Local'}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-surface-container text-secondary font-code-sm">Simulated</span>
        </div>
        <span class="font-code-sm text-code-sm text-secondary truncate mt-1">Tags: ${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(tags) : tags}</span>
      </div>

      <div class="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
        <span class="font-code-sm text-code-sm text-secondary uppercase font-semibold">Consul Agent Node</span>
        <span class="font-code-md text-code-md text-on-surface font-medium mt-1 truncate">${primary.node || 'local-consul-agent'}</span>
        <span class="font-code-sm text-code-sm text-secondary mt-1">ID: ${primary.id}</span>
      </div>

      <div class="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between shadow-sm">
        <span class="font-code-sm text-code-sm text-secondary uppercase font-semibold">Consul Health Check</span>
        <div class="flex items-center gap-space-xs mt-1">
          <span class="w-2 h-2 rounded-full bg-${statusColor}"></span>
          <span class="font-label-md text-label-md text-${statusColor} font-bold capitalize">${primary.status}</span>
        </div>
        <span class="font-code-sm text-code-sm text-secondary mt-1">Auto-monitored by Consul</span>
      </div>
    </div>

    <!-- DNS SRV Record Box -->
    <div class="bg-surface-container-lowest rounded-lg p-space-sm flex flex-col gap-space-xs shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-space-xs">
          <span class="material-symbols-outlined text-[16px] text-primary">lan</span>
          <span class="font-code-sm text-code-sm text-secondary uppercase font-semibold">Consul Dynamic DNS SRV Record</span>
        </div>
        <span class="font-code-sm text-code-sm text-secondary">TTL 300s (RFC-2782)</span>
      </div>
      <div class="bg-surface-container-high/30 p-space-xs rounded font-code-sm text-code-sm text-on-surface select-all overflow-x-auto">
        ${srvRecord}
      </div>
    </div>

    <!-- Active Probe Action Bar -->
    <div class="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-lg">
      <div class="flex items-center gap-2 text-body-sm text-secondary">
        <span class="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
        <span>Diagnostic: ${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(checkSummary) : checkSummary}</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-highest transition-colors font-label-md text-label-md" onclick="probeDirectEndpoint('${primary.address}', ${primary.port})">
          <span class="material-symbols-outlined text-[16px]">sensors</span>
          <span id="probeDirectText">Direct HTTP Probe</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Directly probe instance HTTP health endpoint
 */
async function probeDirectEndpoint(address, port) {
  const probeText = document.getElementById('probeDirectText');
  if (probeText) probeText.innerText = 'Probing HTTP...';

  const startTime = Date.now();
  try {
    const target = `http://${address}:${port}/health`;
    const res = await fetch(target, { mode: 'cors' });
    const latency = Date.now() - startTime;
    const body = await res.json().catch(() => ({}));
    if (probeText) probeText.innerText = `Probe OK (${latency}ms)`;
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`HTTP GET ${target} -> 200 OK (${latency}ms) [${body.status || 'healthy'}]`);
    }
  } catch (err) {
    if (probeText) probeText.innerText = 'Probe Completed';
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Probed ${address}:${port}: ${err.message}`, 'error');
    }
  }

  setTimeout(() => {
    if (probeText) probeText.innerText = 'Direct HTTP Probe';
  }, 2500);
}

/**
 * Render empty state when service is not registered in Consul
 */
function renderEmptyState(rawName, normalized, cloudPref, totalAllClouds) {
  const container = document.getElementById('paymentResultCard');
  if (!container) return;

  const cloudNotice = (cloudPref !== 'any' && totalAllClouds > 0)
    ? `<p class="font-body-md text-body-md text-secondary">Note: Found <strong>${totalAllClouds}</strong> instances in other clouds, but none matching filter <strong>${cloudPref.toUpperCase()}</strong>.</p>`
    : `<p class="font-body-md text-body-md text-secondary">No service matching <strong>"${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(rawName) : rawName}"</strong> (${normalized}) is currently registered in the Consul catalog.</p>`;

  container.className = 'flex flex-col gap-space-md bg-surface-container-low rounded-xl p-space-md shadow-sm border border-outline-variant/30';
  container.innerHTML = `
    <div class="flex items-start gap-space-md">
      <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
        <span class="material-symbols-outlined text-[24px]">search_off</span>
      </div>
      <div class="flex flex-col gap-1">
        <h3 class="font-headline-md text-headline-md text-on-surface">No Service Instances Discovered</h3>
        ${cloudNotice}
        <div class="flex flex-wrap items-center gap-space-sm mt-space-sm">
          <a href="service-registry.html" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-label-md text-label-md transition-colors shadow-sm">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Register "${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(normalized) : normalized}"</span>
          </a>
          <button class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors" onclick="selectService('Payment Service', 'any')">
            <span>Discover "Payment Service" (Live)</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render error state (e.g. backend down or consul offline)
 */
function renderDiscoveryError(msg) {
  const container = document.getElementById('paymentResultCard');
  if (!container) return;

  container.className = 'flex flex-col gap-space-sm bg-error-container/20 border border-error/20 rounded-xl p-space-md shadow-sm';
  container.innerHTML = `
    <div class="flex items-start gap-space-sm">
      <span class="material-symbols-outlined text-error text-[24px]">error</span>
      <div class="flex flex-col gap-1">
        <h3 class="font-headline-md text-headline-md text-error">Consul Discovery Error</h3>
        <p class="font-body-md text-body-md text-on-surface">${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(msg) : msg}</p>
        <div class="flex items-center gap-2 mt-2">
          <button class="px-3 py-1 rounded bg-surface-container text-on-surface text-label-md font-medium" onclick="performDiscovery('Payment Service', 'any')">
            Retry Discovery
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Live health telemetry for lower section
 */
async function fetchLiveHealthTelemetry() {
  try {
    const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
    const res = await fetch(`${apiBase}/api/health`);
    if (!res.ok) return;
    const data = await res.json();
    const summary = data.summary || { passing: 0, warning: 0, critical: 0 };

    const passingEl = document.getElementById('passingChecksCount');
    const warningEl = document.getElementById('warningChecksCount');
    const criticalEl = document.getElementById('criticalChecksCount');
    const totalChecks = (summary.passing + summary.warning + summary.critical) || 1;
    const passingPct = Math.round((summary.passing / totalChecks) * 100);

    if (passingEl) passingEl.textContent = summary.passing;
    if (warningEl) warningEl.textContent = summary.warning;
    if (criticalEl) criticalEl.textContent = summary.critical;

    const passingPctEl = document.getElementById('passingChecksPct');
    if (passingPctEl) passingPctEl.textContent = `${passingPct}% Operational`;
  } catch (e) {
    // Silent fail on telemetry background poll
  }
}

/**
 * Toggle order service simulated accordion
 */
function toggleOrderServiceAccordion() {
  const detail = document.getElementById('orderServiceDetail');
  const icon = document.getElementById('accordionIcon');
  if (detail && icon) {
    if (detail.classList.contains('hidden')) {
      detail.classList.remove('hidden');
      icon.innerText = 'expand_more';
    } else {
      detail.classList.add('hidden');
      icon.innerText = 'expand_less';
    }
  }
}

/**
 * Copy discovery snippet
 */
function copySnippet() {
  const copySnippetText = document.getElementById('copySnippetText');
  const code = `// Discover healthy payment-service instances via Consul
const instances = await consul.health.service({ service: 'payment-service', passing: true });
if (!instances.length) throw new Error('No healthy payment nodes resolved');
const targetUrl = \`http://\${instances[0].Service.Address}:\${instances[0].Service.Port}/pay\`;`;

  navigator.clipboard.writeText(code).then(() => {
    if (copySnippetText) {
      copySnippetText.innerText = 'Copied!';
      setTimeout(() => {
        copySnippetText.innerText = 'Copy Snippet';
      }, 2000);
    }
  });
}
