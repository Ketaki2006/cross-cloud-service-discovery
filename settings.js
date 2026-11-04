/**
 * Cross-Cloud Settings Controller
 * Handles connection tests to Consul and Express, and local configuration persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadLocalPreferences();
  initConnectionTests();
  initSaveAndReset();
});

/**
 * Load user preferences from localStorage
 */
function loadLocalPreferences() {
  const savedPolling = localStorage.getItem('cc_polling_interval') || '5s';
  const savedLogLevel = localStorage.getItem('cc_log_level') || 'info';

  const pollingSelect = document.getElementById('settingPollingSelect');
  const logSelect = document.getElementById('settingLogLevelSelect');

  if (pollingSelect) pollingSelect.value = savedPolling;
  if (logSelect) logSelect.value = savedLogLevel;
}

/**
 * Initialize test connection buttons
 */
function initConnectionTests() {
  // 1. Test Consul Connection
  const testConsulBtn = document.getElementById('testConsulBtn');
  if (testConsulBtn) {
    testConsulBtn.addEventListener('click', async () => {
      const badge = document.getElementById('consulLatencyBadge');
      if (badge) {
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span><span>Probing Consul leader...</span>';
      }

      const startTime = Date.now();
      try {
        const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/consul/status`);
        const latency = Date.now() - startTime;
        const data = await res.json();

        if (res.ok && data.connected) {
          if (badge) {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span><span>Latency: <strong class="font-semibold text-primary">${latency}ms</strong> • Leader ${data.leader} reachable</span>`;
          }
          if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
            window.APP_CONFIG.showToast(`Consul connected (${latency}ms) - Leader: ${data.leader}`);
          }
        } else {
          if (badge) {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span><span class="text-error font-medium">Consul unreachable • Start daemon</span>`;
          }
          if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
            window.APP_CONFIG.showToast('Consul daemon is offline. Run: consul agent -dev', 'error');
          }
        }
      } catch (err) {
        if (badge) {
          badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span><span class="text-error font-medium">Error: ${err.message}</span>`;
        }
        if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
          window.APP_CONFIG.showToast(`Consul test failed: ${err.message}`, 'error');
        }
      }
    });
  }

  // 2. Test Express Backend API Connection
  const testApiBtn = document.getElementById('testApiBtn');
  if (testApiBtn) {
    testApiBtn.addEventListener('click', async () => {
      const badge = document.getElementById('apiStatusBadge');
      if (badge) {
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span><span>Testing Express API...</span>';
      }

      const startTime = Date.now();
      try {
        const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api`);
        const latency = Date.now() - startTime;
        const data = await res.json();

        if (res.ok && data.status === 'running') {
          if (badge) {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span><span>HTTP 200 OK (${latency}ms) — Express :${data.port} responsive</span>`;
          }
          if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
            window.APP_CONFIG.showToast(`Express API v${data.version || '1.0.0'} online on port ${data.port} (${latency}ms)`);
          }
        } else {
          if (badge) {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span><span class="text-error">API returned HTTP ${res.status}</span>`;
          }
        }
      } catch (err) {
        if (badge) {
          badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span><span class="text-error">Backend offline: ${err.message}</span>`;
        }
        if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
          window.APP_CONFIG.showToast(`Backend connection failed: ${err.message}`, 'error');
        }
      }
    });
  }
}

/**
 * Initialize Save and Reset buttons
 */
function initSaveAndReset() {
  const saveAction = (btn) => {
    const pollingSelect = document.getElementById('settingPollingSelect');
    const logSelect = document.getElementById('settingLogLevelSelect');

    if (pollingSelect) localStorage.setItem('cc_polling_interval', pollingSelect.value);
    if (logSelect) localStorage.setItem('cc_log_level', logSelect.value);

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span><span>Saved to Browser!</span>';
    btn.classList.add('bg-tertiary-container');

    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast('Local UI preferences saved successfully.');
    }

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('bg-tertiary-container');
    }, 1800);
  };

  const resetAction = () => {
    localStorage.removeItem('cc_polling_interval');
    localStorage.removeItem('cc_log_level');
    loadLocalPreferences();
    if (window.APP_CONFIG && window.APP_CONFIG.showToast) {
      window.APP_CONFIG.showToast('Preferences reset to default values.');
    }
  };

  document.getElementById('topSaveBtn')?.addEventListener('click', function() { saveAction(this); });
  document.getElementById('bottomSaveBtn')?.addEventListener('click', function() { saveAction(this); });
  document.getElementById('topResetBtn')?.addEventListener('click', resetAction);
  document.getElementById('bottomResetBtn')?.addEventListener('click', resetAction);
}

/**
 * Toggle preview snippet language
 */
function setSnippetLang(lang) {
  const langs = ['js', 'curl', 'go'];
  langs.forEach(l => {
    const btn = document.getElementById('lang-' + l);
    if (!btn) return;
    if (l === lang) {
      btn.className = 'flex-1 py-1 rounded text-center font-code-sm text-code-sm font-semibold bg-primary text-on-primary transition-all';
    } else {
      btn.className = 'flex-1 py-1 rounded text-center font-code-sm text-code-sm text-on-surface-variant hover:text-on-surface transition-all';
    }
  });

  const desc = document.getElementById('snippetDesc');
  if (desc) {
    if (lang === 'js') desc.textContent = 'Express & Axios template (:3000)';
    if (lang === 'curl') desc.textContent = 'CLI HTTP ping syntax (:3000)';
    if (lang === 'go') desc.textContent = 'consul/api official Go client';
  }
}
