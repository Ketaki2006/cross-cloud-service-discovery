const paymentApp = require("./payment-service");
const userApp = require("./user-service");
const serverApp = require("./server");

const PAYMENT_PORT = process.env.PAYMENT_PORT || 8001;
const USER_PORT = process.env.USER_PORT || 8002;
const SERVER_PORT = process.env.PORT || 3000;

const paymentServer = paymentApp.listen(PAYMENT_PORT, () => {
    console.log(`[Payment Service - ${process.env.CLOUD_PROVIDER || 'AZURE'}] Running at http://127.0.0.1:${PAYMENT_PORT}`);
    console.log(`[Payment Service - ${process.env.CLOUD_PROVIDER || 'AZURE'}] Health check probe: http://127.0.0.1:${PAYMENT_PORT}/health`);
});

const userServer = userApp.listen(USER_PORT, () => {
    console.log(`[User Service - AWS]    Running at http://127.0.0.1:${USER_PORT}`);
    console.log(`[User Service - AWS]    Health check probe: http://127.0.0.1:${USER_PORT}/health`);
});

const gatewayServer = serverApp.listen(SERVER_PORT, () => {
    console.log(`[Gateway & UI]          Backend running at http://localhost:${SERVER_PORT}`);
    console.log(`[Gateway & UI]          React Web Dashboard available at http://localhost:${SERVER_PORT}`);
});

process.on("SIGINT", () => {
    console.log("\nGracefully shutting down services...");
    paymentServer.close();
    userServer.close();
    gatewayServer.close();
    process.exit(0);
});

process.on("SIGTERM", () => {
    paymentServer.close();
    userServer.close();
    gatewayServer.close();
    process.exit(0);
});

