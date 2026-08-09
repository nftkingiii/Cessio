const truthy = new Set(['1', 'true', 'yes']);

export function loadConfig(env = process.env) {
  const port = Number.parseInt(env.PORT ?? '3001', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Object.freeze({
    port,
    nodeEnv: env.NODE_ENV ?? 'development',
    allowedOrigins,
    allowUnauthenticatedWrites: truthy.has((env.ALLOW_UNAUTHENTICATED_WRITES ?? 'false').toLowerCase()),
    underwritingProvider: env.UNDERWRITING_PROVIDER ?? 'deterministic',
    ai: {
      apiUrl: env.AI_API_URL,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL
    }
  });
}
