import { FastifyInstance } from 'fastify';
import { HealthStatus } from '../../domain/types.js';

export const registerHealthRoute = (app: FastifyInstance) => {
  app.get<{
    Reply: HealthStatus;
  }>('/health', async (_request, reply) => {
    const payload: HealthStatus = { status: 'ok', timestamp: new Date().toISOString() };
    reply.send(payload);
  });
};
