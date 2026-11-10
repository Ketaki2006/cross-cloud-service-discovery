const cors = require("cors");
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://127.0.0.1:8002";
const AXIOS_TIMEOUT = 3000; // 3 seconds timeout to prevent hanging

app.use(express.json());
app.use(cors());

const frontendDist = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
} else {
    app.use(express.static(__dirname));
}

// Lightweight request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Helper: check if Consul error is connection refused / timeout
function handleConsulError(error, res, actionDescription) {
    console.error(`Consul error during ${actionDescription}:`, error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.message.includes("connect ECONNREFUSED")) {
        return res.status(503).json({
            status: "error",
            code: "CONSUL_UNAVAILABLE",
            message: `HashiCorp Consul is offline or unreachable at ${CONSUL_URL}. Please start Consul in dev mode ('consul agent -dev').`,
            consulUrl: CONSUL_URL
        });
    }
    const statusCode = error.response ? error.response.status : 500;
    const errorDetails = error.response && error.response.data ? error.response.data : error.message;
    return res.status(statusCode).json({
        status: "error",
        code: "CONSUL_REQUEST_FAILED",
        message: `${actionDescription} failed: ${typeof errorDetails === "string" ? errorDetails : JSON.stringify(errorDetails)}`
    });
}

// 1. Root API Info
app.get("/api", (req, res) => {
    res.json({
        name: "Cross-Cloud Service Discovery Registry API",
        version: "1.0.0",
        status: "running",
        port: PORT,
        consulUrl: CONSUL_URL,
        simulationMode: true,
        supportedClouds: ["AWS", "GCP", "Azure", "Local"],
        endpoints: {
            "GET /api": "API overview and metadata",
            "GET /api/consul/status": "Check Consul daemon reachability and leader",
            "GET /api/services": "List all services registered in Consul",
            "POST /api/services/register": "Register a new service with health check",
            "DELETE /api/services/:id": "Deregister a service from Consul",
            "GET /api/services/:name": "Discover service instances and health by service name",
            "GET /api/health": "Aggregated Consul health checks (passing/warning/critical)",
            "POST /api/cross-cloud/pay": "Initiate cross-cloud payment via AWS User Service discovered Payment Service",
            "GET /api/cross-cloud/telemetry": "Get live cross-cloud communication telemetry and history",
            "POST /api/scenarios/inject-fault": "Inject simulated HTTP 503 failure into payment service",
            "POST /api/scenarios/restore-health": "Restore payment service to healthy HTTP 200 state",
            "GET /api/scenarios/status": "Get current health state of simulated payment service"
        }
    });
});

// 2. Check Consul connection status
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
            status: "warning",
            connected: false,
            consulUrl: CONSUL_URL,
            message: "Consul agent is offline or unreachable. Start Consul to enable live mesh discovery.",
            error: error.message
        });
    }
});

// 3. Get all registered services from Consul agent
app.get("/api/services", async (req, res) => {
    try {
        const response = await axios.get(`${CONSUL_URL}/v1/agent/services`, { timeout: AXIOS_TIMEOUT });
        res.json({
            status: "success",
            count: Object.keys(response.data || {}).length,
            services: response.data || {}
        });
    } catch (error) {
        return handleConsulError(error, res, "retrieving services from Consul");
    }
});

// 4. Register a service with Consul agent
app.post("/api/services/register", async (req, res) => {
    try {
        const {
            name,
            id,
            provider,
            address,
            port,
            checkPath,
            interval,
            timeout,
            tags
        } = req.body;

        // Validation: required fields
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                status: "error",
                field: "name",
                message: "Service name is required and must be a non-empty string."
            });
        }

        if (!id || typeof id !== "string" || !id.trim()) {
            return res.status(400).json({
                status: "error",
                field: "id",
                message: "Service instance ID is required and must be a unique string."
            });
        }

        if (!address || typeof address !== "string" || !address.trim()) {
            return res.status(400).json({
                status: "error",
                field: "address",
                message: "Service IP address or hostname is required."
            });
        }

        const parsedPort = Number(port);
        if (!port || isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535 || !Number.isInteger(parsedPort)) {
            return res.status(400).json({
                status: "error",
                field: "port",
                message: "Port must be an integer between 1 and 65535."
            });
        }

        if (!checkPath || typeof checkPath !== "string" || !checkPath.trim()) {
            return res.status(400).json({
                status: "error",
                field: "checkPath",
                message: "Health check path is required (e.g., /health)."
            });
        }

        const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "-");
        const normalizedId = id.trim();
        const normalizedAddress = address.trim();
        const normalizedCheckPath = checkPath.trim().startsWith("/") ? checkPath.trim() : "/" + checkPath.trim();
        const selectedProvider = provider && typeof provider === "string" ? provider.trim() : "Local";

        // Prevent duplicate service IDs from being silently overwritten
        // Check existing services in Consul first
        try {
            const existingRes = await axios.get(`${CONSUL_URL}/v1/agent/services`, { timeout: AXIOS_TIMEOUT });
            const existingServices = existingRes.data || {};
            if (existingServices[normalizedId] && req.query.overwrite !== "true") {
                return res.status(409).json({
                    status: "error",
                    code: "DUPLICATE_SERVICE_ID",
                    message: `Service ID '${normalizedId}' is already registered in Consul as '${existingServices[normalizedId].Service}'. Use a unique instance ID or pass overwrite=true.`,
                    existingService: existingServices[normalizedId]
                });
            }
        } catch (consulCheckErr) {
            // If Consul is offline, we'll catch it when attempting registration below
            if (consulCheckErr.code === "ECONNREFUSED") {
                return handleConsulError(consulCheckErr, res, "checking service duplicates in Consul");
            }
        }

        // Assemble tags array
        const tagList = [];
        if (selectedProvider) tagList.push(selectedProvider);
        if (Array.isArray(tags)) {
            tags.forEach(t => {
                if (typeof t === "string" && t.trim() && !tagList.includes(t.trim())) {
                    tagList.push(t.trim());
                }
            });
        }
        // Embed health check url tag for easy discovery
        tagList.push(`health:${normalizedCheckPath}`);

        const consulPayload = {
            ID: normalizedId,
            Name: normalizedName,
            Address: normalizedAddress,
            Port: parsedPort,
            Tags: tagList,
            Check: {
                HTTP: `http://${normalizedAddress}:${parsedPort}${normalizedCheckPath}`,
                Interval: interval && typeof interval === "string" ? interval : "10s",
                Timeout: timeout && typeof timeout === "string" ? timeout : "2s"
            }
        };

        await axios.put(`${CONSUL_URL}/v1/agent/service/register`, consulPayload, { timeout: AXIOS_TIMEOUT });

        res.status(201).json({
            status: "success",
            message: `Service "${normalizedName}" (${normalizedId}) registered with Consul successfully!`,
            registrationConfirmed: true,
            service: consulPayload
        });
    } catch (error) {
        return handleConsulError(error, res, "registering service with Consul");
    }
});

// 5. Deregister a service from Consul
app.delete("/api/services/:id", async (req, res) => {
    const serviceId = req.params.id;
    if (!serviceId) {
        return res.status(400).json({ status: "error", message: "Service ID is required." });
    }

    try {
        await axios.put(`${CONSUL_URL}/v1/agent/service/deregister/${encodeURIComponent(serviceId)}`, null, { timeout: AXIOS_TIMEOUT });
        res.json({
            status: "success",
            message: `Service instance '${serviceId}' deregistered from Consul catalog successfully.`,
            id: serviceId
        });
    } catch (error) {
        return handleConsulError(error, res, `deregistering service '${serviceId}' from Consul`);
    }
});

// 6. Discover healthy and all instances for a given service name
app.get("/api/services/:name", async (req, res) => {
    const serviceName = req.params.name ? req.params.name.trim().toLowerCase().replace(/\s+/g, "-") : "";
    if (!serviceName) {
        return res.status(400).json({ status: "error", message: "Service name parameter is required." });
    }

    const passingOnly = req.query.passing === "true";

    try {
        const queryUrl = `${CONSUL_URL}/v1/health/service/${encodeURIComponent(serviceName)}${passingOnly ? "?passing=true" : ""}`;
        const response = await axios.get(queryUrl, { timeout: AXIOS_TIMEOUT });
        const rawInstances = response.data || [];

        const instances = rawInstances.map(entry => {
            const svc = entry.Service || {};
            const node = entry.Node || {};
            const checks = entry.Checks || [];

            // Determine overall health status from checks
            let overallStatus = "passing";
            for (const chk of checks) {
                if (chk.Status === "critical") {
                    overallStatus = "critical";
                    break;
                } else if (chk.Status === "warning" && overallStatus !== "critical") {
                    overallStatus = "warning";
                }
            }

            return {
                id: svc.ID,
                name: svc.Service,
                address: svc.Address || node.Address,
                port: svc.Port,
                tags: svc.Tags || [],
                provider: (svc.Tags || []).find(t => ["AWS", "GCP", "Azure", "Hybrid", "Local"].includes(t)) || "Local",
                node: node.Node,
                datacenter: node.Datacenter,
                status: overallStatus,
                checks: checks.map(c => ({
                    checkId: c.CheckID,
                    name: c.Name,
                    status: c.Status,
                    output: c.Output
                }))
            };
        });

        res.json({
            status: "success",
            serviceName,
            totalInstances: instances.length,
            passingOnly,
            instances
        });
    } catch (error) {
        return handleConsulError(error, res, `discovering instances for service '${serviceName}'`);
    }
});

// 7. Aggregated Consul Health Checks
app.get("/api/health", async (req, res) => {
    try {
        const response = await axios.get(`${CONSUL_URL}/v1/health/state/any`, { timeout: AXIOS_TIMEOUT });
        const checks = response.data || [];

        let passing = 0;
        let warning = 0;
        let critical = 0;

        checks.forEach(c => {
            if (c.Status === "passing") passing++;
            else if (c.Status === "warning") warning++;
            else if (c.Status === "critical") critical++;
        });

        res.json({
            status: "success",
            totalChecks: checks.length,
            summary: {
                passing,
                warning,
                critical
            },
            checks
        });
    } catch (error) {
        return handleConsulError(error, res, "retrieving health checks from Consul");
    }
});

// 8. Virtual Lab Scenarios: Inject Fault into Payment Service
app.post("/api/scenarios/inject-fault", async (req, res) => {
    try {
        const response = await axios.post("http://127.0.0.1:8001/simulate/unhealthy", {}, { timeout: 3000 });
        res.json({
            status: "success",
            scenario: "fault_injection",
            message: "Simulated internal failure injected into Payment Service (port 8001). Health probe will return HTTP 503.",
            details: response.data
        });
    } catch (err) {
        res.status(502).json({
            status: "error",
            message: "Could not reach Payment Service at http://127.0.0.1:8001. Ensure payment-service.js is running.",
            error: err.message
        });
    }
});

// 9. Virtual Lab Scenarios: Restore Payment Service Health
app.post("/api/scenarios/restore-health", async (req, res) => {
    try {
        const response = await axios.post("http://127.0.0.1:8001/simulate/healthy", {}, { timeout: 3000 });
        res.json({
            status: "success",
            scenario: "recovery",
            message: "Recovery triggered. Payment Service (port 8001) restored to normal. Health probe will return HTTP 200 OK.",
            details: response.data
        });
    } catch (err) {
        res.status(502).json({
            status: "error",
            message: "Could not reach Payment Service at http://127.0.0.1:8001. Ensure payment-service.js is running.",
            error: err.message
        });
    }
});

// 10. Virtual Lab Scenarios: Get Simulation Status
app.get("/api/scenarios/status", async (req, res) => {
    try {
        const response = await axios.get("http://127.0.0.1:8001/simulate/status", { timeout: 3000 });
        res.json({
            status: "success",
            paymentService: response.data
        });
    } catch (err) {
        res.json({
            status: "unknown",
            paymentService: { isHealthy: null, error: "Payment service offline or unreachable on port 8001" }
        });
    }
});

// 11. Real Cross-Cloud Communication: Trigger Payment via User Service
app.post("/api/cross-cloud/pay", async (req, res) => {
    try {
        const { userId = "usr_101", amount = 100, currency = "USD", description } = req.body || {};
        const response = await axios.post(`${USER_SERVICE_URL}/api/users/${encodeURIComponent(userId)}/pay`, {
            amount,
            currency,
            description
        }, { timeout: 6000 });
        res.status(response.status).json(response.data);
    } catch (err) {
        const status = err.response?.status || 502;
        res.status(status).json({
            status: "error",
            code: "CROSS_CLOUD_GATEWAY_ERROR",
            message: err.response?.data?.message || err.message,
            details: err.response?.data || null
        });
    }
});

// 12. Real Cross-Cloud Telemetry
app.get("/api/cross-cloud/telemetry", async (req, res) => {
    try {
        const response = await axios.get(`${USER_SERVICE_URL}/api/telemetry`, { timeout: 3000 });
        res.json(response.data);
    } catch (err) {
        res.json({
            status: "offline",
            service: "user-service",
            error: `User service unreachable at ${USER_SERVICE_URL}`,
            telemetry: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                lastRequest: null,
                recentHistory: []
            }
        });
    }
});

// 13. Test Route
app.get("/api/test-route", (req, res) => {
    res.json({
        message: "Test route works!",
        timestamp: new Date().toISOString()
    });
});

// React Router SPA fallback for non-API routes
if (fs.existsSync(frontendDist)) {
    app.use((req, res, next) => {
        if (req.method === "GET" && !req.path.startsWith("/api")) {
            return res.sendFile(path.join(frontendDist, "index.html"));
        }
        next();
    });
}

// Start backend only if executed directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend running at http://localhost:${PORT}`);
        console.log(`Targeting Consul daemon at ${CONSUL_URL}`);
    });
}

module.exports = app;
