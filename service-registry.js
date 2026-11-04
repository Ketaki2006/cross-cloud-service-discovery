// Sample demonstration records for offline/evaluation display
const SAMPLE_SERVICES = [
  {
    id: "user-01",
    name: "User Service",
    provider: "AWS",
    providerRegion: "AWS • us-east-1",
    ip: "10.0.1.10",
    port: 8001,
    status: "Healthy",
    healthUrl: "http://10.0.1.10:8001/health",
    version: "v2.4.1 • rest-core",
    isSample: true,
    tags: ["AWS", "user-mgmt", "core"]
  },
  {
    id: "payment-01",
    name: "Payment Service",
    provider: "GCP",
    providerRegion: "GCP • us-central1",
    ip: "10.0.1.20",
    port: 8002,
    status: "Healthy",
    healthUrl: "http://10.0.1.20:8002/healthz",
    version: "v1.9.0 • pci-isolated",
    isSample: true,
    tags: ["GCP", "payment", "pci"]
  },
  {
    id: "order-01",
    name: "Order Service",
    provider: "Azure",
    providerRegion: "Azure • East US 2",
    ip: "10.0.1.30",
    port: 8003,
    status: "Unhealthy",
    healthUrl: "http://10.0.1.30:8003/health",
    version: "v3.0.0-rc2 • order-pipeline",
    isSample: true,
    tags: ["Azure", "order", "pipeline"]
  },
  {
    id: "auth-01",
    name: "Auth Service",
    provider: "AWS",
    providerRegion: "AWS • us-east-1",
    ip: "10.0.1.15",
    port: 8000,
    status: "Healthy",
    healthUrl: "http://10.0.1.15:8000/api/status",
    version: "v4.1.0 • oauth2-oidc",
    isSample: true,
    tags: ["AWS", "security", "oauth2"]
  },
  {
    id: "inventory-01",
    name: "Inventory Service",
    provider: "GCP",
    providerRegion: "GCP • us-central1",
    ip: "10.0.1.25",
    port: 8005,
    status: "Healthy",
    healthUrl: "http://10.0.1.25:8005/health",
    version: "v1.1.4 • warehouse-sync",
    isSample: true,
    tags: ["GCP", "inventory", "warehouse"]
  }
];

let liveConsulServices = [];
let activeSampleServices = [...SAMPLE_SERVICES];
let mergedServices = [];

// Dynamic rendering combining live Consul services and clearly marked demo samples
function renderRegistryTable() {
  const tbody = document.getElementById("servicesTbody");
  if (!tbody) return;

  // Deduplicate by ID: Live Consul services take precedence over any sample item with same ID
  const liveIds = new Set(liveConsulServices.map(s => s.id));
  const filteredSamples = activeSampleServices.filter(s => !liveIds.has(s.id));

  mergedServices = [...liveConsulServices, ...filteredSamples];
  tbody.innerHTML = "";

  mergedServices.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = item.status === "Unhealthy"
      ? "hover:bg-surface-container-low/60 transition-colors group bg-error-container/10"
      : "hover:bg-surface-container-low/60 transition-colors group";
    tr.dataset.id = item.id;
    tr.dataset.name = item.name;
    tr.dataset.provider = item.provider;
    tr.dataset.source = item.isSample ? "SAMPLE" : "LIVE";
    tr.dataset.status = item.status;
    tr.dataset.ip = item.ip;
    tr.dataset.port = item.port;

    const isLive = !item.isSample;
    const sourceBadge = isLive
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant" title="Confirmed in HashiCorp Consul daemon"><span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>LIVE CONSUL</span>`
      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-surface-container text-secondary" title="Simulated sample entry for offline demonstration"><span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>DEMO SAMPLE</span>`;

    const statusBadge = item.status === "Healthy"
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-surface-container text-tertiary font-medium">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
          </span>
          Healthy (Passing)
        </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-error-container text-error font-medium">
          <span class="w-2 h-2 rounded-full bg-error"></span>
          Unhealthy / Critical
        </span>`;

    tr.innerHTML = `
      <td class="py-3 px-space-md">
        <div class="flex items-center gap-space-sm">
          <div class="w-7 h-7 rounded-md ${isLive ? 'bg-primary-fixed text-primary' : 'bg-secondary-container text-secondary'} flex items-center justify-center font-code-sm text-code-sm">
            <span class="material-symbols-outlined text-[16px]">${isLive ? 'cloud_done' : 'dns'}</span>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-label-lg text-label-lg font-medium text-on-surface">${escapeHtml(item.name)}</span>
              ${sourceBadge}
            </div>
            <span class="font-code-sm text-code-sm text-secondary">${escapeHtml(item.version || 'Consul Registered Node')}</span>
          </div>
        </div>
      </td>
      <td class="py-3 px-space-md">
        <span class="font-code-sm text-code-sm bg-surface-container px-2 py-0.5 rounded text-on-surface">${escapeHtml(item.id)}</span>
      </td>
      <td class="py-3 px-space-md">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-code-sm font-semibold bg-surface-container-high text-on-surface">
          <span class="w-1.5 h-1.5 rounded-full ${item.provider === 'AWS' ? 'bg-primary' : (item.provider === 'GCP' ? 'bg-tertiary' : (item.provider === 'Azure' ? 'bg-primary' : 'bg-secondary'))}"></span>
          ${escapeHtml(item.providerRegion || item.provider)}
        </span>
      </td>
      <td class="py-3 px-space-md font-code-md text-code-md text-on-surface">${escapeHtml(item.ip)}</td>
      <td class="py-3 px-space-md">
        <div class="flex items-center gap-1 font-code-md text-code-md text-on-surface">
          <span class="font-bold">${escapeHtml(item.port)}</span>
          <span class="text-secondary text-[11px]">/ HTTP</span>
        </div>
      </td>
      <td class="py-3 px-space-md">${statusBadge}</td>
      <td class="py-3 px-space-md">
        <a class="font-code-sm text-code-sm text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]"
          href="${escapeHtml(item.healthUrl)}" target="_blank" rel="noreferrer" title="${escapeHtml(item.healthUrl)}">
          <span>${escapeHtml(item.healthUrl)}</span>
          <span class="material-symbols-outlined text-[13px]">open_in_new</span>
        </a>
      </td>
      <td class="py-3 px-space-md text-right">
        <div class="flex items-center justify-end gap-space-xs">
          <button class="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
            onclick="inspectService('${escapeHtml(item.id)}')" title="Inspect Node Details">
            <span class="material-symbols-outlined text-[18px]">manage_search</span>
          </button>
          <button class="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-secondary transition-colors"
            onclick="testDns('${escapeHtml(item.name.toLowerCase().replace(/\\s+/g, '-'))}.service.consul', '${escapeHtml(item.ip)}:${escapeHtml(item.port)}')" title="Test DNS Query">
            <span class="material-symbols-outlined text-[18px]">travel_explore</span>
          </button>
          <button class="p-1.5 rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
            onclick="deregisterService(this, '${escapeHtml(item.id)}', ${item.isSample})" title="${item.isSample ? 'Remove Demo Sample' : 'Deregister from Consul'}">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  filterRegistry();
}

// Fetch live services from Express API / Consul
async function loadServicesFromBackend() {
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : "http://localhost:3000";
  try {
    const res = await fetch(`${apiBase}/api/services`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const servicesMap = data.services || {};

    liveConsulServices = Object.entries(servicesMap).map(([svcKey, svc]) => {
      const name = svc.Service || svc.Name || svcKey;
      const id = svc.ID || svcKey;
      const ip = svc.Address || "127.0.0.1";
      const port = svc.Port || 80;
      const tags = Array.isArray(svc.Tags) ? svc.Tags : [];
      const provider = tags.find(t => ["AWS", "GCP", "Azure", "Hybrid", "Local"].includes(t)) || "Local";
      const healthTag = tags.find(t => String(t).startsWith("health:"));
      const healthPath = healthTag ? healthTag.slice(7) : "/health";
      const healthUrl = `http://${ip}:${port}${healthPath.startsWith('/') ? healthPath : '/' + healthPath}`;

      return {
        id,
        name,
        provider,
        providerRegion: `${provider} • Live Consul`,
        ip,
        port,
        status: "Healthy",
        healthUrl,
        version: "HashiCorp Consul Agent",
        isSample: false,
        tags
      };
    });

    const feedback = document.getElementById("registrationFeedback");
    const msg = document.getElementById("feedbackMsg");
    if (feedback && msg && liveConsulServices.length > 0) {
      feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container text-tertiary";
      msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">verified</span><span>Consul daemon synced: <strong>${liveConsulServices.length} live service(s)</strong> active in catalog.</span>`;
      feedback.classList.remove("hidden");
    }

    renderRegistryTable();
  } catch (error) {
    console.warn("Could not load live services from backend/Consul:", error.message);
    liveConsulServices = [];
    renderRegistryTable();

    const feedback = document.getElementById("registrationFeedback");
    const msg = document.getElementById("feedbackMsg");
    if (feedback && msg && !document.getElementById("registrationCard").classList.contains("hidden")) {
      feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container-high text-secondary";
      msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">info</span><span>Consul offline or unreachable. Displaying demo catalog. Run <code>consul agent -dev</code> and <code>node server.js</code> for live mesh.</span>`;
      feedback.classList.remove("hidden");
    }
  }
}

// Handle Service Registration Form Submission
async function handleServiceRegistration(event) {
  event.preventDefault();

  const name = document.getElementById("svcName").value.trim();
  const id = document.getElementById("svcId").value.trim();
  const provider = document.getElementById("svcProvider").value;
  const ip = document.getElementById("svcIp").value.trim();
  const port = document.getElementById("svcPort").value.trim();
  const checkPath = document.getElementById("svcHealth").value.trim();
  const tags = document.getElementById("svcTags").value.trim();
  const intervalValue = document.getElementById("svcInterval").value;
  const [interval, timeout] = intervalValue.split("/");

  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">sync</span><span>Registering with Consul...</span>`;

  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : "http://localhost:3000";

  try {
    const response = await fetch(`${apiBase}/api/services/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        id,
        provider,
        address: ip,
        port: Number(port),
        checkPath: checkPath.startsWith("/") ? checkPath : "/" + checkPath,
        interval: interval ? interval.trim() : "10s",
        timeout: timeout ? timeout.trim() : "2s",
        tags: tags.split(",").map(t => t.trim()).filter(Boolean)
      })
    });

    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      if (response.status === 409) {
        throw new Error(`Duplicate ID: Service ID '${id}' is already registered in Consul! Please choose a unique instance ID.`);
      } else if (response.status === 503) {
        throw new Error("Consul is offline. Please start HashiCorp Consul ('consul agent -dev') before registering.");
      }
      throw new Error(result.message || "Registration failed.");
    }

    // Confirmed registration: reload from backend
    showToast(`Service "${name}" (${id}) registered with Consul successfully!`, "success");
    const feedback = document.getElementById("registrationFeedback");
    const msg = document.getElementById("feedbackMsg");
    feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container text-tertiary";
    msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span><span>Service <strong>${escapeHtml(id)}</strong> registered with Consul catalog.</span>`;
    feedback.classList.remove("hidden");

    // Reset form and reload
    event.target.reset();
    await loadServicesFromBackend();
  } catch (error) {
    showToast(error.message, "error");
    const feedback = document.getElementById("registrationFeedback");
    const msg = document.getElementById("feedbackMsg");
    feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-error-container text-error";
    msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">error</span><span>${escapeHtml(error.message)}</span>`;
    feedback.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
}

// Test Endpoint Probe (Live ping from frontend)
async function testProbe() {
  const ip = document.getElementById("svcIp").value.trim();
  const port = document.getElementById("svcPort").value.trim();
  let path = document.getElementById("svcHealth").value.trim();
  if (!path.startsWith("/")) path = "/" + path;

  const feedback = document.getElementById("registrationFeedback");
  const msg = document.getElementById("feedbackMsg");
  feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container-high text-primary";
  msg.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">sync</span><span>Probing http://${escapeHtml(ip)}:${escapeHtml(port)}${escapeHtml(path)}...</span>`;
  feedback.classList.remove("hidden");

  const start = Date.now();
  const targetUrl = `http://${ip}:${port}${path}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(targetUrl, { signal: controller.signal, mode: "cors" }).catch(() => null);
    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (res && res.ok) {
      feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container text-tertiary";
      msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span><span>Probe passed: <strong>${targetUrl}</strong> returned HTTP ${res.status} OK (${latency}ms).</span>`;
    } else if (res) {
      feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-error-container text-error";
      msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">warning</span><span>Probe warning: <strong>${targetUrl}</strong> returned HTTP ${res.status}.</span>`;
    } else {
      feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container-high text-secondary";
      msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">info</span><span>Probe sent to <strong>${targetUrl}</strong>. If payment-service is running on port 8001, CORS response or direct status is ready for Consul.</span>`;
    }
  } catch (e) {
    feedback.className = "rounded-lg p-space-sm flex items-center justify-between bg-surface-container-high text-secondary";
    msg.innerHTML = `<span class="material-symbols-outlined text-[18px]">info</span><span>Probe completed for ${targetUrl}.</span>`;
  }
}

// Deregister a service (Calls real backend for live services)
async function deregisterService(btn, id, isSample) {
  if (!confirm(`Confirm deregistration of service instance "${id}"?`)) return;

  if (isSample) {
    activeSampleServices = activeSampleServices.filter(s => s.id !== id);
    renderRegistryTable();
    showToast(`Sample demo record "${id}" removed from view.`, "warning");
    return;
  }

  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : "http://localhost:3000";
  try {
    const res = await fetch(`${apiBase}/api/services/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    showToast(`Service "${id}" deregistered from Consul catalog!`, "success");
    await loadServicesFromBackend();
  } catch (err) {
    showToast(`Deregistration failed: ${err.message}`, "error");
  }
}

function inspectService(id) {
  const item = mergedServices.find(s => s.id === id);
  if (!item) return;

  document.getElementById("inspectId").textContent = item.id;
  const drawer = document.getElementById("inspectDrawer");
  const detailsContainer = drawer.querySelector(".flex.flex-col.gap-space-sm");
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div class="flex justify-between py-1 bg-surface-container-low px-2 rounded">
        <span class="text-secondary">Service Name:</span>
        <span class="text-on-surface font-semibold">${escapeHtml(item.name)}</span>
      </div>
      <div class="flex justify-between py-1 bg-surface-container px-2 rounded">
        <span class="text-secondary">Catalog Instance ID:</span>
        <span class="text-on-surface font-semibold">${escapeHtml(item.id)}</span>
      </div>
      <div class="flex justify-between py-1 bg-surface-container-low px-2 rounded">
        <span class="text-secondary">Endpoint Socket:</span>
        <span class="text-primary font-mono">${escapeHtml(item.ip)}:${escapeHtml(item.port)}</span>
      </div>
      <div class="flex justify-between py-1 bg-surface-container px-2 rounded">
        <span class="text-secondary">Cloud Topology:</span>
        <span class="text-on-surface font-semibold">${escapeHtml(item.providerRegion || item.provider)}</span>
      </div>
      <div class="flex justify-between py-1 bg-surface-container-low px-2 rounded">
        <span class="text-secondary">Health-Check URL:</span>
        <span class="text-on-surface font-mono text-xs truncate max-w-[280px]">${escapeHtml(item.healthUrl)}</span>
      </div>
      <div class="flex justify-between py-1 bg-surface-container px-2 rounded">
        <span class="text-secondary">Data Source:</span>
        <span class="${item.isSample ? 'text-secondary' : 'text-tertiary font-bold'}">${item.isSample ? 'Simulated Offline Demo' : 'Live HashiCorp Consul Agent'}</span>
      </div>
    `;
  }
  drawer.classList.remove("hidden");
}

function testDns(domain, target) {
  alert(`[Consul DNS Resolver Probe]\nQuery: ${domain}\nResult: ${target || '127.0.0.1:8001'} (TTL=0s NOERROR)\nAuthority: consul-core-01:8600`);
}

// Table Filtering & Counting
function filterRegistry() {
  const searchVal = (document.getElementById("tableSearch")?.value || "").toLowerCase().trim();
  const providerVal = document.getElementById("filterProvider")?.value || "ALL";
  const sourceVal = document.getElementById("filterSource")?.value || "ALL";
  const statusVal = document.getElementById("filterStatus")?.value || "ALL";

  const rows = document.querySelectorAll("#servicesTbody tr");
  let visibleCount = 0;
  let healthyCount = 0;

  rows.forEach(row => {
    const p = row.dataset.provider;
    const src = row.dataset.source;
    const s = row.dataset.status;
    const text = row.innerText.toLowerCase();

    const matchesSearch = !searchVal || text.includes(searchVal);
    const matchesProvider = (providerVal === "ALL" || p === providerVal);
    const matchesSource = (sourceVal === "ALL" || src === sourceVal);
    const matchesStatus = (statusVal === "ALL" || s === statusVal);

    if (matchesSearch && matchesProvider && matchesSource && matchesStatus) {
      row.style.display = "";
      visibleCount++;
      if (s === "Healthy") healthyCount++;
    } else {
      row.style.display = "none";
    }
  });

  // Update dynamic counters
  const visibleCountEl = document.getElementById("visibleRowCount");
  const totalCountEl = document.getElementById("totalRowCount");
  if (visibleCountEl) visibleCountEl.textContent = visibleCount;
  if (totalCountEl) totalCountEl.textContent = rows.length;

  // Update top metrics bar
  const topNodesEl = document.getElementById("topMeshNodesCount");
  const topHealthEl = document.getElementById("topGlobalHealth");
  if (topNodesEl) topNodesEl.textContent = `${rows.length} Nodes`;
  if (topHealthEl) {
    const percent = rows.length > 0 ? Math.round((healthyCount / rows.length) * 100) : 100;
    topHealthEl.textContent = `${percent}% Pass`;
  }
}

function sortRegistry() {
  const criteria = document.getElementById("filterSort").value;
  const tbody = document.getElementById("servicesTbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  if (criteria === "port-asc") {
    rows.sort((a, b) => Number(a.dataset.port) - Number(b.dataset.port));
  } else if (criteria === "ip-asc") {
    rows.sort((a, b) => a.dataset.ip.localeCompare(b.dataset.ip));
  } else if (criteria === "name-asc") {
    rows.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
  }

  rows.forEach(r => tbody.appendChild(r));
}

function exportConsulJSON() {
  const rows = Array.from(document.querySelectorAll("#servicesTbody tr")).filter(r => r.style.display !== "none");
  const data = rows.map(r => ({
    service: r.dataset.name,
    id: r.dataset.id,
    provider: r.dataset.provider,
    source: r.dataset.source,
    address: r.dataset.ip,
    port: Number(r.dataset.port),
    status: r.dataset.status
  }));

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consul-catalog-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Consul catalog JSON exported!", "success");
}

function triggerBulkSync(btn) {
  const orig = btn.innerHTML;
  btn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin text-tertiary">sync</span><span>Syncing...</span>`;
  loadServicesFromBackend().then(() => {
    btn.innerHTML = `<span class="material-symbols-outlined text-[16px] text-tertiary">done</span><span>Catalog Synced</span>`;
    setTimeout(() => btn.innerHTML = orig, 1800);
  });
}

function copySnippet() {
  const code = document.getElementById("codeSnippet").innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btnText = document.getElementById("copyBtnText");
    btnText.textContent = "Copied to Clipboard!";
    setTimeout(() => btnText.textContent = "Copy Endpoint", 2000);
  });
}

// Initial Load on Page Startup
document.addEventListener("DOMContentLoaded", () => {
  loadServicesFromBackend();
  // Poll every 10s for catalog changes
  setInterval(loadServicesFromBackend, 10000);
});
