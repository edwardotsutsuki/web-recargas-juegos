const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

export function corsMiddleware(req, res) {
  const origin = req.headers.origin;

  const isCapacitorOrLocal =
    origin &&
    (origin === 'capacitor://localhost' ||
     origin === 'https://localhost' ||
     origin.startsWith('http://localhost') ||
     origin.startsWith('http://192.168.') ||
     origin.startsWith('http://10.') ||
     origin.startsWith('http://172.') ||
     origin.endsWith('.trycloudflare.com') ||
     origin.includes('recargasjuegospro.cloud'));

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || isCapacitorOrLocal)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Idempotency-Key, X-Requested-With'
  );

  // Pre-flight request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true; // Handled
  }

  return false;
}

