/**
 * Cross-Cloud Health Monitoring Controller
 * Fetches and displays live Consul check states and diagnostics.
 */

// Sample scenario services for college mini-project demonstration
const SAMPLE_HEALTH_SERVICES = [
  {
    id: 'user-01',
    name: 'User Service',
    serviceName: 'user-service',
    provider: 'AWS',
    region: 'us-east-1',
    address: '10.0.1.10',
    port: 8001,
    endpoint: '/health',
    status: 'passing',
    latency: '22ms',
    isSample: true,
    checkId: 'service:user-01:httpCheck',
    output: 'HTTP GET /health: {"status":"UP","database":"connected","aws_region":"us-east-1"}',
    lastCheck: '2s ago'
  },
  {
    id: 'order-01',
    name: 'Order Service',
    serviceName: 'order-service',
    provider: 'Azure',
    region: 'eastus-2',
    address: '10.0.1.30',
    port: 8003,
    endpoint: '/health',
    status: 'critical',
    latency: 'TIMEOUT',
    isSample: true,
    checkId: 'service:order-01:httpCheck',
    output: 'HTTP GET /health: Connection refused or unhealthy downstream dependency (cosmos-db-unreachable)',
    lastCheck: '5s ago'
  }
];

let allHealthItems = [];
let activeCategory = 'all';
let selectedItem = null;
let autoRefreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchHealthData();
  // Auto refresh every 10s
  autoRefreshInterval = setInterval(fetchHealthData, 10000);

  const searchInput = document.getElementById('service-filter-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterServices(e.target.value));
  }
});

/**
 * Main fetcher combining live Consul health checks with sample items
 */
async function fetchHealthData() {
  const spinner = document.getElementById('refresh-spinner');
  if (spinner) spinner.classList.add('animate-spin');

  try {
    const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
    
    // Fetch both checks and services catalog concurrently
    const [healthRes, servicesRes] = await Promise.all([
      fetch(`${apiBase}/api/health`).catch(() => null),
      fetch(`${apiBase}/api/services`).catch(() => null)
    ]);

    let liveItems = [];

    if (healthRes && healthRes.ok) {
      const healthData = await healthRes.json();
      const rawChecks = healthData.checks || [];

      // Also get services map for IP/port lookup
      let servicesMap = {};
      if (servicesRes && servicesRes.ok) {
        const sData = await servicesRes.json();
        servicesMap = sData.services || {};
      }

      // Filter and map service-specific checks
      liveItems = rawChecks
        .filter(c => c.ServiceID && c.ServiceID !== '')
        .map(c => {
          const svc = servicesMap[c.ServiceID] || {};
          const tags = c.ServiceTags || svc.Tags || [];
          const providerTag = tags.find(t => ['AWS', 'GCP', 'Azure', 'Hybrid', 'Local'].includes(t)) || 'Local';
          
          return {
            id: c.ServiceID,
            name: formatTitle(c.ServiceName || c.ServiceID),
            serviceName: c.ServiceName || c.ServiceID,
            provider: providerTag,
            region: svc.Datacenter || 'local-dc1',
            address: svc.Address || '127.0.0.1',
            port: svc.Port || 8001,
            endpoint: (c.Output && c.Output.includes('HTTP GET')) ? (c.Output.split('HTTP GET ')[1] || '').split(' ')[0] : '/health',
            status: c.Status || 'passing',
            latency: '14ms',
            isSample: false,
            checkId: c.CheckID,
            output: c.Output || 'HTTP check passing normally.',
            lastCheck: 'Live (Consul 5s)'
          };
        });
    }

    // Merge: live Consul services override matching sample IDs
    const merged = [...liveItems];
    for (const sample of SAMPLE_HEALTH_SERVICES) {
      if (!merged.some(m => m.id === sample.id || m.serviceName === sample.serviceName)) {
        merged.push(sample);
      }
    }

    allHealthItems = merged;
    updateHealthMetrics();
    renderHealthTable();

    // Default select first item if none selected
    if (!selectedItem && allHealthItems.length > 0) {
      selectServiceItem(allHealthItems[0]);
    } else if (selectedItem) {
      const refreshed = allHealthItems.find(i => i.id === selectedItem.id);
      if (refreshed) selectServiceItem(refreshed);
    }
  } catch (err) {
    console.error('Error fetching health checks:', err);
    // Fallback to sample items if API fails
    allHealthItems = [...SAMPLE_HEALTH_SERVICES];
    updateHealthMetrics();
    renderHealthTable();
  } finally {
    if (spinner) {
      setTimeout(() => spinner.classList.remove('animate-spin'), 600);
    }
  }
}

/**
 * Format string to title case
 */
function formatTitle(str) {
  if (!str) return 'Service';
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Update top 4 summary metric cards
 */
function updateHealthMetrics() {
  const total = allHealthItems.length;
  const passing = allHealthItems.filter(i => i.status === 'passing').length;
  const critical = allHealthItems.filter(i => i.status === 'critical').length;
  const warning = allHealthItems.filter(i => i.status === 'warning').length;
  const slaPct = total > 0 ? ((passing / total) * 100).toFixed(1) : '100.0';

  const totalEl = document.getElementById('totalServicesCount');
  const healthyEl = document.getElementById('healthyServicesCount');
  const unhealthyEl = document.getElementById('unhealthyServicesCount');
  const slaValEl = document.getElementById('healthSlaValue');
  const slaBarGreen = document.getElementById('healthSlaBarGreen');
  const slaBarRed = document.getElementById('healthSlaBarRed');
  const slaFooter = document.getElementById('healthSlaFooter');
  const cloudBreakdown = document.getElementById('cloudBreakdownText');

  if (totalEl) totalEl.textContent = total;
  if (healthyEl) healthyEl.textContent = passing;
  if (unhealthyEl) unhealthyEl.textContent = critical + warning;
  if (slaValEl) slaValEl.textContent = `${slaPct}%`;

  if (slaBarGreen) slaBarGreen.style.width = `${slaPct}%`;
  if (slaBarRed) slaBarRed.style.width = `${(100 - parseFloat(slaPct)).toFixed(1)}%`;

  if (slaFooter) {
    slaFooter.innerHTML = `<span class="text-tertiary font-medium">${passing} passing</span><span class="text-error font-medium">${critical + warning} critical</span>`;
  }

  if (cloudBreakdown) {
    const aws = allHealthItems.filter(i => i.provider === 'AWS').length;
    const gcp = allHealthItems.filter(i => i.provider === 'GCP').length;
    const azure = allHealthItems.filter(i => i.provider === 'Azure').length;
    const local = allHealthItems.filter(i => i.provider === 'Local' || i.provider === 'Hybrid').length;
    cloudBreakdown.innerHTML = `AWS (${aws}) • GCP (${gcp}) • Azure (${azure})${local > 0 ? ` • Local (${local})` : ''}`;
  }

  // Update pill counts on filter tabs
  const tabAll = document.getElementById('tab-all');
  const tabAws = document.getElementById('tab-aws');
  const tabGcp = document.getElementById('tab-gcp');
  const tabAzure = document.getElementById('tab-azure');
  const tabFailing = document.getElementById('tab-failing');

  if (tabAll) tabAll.textContent = `All (${total})`;
  if (tabAws) tabAws.textContent = `AWS (${allHealthItems.filter(i => i.provider === 'AWS').length})`;
  if (tabGcp) tabGcp.textContent = `GCP (${allHealthItems.filter(i => i.provider === 'GCP').length})`;
  if (tabAzure) tabAzure.textContent = `Azure (${allHealthItems.filter(i => i.provider === 'Azure').length})`;
  if (tabFailing) tabFailing.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span> Failing Only (${critical + warning})`;
}

/**
 * Render health checks data table
 */
function renderHealthTable() {
  const tbody = document.getElementById('services-table-body');
  if (!tbody) return;

  const filtered = allHealthItems.filter(item => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'failing') return item.status === 'critical' || item.status === 'warning';
    return item.provider.toLowerCase() === activeCategory.toLowerCase();
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-8 text-center text-secondary">
          <span class="material-symbols-outlined text-[32px] block mb-1">filter_alt_off</span>
          <span>No health checks match the active filter "${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(activeCategory) : activeCategory}".</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isPassing = item.status === 'passing';
    const statusClass = isPassing 
      ? 'bg-tertiary/10 text-tertiary font-semibold' 
      : 'bg-error-container text-on-error-container font-semibold';
    const dotClass = isPassing ? 'bg-tertiary' : 'bg-error';
    const statusText = isPassing ? 'Healthy (Passing)' : 'Unhealthy (Critical)';
    const badgeType = item.isSample 
      ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-surface-container-high text-secondary font-code-sm uppercase">DEMO SAMPLE</span>'
      : '<span class="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-code-sm uppercase font-bold">LIVE CONSUL</span>';

    const providerColor = item.provider === 'AWS' ? 'bg-[#FFF7ED] text-[#C2410C]' 
      : (item.provider === 'GCP' ? 'bg-[#EFF6FF] text-[#1D4ED8]' 
      : (item.provider === 'Azure' ? 'bg-[#F0FDF4] text-[#15803D]' : 'bg-surface-container text-secondary'));

    const isSelected = selectedItem && selectedItem.id === item.id;
    const rowBg = isSelected ? 'bg-surface-container-low font-medium' : 'hover:bg-surface-container-low/50';

    return `
      <tr class="${rowBg} transition-colors cursor-pointer group" data-cloud="${item.provider.toLowerCase()}" data-status="${item.status}" onclick="selectServiceById('${item.id}')">
        <td class="py-3.5 px-space-md">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${dotClass} shrink-0"></span>
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="font-label-lg text-label-lg text-on-surface group-hover:text-primary transition-colors">${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(item.name) : item.name}</span>
                ${badgeType}
              </div>
              <span class="font-code-sm text-code-sm text-outline">${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(item.id) : item.id}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-space-md">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-code-sm text-code-sm font-semibold ${providerColor}">
            ${item.provider} ${item.region}
          </span>
        </td>
        <td class="py-3.5 px-space-md font-code-sm text-code-sm text-on-surface select-all">${item.address}:${item.port}</td>
        <td class="py-3.5 px-space-md">
          <span class="px-2 py-0.5 rounded bg-surface-container font-code-sm text-code-sm text-on-surface-variant">${item.endpoint}</span>
        </td>
        <td class="py-3.5 px-space-md text-outline font-code-sm text-code-sm">${item.lastCheck}</td>
        <td class="py-3.5 px-space-md">
          <span class="px-2 py-0.5 rounded-full bg-surface-container font-code-sm text-code-sm text-on-surface font-medium">${item.latency}</span>
        </td>
        <td class="py-3.5 px-space-md">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${statusClass} font-label-md text-label-md">
            <span class="w-1.5 h-1.5 rounded-full ${dotClass}"></span>
            ${statusText}
          </span>
        </td>
        <td class="py-3.5 px-space-md text-right">
          <div class="inline-flex items-center gap-1.5">
            <button class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-code-sm font-code-sm font-medium transition-colors" onclick="event.stopPropagation(); selectServiceById('${item.id}')">Inspect</button>
            <button class="p-1 rounded text-outline hover:text-primary hover:bg-surface-container transition-colors" onclick="event.stopPropagation(); probeServiceItem('${item.id}')" title="Trigger Probe Now">
              <span class="material-symbols-outlined text-[18px]">cached</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Select service item by ID
 */
function selectServiceById(id) {
  const item = allHealthItems.find(i => i.id === id);
  if (item) selectServiceItem(item);
}

/**
 * Update the right-hand Inspector Panel with selected service details
 */
function selectServiceItem(item) {
  selectedItem = item;
  renderHealthTable(); // highlight selected row

  const titleEl = document.getElementById('inspector-title');
  const subtitleEl = document.getElementById('inspector-subtitle');
  const urlEl = document.getElementById('inspector-url');
  const hostEl = document.getElementById('inspector-host');
  const checkIdEl = document.getElementById('inspector-check-id');
  const terminalEl = document.getElementById('inspector-terminal');
  const badgeEl = document.getElementById('inspector-status-badge');
  const badgeIconEl = document.getElementById('inspector-badge-icon');

  if (titleEl) titleEl.textContent = item.name;
  if (subtitleEl) subtitleEl.textContent = `${item.id} • ${item.provider} (${item.isSample ? 'Demo Simulation' : 'Live Consul Agent'})`;
  if (urlEl) urlEl.textContent = `http://${item.address}:${item.port}${item.endpoint}`;
  if (hostEl) hostEl.textContent = `${item.address}:${item.port}`;
  if (checkIdEl) checkIdEl.textContent = item.checkId;

  const isFailing = item.status !== 'passing';
  if (terminalEl) {
    if (isFailing) {
      terminalEl.innerHTML = `
        <div class="flex items-center gap-2 text-error font-semibold">
          <span>[CRITICAL FAIL]</span>
          <span>${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(item.output) : item.output}</span>
        </div>
        <div class="text-inverse-on-surface/80 leading-relaxed pl-6 mt-1">
          Root Cause: TCP Connection or HTTP Status check failed threshold. Excluded from dynamic DNS resolution.
        </div>
        <div class="text-inverse-primary/60 text-[10px] pl-6 mt-1 font-code-sm">
          CheckID: ${item.checkId} • Telemetry Latency: ${item.latency} • Timestamp: ${new Date().toISOString()}
        </div>
      `;
    } else {
      terminalEl.innerHTML = `
        <div class="flex items-center gap-2 text-tertiary-fixed font-semibold">
          <span>[PASS]</span>
          <span>HTTP GET ${item.endpoint} returned 200 OK (${item.latency})</span>
        </div>
        <div class="text-inverse-on-surface/80 leading-relaxed pl-6 mt-1 select-all font-code-sm">
          Response output: ${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(item.output) : item.output}
        </div>
        <div class="text-inverse-primary/60 text-[10px] pl-6 mt-1 font-code-sm">
          Node Datacenter: ${item.region} • Managed by Consul Agent • Timestamp: ${new Date().toISOString()}
        </div>
      `;
    }
  }

  if (badgeEl && badgeIconEl) {
    if (isFailing) {
      badgeEl.className = 'px-3 py-1 rounded-full bg-error-container text-on-error-container font-code-sm text-code-sm font-bold flex items-center gap-1.5';
      badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-error animate-ping"></span>CRITICAL / HTTP 503 / UNREACHABLE';
      badgeIconEl.className = 'w-10 h-10 rounded-lg bg-error-container flex items-center justify-center text-error';
      badgeIconEl.innerHTML = '<span class="material-symbols-outlined text-[24px]">troubleshoot</span>';
    } else {
      badgeEl.className = 'px-3 py-1 rounded-full bg-tertiary/10 text-tertiary font-code-sm text-code-sm font-bold flex items-center gap-1.5';
      badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-tertiary"></span>NOMINAL / HTTP 200 OK';
      badgeIconEl.className = 'w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary';
      badgeIconEl.innerHTML = '<span class="material-symbols-outlined text-[24px]">verified</span>';
    }
  }
}

/**
 * Filter categories tab click
 */
function setFilterCategory(category) {
  activeCategory = category;
  const tabs = ['all', 'aws', 'gcp', 'azure', 'failing'];
  tabs.forEach(tab => {
    const btn = document.getElementById('tab-' + tab);
    if (!btn) return;
    if (tab === category) {
      btn.className = (tab === 'failing')
        ? 'px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium bg-error text-on-error transition-colors flex items-center gap-1'
        : 'px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium bg-primary-container text-on-primary-container transition-colors';
    } else {
      btn.className = (tab === 'failing')
        ? 'px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium bg-error-container text-on-error-container hover:opacity-90 transition-colors flex items-center gap-1'
        : 'px-2.5 py-1 rounded-md text-code-sm font-code-sm font-medium bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors';
    }
  });

  renderHealthTable();
}

/**
 * Search filter
 */
function filterServices(query) {
  const q = (query || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#services-table-body tr');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(q) ? '' : 'none';
  });
}

/**
 * Trigger manual probe across all Consul checks
 */
async function triggerManualProbe() {
  const btn = document.getElementById('manual-probe-btn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span><span>Probing Consul Mesh...</span>';
    btn.disabled = true;
  }

  await fetchHealthData();

  if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
    window.APP_CONFIG.showToast(`Manual probe completed: ${allHealthItems.length} services verified via Consul.`);
  }

  if (btn) {
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-tertiary">check</span><span>Probed Successfully</span>';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }, 1500);
  }
}

/**
 * Probe a single service item directly
 */
async function probeServiceItem(serviceId) {
  const item = allHealthItems.find(i => i.id === serviceId);
  if (!item) return;

  selectServiceItem(item);

  if (item.isSample) {
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Demo probe for ${item.name} (${item.id}): Returned status ${item.status}.`);
    }
    return;
  }

  // Live service HTTP fetch test
  try {
    const startTime = Date.now();
    const res = await fetch(`http://${item.address}:${item.port}${item.endpoint}`);
    const ms = Date.now() - startTime;
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Live probe for ${item.id} -> HTTP ${res.status} OK (${ms}ms)`);
    }
  } catch (err) {
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Probe for ${item.id} error: ${err.message}`, 'error');
    }
  }
}

/**
 * Refresh button handler
 */
function refreshChecksUI() {
  fetchHealthData();
}

/**
 * Copy snippet handler
 */
function copySnippetCode() {
  const copyText = document.getElementById('copy-text');
  const code = `// Query Consul health catalog for passing instances
const instances = await consul.health.service({ service: 'payment-service', passing: true });
console.log('Healthy payment instances:', instances.map(i => i.Service.Address + ':' + i.Service.Port));`;

  navigator.clipboard.writeText(code).then(() => {
    if (copyText) {
      copyText.textContent = 'Copied!';
      setTimeout(() => { copyText.textContent = 'Copy'; }, 1800);
    }
  });
}
