export const registerHealthRoute = (app) => {
    app.get('/health', async (_request, reply) => {
        const payload = { status: 'ok', timestamp: new Date().toISOString() };
        reply.send(payload);
    });
};
