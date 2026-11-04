const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const API_BASE = 'http://localhost:3000';
const PAYMENT_BASE = 'http://127.0.0.1:8001';

describe('Cross-Cloud Service Discovery Registry Test Suite', () => {

  describe('Task 1: Express Backend Core API', () => {

    it('GET /api should return API metadata and available endpoints', async () => {
      const res = await fetch(`${API_BASE}/api`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'running');
      assert.equal(data.port, 3000);
      assert.ok(data.endpoints, 'Should provide endpoints list');
      assert.ok(data.endpoints['POST /api/services/register']);
      assert.ok(data.endpoints['GET /api/services/:name']);
    });

    it('POST /api/services/register should reject missing service name with 400', async () => {
      const res = await fetch(`${API_BASE}/api/services/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-id-1',
          address: '127.0.0.1',
          port: 8001,
          checkPath: '/health'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.field, 'name');
    });

    it('POST /api/services/register should reject missing service ID with 400', async () => {
      const res = await fetch(`${API_BASE}/api/services/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-service',
          address: '127.0.0.1',
          port: 8001,
          checkPath: '/health'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.field, 'id');
    });

    it('POST /api/services/register should reject missing IP address with 400', async () => {
      const res = await fetch(`${API_BASE}/api/services/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-service',
          id: 'test-id-1',
          port: 8001,
          checkPath: '/health'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.field, 'address');
    });

    it('POST /api/services/register should reject invalid port numbers with 400', async () => {
      const invalidPorts = [0, -1, 70000, 'abc'];
      for (const p of invalidPorts) {
        const res = await fetch(`${API_BASE}/api/services/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-service',
            id: 'test-id-1',
            address: '127.0.0.1',
            port: p,
            checkPath: '/health'
          })
        });
        assert.equal(res.status, 400, `Port ${p} should be rejected with 400`);
      }
    });

    it('POST /api/services/register should reject missing health check path with 400', async () => {
      const res = await fetch(`${API_BASE}/api/services/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-service',
          id: 'test-id-1',
          address: '127.0.0.1',
          port: 8001,
          checkPath: ''
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.field, 'checkPath');
    });

    it('DELETE /api/services/:id should require service id parameter', async () => {
      const res = await fetch(`${API_BASE}/api/services/`, { method: 'DELETE' });
      // Express default route not found for trailing slash
      assert.ok([400, 404].includes(res.status));
    });
  });

  describe('Task 2: Simulated Payment Service (Port 8001)', () => {

    it('GET / on payment service should return simulation metadata', async () => {
      const res = await fetch(PAYMENT_BASE);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.service, 'payment-service');
      assert.equal(data.status, 'UP');
      assert.ok(data.note.includes('college mini-project'), 'Must state it is a simulated service');
    });

    it('GET /health on payment service should return healthy JSON response', async () => {
      const res = await fetch(`${PAYMENT_BASE}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'healthy');
      assert.equal(data.service, 'payment-service');
      assert.equal(data.port, 8001);
      assert.ok(data.checks, 'Must include health check diagnostics');
      assert.equal(data.checks.httpListener, 'PASSING');
    });
  });

  describe('Task 3: Consul Catalog and Discovery Integration', () => {

    it('GET /api/consul/status should report Consul connection state', async () => {
      const res = await fetch(`${API_BASE}/api/consul/status`);
      assert.ok([200, 503].includes(res.status));
      const data = await res.json();
      if (res.status === 200) {
        assert.equal(data.connected, true);
        assert.ok(data.leader, 'Consul leader should be present');
      } else {
        assert.equal(data.status, 'error');
        assert.equal(data.code, 'CONSUL_UNAVAILABLE');
      }
    });

    it('GET /api/services should retrieve services list from Consul', async () => {
      const res = await fetch(`${API_BASE}/api/services`);
      assert.ok([200, 503].includes(res.status));
      const data = await res.json();
      if (res.status === 200) {
        assert.equal(data.status, 'success');
        assert.equal(typeof data.services, 'object');
      }
    });

    it('GET /api/services/:name should discover matching instances for payment-service', async () => {
      const res = await fetch(`${API_BASE}/api/services/payment-service`);
      assert.ok([200, 503].includes(res.status));
      const data = await res.json();
      if (res.status === 200) {
        assert.equal(data.status, 'success');
        assert.equal(data.serviceName, 'payment-service');
        assert.ok(Array.isArray(data.instances), 'Should return instances array');
      }
    });

    it('GET /api/services/:name should return 0 instances gracefully for unregistered services', async () => {
      const res = await fetch(`${API_BASE}/api/services/nonexistent-service-xyz`);
      assert.ok([200, 503].includes(res.status));
      const data = await res.json();
      if (res.status === 200) {
        assert.equal(data.status, 'success');
        assert.equal(data.totalInstances, 0);
        assert.equal(data.instances.length, 0);
      }
    });

    it('GET /api/health should aggregate passing, warning, and critical check metrics', async () => {
      const res = await fetch(`${API_BASE}/api/health`);
      assert.ok([200, 503].includes(res.status));
      const data = await res.json();
      if (res.status === 200) {
        assert.equal(data.status, 'success');
        assert.ok(data.summary, 'Must provide summary counts');
        assert.equal(typeof data.summary.passing, 'number');
        assert.equal(typeof data.summary.warning, 'number');
        assert.equal(typeof data.summary.critical, 'number');
      }
    });
  });

  describe('Task 4: Duplicate Service Prevention and Conflict Detection', () => {

    it('POST /api/services/register should detect duplicate ID and return 409 Conflict', async () => {
      // First check if any service is in Consul
      const servicesRes = await fetch(`${API_BASE}/api/services`);
      if (servicesRes.status === 200) {
        const sData = await servicesRes.json();
        const existingIds = Object.keys(sData.services || {});
        if (existingIds.length > 0) {
          const testExistingId = existingIds[0];
          const res = await fetch(`${API_BASE}/api/services/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'duplicate-test',
              id: testExistingId,
              address: '127.0.0.1',
              port: 9999,
              checkPath: '/health'
            })
          });
          assert.equal(res.status, 409, 'Duplicate service ID must return 409 Conflict');
          const errData = await res.json();
          assert.equal(errData.code, 'DUPLICATE_SERVICE_ID');
        }
      }
    });
  });

  describe('Virtual Lab Module: Experimental Scenarios', () => {

    it('GET /api/scenarios/status should report payment service simulation state', async () => {
      const res = await fetch(`${API_BASE}/api/scenarios/status`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'success');
      assert.ok(data.paymentService);
    });

    it('POST /api/scenarios/inject-fault should trigger simulated 503 failure', async () => {
      const res = await fetch(`${API_BASE}/api/scenarios/inject-fault`, { method: 'POST' });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'success');
      assert.equal(data.scenario, 'fault_injection');

      // Verify that payment-service actually returns 503 now
      const probeRes = await fetch(`${PAYMENT_BASE}/health`);
      assert.equal(probeRes.status, 503);
    });

    it('POST /api/scenarios/restore-health should restore simulated 200 OK state', async () => {
      const res = await fetch(`${API_BASE}/api/scenarios/restore-health`, { method: 'POST' });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'success');
      assert.equal(data.scenario, 'recovery');

      // Verify that payment-service actually returns 200 again
      const probeRes = await fetch(`${PAYMENT_BASE}/health`);
      assert.equal(probeRes.status, 200);
    });
  });

});

