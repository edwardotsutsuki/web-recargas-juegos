import { createServer } from 'node:http';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/cors.js';
import { handleRequest } from './routes/router.js';
import { startWorkerLoop, stopWorkerLoop } from './jobs/worker.js';
import { catalogService } from './services/catalogService.js';

let syncInterval = null;

const server = createServer(async (req, res) => {
  // Manejo de CORS (responder inmediatamente a OPTIONS)
  if (corsMiddleware(req, res)) return;

  // Enrutar la solicitud
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('[Server] Error no capturado:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(500);
      res.end(JSON.stringify({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno del servidor.' } }));
    }
  }
});

const listenArgs = typeof env.port === 'number' ? [env.port, env.host] : [env.port];

server.listen(...listenArgs, () => {
  console.log(`[Server] API de recargas escuchando en ${typeof env.port === 'number' ? `http://${env.host}:${env.port}` : env.port}`);
  // Iniciar el worker de despacho de compras
  startWorkerLoop(3000);

  // Sincronización automática de catálogo con Canjea (Inicial + cada 30 minutos)
  catalogService.syncCatalogWithProvider().catch((err) => {
    console.error('[Server] Falló sincronización inicial de catálogo:', err);
  });

  syncInterval = setInterval(() => {
    catalogService.syncCatalogWithProvider().catch((err) => {
      console.error('[Server] Falló sincronización periódica de catálogo:', err);
    });
  }, 30 * 60 * 1000);
});

// Cierre elegante
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[Server] Recibida señal ${signal}. Cerrando servidor, sincronizador y worker...`);
    if (syncInterval) clearInterval(syncInterval);
    stopWorkerLoop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
