import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/api/server.js';

describe('health route', () => {
  it('returns ok status', async () => {
    const app = buildServer();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});
