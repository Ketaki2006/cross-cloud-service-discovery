const cors = require("cors");
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://127.0.0.1:8002";
const EXPLICIT_PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "";
const AWS_WG_IP = process.env.AWS_WG_IP || "10.8.0.1";
const AZURE_WG_IP = process.env.AZURE_WG_IP || "10.8.0.2";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AZURE_REGION = process.env.AZURE_REGION || "Central India";
const AXIOS_TIMEOUT = 3000; // 3 seconds timeout to prevent hanging

// Helper: Normalize cloud provider tag case-insensitively
function extractProviderFromTags(tags = []) {
    if (!Array.isArray(tags)) return "Local";
    for (const tag of tags) {
        const upper = String(tag).toUpperCase();
        if (upper === "AWS") return "AWS";
        if (upper === "AZURE") return "AZURE";
        if (upper === "GCP") return "GCP";
        if (upper === "HYBRID") return "Hybrid";
        if (upper === "LOCAL") return "Local";
    }
    return "Local";
}

// Helper: Resolve Payment Service base URL dynamically via Consul (never hardcodes remote IPs)
async function resolvePaymentServiceUrl() {
    if (EXPLICIT_PAYMENT_SERVICE_URL) return EXPLICIT_PAYMENT_SERVICE_URL;
    try {
        const res = await axios.get(`${CONSUL_URL}/v1/health/service/payment-service`, { timeout: 2000 });
        const entries = res.data || [];
        if (entries.length > 0) {
            const svc = entries[0].Service || {};
            const node = entries[0].Node || {};
            const addr = svc.Address || node.Address;
            const port = svc.Port;
            if (addr && port) {
                return `http://${addr}:${port}`;
            }
        }
    } catch {
        // Fallback below if Consul unreachable
    }
    return "http://127.0.0.1:8001";
}

// Helper: Inspect host network interfaces for WireGuard tunnel
function detectWireGuardInterface() {
    const interfaces = os.networkInterfaces();
    const wgIfaces = [];
    let hasWgIp = false;
    for (const [name, addrs] of Object.entries(interfaces)) {
        if (!Array.isArray(addrs)) continue;
        for (const info of addrs) {
            if (info.family === "IPv4" && (name.toLowerCase().startsWith("wg") || info.address === AWS_WG_IP || info.address.startsWith("10.8.0."))) {
                wgIfaces.push({ name, address: info.address });
                hasWgIp = true;
            }
        }
    }
    return { hasWgIp, interfaces: wgIfaces };
}

function parseHostFromUrl(rawUrl, fallback = "127.0.0.1") {
    try {
        return new URL(rawUrl).hostname || fallback;
    } catch {
        return fallback;
    }
}

function isLoopbackHost(hostOrUrl) {
    const host = String(hostOrUrl || "").includes("://")
        ? parseHostFromUrl(hostOrUrl, "")
        : String(hostOrUrl || "").trim().toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "0.0.0.0";
}

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
        version: "1.1.0",
        status: "running",
        port: Number(PORT),
        consulUrl: CONSUL_URL,
        userServiceUrl: USER_SERVICE_URL,
        simulationMode: false,
        supportedClouds: ["AWS", "AZURE", "GCP", "Local"],
        endpoints: {
            "GET /api": "API overview and metadata",
            "GET /api/dashboard/overview": "Live AWS-to-Azure infrastructure, WireGuard, Consul & telemetry overview",
            "GET /api/consul/status": "Check Consul daemon reachability, datacenter and leader",
            "GET /api/consul/catalog": "Full Consul catalog (/v1/catalog/services + /v1/health/service/:name)",
            "GET /api/consul/health/payment-service": "Live Consul health & ?passing discovery status for payment-service",
            "GET /api/services": "List all services registered in Consul agent",
            "POST /api/services/register": "Register a new service with health check",
            "DELETE /api/services/:id": "Deregister a service from Consul",
            "GET /api/services/:name": "Discover service instances and health by service name",
            "POST /api/services/probe": "Execute a real HTTP health probe for a registered service",
            "GET /api/health": "Aggregated Consul health checks (passing/warning/critical)",
            "GET /api/users": "Proxy to AWS User Service users list",
            "POST /api/users/:id/pay": "Proxy to AWS User Service cross-cloud payment trigger",
            "GET /api/telemetry": "Proxy to AWS User Service transaction telemetry",
            "POST /api/cross-cloud/pay": "Initiate cross-cloud payment via AWS User Service discovered Payment Service",
            "GET /api/cross-cloud/telemetry": "Get live cross-cloud communication telemetry and history",
            "POST /api/scenarios/inject-fault": "Inject simulated HTTP 503 failure into payment service",
            "POST /api/scenarios/restore-health": "Restore payment service to healthy HTTP 200 state",
            "GET /api/scenarios/status": "Get current health state of payment service"
        }
    });
});

// 2. Check Consul connection status (including datacenter & node metadata)
app.get("/api/consul/status", async (req, res) => {
    const start = Date.now();
    try {
        const [leaderRes, selfRes] = await Promise.all([
            axios.get(`${CONSUL_URL}/v1/status/leader`, { timeout: 2000 }),
            axios.get(`${CONSUL_URL}/v1/agent/self`, { timeout: 2000 }).catch(() => null),
        ]);
        const leader = leaderRes.data;
        const selfConfig = selfRes?.data?.Config || selfRes?.data?.Member || {};
        res.json({
            status: "success",
            connected: true,
            consulUrl: CONSUL_URL,
            leader: leader || "No leader elected (solo agent)",
            datacenter: selfConfig.Datacenter || selfRes?.data?.Member?.Tags?.dc || "Unknown",
            nodeName: selfConfig.NodeName || selfRes?.data?.Member?.Name || "Unknown",
            version: selfConfig.Version || "Unknown",
            latencyMs: Date.now() - start,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: "warning",
            connected: false,
            consulUrl: CONSUL_URL,
            datacenter: null,
            nodeName: null,
            message: "Consul agent is offline or unreachable.",
            error: error.message,
            timestamp: new Date().toISOString()
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
                provider: extractProviderFromTags(svc.Tags),
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

// 8. Fault Simulation: Inject Fault into Payment Service (resolved via Consul or env)
app.post("/api/scenarios/inject-fault", async (req, res) => {
    const paymentBaseUrl = await resolvePaymentServiceUrl();
    try {
        const response = await axios.post(`${paymentBaseUrl}/simulate/unhealthy`, {}, { timeout: 3000 });
        res.json({
            status: "success",
            scenario: "fault_injection",
            targetUrl: paymentBaseUrl,
            message: `Simulated internal failure injected into Payment Service (${paymentBaseUrl}). Health probe will return HTTP 503.`,
            details: response.data
        });
    } catch (err) {
        res.status(502).json({
            status: "error",
            message: `Could not reach Payment Service at ${paymentBaseUrl}. Ensure payment-service is running.`,
            error: err.message
        });
    }
});

// 9. Fault Simulation: Restore Payment Service Health
app.post("/api/scenarios/restore-health", async (req, res) => {
    const paymentBaseUrl = await resolvePaymentServiceUrl();
    try {
        const response = await axios.post(`${paymentBaseUrl}/simulate/healthy`, {}, { timeout: 3000 });
        res.json({
            status: "success",
            scenario: "recovery",
            targetUrl: paymentBaseUrl,
            message: `Recovery triggered. Payment Service (${paymentBaseUrl}) restored to normal. Health probe will return HTTP 200 OK.`,
            details: response.data
        });
    } catch (err) {
        res.status(502).json({
            status: "error",
            message: `Could not reach Payment Service at ${paymentBaseUrl}. Ensure payment-service is running.`,
            error: err.message
        });
    }
});

// 10. Fault Simulation: Get Simulation Status
app.get("/api/scenarios/status", async (req, res) => {
    const paymentBaseUrl = await resolvePaymentServiceUrl();
    try {
        const response = await axios.get(`${paymentBaseUrl}/simulate/status`, { timeout: 3000 });
        res.json({
            status: "success",
            targetUrl: paymentBaseUrl,
            paymentService: response.data
        });
    } catch (err) {
        res.json({
            status: "unknown",
            targetUrl: paymentBaseUrl,
            paymentService: { isHealthy: null, error: `Payment service offline or unreachable at ${paymentBaseUrl}` }
        });
    }
});

// 11. Full Consul Catalog Services (GET /v1/catalog/services + /v1/health/service/:name + ?passing)
app.get("/api/consul/catalog", async (req, res) => {
    try {
        const catalogRes = await axios.get(`${CONSUL_URL}/v1/catalog/services`, { timeout: AXIOS_TIMEOUT });
        const catalogMap = catalogRes.data || {};
        const serviceNames = Object.keys(catalogMap);

        const instances = [];
        await Promise.all(
            serviceNames.map(async (svcName) => {
                if (svcName === "consul") return; // Exclude internal consul RPC entry from app services
                try {
                    const [allRes, passingRes] = await Promise.all([
                        axios.get(`${CONSUL_URL}/v1/health/service/${encodeURIComponent(svcName)}`, { timeout: AXIOS_TIMEOUT }),
                        axios.get(`${CONSUL_URL}/v1/health/service/${encodeURIComponent(svcName)}?passing`, { timeout: AXIOS_TIMEOUT }).catch(() => ({ data: [] })),
                    ]);
                    const passingIds = new Set((passingRes.data || []).map((e) => e.Service?.ID));
                    for (const entry of allRes.data || []) {
                        const svc = entry.Service || {};
                        const node = entry.Node || {};
                        const checks = entry.Checks || [];
                        // Prefer service-specific check, fall back to node checks
                        const svcChecks = checks.filter((c) => c.ServiceID === svc.ID);
                        const relevantChecks = svcChecks.length > 0 ? svcChecks : checks;

                        let healthState = "UNKNOWN";
                        if (relevantChecks.length > 0) {
                            if (relevantChecks.some((c) => c.Status === "critical")) healthState = "CRITICAL";
                            else if (relevantChecks.some((c) => c.Status === "warning")) healthState = "WARNING";
                            else if (relevantChecks.every((c) => c.Status === "passing")) healthState = "PASSING";
                        }

                        const primaryCheck = svcChecks[0] || relevantChecks[0] || {};
                        const tags = Array.isArray(svc.Tags) ? svc.Tags : [];
                        const healthTag = tags.find((t) => String(t).startsWith("health:"));
                        const checkPath = healthTag ? healthTag.slice(7) : "/health";
                        const regionTag = tags.find((t) => !["AWS", "AZURE", "GCP", "LOCAL", "HYBRID"].includes(String(t).toUpperCase()) && !String(t).startsWith("health:"));

                        instances.push({
                            id: svc.ID,
                            name: svc.Service,
                            provider: extractProviderFromTags(tags),
                            region: regionTag || node.Datacenter || "unknown",
                            address: svc.Address || node.Address || "unknown",
                            port: svc.Port,
                            tags,
                            node: node.Node || "unknown",
                            datacenter: node.Datacenter || "unknown",
                            healthStatus: healthState,
                            excludedFromDiscovery: !passingIds.has(svc.ID),
                            lastCheckId: primaryCheck.CheckID || "unknown",
                            lastCheckOutput: primaryCheck.Output || "No check output reported",
                            checkPath,
                            healthUrl: svc.Address && svc.Port ? `http://${svc.Address}:${svc.Port}${checkPath.startsWith("/") ? checkPath : "/" + checkPath}` : null
                        });
                    }
                } catch {
                    // Skip service if single health lookup fails
                }
            })
        );

        res.json({
            status: "success",
            count: instances.length,
            catalogNames: serviceNames,
            instances,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return handleConsulError(error, res, "retrieving Consul catalog services");
    }
});

// 12. Dedicated Payment Service Consul Health Endpoint (/v1/health/service/payment-service + ?passing)
app.get("/api/consul/health/payment-service", async (req, res) => {
    try {
        const [allRes, passingRes] = await Promise.all([
            axios.get(`${CONSUL_URL}/v1/health/service/payment-service`, { timeout: AXIOS_TIMEOUT }),
            axios.get(`${CONSUL_URL}/v1/health/service/payment-service?passing`, { timeout: AXIOS_TIMEOUT }).catch(() => ({ data: [] })),
        ]);

        const allRaw = allRes.data || [];
        const passingRaw = passingRes.data || [];
        const passingIds = new Set(passingRaw.map((e) => e.Service?.ID));

        let healthState = "UNKNOWN";
        if (allRaw.length > 0) {
            if (passingRaw.length > 0) healthState = "PASSING";
            else {
                const allChecks = allRaw.flatMap((e) => e.Checks || []);
                if (allChecks.some((c) => c.Status === "critical")) healthState = "CRITICAL";
                else if (allChecks.some((c) => c.Status === "warning")) healthState = "WARNING";
            }
        }

        const instances = allRaw.map((entry) => {
            const svc = entry.Service || {};
            const node = entry.Node || {};
            const checks = entry.Checks || [];
            const svcCheck = checks.find((c) => c.ServiceID === svc.ID) || checks[0] || {};
            const isPassing = passingIds.has(svc.ID);

            return {
                id: svc.ID,
                name: svc.Service,
                provider: extractProviderFromTags(svc.Tags || []),
                address: svc.Address || node.Address,
                port: svc.Port,
                tags: svc.Tags || [],
                node: node.Node,
                datacenter: node.Datacenter,
                healthStatus: isPassing ? "PASSING" : (svcCheck.Status || "CRITICAL").toUpperCase(),
                excludedFromDiscovery: !isPassing,
                lastCheckId: svcCheck.CheckID || "unknown",
                lastCheckOutput: svcCheck.Output || "No output",
                checks
            };
        });

        res.json({
            status: "success",
            serviceName: "payment-service",
            healthState,
            totalRegistered: instances.length,
            passingCount: passingRaw.length,
            excludedFromDiscovery: allRaw.length > 0 && passingRaw.length === 0,
            instances,
            passingInstances: instances.filter((i) => !i.excludedFromDiscovery),
            checkedAt: new Date().toISOString()
        });
    } catch (error) {
        return res.status(503).json({
            status: "error",
            serviceName: "payment-service",
            healthState: "UNKNOWN",
            totalRegistered: 0,
            passingCount: 0,
            excludedFromDiscovery: true,
            instances: [],
            passingInstances: [],
            message: `Cannot query Consul for payment-service health: ${error.message}`,
            checkedAt: new Date().toISOString()
        });
    }
});

// 13. Comprehensive Dashboard Live Overview (No fake or assumed healthy statuses)
app.get("/api/dashboard/overview", async (req, res) => {
    const consulPromise = (async () => {
        const t0 = Date.now();
        try {
            const [leaderRes, selfRes] = await Promise.all([
                axios.get(`${CONSUL_URL}/v1/status/leader`, { timeout: 2000 }),
                axios.get(`${CONSUL_URL}/v1/agent/self`, { timeout: 2000 }).catch(() => null),
            ]);
            const selfConfig = selfRes?.data?.Config || {};
            return {
                status: "PASSING",
                connected: true,
                leader: leaderRes.data || "No leader",
                datacenter: selfConfig.Datacenter || selfRes?.data?.Member?.Tags?.dc || "Unknown",
                nodeName: selfConfig.NodeName || "Unknown",
                version: selfConfig.Version || "Unknown",
                latencyMs: Date.now() - t0
            };
        } catch (err) {
            return {
                status: "UNAVAILABLE",
                connected: false,
                leader: null,
                datacenter: null,
                error: err.message
            };
        }
    })();

    const userServicePromise = (async () => {
        const t0 = Date.now();
        const fallbackHost = parseHostFromUrl(USER_SERVICE_URL, "127.0.0.1");
        let registeredAddress = null;
        try {
            const [healthRes, consulUserRes] = await Promise.all([
                axios.get(`${USER_SERVICE_URL}/health`, { timeout: 2500 }),
                axios.get(`${CONSUL_URL}/v1/health/service/user-service`, { timeout: 2000 }).catch(() => null),
            ]);
            const d = healthRes.data || {};
            const regSvc = consulUserRes?.data?.[0]?.Service;
            if (regSvc?.Address) registeredAddress = regSvc.Address;
            return {
                status: d.status === "healthy" ? "PASSING" : "CRITICAL",
                reachable: true,
                cloud: d.cloud || "AWS",
                region: d.region || AWS_REGION,
                address: registeredAddress || fallbackHost,
                registeredAddress,
                port: d.port || 8002,
                uptimeSeconds: d.uptimeSeconds ?? null,
                latencyMs: Date.now() - t0,
                checks: d.checks || null,
                timestamp: d.timestamp || new Date().toISOString()
            };
        } catch (err) {
            return {
                status: err.response?.status === 503 ? "CRITICAL" : "UNKNOWN",
                reachable: false,
                cloud: "AWS",
                region: AWS_REGION,
                address: registeredAddress || fallbackHost,
                registeredAddress,
                port: 8002,
                error: err.message
            };
        }
    })();

    const paymentConsulPromise = (async () => {
        try {
            const [allRes, passingRes] = await Promise.all([
                axios.get(`${CONSUL_URL}/v1/health/service/payment-service`, { timeout: 2500 }),
                axios.get(`${CONSUL_URL}/v1/health/service/payment-service?passing`, { timeout: 2500 }).catch(() => ({ data: [] })),
            ]);
            const allRaw = allRes.data || [];
            const passingRaw = passingRes.data || [];

            if (allRaw.length === 0) {
                return {
                    status: "UNKNOWN",
                    registered: false,
                    excludedFromDiscovery: true,
                    cloud: "AZURE",
                    region: AZURE_REGION,
                    error: "payment-service is not registered in Consul catalog"
                };
            }

            const first = allRaw[0];
            const svc = first.Service || {};
            const node = first.Node || {};
            const checks = first.Checks || [];
            const svcCheck = checks.find((c) => c.ServiceID === svc.ID) || checks[0] || {};
            const isPassing = passingRaw.length > 0;
            const tags = svc.Tags || [];

            let status = "UNKNOWN";
            if (isPassing) status = "PASSING";
            else if (checks.some((c) => c.Status === "critical")) status = "CRITICAL";
            else if (checks.some((c) => c.Status === "warning")) status = "WARNING";

            return {
                status,
                registered: true,
                excludedFromDiscovery: !isPassing,
                serviceId: svc.ID,
                serviceName: svc.Service,
                cloud: extractProviderFromTags(tags),
                region: tags.find((t) => String(t).toLowerCase().includes("india")) || AZURE_REGION,
                address: svc.Address || node.Address,
                port: svc.Port,
                tags,
                datacenter: node.Datacenter,
                passingCount: passingRaw.length,
                totalCount: allRaw.length,
                lastCheckOutput: svcCheck.Output || "No check output"
            };
        } catch (err) {
            return {
                status: "UNKNOWN",
                registered: false,
                excludedFromDiscovery: true,
                cloud: "AZURE",
                region: AZURE_REGION,
                error: `Consul check unavailable: ${err.message}`
            };
        }
    })();

    const telemetryPromise = (async () => {
        try {
            const resTel = await axios.get(`${USER_SERVICE_URL}/api/telemetry`, { timeout: 2500 });
            return {
                available: true,
                persistence: resTel.data?.persistence || "in-memory",
                storageNote: resTel.data?.storageNote || "Telemetry is stored in memory and resets when User Service restarts.",
                ...(resTel.data?.telemetry || {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    lastRequest: null,
                    recentHistory: []
                })
            };
        } catch (err) {
            return {
                available: false,
                persistence: "in-memory",
                storageNote: "User Service telemetry endpoint unreachable.",
                totalRequests: null,
                successfulRequests: null,
                failedRequests: null,
                lastRequest: null,
                recentHistory: [],
                error: err.message
            };
        }
    })();

    const [consulStatus, awsUserService, azurePaymentService, telemetry] = await Promise.all([
        consulPromise,
        userServicePromise,
        paymentConsulPromise,
        telemetryPromise
    ]);

    // Determine genuine WireGuard VPN status and whether running in LOCAL vs REMOTE mode
    const wgNet = detectWireGuardInterface();
    const paymentAddress = azurePaymentService.address || null;
    const paymentOnVpnIp = Boolean(paymentAddress && paymentAddress.startsWith("10.8.0."));
    const paymentOnRemoteHost = Boolean(paymentAddress && !isLoopbackHost(paymentAddress));
    const userOnVpnIp = Boolean(awsUserService.address && awsUserService.address.startsWith("10.8.0."));
    const userOnRemoteHost = Boolean(awsUserService.address && !isLoopbackHost(awsUserService.address));
    const remoteConfigDetected = Boolean(
        wgNet.hasWgIp ||
        paymentOnVpnIp ||
        paymentOnRemoteHost ||
        userOnVpnIp ||
        userOnRemoteHost ||
        !isLoopbackHost(CONSUL_URL) ||
        !isLoopbackHost(USER_SERVICE_URL)
    );

    const deploymentMode = remoteConfigDetected ? "REMOTE" : "LOCAL";
    let wireguardStatus = "UNKNOWN";
    let wireguardActive = false;
    let wireguardDetail = "WireGuard interface not detected on this host.";

    if (wgNet.hasWgIp && paymentOnVpnIp && azurePaymentService.status === "PASSING") {
        wireguardStatus = "CONNECTED";
        wireguardActive = true;
        wireguardDetail = `Tunnel active (${wgNet.interfaces[0]?.address || AWS_WG_IP} <-> ${paymentAddress}, UDP 51820 verified via Consul health check)`;
    } else if (wgNet.hasWgIp && (paymentOnVpnIp || azurePaymentService.registered)) {
        wireguardStatus = "DEGRADED";
        wireguardActive = false;
        wireguardDetail = `WireGuard interface present (${wgNet.interfaces.map((i) => i.address).join(", ")}), but peer ${paymentAddress || AZURE_WG_IP} health is ${azurePaymentService.status}`;
    } else if (wgNet.hasWgIp) {
        wireguardStatus = "DEGRADED";
        wireguardActive = false;
        wireguardDetail = `WireGuard interface active (${wgNet.interfaces.map((i) => `${i.name}=${i.address}`).join(", ")}), waiting for passing remote peer in Consul.`;
    } else if (paymentOnVpnIp && azurePaymentService.status === "PASSING") {
        wireguardStatus = "CONNECTED";
        wireguardActive = true;
        wireguardDetail = `Consul verified remote WireGuard peer ${paymentAddress}:${azurePaymentService.port} is passing`;
    } else if (!remoteConfigDetected) {
        wireguardStatus = "INACTIVE";
        wireguardActive = false;
        wireguardDetail = "Running in LOCAL loopback mode (127.0.0.1). No WireGuard VPN tunnel active on this host.";
    } else if (!consulStatus.connected) {
        wireguardStatus = "UNKNOWN";
        wireguardActive = false;
        wireguardDetail = "Cannot verify cross-cloud tunnel while Consul is unreachable.";
    }

    const hostWgIp = wgNet.interfaces[0]?.address || (userOnVpnIp ? awsUserService.address : remoteConfigDetected ? AWS_WG_IP : null);
    const peerWgIp = paymentOnVpnIp ? paymentAddress : remoteConfigDetected ? AZURE_WG_IP : null;

    res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        deploymentMode: {
            mode: deploymentMode,
            isRemote: remoteConfigDetected,
            vpnActive: wireguardActive,
            label: remoteConfigDetected
                ? "Remote Multi-Cloud Infrastructure (AWS <-> Azure)"
                : "Local Loopback Simulation (127.0.0.1)",
            reason: wgNet.hasWgIp
                ? `WireGuard interface detected (${wgNet.interfaces.map((i) => `${i.name}=${i.address}`).join(", ")})`
                : paymentOnVpnIp
                ? `Remote WireGuard peer ${paymentAddress} registered in Consul`
                : remoteConfigDetected
                ? "Remote cloud host/endpoint detected"
                : "All active services and Consul are running on local loopback (127.0.0.1) without WireGuard"
        },
        consul: consulStatus,
        awsUserService,
        azurePaymentService,
        wireguard: {
            active: wireguardActive,
            status: wireguardStatus,
            detail: wireguardDetail,
            awsWgIp: hostWgIp,
            azureWgIp: peerWgIp,
            configuredAwsWgIp: AWS_WG_IP,
            configuredAzureWgIp: AZURE_WG_IP,
            port: wireguardActive ? 51820 : null,
            hostInterfaceDetected: wgNet.hasWgIp
        },
        telemetry,
        architecture: {
            aws: {
                provider: remoteConfigDetected ? "AWS" : "LOCAL",
                region: remoteConfigDetected ? AWS_REGION : "localhost (127.0.0.1)",
                address: awsUserService.address || "127.0.0.1",
                wgIp: hostWgIp,
                userPort: awsUserService.port || 8002,
                consulPort: 8500
            },
            azure: {
                provider: remoteConfigDetected ? "AZURE" : "LOCAL",
                region: remoteConfigDetected ? AZURE_REGION : "localhost (127.0.0.1)",
                address: paymentAddress || (remoteConfigDetected ? AZURE_WG_IP : "127.0.0.1"),
                wgIp: peerWgIp,
                paymentPort: azurePaymentService.port || 8001
            }
        }
    });
});

// 14. Real HTTP Health Probe for Registered Services
app.post("/api/services/probe", async (req, res) => {
    const { serviceId } = req.body || {};
    if (!serviceId) {
        return res.status(400).json({ status: "error", message: "serviceId is required." });
    }

    try {
        const servicesRes = await axios.get(`${CONSUL_URL}/v1/agent/services`, { timeout: AXIOS_TIMEOUT });
        const svc = (servicesRes.data || {})[serviceId];
        if (!svc) {
            return res.status(404).json({ status: "error", message: `Service ID '${serviceId}' not found in Consul.` });
        }

        const tags = svc.Tags || [];
        const healthTag = tags.find((t) => String(t).startsWith("health:"));
        const checkPath = healthTag ? healthTag.slice(7) : "/health";
        const targetUrl = `http://${svc.Address || "127.0.0.1"}:${svc.Port}${checkPath.startsWith("/") ? checkPath : "/" + checkPath}`;

        const t0 = Date.now();
        try {
            const probeRes = await axios.get(targetUrl, { timeout: 3000 });
            return res.json({
                status: "PASSING",
                httpStatus: probeRes.status,
                latencyMs: Date.now() - t0,
                targetUrl,
                data: probeRes.data,
                checkedAt: new Date().toISOString()
            });
        } catch (probeErr) {
            return res.json({
                status: "CRITICAL",
                httpStatus: probeErr.response?.status || 0,
                latencyMs: Date.now() - t0,
                targetUrl,
                error: probeErr.message,
                data: probeErr.response?.data || null,
                checkedAt: new Date().toISOString()
            });
        }
    } catch (err) {
        return handleConsulError(err, res, `probing service '${serviceId}'`);
    }
});

// 15. AWS User Service Proxy Endpoints (Dashboard never needs to call :8002 directly or bypass gateway)
app.get("/api/users", async (req, res) => {
    try {
        const response = await axios.get(`${USER_SERVICE_URL}/api/users`, { timeout: 3000 });
        res.json(response.data);
    } catch (err) {
        res.status(503).json({
            status: "error",
            message: `AWS User Service unreachable at ${USER_SERVICE_URL}: ${err.message}`,
            users: []
        });
    }
});

app.post("/api/users/:id/pay", async (req, res) => {
    try {
        const response = await axios.post(`${USER_SERVICE_URL}/api/users/${encodeURIComponent(req.params.id)}/pay`, req.body, { timeout: 6000 });
        res.status(response.status).json(response.data);
    } catch (err) {
        const status = err.response?.status || 503;
        res.status(status).json(
            err.response?.data || {
                status: "error",
                code: "USER_SERVICE_UNAVAILABLE",
                message: `AWS User Service unreachable at ${USER_SERVICE_URL}: ${err.message}`
            }
        );
    }
});

app.get("/api/telemetry", async (req, res) => {
    try {
        const response = await axios.get(`${USER_SERVICE_URL}/api/telemetry`, { timeout: 3000 });
        res.json(response.data);
    } catch (err) {
        res.status(503).json({
            status: "offline",
            service: "user-service",
            persistence: "in-memory",
            storageNote: "User Service telemetry unavailable.",
            error: err.message,
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

// 16. Real Cross-Cloud Communication: Trigger Payment via User Service
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

// 17. Real Cross-Cloud Telemetry
app.get("/api/cross-cloud/telemetry", async (req, res) => {
    try {
        const response = await axios.get(`${USER_SERVICE_URL}/api/telemetry`, { timeout: 3000 });
        res.json(response.data);
    } catch (err) {
        res.json({
            status: "offline",
            service: "user-service",
            persistence: "in-memory",
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
