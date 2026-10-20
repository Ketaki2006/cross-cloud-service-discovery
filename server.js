const cors = require("cors");
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;
const CONSUL_URL = "http://localhost:8500";

app.use(express.json());
app.use(cors());

// 1. Test backend
app.get("/api", (req, res) => {
    res.json({
        message: "Cross-Cloud Service Discovery Registry backend is running!",
        status: "success"
    });
});

// 2. Get all registered services
app.get("/api/services", async (req, res) => {
    try {
        const response = await axios.get(
            `${CONSUL_URL}/v1/agent/services`
        );

        res.json({
            status: "success",
            services: response.data
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Could not connect to Consul. Check that Consul is running."
        });
    }
});

// 3. Register payment service with health check
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

        if (!name || !id || !address || !port || !checkPath) {
            return res.status(400).json({
                status: "error",
                message: "Please fill in all required fields."
            });
        }

        const service = {
            ID: id,
            Name: name,
            Address: address,
            Port: Number(port),
            Tags: [provider, ...(tags || [])],
            Check: {
                HTTP: `http://${address}:${port}${checkPath}`,
                Interval: interval || "10s",
                Timeout: timeout || "2s"
            }
        };

        await axios.put(
            `${CONSUL_URL}/v1/agent/service/register`,
            service
        );

        res.json({
            status: "success",
            message: `${name} registered successfully!`,
            service
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Registration failed. Check that Consul is running."
        });
    }
});

// 4. Discover service by name
app.get("/api/services/:name", async (req, res) => {
    try {
        const serviceName = req.params.name;

        const response = await axios.get(
            `${CONSUL_URL}/v1/health/service/${encodeURIComponent(serviceName)}`
        );

        res.json({
            status: "success",
            serviceName,
            instances: response.data
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Service discovery failed."
        });
    }
});

// 5. Test route
app.get("/api/test-route", (req, res) => {
    res.json({
        message: "Test route works!"
    });
});

// Start backend
app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
