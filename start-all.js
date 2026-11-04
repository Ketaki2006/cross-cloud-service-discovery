const paymentApp = require("./payment-service");
const serverApp = require("./server");

const PAYMENT_PORT = process.env.PAYMENT_PORT || 8001;
const SERVER_PORT = process.env.PORT || 3000;

const paymentServer = paymentApp.listen(PAYMENT_PORT, () => {
    console.log(`[Payment Service] Running at http://127.0.0.1:${PAYMENT_PORT}`);
    console.log(`[Payment Service] Health check probe: http://127.0.0.1:${PAYMENT_PORT}/health`);
});

const gatewayServer = serverApp.listen(SERVER_PORT, () => {
    console.log(`[Gateway & UI]   Backend running at http://localhost:${SERVER_PORT}`);
    console.log(`[Gateway & UI]   React Web Dashboard available at http://localhost:${SERVER_PORT}`);
});

process.on("SIGINT", () => {
    console.log("\nGracefully shutting down services...");
    paymentServer.close();
    gatewayServer.close();
    process.exit(0);
});

process.on("SIGTERM", () => {
    paymentServer.close();
    gatewayServer.close();
    process.exit(0);
});

