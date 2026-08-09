import { parseAssessmentRequest, parseChainEventRequest, parseReceivableRequest, ValidationError } from './validation.js';
import { isDomainError } from './service.js';

const MAX_BODY_BYTES = 64 * 1024;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const MAX_WRITES_PER_WINDOW = 25;

export function createApp({ config, service }) {
  const limits = new Map();

  return async function app(request, response) {
    const requestId = crypto.randomUUID();
    setHeaders(response, request, config);
    if (request.method === 'OPTIONS') return response.writeHead(204).end();
    if (!isAllowedOrigin(request, config)) return send(response, 403, { error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origin is not allowed' } }, requestId);
    if (!withinRateLimit(limits, request, isWrite(request.method))) return send(response, 429, { error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, requestId);

    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') {
        return send(response, 200, { status: 'ok', service: 'cessio-api', underwritingProvider: config.underwritingProvider, unauthenticatedWritesEnabled: config.allowUnauthenticatedWrites }, requestId);
      }

      if (isWrite(request.method) && !config.allowUnauthenticatedWrites) {
        return send(response, 503, { error: { code: 'AUTH_REQUIRED', message: 'Write operations are disabled until wallet authentication is configured' } }, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/underwriting/assessments') {
        const assessment = await service.createAssessment(parseAssessmentRequest(await readJson(request)));
        return send(response, 201, { assessment }, requestId);
      }
      if (request.method === 'POST' && url.pathname === '/v1/receivables') {
        const receivable = await service.createReceivable(parseReceivableRequest(await readJson(request)));
        if (isDomainError(receivable)) return send(response, receivable.error.statusCode, { error: { code: 'RECEIVABLE_CONFLICT', message: receivable.error.message } }, requestId);
        return send(response, 201, { receivable }, requestId);
      }
      if (request.method === 'GET' && url.pathname === '/v1/receivables') {
        return send(response, 200, { receivables: await service.listReceivables() }, requestId);
      }
      const receivableMatch = url.pathname.match(/^\/v1\/receivables\/(rcv_[a-f0-9-]+)$/);
      if (request.method === 'GET' && receivableMatch) {
        const receivable = await service.getReceivable(receivableMatch[1]);
        if (isDomainError(receivable)) return send(response, receivable.error.statusCode, { error: { code: 'NOT_FOUND', message: receivable.error.message } }, requestId);
        return send(response, 200, { receivable }, requestId);
      }
      const eventMatch = url.pathname.match(/^\/v1\/receivables\/(rcv_[a-f0-9-]+)\/chain-events$/);
      if (request.method === 'POST' && eventMatch) {
        const event = await service.addChainEvent(eventMatch[1], parseChainEventRequest(await readJson(request)));
        if (isDomainError(event)) return send(response, event.error.statusCode, { error: { code: 'CHAIN_EVENT_REJECTED', message: event.error.message } }, requestId);
        return send(response, 201, { event }, requestId);
      }
      return send(response, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } }, requestId);
    } catch (error) {
      if (error instanceof ValidationError) return send(response, 422, { error: { code: 'VALIDATION_ERROR', message: error.message } }, requestId);
      if (error.message === 'Request body too large') return send(response, 413, { error: { code: 'PAYLOAD_TOO_LARGE', message: error.message } }, requestId);
      if (error instanceof SyntaxError) return send(response, 400, { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } }, requestId);
      console.error(JSON.stringify({ requestId, event: 'request_failed', error: error.message }));
      return send(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } }, requestId);
    }
  };
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function setHeaders(response, request, config) {
  const origin = request.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
}

function isAllowedOrigin(request, config) {
  const origin = request.headers.origin;
  return !origin || config.allowedOrigins.includes(origin);
}

function withinRateLimit(limits, request, write) {
  const key = `${request.socket.remoteAddress ?? 'unknown'}:${write ? 'write' : 'read'}`;
  const now = Date.now();
  const current = limits.get(key) ?? { startedAt: now, count: 0 };
  if (now - current.startedAt >= WINDOW_MS) {
    current.startedAt = now;
    current.count = 0;
  }
  current.count += 1;
  limits.set(key, current);
  return current.count <= (write ? MAX_WRITES_PER_WINDOW : MAX_REQUESTS_PER_WINDOW);
}

function isWrite(method) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function send(response, statusCode, body, requestId) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId });
  response.end(JSON.stringify(body));
}
