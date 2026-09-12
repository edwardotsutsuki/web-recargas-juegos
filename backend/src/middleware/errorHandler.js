import { randomUUID } from 'node:crypto';

export function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, code, message) {
  const requestId = randomUUID();
  sendJson(res, statusCode, {
    error: {
      code,
      message,
      requestId,
    },
  });
}

