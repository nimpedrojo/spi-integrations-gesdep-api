import { FastifyInstance } from 'fastify';
import { HealthStatus } from '../../domain/types.js';

export const registerHealthRoute = (app: FastifyInstance) => {
  app.get<{
    Reply: HealthStatus;
  }>('/health', {
    schema: {
      tags: ['health'],
      summary: 'Estado del servicio',
      response: {
        200: {
          type: 'object',
          required: ['status', 'timestamp'],
          properties: {
            status: { type: 'string', enum: ['ok'] },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    } as any
  }, async (_request, reply) => {
    const payload: HealthStatus = { status: 'ok', timestamp: new Date().toISOString() };
    reply.send(payload);
  });
};
