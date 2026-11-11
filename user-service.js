const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.USER_PORT || 8002;
const CLOUD_PROVIDER = process.env.CLOUD_PROVIDER || "AWS";
const CLOUD_REGION = process.env.CLOUD_REGION || "us-east-1";
const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";
const TARGET_SERVICE_NAME = process.env.TARGET_SERVICE_NAME || "payment-service";
const AXIOS_TIMEOUT = Number(process.env.AXIOS_TIMEOUT) || 4000;

app.use(cors());
app.use(express.json());

// In-memory telemetry log for real cross-cloud transactions
const telemetry = {
    total: 0,
    successful: 0,
    failed: 0,
    lastRequest: null,
    history: []
};

// Sample mock users
const MOCK_USERS = {
    "usr_101": { id: "usr_101", name: "Ketaki", email: "ketaki@cloudmesh.internal", tier: "Premium", balance: 1450.00 },
    "usr_102": { id: "usr_102", name: "Alex Chen", email: "alex.chen@cloudmesh.internal", tier: "Standard", balance: 320.50 },
    "usr_103": { id: "usr_103", name: "DevOps Bot", email: "bot@cloudmesh.internal", tier: "System", balance: 9999.00 }
};

// Request Logger
app.use((req, res, next) => {
    console.log(`[UserService-${CLOUD_PROVIDER}] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

// Root metadata
app.get("/", (req, res) => {
    res.json({
        service: "user-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        port: Number(PORT),
        consulUrl: CONSUL_URL,
        targetPaymentService: TARGET_SERVICE_NAME,
        status: "RUNNING",
        endpoints: {
            root: "/",
            health: "/health",
            users: "/api/users",
            userById: "/api/users/:id",
            pay: "POST /api/users/:id/pay",
            telemetry: "/api/telemetry"
        }
    });
});

// Health check endpoint probed by Consul
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        service: "user-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        port: Number(PORT),
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        checks: {
            httpListener: "PASSING",
            database: "CONNECTED (In-Memory)",
            consulAgent: "CONFIGURED"
        }
    });
});

// List mock users
app.get("/api/users", (req, res) => {
    res.json({
        status: "success",
        cloud: CLOUD_PROVIDER,
        count: Object.keys(MOCK_USERS).length,
        users: Object.values(MOCK_USERS)
    });
});

// Get specific user
app.get("/api/users/:id", (req, res) => {
    const user = MOCK_USERS[req.params.id];
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: `User with ID '${req.params.id}' not found.`
        });
    }
    res.json({ status: "success", cloud: CLOUD_PROVIDER, user });
});

// Cross-Cloud Communication: User triggers payment, discovered via Consul
app.post("/api/users/:id/pay", async (req, res) => {
    const userId = req.params.id;
    const user = MOCK_USERS[userId] || { id: userId, name: "External User", balance: 500 };
    const { amount, currency, description } = req.body || {};

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
            status: "error",
            field: "amount",
            message: "A positive payment amount is required."
        });
    }

    const startTime = Date.now();
    telemetry.total++;

    // STEP 1: Query Consul for healthy Payment Service instances (Dynamic Service Discovery)
    let instances = [];
    try {
        const discoveryUrl = `${CONSUL_URL}/v1/health/service/${encodeURIComponent(TARGET_SERVICE_NAME)}?passing=true`;
        console.log(`[UserService-${CLOUD_PROVIDER}] Discovering '${TARGET_SERVICE_NAME}' via Consul at ${discoveryUrl}`);
        const consulRes = await axios.get(discoveryUrl, { timeout: AXIOS_TIMEOUT });
        instances = consulRes.data || [];
    } catch (err) {
        console.error(`[UserService-${CLOUD_PROVIDER}] Failed to query Consul registry:`, err.message);
        telemetry.failed++;
        const record = {
            timestamp: new Date().toISOString(),
            status: "FAILED_CONSUL_UNREACHABLE",
            userId,
            amount: numAmount,
            error: `Consul service registry unreachable at ${CONSUL_URL}: ${err.message}`
        };
        telemetry.lastRequest = record;
        telemetry.history.unshift(record);
        if (telemetry.history.length > 20) telemetry.history.pop();

        return res.status(503).json({
            status: "error",
            code: "REGISTRY_UNAVAILABLE",
            message: `Consul service registry at ${CONSUL_URL} is unreachable.`,
            error: err.message
        });
    }

    // STEP 2: Validate discovery results
    if (!instances || instances.length === 0) {
        console.warn(`[UserService-${CLOUD_PROVIDER}] Discovery returned 0 healthy instances for '${TARGET_SERVICE_NAME}'.`);
        telemetry.failed++;
        const record = {
            timestamp: new Date().toISOString(),
            status: "FAILED_NO_HEALTHY_INSTANCES",
            userId,
            amount: numAmount,
            error: `No healthy instance of '${TARGET_SERVICE_NAME}' found in Consul.`
        };
        telemetry.lastRequest = record;
        telemetry.history.unshift(record);
        if (telemetry.history.length > 20) telemetry.history.pop();

        return res.status(503).json({
            status: "error",
            code: "NO_HEALTHY_SERVICE_INSTANCES",
            service: "user-service",
            cloud: CLOUD_PROVIDER,
            targetService: TARGET_SERVICE_NAME,
            message: `Service discovery failed: no passing health check instances of '${TARGET_SERVICE_NAME}' registered in Consul.`
        });
    }

    // STEP 3: Select an instance (first healthy or round-robin) and extract network address
    const selected = instances[0];
    const targetService = selected.Service || {};
    const targetNode = selected.Node || {};
    
    // Favor Service.Address, fall back to Node.Address, default to localhost
    const targetHost = targetService.Address || targetNode.Address || "127.0.0.1";
    const targetPort = targetService.Port;
    const targetTags = targetService.Tags || [];
    const matchedCloudTag = targetTags.find(t => ["AWS", "AZURE", "GCP", "HYBRID", "LOCAL"].includes(String(t).toUpperCase()));
    const targetInstanceId = targetService.ID || "unknown";

    if (!targetPort) {
        telemetry.failed++;
        return res.status(502).json({
            status: "error",
            message: `Discovered instance '${targetInstanceId}' has no valid port registered in Consul.`
        });
    }

    const paymentUrl = `http://${targetHost}:${targetPort}/api/payments/process`;
    console.log(`[UserService-${CLOUD_PROVIDER}] Dynamic Discovery SUCCESS: Found ${targetInstanceId} at ${targetHost}:${targetPort}. Forwarding payment...`);

    // STEP 4: Initiate Cross-Cloud HTTP Request to Payment Service
    try {
        const paymentPayload = {
            userId,
            amount: numAmount,
            currency: currency || "USD",
            description: description || "Dashboard demo payment"
        };

        const paymentRes = await axios.post(paymentUrl, paymentPayload, { timeout: AXIOS_TIMEOUT });
        const latencyMs = Date.now() - startTime;
        const targetCloud = (matchedCloudTag || paymentRes.data?.cloud || "AZURE").toUpperCase();

        telemetry.successful++;
        const record = {
            timestamp: new Date().toISOString(),
            status: "SUCCESS",
            userId,
            amount: numAmount,
            currency: currency || "USD",
            description: paymentPayload.description,
            sourceCloud: CLOUD_PROVIDER,
            targetCloud,
            discoveredServiceId: targetInstanceId,
            targetAddress: `${targetHost}:${targetPort}`,
            transactionId: paymentRes.data.transactionId,
            latencyMs
        };
        telemetry.lastRequest = record;
        telemetry.history.unshift(record);
        if (telemetry.history.length > 20) telemetry.history.pop();

        console.log(`[UserService-${CLOUD_PROVIDER}] Cross-Cloud Payment SUCCESS via ${targetHost}:${targetPort} in ${latencyMs}ms! Txn: ${paymentRes.data.transactionId}`);

        return res.status(200).json({
            status: "success",
            crossCloud: true,
            source: {
                service: "user-service",
                cloud: CLOUD_PROVIDER,
                region: CLOUD_REGION,
                port: Number(PORT),
                user: { id: user.id, name: user.name }
            },
            discoveredTarget: {
                service: TARGET_SERVICE_NAME,
                instanceId: targetInstanceId,
                cloud: targetCloud,
                address: targetHost,
                port: targetPort,
                url: paymentUrl
            },
            latencyMs,
            payment: paymentRes.data,
            timestamp: new Date().toISOString()
        });

    } catch (paymentErr) {
        const latencyMs = Date.now() - startTime;
        telemetry.failed++;
        const targetCloud = (matchedCloudTag || "AZURE").toUpperCase();
        const errMsg = paymentErr.response?.data?.message || paymentErr.message;
        const errStatus = paymentErr.response?.status || 502;

        const record = {
            timestamp: new Date().toISOString(),
            status: "FAILED_PAYMENT_ERROR",
            userId,
            amount: numAmount,
            currency: currency || "USD",
            description: description || "Dashboard demo payment",
            sourceCloud: CLOUD_PROVIDER,
            targetCloud,
            discoveredServiceId: targetInstanceId,
            targetAddress: `${targetHost}:${targetPort}`,
            latencyMs,
            error: errMsg
        };
        telemetry.lastRequest = record;
        telemetry.history.unshift(record);
        if (telemetry.history.length > 20) telemetry.history.pop();

        console.error(`[UserService-${CLOUD_PROVIDER}] Cross-Cloud Request to ${paymentUrl} failed: ${errMsg}`);

        return res.status(errStatus).json({
            status: "error",
            code: "CROSS_CLOUD_COMMUNICATION_FAILED",
            sourceCloud: CLOUD_PROVIDER,
            targetCloud,
            discoveredServiceId: targetInstanceId,
            discoveredAddress: `${targetHost}:${targetPort}`,
            latencyMs,
            message: `Discovered Payment Service at ${targetHost}:${targetPort}, but payment execution failed: ${errMsg}`,
            details: paymentErr.response?.data || null
        });
    }
});

// Telemetry endpoint to observe cross-cloud activity
app.get("/api/telemetry", (req, res) => {
    res.json({
        status: "success",
        service: "user-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        persistence: "in-memory",
        storageNote: "Telemetry is stored in memory inside the AWS User Service process and resets if the service restarts.",
        telemetry: {
            totalRequests: telemetry.total,
            successfulRequests: telemetry.successful,
            failedRequests: telemetry.failed,
            lastRequest: telemetry.lastRequest,
            recentHistory: telemetry.history
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        service: "user-service",
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`============================================================`);
        console.log(`User Service [${CLOUD_PROVIDER}] running at http://localhost:${PORT}`);
        console.log(`Health check: http://127.0.0.1:${PORT}/health`);
        console.log(`Payment Target via Consul: ${TARGET_SERVICE_NAME}`);
        console.log(`============================================================`);
    });
}

module.exports = app;

