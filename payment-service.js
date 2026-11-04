const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PAYMENT_PORT || 8001;

app.use(cors());
app.use(express.json());

// Request logger for simulated service
app.use((req, res, next) => {
    console.log(`[PaymentService-Simulated] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

let isHealthy = true;

// Root endpoint: service metadata
app.get("/", (req, res) => {
    res.json({
        service: "payment-service",
        cloudSimulation: "AWS (Simulated us-east-1)",
        environment: "local-simulation",
        note: "Simulated microservice for college mini-project demonstration. Not connected to real cloud infrastructure.",
        status: isHealthy ? "UP" : "DOWN",
        isHealthy,
        endpoints: {
            root: "/",
            health: "/health",
            simulateUnhealthy: "POST /simulate/unhealthy",
            simulateHealthy: "POST /simulate/healthy",
            simulateStatus: "GET /simulate/status"
        }
    });
});

// Health check endpoint consumed by HashiCorp Consul probe
app.get("/health", (req, res) => {
    if (!isHealthy) {
        return res.status(503).json({
            status: "critical",
            service: "payment-service",
            cloud: "AWS",
            port: PORT,
            timestamp: new Date().toISOString(),
            error: "Simulated microservice failure injected for SSD Virtual Lab experiment.",
            checks: {
                httpListener: "FAILING",
                ledgerDatabase: "DOWN (Simulated Timeout)",
                paymentGateway: "UNAVAILABLE"
            }
        });
    }

    res.status(200).json({
        status: "healthy",
        service: "payment-service",
        cloud: "AWS",
        port: PORT,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        checks: {
            httpListener: "PASSING",
            ledgerDatabase: "UP (Simulated)",
            paymentGateway: "READY"
        }
    });
});

// Fault injection endpoints for Virtual Lab Scenarios
app.post("/simulate/unhealthy", (req, res) => {
    isHealthy = false;
    console.log("[PaymentService-Simulated] Fault injected: /health will now return HTTP 503 Critical.");
    res.json({
        status: "success",
        simulatedState: "unhealthy",
        message: "Fault injected. Service is now returning HTTP 503. Consul will mark check as CRITICAL."
    });
});

app.post("/simulate/healthy", (req, res) => {
    isHealthy = true;
    console.log("[PaymentService-Simulated] Recovery triggered: /health will now return HTTP 200 OK.");
    res.json({
        status: "success",
        simulatedState: "healthy",
        message: "Recovery triggered. Service is now returning HTTP 200 OK. Consul will restore check to PASSING."
    });
});

app.get("/simulate/status", (req, res) => {
    res.json({
        service: "payment-service",
        isHealthy,
        healthEndpointStatus: isHealthy ? 200 : 503
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        service: "payment-service",
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("[PaymentService Error]", err.stack);
    res.status(500).json({
        status: "error",
        service: "payment-service",
        message: "Internal simulated payment service error."
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Payment service running at http://localhost:${PORT}`);
        console.log(`Health check probe active at http://127.0.0.1:${PORT}/health`);
    });
}

module.exports = app;
