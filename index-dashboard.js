/**
 * Cross-Cloud Overview / Homepage Dashboard Controller
 * Synchronizes with Express API (http://localhost:3000) and Consul catalog.
 */

// Sample demonstration services for college mini-project
const DEMO_OVERVIEW_SERVICES = [
  {
    id: 'user-01',
    name: 'User Service',
    provider: 'AWS',
    address: '10.0.1.10',
    port: 8001,
    status: 'passing',
    isSample: true
  },
  {
    id: 'order-01',
    name: 'Order Service',
    provider: 'Azure',
    address: '10.0.1.30',
    port: 8003,
    status: 'critical',
    isSample: true
  }
];

let overviewServices = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initModals();
  initSyncMesh();
  initFilterTabs();
  fetchOverviewData();

  // Polling every 8 seconds
  setInterval(fetchOverviewData, 8000);
});

/**
 * Initialize modal open/close handlers
 */
function initModals() {
  const regModal = document.getElementById('register-modal');
  const openRegBtn = document.getElementById('btn-register-open');
  const closeRegBtn = document.getElementById('btn-register-close');
  const cancelRegBtn = document.getElementById('btn-register-cancel');
  const form = document.getElementById('service-reg-form');

  function toggleModal(open) {
    if (!regModal) return;
    if (open) {
      regModal.classList.remove('hidden');
    } else {
      regModal.classList.add('hidden');
    }
  }

  if (openRegBtn) openRegBtn.addEventListener('click', () => toggleModal(true));
  if (closeRegBtn) closeRegBtn.addEventListener('click', () => toggleModal(false));
  if (cancelRegBtn) cancelRegBtn.addEventListener('click', () => toggleModal(false));

  if (form) {
    form.addEventListener('submit', handleRegisterSubmit);
  }
}

/**
 * Initialize mesh sync button
 */
function initSyncMesh() {
  const syncBtn = document.getElementById('btn-sync-mesh');
  const syncIcon = document.getElementById('sync-icon');

  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      if (syncIcon) syncIcon.classList.add('rotate-180');
      try {
        const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/consul/status`);
        const data = await res.json();
        if (res.ok && data.connected) {
          if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
            window.APP_CONFIG.showToast(`Consul Mesh Connected • Leader: ${data.leader} (DC: dc1)`);
          }
        } else {
          if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
            window.APP_CONFIG.showToast('Consul daemon is offline. Start: consul agent -dev', 'error');
          }
        }
      } catch (err) {
        if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
          window.APP_CONFIG.showToast(`Mesh sync error: ${err.message}`, 'error');
        }
      }
      await fetchOverviewData();
      if (syncIcon) {
        setTimeout(() => syncIcon.classList.remove('rotate-180'), 700);
      }
    });
  }
}

/**
 * Initialize tab filtering
 */
function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        t.classList.add('text-secondary');
      });
      tab.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
      tab.classList.remove('text-secondary');

      activeFilter = tab.getAttribute('data-filter') || 'all';
      renderOverviewTable();
    });
  });
}

/**
 * Fetch live data from backend & Consul
 */
async function fetchOverviewData() {
  try {
    const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
    const [servicesRes, healthRes] = await Promise.all([
      fetch(`${apiBase}/api/services`).catch(() => null),
      fetch(`${apiBase}/api/health`).catch(() => null)
    ]);

    let liveList = [];
    let checksMap = {};

    if (healthRes && healthRes.ok) {
      const hData = await healthRes.json();
      (hData.checks || []).forEach(c => {
        if (c.ServiceID) checksMap[c.ServiceID] = c.Status;
      });
    }

    if (servicesRes && servicesRes.ok) {
      const sData = await servicesRes.json();
      const rawServices = sData.services || {};
      liveList = Object.keys(rawServices).map(key => {
        const s = rawServices[key];
        const tags = s.Tags || [];
        const provider = tags.find(t => ['AWS', 'GCP', 'Azure', 'Hybrid', 'Local'].includes(t)) || 'Local';
        const healthStatus = checksMap[s.ID] || 'passing';

        return {
          id: s.ID,
          name: formatTitle(s.Service),
          serviceName: s.Service,
          provider: provider,
          address: s.Address || '127.0.0.1',
          port: s.Port,
          status: healthStatus,
          isSample: false
        };
      });
    }

    // Merge: live Consul services override matching sample IDs
    const merged = [...liveList];
    for (const sample of DEMO_OVERVIEW_SERVICES) {
      if (!merged.some(m => m.id === sample.id || m.name.toLowerCase() === sample.name.toLowerCase())) {
        merged.push(sample);
      }
    }

    overviewServices = merged;
    updateOverviewStats();
    renderOverviewTable();
  } catch (err) {
    console.error('Error fetching overview data:', err);
    overviewServices = [...DEMO_OVERVIEW_SERVICES];
    updateOverviewStats();
    renderOverviewTable();
  }
}

/**
 * Format title string
 */
function formatTitle(str) {
  if (!str) return 'Service';
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Update top metric cards and tab badges
 */
function updateOverviewStats() {
  const total = overviewServices.length;
  const passing = overviewServices.filter(s => s.status === 'passing').length;
  const critical = overviewServices.filter(s => s.status === 'critical' || s.status === 'warning').length;

  const totalEl = document.getElementById('overviewTotalServices');
  const healthyEl = document.getElementById('overviewHealthyServices');
  const unhealthyEl = document.getElementById('overviewUnhealthyServices');

  if (totalEl) totalEl.textContent = total;
  if (healthyEl) healthyEl.textContent = passing;
  if (unhealthyEl) unhealthyEl.textContent = critical;

  // Update tabs count
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    const filter = tab.getAttribute('data-filter');
    if (filter === 'all') tab.textContent = `All (${total})`;
    if (filter === 'aws') tab.textContent = `AWS (${overviewServices.filter(s => s.provider.toLowerCase() === 'aws').length})`;
    if (filter === 'gcp') tab.textContent = `GCP (${overviewServices.filter(s => s.provider.toLowerCase() === 'gcp').length})`;
    if (filter === 'azure') tab.textContent = `Azure (${overviewServices.filter(s => s.provider.toLowerCase() === 'azure').length})`;
  });
}

/**
 * Render registered services table
 */
function renderOverviewTable() {
  const tbody = document.getElementById('services-table-body');
  if (!tbody) return;

  const filtered = overviewServices.filter(s => {
    if (activeFilter === 'all') return true;
    return s.provider.toLowerCase() === activeFilter.toLowerCase();
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-6 text-center text-secondary">
          No services registered under category "${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(activeFilter) : activeFilter}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const isPassing = s.status === 'passing';
    const dotClass = isPassing ? 'bg-tertiary' : 'bg-error';
    const statusBadge = isPassing
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-code-sm text-code-sm font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Passing
        </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-code-sm text-code-sm font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-error"></span> Critical
        </span>`;

    const sampleBadge = s.isSample 
      ? '<span class="text-[9px] px-1 py-0.2 rounded bg-surface-container-high text-secondary font-code-sm uppercase">DEMO</span>'
      : '<span class="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-code-sm uppercase font-bold">CONSUL</span>';

    return `
      <tr class="service-row group hover:bg-surface-container-low/50 transition-colors" data-provider="${s.provider.toLowerCase()}">
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${dotClass} shrink-0"></span>
            <div class="flex items-center gap-1.5">
              <span class="font-label-lg text-label-lg font-semibold text-on-surface">${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(s.name) : s.name}</span>
              ${sampleBadge}
            </div>
          </div>
        </td>
        <td class="py-3 px-3 font-code-sm text-code-sm text-secondary select-all">${window.APP_CONFIG ? window.APP_CONFIG.escapeHtml(s.id) : s.id}</td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center gap-1.5 font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container font-medium text-on-surface">
            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span> ${s.provider}
          </span>
        </td>
        <td class="py-3 px-3 font-code-sm text-code-sm text-on-surface select-all">${s.address}</td>
        <td class="py-3 px-3 font-code-sm text-code-sm text-secondary">${s.port}</td>
        <td class="py-3 px-3">${statusBadge}</td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <button class="px-2 py-1 rounded bg-surface-container text-primary font-code-sm text-code-sm hover:bg-surface-container-high transition-colors" onclick="handleDnsQuery('${s.serviceName || s.id}.service.consul', '${s.address}:${s.port}')" title="Query DNS via Express">Query DNS</button>
            <button class="px-2 py-1 rounded bg-surface-container text-secondary font-code-sm text-code-sm hover:text-on-surface transition-colors" onclick="handleInspect('${s.id}')">Inspect</button>
            <button class="px-2 py-1 rounded bg-surface-container text-error font-code-sm text-code-sm hover:bg-error-container transition-colors" onclick="handleDeregister('${s.id}')">Deregister</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle new service registration via real backend API
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('form-name').value.trim();
  const id = document.getElementById('form-id').value.trim();
  const provider = document.getElementById('form-provider').value;
  const ip = document.getElementById('form-ip').value.trim();
  const port = document.getElementById('form-port').value.trim();
  const healthPathInput = document.getElementById('form-health');
  const healthPath = healthPathInput ? healthPathInput.value.trim() : '/health';

  const regModal = document.getElementById('register-modal');

  try {
    const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
    const payload = {
      name,
      id,
      provider: provider.toUpperCase(),
      address: ip,
      port: Number(port),
      healthCheckPath: healthPath || '/health',
      interval: '10s',
      timeout: '2s',
      tags: [provider.toUpperCase(), 'microservice', 'college-demo']
    };

    const res = await fetch(`${apiBase}/api/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
        window.APP_CONFIG.showToast(data.message || `Registration error: HTTP ${res.status}`, 'error');
      }
      return;
    }

    if (regModal) regModal.classList.add('hidden');
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Service "${name}" (${id}) registered with Consul successfully!`);
    }
    e.target.reset();
    await fetchOverviewData();
  } catch (err) {
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Registration failed: ${err.message}`, 'error');
    }
  }
}

/**
 * Handle deregister service from Consul
 */
async function handleDeregister(serviceId) {
  if (!confirm(`Are you sure you want to deregister "${serviceId}" from Consul?`)) return;

  try {
    const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
    const res = await fetch(`${apiBase}/api/services/${encodeURIComponent(serviceId)}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (!res.ok) {
      if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
        window.APP_CONFIG.showToast(data.message || `Deregistration failed`, 'error');
      }
      return;
    }

    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Service "${serviceId}" deregistered from Consul catalog successfully.`);
    }
    await fetchOverviewData();
  } catch (err) {
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast(`Deregistration failed: ${err.message}`, 'error');
    }
  }
}

/**
 * DNS Query simulation action
 */
function handleDnsQuery(fqdn, target) {
  if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
    window.APP_CONFIG.showToast(`Consul DNS: Resolved ${fqdn} -> ${target} (RFC-2782)`);
  }
}

/**
 * Inspect action
 */
function handleInspect(serviceId) {
  if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
    window.APP_CONFIG.showToast(`Viewing Consul catalog record for service ID: ${serviceId}`);
  }
}

/**
 * Copy snippet handler
 */
function copySnippet() {
  const text = document.getElementById('curl-snippet')?.innerText || 'curl -X GET http://localhost:3000/api/services';
  navigator.clipboard.writeText(text).then(() => {
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast('cURL command copied to clipboard!');
    }
  });
}
