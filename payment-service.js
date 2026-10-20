
const express = require("express");

const app = express();
const PORT = 8001;

app.get("/", (req, res) => {
    res.json({
        service: "payment-service",
        cloud: "AWS",
        message: "Payment service is running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "payment-service"
    });
});

app.listen(PORT, () => {
    console.log(`Payment service running at http://localhost:${PORT}`);
});
