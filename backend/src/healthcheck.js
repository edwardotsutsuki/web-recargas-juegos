import { env } from './config/env.js';
try {
  const response = await fetch(`http://127.0.0.1:${env.port}/health`, {
    signal: AbortSignal.timeout(4000),
  });
  process.exit(response.ok ? 0 : 1);
} catch {
  process.exit(1);
}
