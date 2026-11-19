const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PAYMENT_PORT || 8001;
const CLOUD_PROVIDER = process.env.CLOUD_PROVIDER || "AZURE";
const CLOUD_REGION = process.env.CLOUD_REGION || "Central India";
const DB_PATH = process.env.PAYMENT_DB_PATH || path.join(__dirname, "payments.db");

app.use(cors());
app.use(express.json());

// In-memory fallback payments list
const inMemoryPayments = [];

// SQLite initialization
let sqlite3;
try {
    sqlite3 = require("sqlite3").verbose();
} catch (e) {
    sqlite3 = null;
    console.warn(`[PaymentService-${CLOUD_PROVIDER}] sqlite3 not available, running in in-memory mode.`);
}

let db = null;

function initDatabase() {
    if (!sqlite3) return;

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error(`[PaymentService-${CLOUD_PROVIDER}] SQLite connection error (${DB_PATH}):`, err.message);
            db = null;
            return;
        }
        console.log(`[PaymentService-${CLOUD_PROVIDER}] Connected to persistent SQLite database at ${DB_PATH}`);

        db.run(`
            CREATE TABLE IF NOT EXISTS processed_payments (
                transaction_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                description TEXT,
                status TEXT NOT NULL DEFAULT 'COMPLETED',
                cloud TEXT NOT NULL DEFAULT 'AZURE',
                region TEXT NOT NULL DEFAULT 'Central India',
                processed_at TEXT NOT NULL
            )
        `, (createErr) => {
            if (createErr) {
                console.error(`[PaymentService-${CLOUD_PROVIDER}] Error creating processed_payments table:`, createErr.message);
            } else {
                console.log(`[PaymentService-${CLOUD_PROVIDER}] Table 'processed_payments' ready.`);
            }
        });
    });
}

initDatabase();

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve({ changes: 0 });
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(null);
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

// Request logger
app.use((req, res, next) => {
    console.log(`[PaymentService-${CLOUD_PROVIDER}] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

let isHealthy = true;

// Root endpoint: service metadata
app.get("/", (req, res) => {
    res.json({
        service: "payment-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        cloudSimulation: `${CLOUD_PROVIDER} (${CLOUD_REGION})`,
        environment: process.env.NODE_ENV || "production",
        note: "Simulated transaction processor for college mini-project demonstration (no real money processed).",
        status: isHealthy ? "UP" : "DOWN",
        isHealthy,
        database: {
            engine: db ? "SQLite" : "In-Memory",
            file: db ? "payments.db" : null
        },
        endpoints: {
            root: "/",
            health: "/health",
            processPayment: "POST /api/payments/process",
            listPayments: "GET /api/payments",
            simulateUnhealthy: "POST /simulate/unhealthy",
            simulateHealthy: "POST /simulate/healthy",
            simulateStatus: "GET /simulate/status"
        }
    });
});

// Health check endpoint consumed by HashiCorp Consul probe
app.get("/health", async (req, res) => {
    if (!isHealthy) {
        return res.status(503).json({
            status: "critical",
            service: "payment-service",
            cloud: CLOUD_PROVIDER,
            region: CLOUD_REGION,
            port: Number(PORT),
            timestamp: new Date().toISOString(),
            error: "Service failure injected via /simulate/unhealthy.",
            checks: {
                httpListener: "FAILING",
                ledgerDatabase: "DOWN (Simulated Timeout)",
                paymentGateway: "UNAVAILABLE"
            }
        });
    }

    let dbOk = true;
    if (db) {
        try {
            await dbGet("SELECT 1");
        } catch {
            dbOk = false;
        }
    }

    res.status(200).json({
        status: "healthy",
        service: "payment-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        port: Number(PORT),
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            engine: db ? "SQLite" : "In-Memory",
            file: db ? "payments.db" : null,
            status: dbOk ? "CONNECTED" : "ERROR"
        },
        checks: {
            httpListener: "PASSING",
            ledgerDatabase: db ? (dbOk ? "UP (SQLite payments.db)" : "WARNING (DB Error)") : "UP (In-Memory)",
            paymentGateway: "READY"
        }
    });
});

// Real Cross-Cloud Payment Processing Endpoint
app.post("/api/payments/process", async (req, res) => {
    const { userId, amount, currency, description } = req.body || {};

    if (!userId || typeof userId !== "string" || !userId.trim()) {
        return res.status(400).json({
            status: "error",
            field: "userId",
            message: "User ID is required to process payment."
        });
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
            status: "error",
            field: "amount",
            message: "Amount must be a positive number."
        });
    }

    if (!isHealthy) {
        console.log(`[PaymentService-${CLOUD_PROVIDER}] Rejected payment for user ${userId}: Service is unhealthy (503).`);
        return res.status(503).json({
            status: "error",
            error: "PAYMENT_SERVICE_UNAVAILABLE",
            service: "payment-service",
            cloud: CLOUD_PROVIDER,
            region: CLOUD_REGION,
            message: "Payment backend is currently unhealthy (simulated outage)."
        });
    }

    const transactionId = `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const processedAt = new Date().toISOString();

    const paymentRecord = {
        transactionId,
        userId: userId.trim(),
        amount: numAmount,
        currency: currency || "USD",
        description: description || "Dashboard demo payment",
        status: "COMPLETED",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        processedAt
    };

    if (db) {
        try {
            await dbRun(`
                INSERT INTO processed_payments (transaction_id, user_id, amount, currency, description, status, cloud, region, processed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                transactionId,
                paymentRecord.userId,
                numAmount,
                paymentRecord.currency,
                paymentRecord.description,
                "COMPLETED",
                CLOUD_PROVIDER,
                CLOUD_REGION,
                processedAt
            ]);
            console.log(`[PaymentService-${CLOUD_PROVIDER}] Persisted payment ${transactionId} to SQLite (${DB_PATH}).`);
        } catch (dbErr) {
            console.error(`[PaymentService-${CLOUD_PROVIDER}] Database insert failed:`, dbErr.message);
        }
    } else {
        inMemoryPayments.unshift(paymentRecord);
        if (inMemoryPayments.length > 50) inMemoryPayments.pop();
    }

    console.log(`[PaymentService-${CLOUD_PROVIDER}] Processed payment of ${numAmount} ${currency || "USD"} for user ${userId}. Txn ID: ${transactionId}`);

    res.status(200).json({
        status: "success",
        transactionId,
        userId: userId.trim(),
        amount: numAmount,
        currency: currency || "USD",
        description: description || "Dashboard demo payment",
        service: "payment-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        database: db ? "SQLite (payments.db)" : "In-Memory",
        processedAt,
        message: "Payment processed and recorded into persistent SQLite ledger across clouds"
    });
});

// List processed payments from SQLite
app.get("/api/payments", async (req, res) => {
    try {
        if (db) {
            const rows = await dbAll("SELECT * FROM processed_payments ORDER BY processed_at DESC LIMIT 50");
            return res.json({
                status: "success",
                service: "payment-service",
                cloud: CLOUD_PROVIDER,
                region: CLOUD_REGION,
                database: "SQLite (payments.db)",
                count: rows.length,
                payments: rows
            });
        }
    } catch (err) {
        console.error(`[PaymentService-${CLOUD_PROVIDER}] Error querying SQLite payments:`, err.message);
    }

    res.json({
        status: "success",
        service: "payment-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        database: "In-Memory",
        count: inMemoryPayments.length,
        payments: inMemoryPayments
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
        console.log(`Database: ${db ? `SQLite (${DB_PATH})` : 'In-Memory fallback'}`);
    });
}

module.exports = app;
