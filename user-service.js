const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.USER_PORT || 8002;
const CLOUD_PROVIDER = process.env.CLOUD_PROVIDER || "AWS";
const CLOUD_REGION = process.env.CLOUD_REGION || "us-east-1";
const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";
const TARGET_SERVICE_NAME = process.env.TARGET_SERVICE_NAME || "payment-service";
const AXIOS_TIMEOUT = Number(process.env.AXIOS_TIMEOUT) || 4000;
const DB_PATH = process.env.USER_DB_PATH || path.join(__dirname, "users.db");

app.use(cors());
app.use(express.json());

// In-memory fallback telemetry
const inMemoryTelemetry = {
    total: 0,
    successful: 0,
    failed: 0,
    lastRequest: null,
    history: []
};

// Seed mock users
const SEED_USERS = [
    { id: "usr_101", name: "Ketaki", email: "ketaki@cloudmesh.internal", tier: "Premium", balance: 1450.00 },
    { id: "usr_102", name: "Alex Chen", email: "alex.chen@cloudmesh.internal", tier: "Standard", balance: 320.50 },
    { id: "usr_103", name: "DevOps Bot", email: "bot@cloudmesh.internal", tier: "System", balance: 9999.00 }
];

const MOCK_USERS = {};
SEED_USERS.forEach((u) => {
    MOCK_USERS[u.id] = { ...u };
});

// SQLite initialization
let sqlite3;
try {
    sqlite3 = require("sqlite3").verbose();
} catch (e) {
    sqlite3 = null;
    console.warn(`[UserService-${CLOUD_PROVIDER}] sqlite3 not available, running in in-memory mode.`);
}

let db = null;

function initDatabase() {
    if (!sqlite3) return;

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error(`[UserService-${CLOUD_PROVIDER}] SQLite connection failed (${DB_PATH}):`, err.message);
            db = null;
            return;
        }
        console.log(`[UserService-${CLOUD_PROVIDER}] Connected to persistent SQLite database at ${DB_PATH}`);

        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    tier TEXT NOT NULL,
                    balance REAL NOT NULL DEFAULT 0.0
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'USD',
                    description TEXT,
                    source_cloud TEXT NOT NULL DEFAULT 'AWS',
                    target_cloud TEXT NOT NULL DEFAULT 'AZURE',
                    target_address TEXT,
                    discovered_service_id TEXT,
                    latency_ms INTEGER,
                    status TEXT NOT NULL,
                    error TEXT,
                    timestamp TEXT NOT NULL
                )
            `);

            db.get("SELECT COUNT(*) as count FROM users", (countErr, row) => {
                if (countErr) {
                    console.error(`[UserService-${CLOUD_PROVIDER}] Error querying users table:`, countErr.message);
                    return;
                }
                if (!row || row.count === 0) {
                    console.log(`[UserService-${CLOUD_PROVIDER}] Seeding default users into users.db...`);
                    const stmt = db.prepare("INSERT INTO users (id, name, email, tier, balance) VALUES (?, ?, ?, ?, ?)");
                    SEED_USERS.forEach((u) => {
                        stmt.run([u.id, u.name, u.email, u.tier, u.balance]);
                    });
                    stmt.finalize();
                } else {
                    console.log(`[UserService-${CLOUD_PROVIDER}] SQLite users table ready with ${row.count} user(s).`);
                }
            });
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

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(null);
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
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
        database: {
            engine: db ? "SQLite" : "In-Memory",
            file: db ? "users.db" : null
        },
        endpoints: {
            root: "/",
            health: "/health",
            users: "/api/users",
            userById: "/api/users/:id",
            pay: "POST /api/users/:id/pay",
            telemetry: "/api/telemetry",
            dbStatus: "/api/database/status"
        }
    });
});

// Health check endpoint probed by Consul
app.get("/health", async (req, res) => {
    let dbStatus = "PASSING";
    if (db) {
        try {
            await dbGet("SELECT 1");
        } catch {
            dbStatus = "FAILING";
        }
    } else {
        dbStatus = "IN_MEMORY";
    }

    res.status(200).json({
        status: "healthy",
        service: "user-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        port: Number(PORT),
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            engine: db ? "SQLite" : "In-Memory",
            file: db ? "users.db" : null,
            status: dbStatus
        },
        checks: {
            httpListener: "PASSING",
            database: db ? `CONNECTED (SQLite users.db: ${dbStatus})` : "CONNECTED (In-Memory)",
            consulAgent: "CONFIGURED"
        }
    });
});

// Database inspection endpoint
app.get("/api/database/status", async (req, res) => {
    try {
        if (!db) {
            return res.json({
                status: "active",
                engine: "In-Memory",
                tables: { users: Object.keys(MOCK_USERS).length, transactions: inMemoryTelemetry.total },
                users: Object.values(MOCK_USERS)
            });
        }
        const userCount = await dbGet("SELECT COUNT(*) as count FROM users");
        const txnCount = await dbGet("SELECT COUNT(*) as count FROM transactions");
        const allUsers = await dbAll("SELECT id, name, email, tier, balance FROM users ORDER BY id ASC");
        res.json({
            status: "active",
            engine: "SQLite 3",
            dbFile: DB_PATH,
            tables: {
                users: userCount ? userCount.count : 0,
                transactions: txnCount ? txnCount.count : 0
            },
            users: allUsers
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// List users (reads from SQLite)
app.get("/api/users", async (req, res) => {
    try {
        if (db) {
            const rows = await dbAll("SELECT id, name, email, tier, balance FROM users ORDER BY id ASC");
            if (rows && rows.length > 0) {
                return res.json({
                    status: "success",
                    cloud: CLOUD_PROVIDER,
                    database: "SQLite (users.db)",
                    count: rows.length,
                    users: rows
                });
            }
        }
    } catch (err) {
        console.error(`[UserService-${CLOUD_PROVIDER}] Error querying SQLite users:`, err.message);
    }

    res.json({
        status: "success",
        cloud: CLOUD_PROVIDER,
        database: "In-Memory",
        count: Object.keys(MOCK_USERS).length,
        users: Object.values(MOCK_USERS)
    });
});

// Get specific user
app.get("/api/users/:id", async (req, res) => {
    const userId = req.params.id;
    try {
        if (db) {
            const row = await dbGet("SELECT id, name, email, tier, balance FROM users WHERE id = ?", [userId]);
            if (row) {
                return res.json({ status: "success", cloud: CLOUD_PROVIDER, database: "SQLite", user: row });
            }
        }
    } catch (err) {
        console.error(`[UserService-${CLOUD_PROVIDER}] Error querying SQLite user ${userId}:`, err.message);
    }

    const user = MOCK_USERS[userId];
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: `User with ID '${userId}' not found.`
        });
    }
    res.json({ status: "success", cloud: CLOUD_PROVIDER, database: "In-Memory", user });
});

// Cross-Cloud Communication: User triggers payment, discovered via Consul
app.post("/api/users/:id/pay", async (req, res) => {
    const userId = req.params.id;
    const { amount, currency, description } = req.body || {};

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
            status: "error",
            field: "amount",
            message: "A positive payment amount is required."
        });
    }

    // Lookup user in DB or memory
    let user = null;
    if (db) {
        try {
            user = await dbGet("SELECT id, name, email, tier, balance FROM users WHERE id = ?", [userId]);
        } catch (e) {
            console.error(`[UserService] DB user lookup failed:`, e.message);
        }
    }
    if (!user) {
        user = MOCK_USERS[userId] || { id: userId, name: "External User", balance: 500 };
    }

    // Check balance
    if (user.balance < numAmount) {
        return res.status(400).json({
            status: "error",
            field: "amount",
            message: `Insufficient balance: user '${userId}' has $${Number(user.balance).toFixed(2)}, requested payment is $${numAmount.toFixed(2)}.`
        });
    }

    const startTime = Date.now();
    inMemoryTelemetry.total++;

    // STEP 1: Query Consul for healthy Payment Service instances
    let instances = [];
    try {
        const discoveryUrl = `${CONSUL_URL}/v1/health/service/${encodeURIComponent(TARGET_SERVICE_NAME)}?passing=true`;
        console.log(`[UserService-${CLOUD_PROVIDER}] Discovering '${TARGET_SERVICE_NAME}' via Consul at ${discoveryUrl}`);
        const consulRes = await axios.get(discoveryUrl, { timeout: AXIOS_TIMEOUT });
        instances = consulRes.data || [];
    } catch (err) {
        console.error(`[UserService-${CLOUD_PROVIDER}] Failed to query Consul registry:`, err.message);
        inMemoryTelemetry.failed++;
        const record = {
            timestamp: new Date().toISOString(),
            status: "FAILED_CONSUL_UNREACHABLE",
            userId,
            amount: numAmount,
            error: `Consul service registry unreachable at ${CONSUL_URL}: ${err.message}`
        };
        inMemoryTelemetry.lastRequest = record;
        inMemoryTelemetry.history.unshift(record);
        if (inMemoryTelemetry.history.length > 20) inMemoryTelemetry.history.pop();

        if (db) {
            try {
                await dbRun(
                    `INSERT INTO transactions (id, user_id, amount, currency, description, source_cloud, target_cloud, target_address, discovered_service_id, latency_ms, status, error, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [`fail_${Date.now()}`, userId, numAmount, currency || "USD", description || "Dashboard demo payment", CLOUD_PROVIDER, "AZURE", null, null, Date.now() - startTime, "FAILED_CONSUL_UNREACHABLE", err.message, record.timestamp]
                );
            } catch {}
        }

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
        inMemoryTelemetry.failed++;
        const record = {
            timestamp: new Date().toISOString(),
            status: "FAILED_NO_HEALTHY_INSTANCES",
            userId,
            amount: numAmount,
            error: `No healthy instance of '${TARGET_SERVICE_NAME}' found in Consul.`
        };
        inMemoryTelemetry.lastRequest = record;
        inMemoryTelemetry.history.unshift(record);
        if (inMemoryTelemetry.history.length > 20) inMemoryTelemetry.history.pop();

        if (db) {
            try {
                await dbRun(
                    `INSERT INTO transactions (id, user_id, amount, currency, description, source_cloud, target_cloud, target_address, discovered_service_id, latency_ms, status, error, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [`fail_${Date.now()}`, userId, numAmount, currency || "USD", description || "Dashboard demo payment", CLOUD_PROVIDER, "AZURE", null, null, Date.now() - startTime, "FAILED_NO_HEALTHY_INSTANCES", record.error, record.timestamp]
                );
            } catch {}
        }

        return res.status(503).json({
            status: "error",
            code: "NO_HEALTHY_SERVICE_INSTANCES",
            service: "user-service",
            cloud: CLOUD_PROVIDER,
            targetService: TARGET_SERVICE_NAME,
            message: `Service discovery failed: no passing health check instances of '${TARGET_SERVICE_NAME}' registered in Consul.`
        });
    }

    // STEP 3: Select an instance and extract network address
    const selected = instances[0];
    const targetService = selected.Service || {};
    const targetNode = selected.Node || {};
    const targetHost = targetService.Address || targetNode.Address || "127.0.0.1";
    const targetPort = targetService.Port;
    const targetTags = targetService.Tags || [];
    const matchedCloudTag = targetTags.find((t) => ["AWS", "AZURE", "GCP", "HYBRID", "LOCAL"].includes(String(t).toUpperCase()));
    const targetInstanceId = targetService.ID || "unknown";

    if (!targetPort) {
        inMemoryTelemetry.failed++;
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
        const txnId = paymentRes.data?.transactionId || `txn_${Date.now()}`;

        // Deduct balance in SQLite or memory
        let updatedBalance = user.balance - numAmount;
        if (db) {
            try {
                await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [numAmount, userId]);
                const updatedRow = await dbGet("SELECT balance FROM users WHERE id = ?", [userId]);
                if (updatedRow) updatedBalance = updatedRow.balance;
            } catch (dbErr) {
                console.error(`[UserService-${CLOUD_PROVIDER}] Failed to update balance in DB:`, dbErr.message);
            }
        } else if (MOCK_USERS[userId]) {
            MOCK_USERS[userId].balance = Math.max(0, MOCK_USERS[userId].balance - numAmount);
            updatedBalance = MOCK_USERS[userId].balance;
        }

        // Record in SQLite transactions table
        if (db) {
            try {
                await dbRun(
                    `INSERT INTO transactions (id, user_id, amount, currency, description, source_cloud, target_cloud, target_address, discovered_service_id, latency_ms, status, error, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [txnId, userId, numAmount, currency || "USD", paymentPayload.description, CLOUD_PROVIDER, targetCloud, `${targetHost}:${targetPort}`, targetInstanceId, latencyMs, "SUCCESS", null, new Date().toISOString()]
                );
            } catch (dbErr) {
                console.error(`[UserService-${CLOUD_PROVIDER}] Failed to record transaction in DB:`, dbErr.message);
            }
        }

        inMemoryTelemetry.successful++;
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
            transactionId: txnId,
            latencyMs
        };
        inMemoryTelemetry.lastRequest = record;
        inMemoryTelemetry.history.unshift(record);
        if (inMemoryTelemetry.history.length > 20) inMemoryTelemetry.history.pop();

        console.log(`[UserService-${CLOUD_PROVIDER}] Cross-Cloud Payment SUCCESS via ${targetHost}:${targetPort} in ${latencyMs}ms! Txn: ${txnId}, Remaining Balance: $${updatedBalance.toFixed(2)}`);

        return res.status(200).json({
            status: "success",
            crossCloud: true,
            source: {
                service: "user-service",
                cloud: CLOUD_PROVIDER,
                region: CLOUD_REGION,
                port: Number(PORT),
                user: { id: user.id, name: user.name, balance: updatedBalance }
            },
            discoveredTarget: {
                service: TARGET_SERVICE_NAME,
                instanceId: targetInstanceId,
                cloud: targetCloud,
                address: targetHost,
                port: targetPort,
                url: paymentUrl
            },
            database: db ? "SQLite (persisted)" : "In-Memory",
            latencyMs,
            payment: paymentRes.data,
            timestamp: new Date().toISOString()
        });

    } catch (paymentErr) {
        const latencyMs = Date.now() - startTime;
        inMemoryTelemetry.failed++;
        const targetCloud = (matchedCloudTag || "AZURE").toUpperCase();
        const errMsg = paymentErr.response?.data?.message || paymentErr.message;
        const errStatus = paymentErr.response?.status || 502;
        const timestamp = new Date().toISOString();

        const record = {
            timestamp,
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
        inMemoryTelemetry.lastRequest = record;
        inMemoryTelemetry.history.unshift(record);
        if (inMemoryTelemetry.history.length > 20) inMemoryTelemetry.history.pop();

        if (db) {
            try {
                await dbRun(
                    `INSERT INTO transactions (id, user_id, amount, currency, description, source_cloud, target_cloud, target_address, discovered_service_id, latency_ms, status, error, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [`fail_${Date.now()}`, userId, numAmount, currency || "USD", description || "Dashboard demo payment", CLOUD_PROVIDER, targetCloud, `${targetHost}:${targetPort}`, targetInstanceId, latencyMs, "FAILED_PAYMENT_ERROR", errMsg, timestamp]
                );
            } catch {}
        }

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
app.get("/api/telemetry", async (req, res) => {
    try {
        if (db) {
            const stats = await dbGet(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN status != 'SUCCESS' THEN 1 ELSE 0 END) as failed
                FROM transactions
            `);
            const recentRows = await dbAll(`
                SELECT 
                    timestamp,
                    status,
                    user_id as userId,
                    amount,
                    currency,
                    description,
                    source_cloud as sourceCloud,
                    target_cloud as targetCloud,
                    discovered_service_id as discoveredServiceId,
                    target_address as targetAddress,
                    id as transactionId,
                    latency_ms as latencyMs,
                    error
                FROM transactions 
                ORDER BY timestamp DESC 
                LIMIT 20
            `);

            const total = stats ? (Number(stats.total) || 0) : 0;
            const successful = stats ? (Number(stats.successful) || 0) : 0;
            const failed = stats ? (Number(stats.failed) || 0) : 0;
            const lastRequest = recentRows.length > 0 ? recentRows[0] : null;

            return res.json({
                status: "success",
                service: "user-service",
                cloud: CLOUD_PROVIDER,
                region: CLOUD_REGION,
                persistence: "sqlite",
                storageNote: "Persistent SQLite Database (AWS: users.db | Azure: payments.db)",
                database: {
                    engine: "SQLite 3",
                    file: "users.db",
                    recordsCount: total
                },
                telemetry: {
                    totalRequests: total,
                    successfulRequests: successful,
                    failedRequests: failed,
                    lastRequest,
                    recentHistory: recentRows
                }
            });
        }
    } catch (dbErr) {
        console.error(`[UserService-${CLOUD_PROVIDER}] Error reading telemetry from DB:`, dbErr.message);
    }

    res.json({
        status: "success",
        service: "user-service",
        cloud: CLOUD_PROVIDER,
        region: CLOUD_REGION,
        persistence: "in-memory",
        storageNote: "Telemetry is stored in memory inside the AWS User Service process and resets if the service restarts.",
        telemetry: {
            totalRequests: inMemoryTelemetry.total,
            successfulRequests: inMemoryTelemetry.successful,
            failedRequests: inMemoryTelemetry.failed,
            lastRequest: inMemoryTelemetry.lastRequest,
            recentHistory: inMemoryTelemetry.history
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
        console.log(`Database: ${db ? `SQLite (${DB_PATH})` : 'In-Memory fallback'}`);
        console.log(`============================================================`);
    });
}

module.exports = app;
