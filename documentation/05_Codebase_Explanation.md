# Chapter 5: Complete Codebase Deep Dive

This chapter provides a file-by-file, section-by-section walkthrough of the source code.

---

## 5.1 Backend: `server.js`

### Section 1: Imports and Global Constants
```javascript
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";
const AXIOS_TIMEOUT = 3000;
```
- **Explanation:** Loads Express, CORS, Path, and Axios. Configures default port 3000 and target Consul URL on port 8500.

### Section 2: Middleware & Static File Hosting
```javascript
app.use(cors());
app.use(express.json());

const frontendDist = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendDist));
```
- **Explanation:** Enables cross-origin requests, parses incoming JSON bodies, and serves pre-built React static files from `frontend/dist`.

### Section 3: Consul Connection Probe (`GET /api/consul/status`)
```javascript
app.get("/api/consul/status", async (req, res) => {
    try {
        const leaderRes = await axios.get(`${CONSUL_URL}/v1/status/leader`, { timeout: 2000 });
        const leader = leaderRes.data;
        res.json({
            status: "success",
            connected: true,
            consulUrl: CONSUL_URL,
            leader: leader || "No leader elected (solo agent)",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: "error",
            connected: false,
            consulUrl: CONSUL_URL,
            message: "Unable to connect to Consul daemon.",
            error: error.message
        });
    }
});
```
- **Explanation:** Pings Consul's Raft leader status endpoint. If unreachable, returns `connected: false` gracefully without crashing the server.

### Section 4: Service Registration & Duplicate Prevention (`POST /api/services/register`)
```javascript
app.post("/api/services/register", async (req, res) => {
    // 1. Validate required fields (name, id, address, port, checkPath)
    // 2. Query Consul for existing services:
    const existingRes = await axios.get(`${CONSUL_URL}/v1/agent/services`, { timeout: AXIOS_TIMEOUT });
    if (existingRes.data && existingRes.data[id.trim()]) {
        return res.status(409).json({
            status: "error",
            message: `Service instance with ID "${id}" already exists. Use a unique ID.`
        });
    }
    // 3. Submit payload to Consul PUT /v1/agent/service/register
    await axios.put(`${CONSUL_URL}/v1/agent/service/register`, consulPayload, { timeout: AXIOS_TIMEOUT });
    res.status(200).json({ status: "success", message: "Registered with Consul successfully!" });
});
```
- **Explanation:** Enforces strict validation and prevents duplicate ID collisions.

### Section 5: SPA Client-Side Fallback Middleware
```javascript
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
        return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
});
```
- **Explanation:** Express 5-compatible fallback that serves `index.html` for frontend client routes (like `/service-registry`) while preserving `/api` routes.

---

## 5.2 Microservice: `payment-service.js`
- Implements simulated AWS payment microservice on port 8001.
- Global variable `let isHealthy = true;` controls health state.
- `GET /health` returns `200 OK` when healthy and `503 Critical` when fault is injected via `POST /simulate/unhealthy`.

---

## 5.3 Unified Orchestrator: `start-all.js`
- Concurrently imports and boots both `payment-service.js` and `server.js`.
- Listens for `SIGINT` and `SIGTERM` signals to cleanly close HTTP listeners.

---

## 5.4 Frontend Code Architecture
- `src/types/index.ts`: Formal interfaces for `ServiceRecord`, `HealthResponse`, and payloads.
- `src/services/api.ts`: Centralized HTTP client methods using native `fetch`.
- `src/components/Header.tsx`: Real-time Consul connectivity badge.
- `src/components/Sidebar.tsx`: NavLink routing menu.
- `src/components/RegisterServiceModal.tsx`: Registration modal with field validation.
- `src/components/Toast.tsx`: Floating notification banner context.
- `src/pages/Dashboard.tsx`: KPI cards, cloud distribution counters, and live service table.
- `src/pages/ServiceRegistry.tsx`: Filterable catalog table with deregistration action.
- `src/pages/ServiceDiscovery.tsx`: Discovery query tool with multi-language code snippets.
- `src/pages/HealthMonitoring.tsx`: Real-time probe logs and status counts.
- `src/pages/Settings.tsx`: Cluster configuration and latency test tool.
