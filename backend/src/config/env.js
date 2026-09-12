const rawPort = process.env.PORT?.trim() || '3000';
const isNumericPort = /^\d+$/.test(rawPort);
const port = isNumericPort ? Number(rawPort) : rawPort;

const host = process.env.HOST?.trim() || '0.0.0.0';

// Las credenciales de negocio se validarán al implementar sus adaptadores.
export const env = Object.freeze({ host, port });
