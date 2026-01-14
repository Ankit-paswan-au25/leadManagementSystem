const request = require('supertest');
const app = require('../app');

describe('Health Check API', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'OK');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'ok');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.data.timestamp;
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('App Boot Test', () => {
    it('should boot without crashing', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });
  });
});

